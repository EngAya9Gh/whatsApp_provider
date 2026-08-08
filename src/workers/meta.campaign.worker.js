const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const logger = require('../utils/logger');
const redisConfig = require('../config/redis');

const prisma = new PrismaClient();
const metaCampaignQueue = new Queue('meta-campaign-queue', { connection: redisConfig });
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';

/**
 * Fetches the correct language code for a given template name from Meta API.
 * This avoids mismatches between what we store and what Meta actually has.
 */
async function getTemplateLang(channel, templateName) {
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

const worker = new Worker('meta-campaign-queue', async (job) => {
  const { campaignId, targetId, tenantId, channelId, phone, variables, templateName, templateLanguage, metaCategory } = job.data;
  
  try {
    // 1. Fetch the Meta Channel details to get the Access Token & Phone ID
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: channelId }
    });

    if (!channel || channel.providerType !== 'META_CLOUD' || !channel.metaAccessToken || !channel.metaPhoneNumberId) {
      throw new Error('Meta channel configuration is missing or invalid.');
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

    // 6. Log Message
    await prisma.messageLog.create({
      data: {
        tenantId,
        channelId,
        campaignId,
        phone,
        messageType: 'TEMPLATE',
        content: `[Template: ${templateName}] Variables: ${JSON.stringify(variables)}`,
        status: 'SENT',
        direction: 'OUTBOUND',
        metaMessageId: wamid
      }
    });

    logger.info(`[MetaCampaign] Message sent to ${phone} for campaign ${campaignId}. WAMID: ${wamid}`);
    return { success: true, wamid };

  } catch (error) {
    logger.error(`[MetaCampaign] Error sending to ${phone}: ${error.response?.data?.error?.message || error.message}`);

    // Update target as FAILED
    await prisma.campaignTarget.update({
      where: { id: targetId },
      data: { 
        status: 'FAILED',
        error: error.response?.data?.error?.message || error.message
      }
    });

    throw error;
  }
}, { connection: redisConfig, concurrency: 5 });

worker.on('failed', (job, err) => {
  logger.error(`[MetaCampaign] Job ${job.id} failed: ${err.message}`);
});

module.exports = { metaCampaignQueue };
