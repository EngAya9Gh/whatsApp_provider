// Keyword auto-replies («الرد الآلي»): which rule answers a customer's text, shared by every channel.
// WhatsApp numbers reply from the Meta webhook worker (templates, media); the website widget, Instagram
// and Messenger reply here, through Live Chat (texts and media links; templates are WhatsApp-only).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');

const matches = (rule, text) => {
  const t = String(text || '').trim().toLowerCase();
  const k = String(rule.keyword || '').trim().toLowerCase();
  if (!t || !k) return false;
  if (rule.matchType === 'EXACT') return t === k;
  if (rule.matchType === 'CONTAINS') return t.includes(k);
  if (rule.matchType === 'STARTS_WITH') return t.startsWith(k);
  return false;
};

/**
 * The rule that answers `text`, or null. Rules of this channel come before rules for all channels, and
 * rules of the customer's campaign before general ones; rules outside their dates are skipped.
 */
function pickRule(rules, text, { campaignId = null, now = new Date() } = {}) {
  const applicable = rules
    .filter(r => !r.campaignId || (campaignId && campaignId === r.campaignId))
    .sort((a, b) => {
      if (a.channelId && !b.channelId) return -1;
      if (!a.channelId && b.channelId) return 1;
      if (a.campaignId && !b.campaignId) return -1;
      if (!a.campaignId && b.campaignId) return 1;
      return 0;
    });
  for (const rule of applicable) {
    if (rule.startDate && now < new Date(rule.startDate)) continue;
    if (rule.endDate && now > new Date(rule.endDate)) continue;
    if (matches(rule, text)) return rule;
  }
  return null;
}

const absolute = (url) => (/^https?:\/\//.test(url) ? url : `${String(process.env.APP_URL || '').replace(/\/+$/, '')}${url.startsWith('/') ? '' : '/'}${url}`);

/**
 * Answers a customer's text on a non-WhatsApp channel when a rule matches. Returns the rule used, or null.
 * Never throws: an auto-reply must not lose the customer's message.
 */
async function replyIfMatched(tenantId, channel, threadId, text) {
  try {
    if (!text) return null;
    const rules = await prisma.autoResponder.findMany({
      // This channel's rules and the rules marked "all channels" (rules without a channel belong to the QR bot)
      where: { tenantId, isActive: true, campaignId: null, OR: [{ channelId: channel.id }, { allChannels: true }] }
    });
    const rule = pickRule(rules, text);
    if (!rule || rule.responseType === 'META_TEMPLATE') return null;

    const chatService = require('../chat/chat.service');
    const media = ['IMAGE', 'VIDEO', 'DOCUMENT', 'QR_CODE'].includes(rule.responseType) && rule.mediaUrl ? absolute(rule.mediaUrl) : null;
    if (media && channel.providerType !== 'WEBCHAT') {
      // Instagram / Messenger: the file itself, with the rule's text as its caption
      await chatService.sendMessage(tenantId, threadId, {
        content: rule.message || '', type: rule.responseType === 'VIDEO' ? 'video' : rule.responseType === 'DOCUMENT' ? 'document' : 'image',
        hasMedia: true, mediaUrl: media, isAutomated: true
      });
    } else {
      // The widget shows text: the file goes as a link
      const content = [rule.message, media].filter(Boolean).join('\n');
      if (!content) return null;
      await chatService.sendMessage(tenantId, threadId, { content, type: 'text', isAutomated: true });
    }
    return rule;
  } catch (err) {
    logger.warn(`[AutoReply] Could not send the auto-reply: ${err.message || err}`);
    return null;
  }
}

module.exports = { pickRule, replyIfMatched, matches };
