// Instagram / Messenger webhooks → Live Chat. Each messaging event becomes a customer message in the
// common shape (chat.service receiveMessage), on the conversation "fb:<id>" / "ig:<id>" of the channel.
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const ChatThread = require('../../models/mongo/ChatThread');
const graph = require('./social.graph');

const PREFIX = { MESSENGER: 'fb:', INSTAGRAM: 'ig:' };
const MEDIA = { image: 'IMAGE', video: 'VIDEO', audio: 'AUDIO', file: 'DOCUMENT' };

/**
 * One messaging event → { kind: 'message', customerId, message } or { kind: 'skip' }.
 * Our own messages come back as echoes and are skipped (they are already in Live Chat).
 */
function normalizeEvent(event) {
  if (!event?.sender?.id) return { kind: 'skip' };
  if (event.postback) {
    return {
      kind: 'message',
      customerId: String(event.sender.id),
      message: { id: event.postback.mid || null, type: 'INTERACTIVE', content: event.postback.title || event.postback.payload || '', interactiveId: event.postback.payload || null, hasMedia: false, mediaUrl: null, mediaMime: null }
    };
  }
  const m = event.message;
  if (!m || m.is_echo || m.is_deleted || m.is_unsupported) return { kind: 'skip' };

  const out = { id: m.mid || null, type: 'TEXT', content: m.text || '', interactiveId: null, hasMedia: false, mediaUrl: null, mediaMime: null };
  if (m.quick_reply?.payload) {
    out.type = 'INTERACTIVE';
    out.interactiveId = m.quick_reply.payload;
  }
  const attachment = (m.attachments || [])[0];
  if (attachment) {
    const url = attachment.payload?.url || null;
    if (MEDIA[attachment.type] && url) {
      out.type = MEDIA[attachment.type];
      out.hasMedia = true;
      out.mediaUrl = url;
    } else if (attachment.type === 'story_mention') {
      out.content = [`📣 ذكرك في ستوري`, url].filter(Boolean).join('\n');
    } else {
      // A shared post or reel, a location…: show what it is, with its link
      out.content = [out.content, url ? `🔗 ${url}` : `[${attachment.type}]`].filter(Boolean).join('\n');
    }
  }
  if (m.reply_to?.story) out.content = [`↩️ رد على ستوري`, m.reply_to.story.url, out.content].filter(Boolean).join('\n');
  if (!out.content && !out.hasMedia) return { kind: 'skip' };
  return { kind: 'message', customerId: String(event.sender.id), message: out };
}

/** A webhook entry of one channel (queued by meta.controller, run by the webhook worker) */
async function processEntry(channelId, { entry }) {
  const channel = await prisma.whatsAppChannel.findUnique({ where: { id: channelId } });
  if (!channel || !PREFIX[channel.providerType]) return;
  const chatService = require('../chat/chat.service');

  for (const event of entry?.messaging || []) {
    const n = normalizeEvent(event);
    if (n.kind !== 'message') continue;
    const address = `${PREFIX[channel.providerType]}${n.customerId}`;

    // Their name and picture instead of a number: read with the first message, and read again (at most every
    // few hours) while the conversation still has no name. Before Meta approves "Business Asset User Profile
    // Access" the lookup works only for people with a role on the app, so a customer who wrote then gets
    // their name with a later message.
    let name = null;
    let info;
    const thread = await ChatThread.findOne({ tenantId: channel.tenantId, channelId: channel.id, contactPhone: address }, { contactName: 1 }).lean();
    const named = thread?.contactName && thread.contactName !== address;
    if (!named && (!thread || await mayRetryProfile(channel.id, address))) {
      try {
        const p = await graph.profile(channel, n.customerId);
        name = p.name;
        info = { username: p.username, avatarUrl: p.avatarUrl };
      } catch (err) {
        logger.warn(`[Social] Could not read the profile of ${address}: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    const result = await chatService.receiveMessage(channel.tenantId, channel.id, { address, name, phone: null, info }, n.message);
    // Keyword auto-replies answer when no flow did, as on WhatsApp
    if (result?.threadId && !result.flowHandled && !result.duplicate && n.message.content) {
      await require('../chatbot/autoReply').replyIfMatched(channel.tenantId, channel, result.threadId, n.message.content);
    }
  }
}

const PROFILE_RETRY_S = 6 * 60 * 60;

/** Once per PROFILE_RETRY_S per person (no retry without Redis) */
async function mayRetryProfile(channelId, address) {
  try {
    const { redisClient } = require('../../config/redis');
    if (redisClient.status !== 'ready') return false;
    return (await redisClient.set(`social:profile:${channelId}:${address}`, '1', 'EX', PROFILE_RETRY_S, 'NX')) === 'OK';
  } catch {
    return false;
  }
}

module.exports = { normalizeEvent, processEntry, PREFIX };
