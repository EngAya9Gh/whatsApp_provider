const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { bullConnection } = require('../config/redis');
const { runsBackground } = require('../config/processRole');

const prisma = new PrismaClient();

/**
 * Meta Webhook Queue — ensures webhook events are never lost.
 * All incoming META webhook payloads are queued here with automatic retries.
 */
const metaWebhookQueue = new Queue('meta-webhook-queue', {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    // Failed jobs stay 14 days for System health, then go (old failures no longer look like new problems)
    removeOnFail: { age: 14 * 24 * 3600, count: 500 }
  }
});

async function processJob(job) {
  const { type, channelId, tenantId, payload } = job.data;
  if (type === 'INCOMING_MESSAGE') {
    await processIncomingMessage(channelId, tenantId, payload);
  } else if (type === 'STATUS_UPDATE') {
    await processStatusUpdate(channelId, tenantId, payload);
  } else if (type === 'COEX_EVENT') {
    // WhatsApp Business app numbers: messages sent from the app, old chats, the app's contacts
    await require('../modules/meta/meta.coexistence').processEvent(channelId, payload);
  } else if (type === 'COEX_SYNC') {
    await require('../modules/meta/meta.coexistence').runSyncJob(channelId);
  } else if (type === 'ACCOUNT_UPDATE') {
    await require('../modules/meta/meta.coexistence').processAccountUpdate(payload);
  } else if (type === 'SOCIAL_EVENT') {
    // Instagram and Messenger messages (social/social.inbound.js)
    await require('../modules/social/social.inbound').processEntry(channelId, payload);
  } else if (type === 'TIKTOK_EVENT') {
    // TikTok direct messages (tiktok/tiktok.inbound.js)
    await require('../modules/tiktok/tiktok.inbound').processEvent(payload);
  } else if (type === 'META_AI_EVENT') {
    // Meta Business Agent: read-only copies of the conversations it answers, and its handovers to the team
    await require('../modules/meta/meta.agent.inbox').processAgentEvent(channelId, payload);
  }
}

// Only the process that runs background jobs takes them (PROCESS_ROLE all / worker)
const worker = runsBackground
  ? new Worker('meta-webhook-queue', processJob, { connection: bullConnection, concurrency: 10 })
  : null;

async function processIncomingMessage(channelId, tenantId, payload) {
  const { msg, contacts } = payload;
  const chatService = require('../modules/chat/chat.service');
  const metaService = require('../modules/meta/meta.service');
  const webhookService = require('../modules/webhook/webhook.service');

  const from = msg.from;
  const contactName = (contacts || []).find(c => c.wa_id === from)?.profile?.name || null;

  // 1. Save to Live Chat (throw to trigger retry if fails)
  const intake = await chatService.handleIncomingMessage(tenantId, channelId, from, contactName, msg);
  logger.info(`[MetaWebhookWorker] ✅ Live chat saved message from ${from}`);

  // 2. Track button/text interactions
  let buttonId = null, buttonText = null, incomingText = null;
  if (msg.type === 'interactive') {
    const t = msg.interactive.type;
    if (t === 'button_reply') { buttonId = msg.interactive.button_reply.id; buttonText = msg.interactive.button_reply.title; }
    else if (t === 'list_reply') { buttonId = msg.interactive.list_reply.id; buttonText = msg.interactive.list_reply.title; }
    else if (t === 'nfm_reply') { buttonId = 'FLOW_SUBMIT'; buttonText = msg.interactive.nfm_reply.response_json || 'Flow Submitted'; }
  }
  if (msg.type === 'button') {
    // A template's quick-reply button (the buttons of a Meta campaign)
    buttonId = msg.button?.payload || msg.button?.text || null;
    buttonText = msg.button?.text || msg.button?.payload || null;
  }
  if (buttonId) {
    const target = await prisma.campaignTarget.findFirst({ where: { phone: { contains: from }, campaign: { tenantId } }, orderBy: { id: 'desc' } }).catch(() => null);
    await prisma.buttonInteraction.create({ data: { tenantId, campaignId: target ? target.campaignId : 'UNKNOWN', campaignTargetId: target?.id || null, phone: from, buttonId, buttonText, interactionType: 'BUTTON' } }).catch(() => {});
  } else if (msg.type === 'text') {
    incomingText = msg.text.body;
    const target = await prisma.campaignTarget.findFirst({ where: { phone: { contains: from }, campaign: { tenantId } }, orderBy: { id: 'desc' } }).catch(() => null);
    if (target) {
      await prisma.buttonInteraction.create({ data: { tenantId, campaignId: target.campaignId, campaignTargetId: target.id, phone: from, buttonId: 'TEXT_REPLY', buttonText: incomingText.substring(0, 200), interactionType: 'TEXT' } }).catch(() => {});
    }
  }

  // 3. Auto Responder (skipped when the channel's WhatsApp flow already answered)
  const textForBot = buttonText || incomingText;
  if (textForBot && !intake?.flowHandled) {
    const channelRecord = await prisma.whatsAppChannel.findUnique({ where: { id: channelId } }).catch(() => null);
    if (channelRecord) {
      const rules = await prisma.autoResponder.findMany({ where: { tenantId, isActive: true, OR: [{ channelId }, { channelId: null }, { allChannels: true }] } }).catch(() => []);
      const target = await prisma.campaignTarget.findFirst({ where: { phone: { contains: from }, campaign: { tenantId } }, orderBy: { id: 'desc' } }).catch(() => null);
      // Same rule choice as the other channels (chatbot/autoReply.js); WhatsApp can also answer with templates and files
      const rule = require('../modules/chatbot/autoReply').pickRule(rules, textForBot, { campaignId: target?.campaignId || null });
      if (rule) {
        try {
          const rT = rule.responseType;
          let metaRes = null;
          if (rT === 'META_TEMPLATE' && rule.metaTemplateName) metaRes = await metaService.sendTemplateViaApi(channelRecord, from, rule.metaTemplateName, rule.metaTemplateLang || 'ar');
          else if ((rT === 'IMAGE' || rT === 'QR_CODE') && rule.mediaUrl) metaRes = await metaService.sendImageViaApi(channelRecord, from, rule.mediaUrl, rule.message || '');
          else if (rT === 'VIDEO' && rule.mediaUrl) metaRes = await metaService.sendVideoViaApi(channelRecord, from, rule.mediaUrl, rule.message || '');
          else if (rT === 'DOCUMENT' && rule.mediaUrl) metaRes = await metaService.sendDocumentViaApi(channelRecord, from, rule.mediaUrl, 'document', rule.message || '');
          else if (rule.message) metaRes = await metaService.sendTextViaApi(channelRecord, from, rule.message);

          // Save the auto-reply to Mongoose (Live Chat)
          if (metaRes && metaRes.messages && metaRes.messages[0]) {
            const metaMessageId = metaRes.messages[0].id;
            const ChatThread = require('../models/mongo/ChatThread');
            const ChatMessage = require('../models/mongo/ChatMessage');
            const socketService = require('../services/socket.service');
          
            const thread = await ChatThread.findOne({ tenantId, channelId, contactPhone: from });
            if (thread) {
              const newMsg = await ChatMessage.create({
                threadId: thread._id,
                direction: 'OUTBOUND',
                type: rT === 'META_TEMPLATE' ? 'TEMPLATE' : rT,
                content: rule.message || rule.metaTemplateName || '[Auto Reply]',
                hasMedia: ['IMAGE', 'VIDEO', 'DOCUMENT', 'QR_CODE'].includes(rT),
                mediaUrl: rule.mediaUrl || null,
                metaMessageId,
                status: 'SENT',
                isAutomated: true
              });
              const msgData = newMsg.toObject();
              msgData.id = msgData._id.toString();
              socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
            }
          }
        } catch (e) { logger.error(`[MetaAutoResponder] Failed reply to ${from}`, e.message); }
      }
    }
  }

  // 4. Dispatch to tenant webhooks
  const channelRecord = await prisma.whatsAppChannel.findUnique({ where: { id: channelId } }).catch(() => null);
  if (channelRecord) {
    await webhookService.dispatchIncomingMessage(tenantId, {
      object: 'whatsapp_business_account',
      entry: [{ id: channelRecord.metaWabaId || 'unknown', changes: [{ value: { metadata: { phone_number_id: channelRecord.metaPhoneNumberId }, contacts, messages: [msg] }, field: 'messages' }] }]
    }, 'META').catch(e => logger.error('[MetaWebhookWorker] dispatch error', e));
  }
}

async function processStatusUpdate(channelId, tenantId, payload) {
  const { statusUpdate } = payload;
  const webhookService = require('../modules/webhook/webhook.service');
  const { id: wamid, status, recipient_id, errors } = statusUpdate;
  logger.info(`[MetaWebhookWorker] Status: ${status} for wamid ${wamid} (to: ${recipient_id})`);

  const updateData = { deliveryStatus: status };
  if (status === 'failed' && errors?.length > 0) {
    updateData.status = 'FAILED';
    updateData.errorMessage = errors.map(e => `[${e.code}] ${e.title}: ${e.message || ''}`).join('; ');
    logger.error(`[MetaWebhookWorker] Message ${wamid} FAILED: ${updateData.errorMessage}`);
  }

  const msgLog = await prisma.messageLog.findFirst({ where: { metaMessageId: wamid }, select: { phone: true } });
  await prisma.messageLog.updateMany({ where: { metaMessageId: wamid }, data: updateData });

  // Update Mongoose ChatMessage
  const ChatMessage = require('../models/mongo/ChatMessage');
  try {
    await ChatMessage.updateMany(
      { metaMessageId: wamid },
      { $set: { status: updateData.status || status.toUpperCase() } }
    );
  } catch (e) {
    logger.error(`[MetaWebhookWorker] Failed to update Mongoose ChatMessage status:`, e.message);
  }

  // Campaign messages: delivered / read tracking
  try {
    const CampaignDelivery = require('../models/mongo/CampaignDelivery');
    // Meta could not deliver a campaign message it had accepted: the recipient becomes FAILED with Meta's
    // reason (shown on the campaign page, retried by "Retry failed", refunded by campaign.billing.js)
    const delivery = status === 'failed' ? await CampaignDelivery.findOne({ wamid, status: 'sent' }).lean() : null;
    await CampaignDelivery.applyStatus(wamid, status);
    if (delivery?.targetId) {
      await prisma.campaignTarget.updateMany({
        where: { id: delivery.targetId, status: 'SENT' },
        data: { status: 'FAILED', error: updateData.errorMessage || 'Meta could not deliver the message' }
      });
    }
  } catch (e) {
    logger.error(`[MetaWebhookWorker] Failed to update campaign delivery status:`, e.message);
  }

  logger.info(`[MetaWebhookWorker] ✅ Updated status for wamid ${wamid} → ${status}`);
}

if (worker) {
  worker.on('failed', (job, err) => logger.error(`[MetaWebhookWorker] Job ${job?.id} failed after all retries: ${err.message}`));
  worker.on('completed', (job) => logger.info(`[MetaWebhookWorker] Job ${job?.id} completed`));
}

module.exports = { metaWebhookQueue, worker };
