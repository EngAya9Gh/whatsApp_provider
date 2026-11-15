const { Queue, Worker, UnrecoverableError } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const logger = require('../utils/logger');
const { bullConnection } = require('../config/redis');
const { runsBackground } = require('../config/processRole');
const { metaErrorInfo, metaErrorText } = require('../modules/meta/meta.errors');

const prisma = new PrismaClient();
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';

// Campaign messages per second, all Meta campaigns together. Meta accepts about 80/s per number by
// default; staying well below keeps room for live chat and avoids "too many messages" errors.
const RATE_PER_SECOND = Math.max(1, Number(process.env.META_CAMPAIGN_RATE_PER_SECOND) || 10);
const MAX_ATTEMPTS = 4;
const THROTTLE_PAUSE_MS = Number(process.env.META_CAMPAIGN_THROTTLE_PAUSE_MS) || 60 * 1000;

const metaCampaignQueue = new Queue('meta-campaign-queue', {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: MAX_ATTEMPTS,
    backoff: { type: 'exponential', delay: 30 * 1000 }, // 30s, 1m, 2m
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 }
  }
});

// Meta says the number is sending too fast → pause the whole queue for a minute, then go on
const THROTTLE_CODES = new Set([4, 80007, 130429, 131048]);
// Meta-side hiccups or the same customer messaged too often → try this message again later
const TEMPORARY_CODES = new Set([1, 2, 131000, 131016, 131056, 133004]);

/** 'THROTTLED' | 'TEMPORARY' | 'PERMANENT' (wrong number, template problem, expired token…) */
function classifyError(err) {
  const { code } = metaErrorInfo(err);
  const status = err?.response?.status;
  if (THROTTLE_CODES.has(code) || status === 429) return 'THROTTLED';
  if (TEMPORARY_CODES.has(code)) return 'TEMPORARY';
  if (err?.isAxiosError && !err.response) return 'TEMPORARY'; // network error or timeout
  if (status >= 500) return 'TEMPORARY';
  return 'PERMANENT';
}

// Template language per channel + template, so a campaign does not ask Meta once per recipient
const langCache = new Map();
const LANG_CACHE_MS = 10 * 60 * 1000;

/**
 * Fetches the correct language code for a given template name from Meta API.
 * This avoids mismatches between what we store and what Meta actually has.
 */
async function getTemplateLang(channel, templateName) {
  const key = `${channel.id}:${templateName}`;
  const cached = langCache.get(key);
  if (cached && cached.until > Date.now()) return cached.lang;
  const lang = await fetchTemplateLang(channel, templateName);
  langCache.set(key, { lang, until: Date.now() + LANG_CACHE_MS });
  return lang;
}

async function fetchTemplateLang(channel, templateName) {
  try {
    if (!channel.metaWabaId || !channel.metaAccessToken) return 'ar';
    const res = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${channel.metaWabaId}/message_templates`,
      {
        params: { name: templateName, fields: 'name,language,status', limit: 5 },
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` }
      }
    );
    const tpl = (res.data?.data || []).find(t => t.name === templateName && t.status === 'APPROVED');
    if (tpl?.language) {
      logger.info(`[MetaCampaign] Template "${templateName}" language: ${tpl.language}`);
      return tpl.language;
    }
    logger.warn(`[MetaCampaign] Could not find approved template "${templateName}" in Meta, defaulting to 'ar'`);
    return 'ar';
  } catch (e) {
    logger.warn(`[MetaCampaign] Failed to fetch template language: ${e.message}, defaulting to 'ar'`);
    return 'ar';
  }
}

async function processJob(job) {
  const { campaignId, targetId, tenantId, channelId, phone, variables, templateName, templateLanguage, metaCategory } = job.data;
  
  try {
    // 1. Fetch the Meta Channel details to get the Access Token & Phone ID
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: channelId }
    });

    if (!channel || channel.providerType !== 'META_CLOUD' || !channel.metaAccessToken || !channel.metaPhoneNumberId) {
      const error = new Error('Meta channel configuration is missing or invalid.');
      error.permanent = true;
      throw error;
    }

    // 2. Get the correct language from Meta API (or use passed language as fallback)
    const langCode = templateLanguage || await getTemplateLang(channel, templateName);
    logger.info(`[MetaCampaign] Sending template "${templateName}" (lang: ${langCode}) to ${phone}, variables: ${JSON.stringify(variables)}`);

    // 3. Prepare the parameters array for Meta
    const parameters = variables.map(v => ({
      type: 'text',
      text: v.toString()
    }));

    const components = [];
    if (parameters.length > 0) {
      components.push({
        type: 'body',
        parameters
      });
    }

    // 4. Prepare Axios Payload
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: langCode },
        components
      }
    };

    // 5. Send to Meta API
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${channel.metaPhoneNumberId}/messages`;
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${channel.metaAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const wamid = response.data.messages?.[0]?.id;

    // 5. Update Target Status
    await prisma.campaignTarget.update({
      where: { id: targetId },
      data: { status: 'SENT' }
    });

    // Track delivered / read for campaign analytics (Meta status webhooks update it by wamid)
    if (wamid) {
      const CampaignDelivery = require('../models/mongo/CampaignDelivery');
      await CampaignDelivery.create({ wamid, tenantId, campaignId, targetId, status: 'sent' })
        .catch(e => logger.warn(`[MetaCampaign] Could not record delivery tracking: ${e.message}`));
    }

    logger.info(`[MetaCampaign] Message sent to ${phone} for campaign ${campaignId}. WAMID: ${wamid}`);
    return { success: true, wamid };

  } catch (error) {
    const reason = metaErrorText(error);
    const kind = error.permanent ? 'PERMANENT' : classifyError(error);

    if (kind === 'THROTTLED') {
      // Does not use up an attempt: the message is sent once the pause is over
      logger.warn(`[MetaCampaign] Meta asks to slow down (${reason}); pausing campaign sending for ${THROTTLE_PAUSE_MS / 1000}s`);
      await worker.rateLimit(THROTTLE_PAUSE_MS);
      throw Worker.RateLimitError();
    }

    const attempts = job.opts.attempts || 1;
    if (kind === 'TEMPORARY' && job.attemptsMade + 1 < attempts) {
      logger.warn(`[MetaCampaign] Temporary error for ${phone} (${reason}), retry ${job.attemptsMade + 1}/${attempts - 1}`);
      throw error; // BullMQ tries again after the backoff; the recipient stays PENDING
    }

    logger.error(`[MetaCampaign] Error sending to ${phone}: ${reason}`);
    await prisma.campaignTarget.update({
      where: { id: targetId },
      data: { status: 'FAILED', error: reason }
    });
    throw new UnrecoverableError(reason);
  }
}

// Only the process that runs background jobs takes them (PROCESS_ROLE all / worker)
const worker = runsBackground
  ? new Worker('meta-campaign-queue', processJob, {
    connection: bullConnection,
    concurrency: 5,
    limiter: { max: RATE_PER_SECOND, duration: 1000 }
  })
  : null;

if (worker) {
  worker.on('failed', (job, err) => {
    logger.error(`[MetaCampaign] Job ${job?.id} failed: ${err.message}`);
  });
}

module.exports = { metaCampaignQueue, worker, classifyError, RATE_PER_SECOND };
