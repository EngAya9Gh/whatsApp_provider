/**
 * WhatsApp Business app Coexistence
 *
 * A customer connects the number they already use in the WhatsApp Business app; the number keeps working
 * there AND on Cloud API (Meta: embedded-signup/onboarding-business-app-users). After the popup:
 *   - the number is NOT registered (it already is, on the app)
 *   - within 24 hours we may ask Meta ONCE for the app's contacts and ONCE for its chat history
 *     (POST /{phone-number-id}/smb_app_data); they then arrive as webhooks
 *   - messages the business sends from the app arrive as `smb_message_echoes` webhooks
 *   - `account_update` tells us when the connection ends (business disconnected, phone inactive ~14 days…)
 *
 * State per channel lives in WhatsAppChannel.coexSync (JSON):
 *   { state: 'ACTIVE'|'OFFBOARDED'|'DISCONNECTED', stateReason, stateAt,
 *     contacts: { requestId, requestedAt, error, lastAttemptAt },
 *     history:  { requestId, requestedAt, error, lastAttemptAt, declined, progress, completedAt } }
 */
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');
const { metaErrorInfo, metaErrorText } = require('./meta.errors');
const socketService = require('../../services/socket.service');
const ChatThread = require('../../models/mongo/ChatThread');
const ChatMessage = require('../../models/mongo/ChatMessage');

// Meta documents the Coexistence calls on recent Graph versions (its examples use v27.0), while the rest of
// the platform stays on GRAPH_API_VERSION. Set META_COEX_GRAPH_VERSION when Meta retires this one.
const COEX_GRAPH = `https://graph.facebook.com/${process.env.META_COEX_GRAPH_VERSION || 'v27.0'}`;

const SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;
const HISTORY_MONTH_CHOICES = [0, 1, 3, 6]; // Meta shares up to 6 months; the customer picks how much to keep
const DEFAULT_HISTORY_MONTHS = 6;
const COEX_EVENT = 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';
const CHANNEL_FIELDS = { id: true, phoneNumber: true, name: true, displayPhoneNumber: true, providerType: true };

const digits = (v) => String(v || '').replace(/\D/g, '');
const normalizeHistoryMonths = (v) => {
  const n = Number(v);
  return HISTORY_MONTH_CHOICES.includes(n) ? n : DEFAULT_HISTORY_MONTHS;
};
const authOf = (token) => ({ headers: { Authorization: `Bearer ${token}` }, timeout: 20000 });

// ─── State (JSON column, updated under a row lock: webhook jobs run in parallel) ──────────────────────

const parseJson = (v) => {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return {}; }
};

async function updateCoexSync(channelId, mutate) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT coex_sync FROM whatsapp_channels WHERE id = ${channelId} FOR UPDATE`;
    if (!rows.length) return null;
    const next = mutate(parseJson(rows[0].coex_sync));
    await tx.whatsAppChannel.update({ where: { id: channelId }, data: { coexSync: next } });
    return next;
  });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────────────────────────────

/**
 * Meta's Coexistence finish event carries only the WhatsApp Business Account ID, so the number is looked up:
 * the account's only number, or the one that is on the WhatsApp Business app.
 */
async function findAppNumber(wabaId, token) {
  const auth = authOf(token);
  const res = await axios.get(`${COEX_GRAPH}/${wabaId}/phone_numbers`, { ...auth, params: { fields: 'id,display_phone_number' } });
  const numbers = res.data?.data || [];
  if (numbers.length <= 1) return numbers[0]?.id || null;
  for (const n of numbers) {
    try {
      const r = await axios.get(`${COEX_GRAPH}/${n.id}`, { ...auth, params: { fields: 'is_on_biz_app' } });
      if (r.data?.is_on_biz_app) return n.id;
    } catch { /* try the next one */ }
  }
  return null;
}

/** Fresh state for a (re)connected Coexistence number: a new 24h window and new one-time syncs. */
const initialCoexSync = () => ({ state: 'ACTIVE', stateReason: null, stateAt: new Date().toISOString(), contacts: {}, history: {} });

/**
 * Asks Meta for the contacts and (unless the customer chose none) the chat history. Each can be asked for
 * once per connection, within 24 hours; a type already accepted is never asked again.
 * Returns { ok, retryable, windowOpen, results }.
 */
async function requestSync(channelId) {
  const channel = await prisma.whatsAppChannel.findUnique({ where: { id: channelId } });
  if (!channel || !channel.isCoexistence) return { ok: true, retryable: false, results: {} };

  const sync = parseJson(channel.coexSync);
  const startedAt = channel.coexOnboardedAt ? new Date(channel.coexOnboardedAt).getTime() : Date.now();
  const windowOpen = Date.now() - startedAt < SYNC_WINDOW_MS;
  const wanted = [{ key: 'contacts', syncType: 'smb_app_state_sync' }];
  if (channel.coexHistoryMonths !== 0) wanted.push({ key: 'history', syncType: 'history' });

  const results = {};
  let ok = true;
  for (const { key, syncType } of wanted) {
    if (sync[key]?.requestId) { results[key] = { ok: true, already: true }; continue; }
    if (!windowOpen) {
      ok = false;
      results[key] = { ok: false, expired: true };
      continue;
    }
    try {
      const r = await axios.post(`${COEX_GRAPH}/${channel.metaPhoneNumberId}/smb_app_data`,
        { messaging_product: 'whatsapp', sync_type: syncType },
        authOf(channel.metaAccessToken));
      const requestId = r.data?.request_id || 'accepted';
      await updateCoexSync(channel.id, (s) => ({ ...s, [key]: { ...(s[key] || {}), requestId, requestedAt: new Date().toISOString(), error: null } }));
      logger.info(`[Coexistence] ${syncType} requested for channel ${channel.id} (request ${requestId})`);
      results[key] = { ok: true, requestId };
    } catch (e) {
      ok = false;
      const message = metaErrorText(e);
      await updateCoexSync(channel.id, (s) => ({ ...s, [key]: { ...(s[key] || {}), error: message, lastAttemptAt: new Date().toISOString() } }));
      logger.warn(`[Coexistence] ${syncType} request failed for channel ${channel.id}: ${message}`);
      results[key] = { ok: false, error: message };
    }
  }
  return { ok, retryable: !ok && windowOpen, windowOpen, results };
}

/** Background retries (1, 2, 4… minutes) for a sync request Meta did not accept straight after the popup. */
function scheduleSyncRetry(channelId) {
  const { metaWebhookQueue } = require('../../workers/meta.webhook.worker');
  return metaWebhookQueue.add('coex-sync', { type: 'COEX_SYNC', channelId }, {
    delay: 60 * 1000,
    attempts: 6,
    backoff: { type: 'exponential', delay: 60 * 1000 }
  }).catch((e) => logger.error(`[Coexistence] Could not schedule the sync retry for ${channelId}: ${e.message}`));
}

/** Queue job: throws while a request is still missing and the window is open, so BullMQ retries it. */
async function runSyncJob(channelId) {
  const r = await requestSync(channelId);
  if (r.retryable) {
    const failedTypes = Object.entries(r.results).filter(([, v]) => !v.ok).map(([k]) => k).join(', ');
    throw new Error(`Coexistence sync not accepted yet (${failedTypes})`);
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────────────────────────────

/** A WhatsApp message (echo or history) as a Live Chat message; null for what is not shown (reactions…). */
function describeMessage(msg, channelId) {
  const t = msg.type;
  const out = { type: 'TEXT', content: '', hasMedia: false, mediaUrl: null, mediaMime: null };
  if (t === 'text') {
    out.content = msg.text?.body || '';
  } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(t)) {
    const m = msg[t] || {};
    out.type = t === 'sticker' ? 'IMAGE' : t.toUpperCase();
    out.content = m.caption || (t === 'document' ? (m.filename || '') : '');
    out.mediaMime = m.mime_type || null;
    if (m.id) {
      out.hasMedia = true;
      out.mediaUrl = `/api/v1/chat/media/${m.id}?channelId=${channelId}`;
    }
  } else if (t === 'media_placeholder') {
    // Old media: Meta sends the file later (only for media from the last 14 days)
    out.type = 'MEDIA_PLACEHOLDER';
    out.content = '📎 [Media]';
  } else if (t === 'location') {
    const l = msg.location || {};
    out.type = 'LOCATION';
    out.content = `📍 ${l.name || l.address || ''} https://maps.google.com/?q=${l.latitude},${l.longitude}`.replace(/\s+/g, ' ').trim();
  } else if (t === 'contacts') {
    out.type = 'CONTACTS';
    out.content = '👤 ' + (msg.contacts || []).map(c => c.name?.formatted_name || c.phones?.[0]?.phone).filter(Boolean).join(', ');
  } else if (t === 'interactive') {
    out.type = 'INTERACTIVE';
    out.content = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || msg.interactive?.body?.text || '[Interactive]';
  } else if (t === 'button') {
    out.content = msg.button?.text || '';
  } else if (t === 'reaction' || t === 'edit' || t === 'revoke' || t === 'unsupported') {
    return null;
  } else {
    out.content = `[${t}]`;
  }
  return out;
}

const STATUS = { read: 'READ', played: 'READ', delivered: 'DELIVERED', sent: 'SENT', pending: 'PENDING', error: 'FAILED' };

async function findOrCreateThread(channel, contactPhone, contactName, lastAt) {
  const { tenantId, id: channelId } = channel;
  let thread = await ChatThread.findOne({ tenantId, channelId, contactPhone });
  if (thread) return { thread, isNew: false };
  const contact = await prisma.contact.findFirst({ where: { tenantId, phone: contactPhone }, select: { name: true } }).catch(() => null);
  try {
    thread = await ChatThread.create({
      tenantId, channelId, contactPhone,
      contactName: contactName || contact?.name || contactPhone,
      lastMessageAt: lastAt, unreadCount: 0
    });
    return { thread, isNew: true };
  } catch (e) {
    if (e.code !== 11000) throw e; // created at the same moment by another job
    return { thread: await ChatThread.findOne({ tenantId, channelId, contactPhone }), isNew: false };
  }
}

/** Inserts the messages this thread does not have yet (webhooks can be delivered twice). */
async function insertNew(threadId, docs) {
  const ids = [...new Set(docs.map(d => d.metaMessageId).filter(Boolean))];
  const existing = ids.length
    ? await ChatMessage.find({ threadId, metaMessageId: { $in: ids } }).select('metaMessageId').lean()
    : [];
  const seen = new Set(existing.map(e => e.metaMessageId));
  const fresh = [];
  for (const d of docs) {
    if (d.metaMessageId && seen.has(d.metaMessageId)) continue;
    if (d.metaMessageId) seen.add(d.metaMessageId);
    fresh.push({ ...d, threadId });
  }
  if (!fresh.length) return [];
  return ChatMessage.insertMany(fresh, { ordered: false });
}

async function emitThread(channel, thread, isNew, lastMessageAt) {
  if (isNew) {
    const data = thread.toObject();
    data.id = data._id.toString();
    data.lastMessageAt = lastMessageAt;
    data.channel = await prisma.whatsAppChannel.findUnique({ where: { id: channel.id }, select: CHANNEL_FIELDS });
    socketService.emitToTenant(channel.tenantId, 'thread_updated', data);
  } else {
    socketService.emitToTenant(channel.tenantId, 'thread_updated', { id: thread._id.toString(), lastMessageAt });
  }
}

/** Marks a message the business deleted for everyone in the app. */
async function markRevoked(channel, originalId) {
  if (!originalId) return;
  const msg = await ChatMessage.findOne({ metaMessageId: originalId });
  if (!msg) return;
  const owned = await ChatThread.exists({ _id: msg.threadId, channelId: channel.id });
  if (!owned) return;
  await ChatMessage.updateOne({ _id: msg._id }, { $set: { type: 'REVOKED', content: '🚫 [Deleted]', hasMedia: false, mediaUrl: null } });
}

/** smb_message_echoes: what the business sent from the WhatsApp Business app, shown in Live Chat. */
async function recordEchoes(channel, value) {
  const contacts = value.contacts || [];
  for (const echo of value.message_echoes || []) {
    if (echo.type === 'revoke') { await markRevoked(channel, echo.revoke?.original_message_id); continue; }
    const body = describeMessage(echo, channel.id);
    if (!body) continue;
    const to = digits(echo.to) || digits(contacts.find(c => c.user_id && c.user_id === echo.to_user_id)?.wa_id);
    if (!to) {
      logger.warn(`[Coexistence] App message ${echo.id} has no phone number (username-only contact); not shown in Live Chat`);
      continue;
    }
    const at = echo.timestamp ? new Date(Number(echo.timestamp) * 1000) : new Date();
    const { thread, isNew } = await findOrCreateThread(channel, to, null, at);
    // Not lastInboundAt: messages from the app neither open nor extend Meta's 24h window
    const [created] = await insertNew(thread._id, [{
      direction: 'OUTBOUND', ...body, status: 'SENT', metaMessageId: echo.id, source: 'BUSINESS_APP', createdAt: at
    }]);
    if (!created) continue;
    await ChatThread.updateOne({ _id: thread._id }, { $max: { lastMessageAt: at } });
    const msgData = created.toObject();
    msgData.id = msgData._id.toString();
    socketService.emitToTenant(channel.tenantId, 'new_chat_message', msgData);
    await emitThread(channel, thread, isNew, at);
  }
}

// ─── History ──────────────────────────────────────────────────────────────────────────────────────────

/** Oldest message to keep: the customer's choice, counted back from the connection date. */
function historyCutoff(channel, months) {
  const d = channel.coexOnboardedAt ? new Date(channel.coexOnboardedAt) : new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

async function importThread(channel, businessNumber, t, since) {
  const contactPhone = digits(t.context?.wa_id || t.id);
  if (!contactPhone) return 0;
  const docs = [];
  for (const m of t.messages || []) {
    const at = new Date(Number(m.timestamp) * 1000);
    if (!(at >= since)) continue;
    const body = describeMessage(m, channel.id);
    if (!body) continue;
    const outbound = !!m.to || (!!businessNumber && digits(m.from) === businessNumber);
    docs.push({
      direction: outbound ? 'OUTBOUND' : 'INBOUND', ...body,
      status: outbound ? (STATUS[m.history_context?.status] || 'SENT') : null,
      metaMessageId: m.id, source: 'HISTORY', createdAt: at
    });
  }
  if (!docs.length) return 0;
  const latest = docs.reduce((a, d) => (d.createdAt > a ? d.createdAt : a), docs[0].createdAt);
  const { thread, isNew } = await findOrCreateThread(channel, contactPhone, t.context?.username || null, latest);
  // Old messages: no unread badge, and no 24h window (customer messages from before the connection only allow templates)
  const inserted = await insertNew(thread._id, docs);
  if (!inserted.length) return 0;
  await ChatThread.updateOne({ _id: thread._id }, { $max: { lastMessageAt: latest } });
  await emitThread(channel, thread, isNew, latest);
  return inserted.length;
}

/** The files of old media messages, sent by Meta after the chats (value.messages on the `history` field). */
async function attachHistoryMedia(channel, messages) {
  for (const m of messages) {
    const body = describeMessage(m, channel.id);
    if (!body?.hasMedia) continue;
    const existing = await ChatMessage.findOne({ metaMessageId: m.id, source: 'HISTORY' });
    if (!existing) continue; // older than the period the customer chose
    const owned = await ChatThread.exists({ _id: existing.threadId, channelId: channel.id });
    if (!owned) continue;
    await ChatMessage.updateOne({ _id: existing._id }, {
      $set: { type: body.type, content: body.content, hasMedia: true, mediaUrl: body.mediaUrl, mediaMime: body.mediaMime }
    });
  }
}

/** history: chunks of old 1:1 chats (any order), or the business's refusal to share them. */
async function importHistory(channel, value) {
  if (Array.isArray(value.messages) && value.messages.length) return attachHistoryMedia(channel, value.messages);

  const months = channel.coexHistoryMonths ?? DEFAULT_HISTORY_MONTHS;
  const since = historyCutoff(channel, months);
  const businessNumber = digits(value.metadata?.display_phone_number || channel.phoneNumber);

  for (const chunk of value.history || []) {
    if (chunk.errors?.length) {
      const declined = chunk.errors.some(e => Number(e.code) === 2593109);
      const error = chunk.errors.map(e => e.message || e.title).join('; ');
      logger.warn(`[Coexistence] History not shared for channel ${channel.id}: ${error}`);
      await updateCoexSync(channel.id, (s) => ({ ...s, history: { ...(s.history || {}), declined, error } }));
      continue;
    }
    if (months > 0) {
      for (const t of chunk.threads || []) await importThread(channel, businessNumber, t, since);
    }
    const progress = Number(chunk.metadata?.progress);
    if (Number.isFinite(progress)) {
      await updateCoexSync(channel.id, (s) => {
        const h = s.history || {};
        const p = Math.max(h.progress || 0, progress);
        return { ...s, history: { ...h, progress: p, ...(p >= 100 && !h.completedAt ? { completedAt: new Date().toISOString() } : {}) } };
      });
    }
  }
}

// ─── Contacts ─────────────────────────────────────────────────────────────────────────────────────────

/** smb_app_state_sync: the app's contacts join Contacts (a contact removed in the app is kept here). */
async function syncContacts(channel, value) {
  for (const item of value.state_sync || []) {
    if (item.type !== 'contact' || !item.contact) continue;
    const phone = digits(item.contact.phone_number);
    if (!phone || item.action === 'remove') continue;
    const name = String(item.contact.full_name || item.contact.first_name || '').trim() || phone;
    const existing = await prisma.contact.findFirst({ where: { tenantId: channel.tenantId, phone } });
    if (!existing) {
      await prisma.contact.create({ data: { tenantId: channel.tenantId, phone, name, metadata: { source: 'WHATSAPP_BUSINESS_APP' } } });
    } else if (!existing.name || existing.name === phone) {
      await prisma.contact.update({ where: { id: existing.id }, data: { name } });
    }
    // Conversations created before the contact arrived carry the bare number as their name
    await ChatThread.updateMany({ tenantId: channel.tenantId, channelId: channel.id, contactPhone: phone, contactName: phone }, { $set: { contactName: name } });
  }
}

/** Queue job for one Coexistence webhook change of a known channel. */
async function processEvent(channelId, { field, value }) {
  const channel = await prisma.whatsAppChannel.findUnique({ where: { id: channelId } });
  if (!channel || !value) return;
  if (field === 'smb_message_echoes') return recordEchoes(channel, value);
  if (field === 'history') return importHistory(channel, value);
  if (field === 'smb_app_state_sync') return syncContacts(channel, value);
}

// ─── Connection state (account_update) ────────────────────────────────────────────────────────────────

/** false only when Meta says our token can no longer reach the number (not on a network error). */
async function canReadNumber(channel) {
  if (!channel.metaPhoneNumberId || !channel.metaAccessToken) return false;
  try {
    await axios.get(`${COEX_GRAPH}/${channel.metaPhoneNumberId}`, { ...authOf(channel.metaAccessToken), params: { fields: 'id' } });
    return true;
  } catch (e) {
    if (!e.response) return true;
    const { code, subcode } = metaErrorInfo(e);
    return !([10, 190, 200].includes(Number(code)) || (Number(code) === 100 && Number(subcode) === 33));
  }
}

/**
 * account_update for a WhatsApp account we hold numbers in (no phone number in the payload):
 *   PARTNER_REMOVED            → the number(s) we lost access to are switched off
 *   ACCOUNT_OFFBOARDED         → the app number left Cloud API for now (phone changed / re-registered)
 *   ACCOUNT_RECONNECTED / PARTNER_ADDED → working again
 */
async function processAccountUpdate({ wabaId, value }) {
  const event = value?.event;
  if (!wabaId || !event) return;
  const channels = await prisma.whatsAppChannel.findMany({ where: { metaWabaId: String(wabaId), providerType: 'META_CLOUD' } });
  if (!channels.length) return;
  const now = new Date().toISOString();

  if (event === 'PARTNER_REMOVED') {
    const info = value.disconnection_info || null; // only for numbers used on both the app and Cloud API
    for (const ch of channels) {
      const lost = (info && ch.isCoexistence) || !(await canReadNumber(ch));
      if (!lost) {
        logger.info(`[Coexistence] PARTNER_REMOVED for WABA ${wabaId}, but channel ${ch.id} still works — kept`);
        continue;
      }
      await prisma.whatsAppChannel.update({ where: { id: ch.id }, data: { status: 'DISCONNECTED' } });
      if (ch.isCoexistence) {
        await updateCoexSync(ch.id, (s) => ({ ...s, state: 'DISCONNECTED', stateReason: info?.reason || 'PARTNER_REMOVED', stateAt: now }));
      }
      logger.warn(`[Coexistence] Channel ${ch.id} disconnected by Meta (${info?.reason || 'PARTNER_REMOVED'}, by ${info?.initiated_by || 'unknown'})`);
    }
    return;
  }

  const states = { ACCOUNT_OFFBOARDED: 'OFFBOARDED', ACCOUNT_RECONNECTED: 'ACTIVE', PARTNER_ADDED: 'ACTIVE' };
  if (!states[event]) return;
  for (const ch of channels.filter(c => c.isCoexistence)) {
    await updateCoexSync(ch.id, (s) => ({ ...s, state: states[event], stateReason: event, stateAt: now }));
    logger.info(`[Coexistence] Channel ${ch.id}: ${event}`);
  }
}

// ─── "Check connection" ───────────────────────────────────────────────────────────────────────────────

/** What the Meta connection page shows for a Coexistence number. */
async function coexHealth(channel) {
  const sync = parseJson(channel.coexSync);
  const startedAt = channel.coexOnboardedAt ? new Date(channel.coexOnboardedAt) : null;
  const windowEndsAt = startedAt ? new Date(startedAt.getTime() + SYNC_WINDOW_MS) : null;
  const windowOpen = !!windowEndsAt && Date.now() < windowEndsAt.getTime();
  const wantsHistory = channel.coexHistoryMonths !== 0;
  const missing = !sync.contacts?.requestId || (wantsHistory && !sync.history?.requestId);

  const out = {
    state: sync.state || 'ACTIVE',
    stateReason: sync.stateReason || null,
    historyMonths: channel.coexHistoryMonths ?? DEFAULT_HISTORY_MONTHS,
    onboardedAt: startedAt,
    windowEndsAt,
    contacts: sync.contacts || {},
    history: sync.history || {},
    canRetrySync: windowOpen && missing,
    onBizApp: null,
    platformType: null
  };

  try {
    const r = await axios.get(`${COEX_GRAPH}/${channel.metaPhoneNumberId}`, { ...authOf(channel.metaAccessToken), params: { fields: 'is_on_biz_app,platform_type' } });
    out.onBizApp = r.data?.is_on_biz_app ?? null;
    out.platformType = r.data?.platform_type || null;
  } catch (e) {
    out.statusError = metaErrorText(e);
  }

  try {
    const threadIds = await ChatThread.find({ tenantId: channel.tenantId, channelId: channel.id }).distinct('_id');
    out.importedMessages = threadIds.length ? await ChatMessage.countDocuments({ threadId: { $in: threadIds }, source: 'HISTORY' }) : 0;
  } catch { out.importedMessages = null; }

  return out;
}

module.exports = {
  COEX_EVENT,
  COEX_FIELDS: ['smb_message_echoes', 'history', 'smb_app_state_sync'],
  HISTORY_MONTH_CHOICES,
  normalizeHistoryMonths,
  findAppNumber,
  initialCoexSync,
  requestSync,
  scheduleSyncRetry,
  runSyncJob,
  processEvent,
  processAccountUpdate,
  coexHealth,
  // exported for tests
  describeMessage,
  historyCutoff
};
