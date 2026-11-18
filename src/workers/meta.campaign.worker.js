const https = require('https');
const { Queue, Worker, UnrecoverableError, DelayedError } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const logger = require('../utils/logger');
const { bullConnection } = require('../config/redis');
const { runsBackground } = require('../config/processRole');
const { metaErrorInfo, metaErrorText } = require('../modules/meta/meta.errors');
const { templatePreview } = require('../modules/campaign/campaign.preview');
const templateLookup = require('../modules/meta/meta.templateLookup');

const prisma = new PrismaClient();
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';

// Campaign messages per second, all Meta campaigns together (the safety cap of this server). The pace of each
// number is set by campaign.dispatcher.js, which releases a wave per number every second.
const RATE_PER_SECOND = Math.max(1, Number(process.env.META_CAMPAIGN_RATE_PER_SECOND) || 150);
// Messages being sent at the same time: a send takes ~0.2–0.5 s, so this many keep up with the rate above
const CONCURRENCY = Math.max(1, Number(process.env.META_CAMPAIGN_CONCURRENCY) || Math.min(100, Math.ceil(RATE_PER_SECOND / 3)));
const MAX_ATTEMPTS = 4;
const THROTTLE_PAUSE_MS = Number(process.env.META_CAMPAIGN_THROTTLE_PAUSE_MS) || 60 * 1000;
// One kept-alive connection pool to Meta instead of a new TLS handshake per message
const metaAgent = new https.Agent({ keepAlive: true, maxSockets: Math.max(CONCURRENCY, 16) });

const metaCampaignQueue = new Queue('meta-campaign-queue', {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: MAX_ATTEMPTS,
    backoff: { type: 'exponential', delay: 30 * 1000 }, // 30s, 1m, 2m
    removeOnComplete: { count: 1000 },
    // The campaign page keeps each recipient's error; the failed job itself goes after 14 days
    removeOnFail: { age: 14 * 24 * 3600, count: 5000 }
  }
});

// Meta says a number (or the WhatsApp account) sends too fast → that number waits a minute, then goes on.
// Code 4 is the limit of the whole Meta app: then every campaign waits.
const THROTTLE_CODES = new Set([4, 80007, 130429, 131048]);
const APP_THROTTLE_CODES = new Set([4]);
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

/** The template's language on Meta, when the campaign did not store one */
async function getTemplateLang(channel, templateName) {
  const lang = (await templateLookup.approvedVersions(channel, templateName))[0]?.language;
  if (lang) return lang;
  logger.warn(`[MetaCampaign] Could not find approved template "${templateName}" in Meta, defaulting to 'ar'`);
  return 'ar';
}

// Channels (token, phone number id) for a minute, instead of a database read per message
const channelCache = new Map();
async function getChannel(channelId) {
  const hit = channelCache.get(channelId);
  if (hit && hit.until > Date.now()) return hit.channel;
  const channel = await prisma.whatsAppChannel.findUnique({ where: { id: channelId } });
  if (channelCache.size > 500) channelCache.clear();
  channelCache.set(channelId, { channel, until: Date.now() + 60 * 1000 });
  return channel;
}

// Campaign names for the conversation badge
const nameCache = new Map();
async function campaignName(campaignId) {
  if (!nameCache.has(campaignId)) {
    if (nameCache.size > 500) nameCache.clear();
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { name: true } }).catch(() => null);
    nameCache.set(campaignId, campaign?.name || null);
  }
  return nameCache.get(campaignId);
}

/** What Live Chat shows if the customer replies: the template text with this recipient's values */
async function chatPreview(channel, templateName, langCode, variables) {
  try {
    const versions = await templateLookup.approvedVersions(channel, templateName);
    const template = versions.find(t => t.language === langCode) || versions[0];
    return templatePreview(template?.components, variables) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Before sending: is this recipient still to be sent? A stopped campaign, a paused one (the recipient goes
 * back to PENDING and is sent on resume) or a recipient already handled is skipped.
 */
async function stillToSend(targetId) {
  const target = await prisma.campaignTarget.findUnique({
    where: { id: targetId },
    select: { status: true, campaign: { select: { status: true } } }
  });
  if (!target) return 'gone';
  if (!['PENDING', 'QUEUED'].includes(target.status)) return target.status;
  const campaignStatus = target.campaign?.status;
  if (campaignStatus === 'PAUSED') {
    await prisma.campaignTarget.updateMany({ where: { id: targetId, status: 'QUEUED' }, data: { status: 'PENDING', queuedAt: null } });
    return 'PAUSED';
  }
  if (campaignStatus === 'CANCELLED') {
    await prisma.campaignTarget.updateMany({ where: { id: targetId, status: { in: ['PENDING', 'QUEUED'] } }, data: { status: 'CANCELLED' } });
    return 'CANCELLED';
  }
  return null;
}

async function processJob(job, token) {
  const { campaignId, targetId, tenantId, channelId, phone, variables, templateName, templateLanguage, headerMedia } = job.data;

  const skip = await stillToSend(targetId);
  if (skip) return { skipped: skip };

  // Meta asked this number to slow down a moment ago: wait with it instead of sending into the same error
  const { THROTTLE_KEY, rateFor } = require('../modules/campaign/campaign.dispatcher');
  const redis = await metaCampaignQueue.client;
  const waitMs = await redis.pttl(THROTTLE_KEY(channelId));
  if (waitMs > 0 && token) {
    await job.moveToDelayed(Date.now() + waitMs + Math.floor(Math.random() * 1000), token);
    throw new DelayedError();
  }

  try {
    // 1. The Meta channel (access token & phone number id)
    const channel = await getChannel(channelId);

    if (!channel || channel.providerType !== 'META_CLOUD' || !channel.metaAccessToken || !channel.metaPhoneNumberId) {
      const error = new Error('Meta channel configuration is missing or invalid.');
      error.permanent = true;
      throw error;
    }

    // Never more than the number's rate within one second (Meta counts per second): the waves set the
    // average pace, this keeps a backlog from going out in a burst. Over the limit → the next second.
    if (token) {
      const second = Math.floor(Date.now() / 1000);
      const key = `wakeel:meta-campaign:rate:${channelId}:${second}`;
      const [[, used]] = await redis.multi().incr(key).expire(key, 3).exec();
      if (used > rateFor(channel)) {
        await job.moveToDelayed((second + 1) * 1000 + Math.floor(Math.random() * 400), token);
        throw new DelayedError();
      }
    }

    // 2. The template language stored with the campaign (or the one Meta has)
    const langCode = templateLanguage || await getTemplateLang(channel, templateName);

    // 3. The values of this recipient, in variable order
    const parameters = (variables || []).map(v => ({ type: 'text', text: String(v) }));

    const components = [];
    // Media-header template: the same image / video / PDF for every recipient
    if (headerMedia) components.push(require('../modules/meta/meta.templateMedia').headerComponent(headerMedia));
    if (parameters.length > 0) components.push({ type: 'body', parameters });

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: { name: templateName, language: { code: langCode }, components }
    };

    // 4. Send to Meta
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${channel.metaPhoneNumberId}/messages`;
    const response = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${channel.metaAccessToken}`, 'Content-Type': 'application/json' },
      httpsAgent: metaAgent,
      timeout: 30000
    });

    const wamid = response.data.messages?.[0]?.id;

    // 5. The recipient is sent
    await prisma.campaignTarget.update({
      where: { id: targetId },
      data: { status: 'SENT', sentAt: new Date(), error: null }
    });

    // Track delivered / read for campaign analytics (Meta status webhooks update it by wamid)
    // …and what to add to the Live Chat conversation if the customer replies
    if (wamid) {
      const CampaignDelivery = require('../models/mongo/CampaignDelivery');
      const [preview, name] = await Promise.all([
        chatPreview(channel, templateName, langCode, variables),
        campaignName(campaignId).catch(() => null)
      ]);
      await CampaignDelivery.create({
        wamid, tenantId, campaignId, targetId, status: 'sent',
        channelId, phone: String(phone).replace(/\D/g, ''), preview, campaignName: name
      }).catch(e => logger.warn(`[MetaCampaign] Could not record delivery tracking: ${e.message}`));
    }

    logger.debug(`[MetaCampaign] Sent to ${phone} (campaign ${campaignId}, ${wamid})`);
    return { success: true, wamid };

  } catch (error) {
    if (error instanceof DelayedError) throw error;
    const reason = metaErrorText(error);
    const kind = error.permanent ? 'PERMANENT' : classifyError(error);

    if (kind === 'THROTTLED') {
      // Does not use up an attempt: the message is sent once the pause is over
      const { code } = metaErrorInfo(error);
      if (APP_THROTTLE_CODES.has(code)) {
        logger.warn(`[MetaCampaign] Meta app limit reached (${reason}); all campaigns wait ${THROTTLE_PAUSE_MS / 1000}s`);
        await worker.rateLimit(THROTTLE_PAUSE_MS);
        throw Worker.RateLimitError();
      }
      // Only this number waits: the dispatcher sends it no new wave until the key expires
      const fresh = (await redis.set(THROTTLE_KEY(channelId), String(Date.now()), 'PX', THROTTLE_PAUSE_MS, 'NX')) === 'OK';
      if (fresh) logger.warn(`[MetaCampaign] Meta asks number ${channelId} to slow down (${reason}); it waits ${THROTTLE_PAUSE_MS / 1000}s`);
      await job.moveToDelayed(Date.now() + THROTTLE_PAUSE_MS, token);
      throw new DelayedError();
    }

    const attempts = job.opts.attempts || 1;
    if (kind === 'TEMPORARY' && job.attemptsMade + 1 < attempts) {
      logger.warn(`[MetaCampaign] Temporary error for ${phone} (${reason}), retry ${job.attemptsMade + 1}/${attempts - 1}`);
      throw error; // BullMQ tries again after the backoff; the recipient stays QUEUED
    }

    logger.warn(`[MetaCampaign] Not sent to ${phone}: ${reason}`);
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
    concurrency: CONCURRENCY,
    limiter: { max: RATE_PER_SECOND, duration: 1000 }
  })
  : null;

if (worker) {
  worker.on('failed', (job, err) => {
    logger.debug(`[MetaCampaign] Job ${job?.id} failed: ${err.message}`);
  });
}

module.exports = { metaCampaignQueue, worker, classifyError, processJob, RATE_PER_SECOND, CONCURRENCY };
