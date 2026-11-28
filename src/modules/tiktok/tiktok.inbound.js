// TikTok webhooks → Live Chat. A customer's direct message ("im_receive_msg") becomes a message in the
// common shape (chat.service receiveMessage) on the conversation "tt:<conversation id>" of the TikTok
// channel whose account it was sent to (user_openid = the channel's externalId). Our own sends come back as
// "im_send_msg" and are skipped, like Instagram echoes.
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

const parse = (content) => {
  if (content && typeof content === 'object') return content;
  try {
    return JSON.parse(content || '{}');
  } catch {
    return {};
  }
};

/** One webhook event → { kind: 'message', businessId, conversationId, username, uniqueId, message } or { kind: 'skip' } */
function normalizeEvent(event) {
  if (event?.event !== 'im_receive_msg' || !event.user_openid) return { kind: 'skip' };
  const c = parse(event.content);
  if (!c.conversation_id || c.from_user?.role === 'business_account') return { kind: 'skip' };

  const out = { id: c.message_id ? `tt.${c.message_id}` : null, type: 'TEXT', content: '', interactiveId: null, hasMedia: false, mediaUrl: null, mediaMime: null };
  switch (c.type) {
    case 'text':
      out.content = c.text?.body || '';
      break;
    case 'image':
      out.content = '📷 صورة (افتحها من تطبيق تيك توك)';
      break;
    case 'video':
      out.content = '🎬 فيديو (افتحه من تطبيق تيك توك)';
      break;
    case 'share_post':
      out.content = ['🎬 منشور تيك توك', c.share_post?.embed_url].filter(Boolean).join('\n');
      break;
    case 'emoji':
    case 'sticker':
      out.content = c.text?.body || (c.type === 'emoji' ? '😊' : '[ملصق]');
      break;
    default:
      return { kind: 'skip' }; // reactions and others
  }
  if (!out.content) return { kind: 'skip' };
  return {
    kind: 'message',
    businessId: String(event.user_openid),
    conversationId: String(c.conversation_id),
    username: c.from || null,
    uniqueId: c.unique_identifier || c.from_user?.id || null,
    message: out
  };
}

/** A webhook event (queued by tiktok.webhook.js, run by the webhook worker) */
async function processEvent(event) {
  const n = normalizeEvent(event);
  if (n.kind !== 'message') return;
  const channel = await prisma.whatsAppChannel.findFirst({ where: { providerType: 'TIKTOK', externalId: n.businessId, status: 'CONNECTED' } });
  if (!channel) {
    logger.warn(`[TikTok] Message for an account that is not connected (${n.businessId})`);
    return;
  }
  const chatService = require('../chat/chat.service');
  const contact = { address: `tt:${n.conversationId}`, name: n.username, phone: null, info: { username: n.username, tiktokId: n.uniqueId } };
  const result = await chatService.receiveMessage(channel.tenantId, channel.id, contact, n.message);
  // Keyword auto-replies answer when no flow did, as on the other channels
  if (result?.threadId && !result.flowHandled && !result.duplicate && n.message.content) {
    await require('../chatbot/autoReply').replyIfMatched(channel.tenantId, channel, result.threadId, n.message.content);
  }
}

module.exports = { normalizeEvent, processEvent };
