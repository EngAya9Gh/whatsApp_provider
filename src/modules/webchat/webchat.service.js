// Website chat widget: a WEBCHAT channel per widget. Visitors chat from the tenant's website; their
// conversation is an ordinary Live Chat conversation (address `web:<visitor id>`) with tickets, teams,
// hours, flows and the AI agent. The widget reads the conversation through the public API (polling).
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ChatThread = require('../../models/mongo/ChatThread');
const ChatMessage = require('../../models/mongo/ChatMessage');
const socketService = require('../../services/socket.service');
const logger = require('../../utils/logger');
const { DEFAULTS, normalizeSettings, originAllowed, normalizePhone, hostOf } = require('./webchat.settings');

const PROVIDER = 'WEBCHAT';
const MAX_TEXT = 2000;
const CONFIG_CACHE_MS = 30 * 1000;
const WIDGET_FIELDS = { id: true, tenantId: true, providerType: true, name: true, status: true, settings: true, createdAt: true, paidUntil: true, billingState: true };
const channelBilling = require('../channels/channel.billing');

const httpError = (status, message, code) => Object.assign(new Error(message), { status, code });
const addressOf = (visitorId) => `web:${visitorId}`;
/** Short code the visitor quotes on WhatsApp, so the team can match both conversations */
const refOf = (visitorId) => `W-${String(visitorId).slice(0, 6).toUpperCase()}`;
const secret = () => process.env.JWT_SECRET || 'webchat';
const sign = (channelId, visitorId) => crypto.createHmac('sha256', secret()).update(`webchat:${channelId}:${visitorId}`).digest('base64url');

/** Our own dashboard may always show the widget (preview page), whatever the allowed websites are */
const ownHosts = () => [process.env.APP_URL, process.env.FRONTEND_URL].map(hostOf).filter(Boolean);

/** price: monthly fee from the wallet (null = free); state: ACTIVE | UNPAID (stopped) | null */
const widgetView = (channel, price = null) => ({
  id: channel.id,
  name: channel.name || '',
  createdAt: channel.createdAt,
  settings: normalizeSettings({}, channel.settings || {}).settings,
  billing: { price, paidUntil: price ? channel.paidUntil || null : null, state: price ? channel.billingState || null : null }
});

class WebchatService {
  constructor() {
    this.cache = new Map(); // channelId → { channel, until }
  }

  // ─── Dashboard ──────────────────────────────────────────────────────

  async listWidgets(tenantId) {
    const channels = await prisma.whatsAppChannel.findMany({
      where: { tenantId, providerType: PROVIDER },
      select: WIDGET_FIELDS,
      orderBy: { createdAt: 'asc' }
    });
    const price = await channelBilling.priceNow(PROVIDER);
    return channels.map(c => widgetView(c, price));
  }

  async createWidget(tenantId, { name, settings } = {}) {
    const checked = normalizeSettings(settings || {});
    if (checked.errors.length) throw httpError(400, checked.errors.join(' · '));
    const channel = await prisma.whatsAppChannel.create({
      data: {
        tenantId,
        providerType: PROVIDER,
        name: String(name || checked.settings.title).trim().slice(0, 80),
        status: 'CONNECTED',
        settings: checked.settings
      },
      select: WIDGET_FIELDS
    });
    // A paid widget starts with its first month, from the wallet
    const billing = await channelBilling.chargeChannel(channel);
    if (billing.insufficient) {
      await prisma.whatsAppChannel.delete({ where: { id: channel.id } }).catch(() => {});
      throw httpError(402, `The website widget costs ${billing.price} per month from your wallet, and the balance does not cover it. Top up the wallet first.`, 'INSUFFICIENT_BALANCE');
    }
    return widgetView({ ...channel, paidUntil: billing.paidUntil, billingState: billing.state }, billing.price);
  }

  /** Pays the next month now (a widget stopped for the balance starts again at once) */
  async renewWidget(tenantId, id) {
    const channel = await prisma.whatsAppChannel.findFirst({ where: { id, tenantId, providerType: PROVIDER }, select: WIDGET_FIELDS });
    if (!channel) throw httpError(404, 'Widget not found');
    if (channel.billingState !== 'UNPAID') return widgetView(channel, await channelBilling.priceNow(PROVIDER));
    const billing = await channelBilling.chargeChannel(channel);
    if (billing.insufficient) throw httpError(402, 'The wallet balance does not cover this month yet. Top up the wallet first.', 'INSUFFICIENT_BALANCE');
    this.cache.delete(id);
    return widgetView({ ...channel, paidUntil: billing.paidUntil, billingState: billing.state }, billing.price);
  }

  async updateWidget(tenantId, id, { name, settings } = {}) {
    const channel = await prisma.whatsAppChannel.findFirst({ where: { id, tenantId, providerType: PROVIDER }, select: WIDGET_FIELDS });
    if (!channel) throw httpError(404, 'Widget not found');
    const checked = normalizeSettings(settings || {}, channel.settings || {});
    if (checked.errors.length) throw httpError(400, checked.errors.join(' · '));
    const updated = await prisma.whatsAppChannel.update({
      where: { id },
      data: {
        settings: checked.settings,
        ...(name !== undefined && String(name).trim() && { name: String(name).trim().slice(0, 80) })
      },
      select: WIDGET_FIELDS
    });
    this.cache.delete(id);
    return widgetView(updated, await channelBilling.priceNow(PROVIDER));
  }

  /** Only a widget without tickets can be deleted (the reports keep them); otherwise switch it off */
  async deleteWidget(tenantId, id) {
    const channel = await prisma.whatsAppChannel.findFirst({ where: { id, tenantId, providerType: PROVIDER }, select: { id: true } });
    if (!channel) throw httpError(404, 'Widget not found');
    const tickets = await prisma.ticket.count({ where: { channelId: id } });
    if (tickets > 0) throw httpError(409, 'This widget has tickets in the reports. Switch it off instead of deleting it.', 'HAS_TICKETS');
    await prisma.whatsAppChannel.delete({ where: { id } });
    this.cache.delete(id);
    return { deleted: true };
  }

  // ─── Public widget API ──────────────────────────────────────────────

  /** The widget's channel, cached briefly: the widget asks every few seconds */
  async _channel(channelId) {
    const hit = this.cache.get(channelId);
    if (hit && hit.until > Date.now()) return hit.channel;
    const channel = /^[0-9a-f-]{36}$/i.test(String(channelId))
      ? await prisma.whatsAppChannel.findFirst({
        where: { id: channelId, providerType: PROVIDER },
        select: { id: true, tenantId: true, name: true, settings: true, billingState: true }
      })
      : null;
    if (channel) channel.settings = normalizeSettings({}, channel.settings || {}).settings;
    if (this.cache.size > 2000) this.cache.clear();
    this.cache.set(channelId, { channel, until: Date.now() + CONFIG_CACHE_MS });
    return channel;
  }

  /** The channel, if this page may use it */
  async _usable(channelId, origin) {
    const channel = await this._channel(channelId);
    // Switched off, or stopped because the wallet did not cover its monthly fee
    if (!channel || !channel.settings.enabled || channelBilling.isStopped(channel)) throw httpError(404, 'This chat is not available');
    if (!originAllowed(channel.settings, origin, ownHosts())) throw httpError(403, 'This chat is not enabled on this website');
    return channel;
  }

  verifyVisitor(channelId, visitorId, token) {
    if (!/^[0-9a-f]{24}$/.test(String(visitorId || '')) || typeof token !== 'string') return false;
    const expected = Buffer.from(sign(channelId, visitorId));
    const given = Buffer.from(token);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
  }

  async publicConfig(channelId, origin) {
    const channel = await this._usable(channelId, origin);
    const s = channel.settings;
    let online = true;
    try {
      online = await require('../workforce/hours.service').isChannelOpen(channel.tenantId, channel.id);
    } catch (e) { /* show as open */ }
    return {
      id: channel.id,
      title: s.title,
      welcome: s.welcome,
      color: s.color,
      position: s.position,
      language: s.language,
      askName: s.askName,
      askPhone: s.askPhone,
      whatsapp: !!s.whatsappNumber,
      online
    };
  }

  /** The visitor's identity: kept when its token is valid, a new one otherwise */
  async startSession(channelId, origin, { visitorId, token } = {}) {
    await this._usable(channelId, origin);
    if (this.verifyVisitor(channelId, visitorId, token)) return { visitorId, token, ref: refOf(visitorId) };
    const fresh = crypto.randomBytes(12).toString('hex');
    return { visitorId: fresh, token: sign(channelId, fresh), ref: refOf(fresh) };
  }

  async _visitorThread(channel, visitorId) {
    return ChatThread.findOne({ tenantId: channel.tenantId, channelId: channel.id, contactPhone: addressOf(visitorId) });
  }

  /**
   * Messages the visitor may see (never the team's notes), oldest first. `after` (ISO time) returns only
   * newer ones; `seen` marks the team's replies as read.
   */
  async visitorMessages(channelId, origin, { visitorId, token }, { after, seen } = {}) {
    if (!this.verifyVisitor(channelId, visitorId, token)) throw httpError(401, 'Unknown visitor');
    const channel = await this._usable(channelId, origin);
    const thread = await this._visitorThread(channel, visitorId);
    if (!thread) return { messages: [] };

    const query = { threadId: thread._id, isInternal: { $ne: true }, type: { $ne: 'INTERNAL_NOTE' } };
    const since = after ? new Date(after) : null;
    if (since && !Number.isNaN(since.getTime())) query.createdAt = { $gte: since };
    const rows = await ChatMessage.find(query).sort({ createdAt: -1 }).limit(100).lean();

    if (seen) {
      await ChatMessage.updateMany(
        { threadId: thread._id, direction: 'OUTBOUND', status: { $in: ['SENT', 'DELIVERED'] }, isInternal: { $ne: true } },
        { $set: { status: 'READ' } }
      ).catch(() => {});
    }
    return { messages: rows.reverse().map(toVisitor) };
  }

  /** A visitor's message → Live Chat (the same path as a WhatsApp message) */
  async visitorSend(channelId, origin, { visitorId, token }, body = {}) {
    if (!this.verifyVisitor(channelId, visitorId, token)) throw httpError(401, 'Unknown visitor');
    const channel = await this._usable(channelId, origin);
    const s = channel.settings;

    const text = String(body.text || '').trim();
    if (!text) throw httpError(400, 'Write a message');
    if (text.length > MAX_TEXT) throw httpError(400, `The message must be at most ${MAX_TEXT} characters`);

    const name = String(body.name || '').trim().slice(0, 80) || null;
    const phone = body.phone ? normalizePhone(body.phone) : null;
    if (body.phone && !phone) throw httpError(400, 'Write the phone number with the country code', 'BAD_PHONE');
    const thread = await this._visitorThread(channel, visitorId);
    if (!thread && s.askPhone === 'REQUIRED' && !phone) throw httpError(400, 'Write your phone number', 'PHONE_REQUIRED');

    const email = String(body.email || '').trim().slice(0, 120);
    const info = {
      phone,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
      pageUrl: String(body.pageUrl || '').slice(0, 500) || null,
      pageTitle: String(body.pageTitle || '').slice(0, 200) || null,
      ref: refOf(visitorId)
    };
    const interactiveId = typeof body.interactiveId === 'string' ? body.interactiveId.slice(0, 200) : null;

    const chatService = require('../chat/chat.service');
    const result = await chatService.receiveMessage(channel.tenantId, channel.id, {
      address: addressOf(visitorId),
      name: name || `${s.language === 'en' ? 'Visitor' : 'زائر'} ${refOf(visitorId)}`,
      // A number typed on a website is not verified: it is shown to the team, not used as the identity
      phone: null,
      info
    }, {
      id: `webin.${crypto.randomBytes(8).toString('hex')}`,
      type: interactiveId ? 'INTERACTIVE' : 'TEXT',
      content: text,
      interactiveId
    });
    return { sent: true, duplicate: !!result?.duplicate };
  }

  /** "Continue on WhatsApp": the wa.me link with the visitor's code */
  async whatsappLink(channelId, origin, { visitorId, token }) {
    if (!this.verifyVisitor(channelId, visitorId, token)) throw httpError(401, 'Unknown visitor');
    const channel = await this._usable(channelId, origin);
    const s = channel.settings;
    if (!s.whatsappNumber) throw httpError(404, 'No WhatsApp number for this chat');
    const text = s.language === 'en'
      ? `Hello, I am continuing my chat from the website (code ${refOf(visitorId)})`
      : `مرحباً، أكمل محادثتي من الموقع (رمز ${refOf(visitorId)})`;
    return { url: `https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent(text)}` };
  }

  /**
   * A WhatsApp message quoting a website code (W-XXXXXX): both conversations get a team note pointing to
   * the other, and the website conversation keeps the customer's (now verified) WhatsApp number.
   */
  async linkFromWhatsApp(tenantId, text, { threadId, phone }) {
    const match = String(text || '').match(/\bW-([0-9A-F]{6})\b/i);
    if (!match) return null;
    const code = match[1].toLowerCase();
    const webThread = await ChatThread.findOne({ tenantId, contactPhone: { $regex: `^web:${code}` } }).sort({ lastMessageAt: -1 });
    if (!webThread || webThread.contactInfo?.whatsappThreadId === String(threadId)) return null;

    await ChatThread.updateOne({ _id: webThread._id }, { $set: { 'contactInfo.phone': phone, 'contactInfo.whatsappThreadId': String(threadId) } });
    const ref = `W-${match[1].toUpperCase()}`;
    await note(tenantId, webThread._id, `📱 تابع العميل المحادثة على واتساب من الرقم +${phone}`);
    await note(tenantId, threadId, `🌐 هذا العميل جاء من محادثة الموقع (${ref}) باسم «${webThread.contactName || ref}»`);
    return String(webThread._id);
  }
}

/** One message as the widget shows it */
function toVisitor(m) {
  return {
    id: String(m._id),
    from: m.direction === 'INBOUND' ? 'visitor' : (m.isAutomated ? 'bot' : 'agent'),
    text: m.interactive?.body ?? m.content ?? '',
    options: m.direction === 'OUTBOUND' && Array.isArray(m.interactive?.options) ? m.interactive.options : undefined,
    link: m.direction === 'OUTBOUND' && m.interactive?.link ? m.interactive.link : undefined,
    at: m.createdAt
  };
}

async function note(tenantId, threadId, content) {
  try {
    const message = await ChatMessage.create({
      threadId, direction: 'OUTBOUND', type: 'INTERNAL_NOTE', content, status: 'READ', isInternal: true, isAutomated: true
    });
    const data = message.toObject();
    data.id = data._id.toString();
    socketService.emitToTenant(tenantId, 'new_chat_message', data);
  } catch (e) {
    logger.warn(`[Webchat] Could not add a team note: ${e.message}`);
  }
}

module.exports = new WebchatService();
module.exports.DEFAULTS = DEFAULTS;
module.exports.refOf = refOf;
module.exports.toVisitor = toVisitor;
