/**
 * Meta Business Agent conversations in Live Chat.
 *
 * While Meta's agent owns a conversation, the customer's messages do NOT come on the "messages" webhook.
 * They come on "standby" (read-only copies), and only if the business granted our app conversation
 * visibility (Business Settings › WhatsApp accounts › Conversation routing) and the app subscribes to
 * the "standby" field. Meta: "Do not reply to the WhatsApp user in response to a standby webhook."
 * So nothing here answers, runs a bot or opens a ticket: it only records.
 *
 *   standby               value.standby.{contacts, messages, message_echoes, statuses}
 *   messaging_handovers   value.{sender.phone_number, recipient.phone_number_id, control_passed | control_taken}
 *                         control_passed = the agent handed the conversation to us (the team must answer)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');
const socketService = require('../../services/socket.service');
const ChatThread = require('../../models/mongo/ChatThread');
const ChatMessage = require('../../models/mongo/ChatMessage');
const { describeMessage, findOrCreateThread, insertNew, emitThread } = require('./meta.coexistence');

const AGENT_FIELDS = ['standby', 'messaging_handovers'];
const digits = (v) => String(v || '').replace(/\D/g, '');
const at = (ts) => (ts ? new Date(Number(ts) * 1000) : new Date());

function emitMessage(tenantId, doc) {
  const data = doc.toObject();
  data.id = data._id.toString();
  socketService.emitToTenant(tenantId, 'new_chat_message', data);
}

/** The agent's reply, from the request body Meta echoes back (message_echoes[].message). */
function describeAgentReply(msg = {}) {
  const t = msg.type || 'text';
  if (t === 'text') return { type: 'TEXT', content: msg.text?.body || '' };
  if (t === 'interactive') {
    const i = msg.interactive || {};
    const options = [
      ...(i.action?.buttons || []).map(b => b.reply?.title || b.title),
      ...((i.action?.sections || []).flatMap(s => (s.rows || []).map(r => r.title)))
    ].filter(Boolean);
    return { type: 'INTERACTIVE', content: [i.body?.text, options.length ? `[${options.join(' | ')}]` : ''].filter(Boolean).join('\n') || '[Interactive]' };
  }
  if (t === 'template') return { type: 'TEMPLATE', content: `[Template] ${msg.template?.name || ''}`.trim() };
  if (['image', 'video', 'document', 'audio', 'sticker'].includes(t)) {
    const m = msg[t] || {};
    return { type: 'TEXT', content: `[${t}] ${m.caption || m.filename || ''}`.trim() };
  }
  return { type: 'TEXT', content: `[${t}]` };
}

async function recordStandby(channel, sb) {
  const contacts = sb.contacts || [];
  const phoneOf = (direct, userId) => digits(direct) || digits(contacts.find(c => userId && c.user_id === userId)?.wa_id);

  // Customer messages the agent is answering
  for (const m of sb.messages || []) {
    const phone = phoneOf(m.from, m.from_user_id);
    if (!phone) { logger.warn(`[MetaAgent] standby message ${m.id} has no phone number (username-only customer)`); continue; }
    const body = describeMessage(m, channel.id);
    if (!body) continue;
    const when = at(m.timestamp);
    const name = contacts.find(c => digits(c.wa_id) === phone || (m.from_user_id && c.user_id === m.from_user_id))?.profile?.name || null;
    const { thread, isNew } = await findOrCreateThread(channel, phone, name, when);
    const [created] = await insertNew(thread._id, [{ direction: 'INBOUND', ...body, metaMessageId: m.id, source: 'STANDBY', createdAt: when }]);
    if (!created) continue;
    // A customer message opens Meta's 24h window whoever answers; no unread badge while the agent answers
    await ChatThread.updateOne({ _id: thread._id }, { $max: { lastMessageAt: when, lastInboundAt: when, 'metaAi.lastAt': when } });
    emitMessage(channel.tenantId, created);
    await emitThread(channel, thread, isNew, when);
    socketService.emitToTenant(channel.tenantId, 'thread_updated', { id: thread._id.toString(), lastInboundAt: when, metaAi: { ...(thread.metaAi || {}), lastAt: when } });
  }

  // The agent's replies
  for (const e of sb.message_echoes || []) {
    const msg = e.message || {};
    const phone = digits(msg.to || e.to);
    if (!phone) continue;
    const when = at(e.timestamp);
    const { thread, isNew } = await findOrCreateThread(channel, phone, null, when);
    const [created] = await insertNew(thread._id, [{
      direction: 'OUTBOUND', ...describeAgentReply(msg), status: 'SENT', metaMessageId: e.id,
      source: 'META_AI', isAutomated: true, createdAt: when
    }]);
    if (!created) continue;
    await ChatThread.updateOne({ _id: thread._id }, { $max: { lastMessageAt: when, 'metaAi.lastAt': when } });
    emitMessage(channel.tenantId, created);
    await emitThread(channel, thread, isNew, when);
    socketService.emitToTenant(channel.tenantId, 'thread_updated', { id: thread._id.toString(), metaAi: { ...(thread.metaAi || {}), lastAt: when } });
  }

  // Delivery of the agent's replies
  for (const s of sb.statuses || []) {
    if (!s.id || !s.status) continue;
    await ChatMessage.updateMany({ metaMessageId: s.id }, { $set: { status: String(s.status).toUpperCase() } });
  }
}

/** Plain text from Meta's optional conversation summary (string or object). */
const summaryText = (ctx) => {
  if (!ctx) return '';
  if (typeof ctx === 'string') return ctx;
  return ctx.summary || ctx.text || ctx.conversation_summary || JSON.stringify(ctx).slice(0, 1500);
};

async function recordHandover(channel, v) {
  const phone = digits(v.sender?.phone_number);
  if (!phone) return;
  const passed = v.control_passed || (v.type === 'control_passed' ? v : null);
  const taken = v.control_taken || (v.type === 'control_taken' ? v : null);
  if (!passed && !taken) return;
  const when = at(v.timestamp);
  const { thread, isNew } = await findOrCreateThread(channel, phone, null, when);

  let content;
  let update;
  if (passed) {
    // The agent handed the conversation to us: the team must answer, so it shows as unread
    const reason = passed.metadata ? `\n${passed.metadata}` : '';
    const summary = summaryText(passed.conversation_context);
    content = `🤖 بوت Meta حوّل المحادثة للفريق · Meta Business Agent handed this conversation to the team${reason}${summary ? `\n\n${summary}` : ''}`;
    update = { $set: { 'metaAi.handedOffAt': when, 'metaAi.handoffReason': passed.metadata || null }, $inc: { unreadCount: 1 }, $max: { lastMessageAt: when } };
  } else {
    const owner = taken.new_owner_role || taken.new_owner_app_id || '?';
    content = `🤖 انتقلت المحادثة إلى ${owner} · Conversation taken by ${owner}`;
    update = { $set: { 'metaAi.takenAt': when, 'metaAi.takenBy': String(owner) }, $max: { lastMessageAt: when } };
  }

  const note = await ChatMessage.create({
    threadId: thread._id, direction: 'OUTBOUND', type: 'INTERNAL_NOTE', isInternal: true, isAutomated: true,
    content: content.slice(0, 4000), status: 'READ', source: 'META_AI', createdAt: when
  });
  await ChatThread.updateOne({ _id: thread._id }, update);
  emitMessage(channel.tenantId, note);
  await emitThread(channel, thread, isNew, when);
  const fresh = await ChatThread.findById(thread._id).select('metaAi unreadCount').lean();
  socketService.emitToTenant(channel.tenantId, 'thread_updated', { id: thread._id.toString(), metaAi: fresh?.metaAi || null, unreadCount: fresh?.unreadCount });
}

/** Queue job for one standby / messaging_handovers change of a known channel. */
async function processAgentEvent(channelId, { field, value }) {
  const channel = await prisma.whatsAppChannel.findUnique({ where: { id: channelId } });
  if (!channel || !value) return;
  if (field === 'standby') return recordStandby(channel, value.standby || {});
  if (field === 'messaging_handovers') return recordHandover(channel, value);
}

module.exports = { AGENT_FIELDS, processAgentEvent, describeAgentReply };
