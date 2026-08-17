const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const redisConfig = require('../config/redis');

const prisma = new PrismaClient();

/**
 * Meta Webhook Queue — ensures webhook events are never lost.
 * All incoming META webhook payloads are queued here with automatic retries.
 */
const metaWebhookQueue = new Queue('meta-webhook-queue', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 }
  }
});

const worker = new Worker('meta-webhook-queue', async (job) => {
  const { type, channelId, tenantId, payload } = job.data;
  if (type === 'INCOMING_MESSAGE') {
    await processIncomingMessage(channelId, tenantId, payload);
  } else if (type === 'STATUS_UPDATE') {
    await processStatusUpdate(channelId, tenantId, payload);
  }
}, { connection: redisConfig, concurrency: 10 });

async function processIncomingMessage(channelId, tenantId, payload) {
  const { msg, contacts } = payload;
  const chatService = require('../modules/chat/chat.service');
  const metaService = require('../modules/meta/meta.service');
  const webhookService = require('../modules/webhook/webhook.service');

  const from = msg.from;
  const contactName = (contacts || []).find(c => c.wa_id === from)?.profile?.name || null;

  // 1. Save to Live Chat (throw to trigger retry if fails)
  await chatService.handleIncomingMessage(tenantId, channelId, from, contactName, msg);
  logger.info(`[MetaWebhookWorker] ✅ Live chat saved message from ${from}`);

  // 2. Track button/text interactions
  let buttonId = null, buttonText = null, incomingText = null;
  if (msg.type === 'interactive') {
    const t = msg.interactive.type;
    if (t === 'button_reply') { buttonId = msg.interactive.button_reply.id; buttonText = msg.interactive.button_reply.title; }
    else if (t === 'list_reply') { buttonId = msg.interactive.list_reply.id; buttonText = msg.interactive.list_reply.title; }
    else if (t === 'nfm_reply') { buttonId = 'FLOW_SUBMIT'; buttonText = msg.interactive.nfm_reply.response_json || 'Flow Submitted'; }
    if (buttonId) {
      const target = await prisma.campaignTarget.findFirst({ where: { phone: { contains: from }, campaign: { tenantId } }, orderBy: { id: 'desc' } }).catch(() => null);
      await prisma.buttonInteraction.create({ data: { tenantId, campaignId: target ? target.campaignId : 'UNKNOWN', campaignTargetId: target?.id || null, phone: from, buttonId, buttonText, interactionType: 'BUTTON' } }).catch(() => {});
    }
  } else if (msg.type === 'text') {
    incomingText = msg.text.body;
    const target = await prisma.campaignTarget.findFirst({ where: { phone: { contains: from }, campaign: { tenantId } }, orderBy: { id: 'desc' } }).catch(() => null);
    if (target) {
      await prisma.buttonInteraction.create({ data: { tenantId, campaignId: target.campaignId, campaignTargetId: target.id, phone: from, buttonId: 'TEXT_REPLY', buttonText: incomingText.substring(0, 200), interactionType: 'TEXT' } }).catch(() => {});
    }
  }

  // 3. Auto Responder
  const textForBot = buttonText || incomingText;
  if (textForBot) {
    const channelRecord = await prisma.whatsAppChannel.findUnique({ where: { id: channelId } }).catch(() => null);
    if (channelRecord) {
      const rules = await prisma.autoResponder.findMany({ where: { tenantId, isActive: true, OR: [{ channelId }, { channelId: null }] } }).catch(() => []);
      const target = await prisma.campaignTarget.findFirst({ where: { phone: { contains: from }, campaign: { tenantId } }, orderBy: { id: 'desc' } }).catch(() => null);
      const applicableRules = rules.filter(r => !r.campaignId || (target && target.campaignId === r.campaignId))
        .sort((a, b) => { if (a.channelId && !b.channelId) return -1; if (!a.channelId && b.channelId) return 1; if (a.campaignId && !b.campaignId) return -1; if (!a.campaignId && b.campaignId) return 1; return 0; });
      for (const rule of applicableRules) {
        const now = new Date();
        if (rule.startDate && now < new Date(rule.startDate)) continue;
        if (rule.endDate && now > new Date(rule.endDate)) continue;
        const tL = textForBot.trim().toLowerCase(), kL = rule.keyword.trim().toLowerCase();
        let isMatch = (rule.matchType === 'EXACT' && tL === kL) || (rule.matchType === 'CONTAINS' && tL.includes(kL)) || (rule.matchType === 'STARTS_WITH' && tL.startsWith(kL));
        if (isMatch) {
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
              const ChatThread = require('../../models/mongo/ChatThread');
              const ChatMessage = require('../../models/mongo/ChatMessage');
              const socketService = require('../../services/socket.service');
              
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
                  status: 'SENT'
                });
                const msgData = newMsg.toObject();
                msgData.id = msgData._id.toString();
                socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
              }
            }
          } catch (e) { logger.error(`[MetaAutoResponder] Failed reply to ${from}`, e.message); }
          break;
        }
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
  const ChatMessage = require('../../models/mongo/ChatMessage');
  try {
    await ChatMessage.updateMany(
      { metaMessageId: wamid },
      { $set: { status: updateData.status || status.toUpperCase() } }
    );
  } catch (e) {
    logger.error(`[MetaWebhookWorker] Failed to update Mongoose ChatMessage status:`, e.message);
  }

  logger.info(`[MetaWebhookWorker] ✅ Updated status for wamid ${wamid} → ${status}`);
}

worker.on('failed', (job, err) => logger.error(`[MetaWebhookWorker] Job ${job?.id} failed after all retries: ${err.message}`));
worker.on('completed', (job) => logger.info(`[MetaWebhookWorker] Job ${job?.id} completed`));

module.exports = { metaWebhookQueue };
