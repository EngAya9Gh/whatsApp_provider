// Live Chat on more than WhatsApp: a website-widget conversation goes through the same path as a WhatsApp
// one (thread, ticket, flow), but nothing is sent to Meta, it uses no WhatsApp message quota, its visitor
// is not treated as a verified phone (no CRM, no saved-contact lookup), and WhatsApp-only tools refuse it.
// Databases, Meta and billing are test doubles.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

const calls = { meta: [], billing: [], crm: [], contacts: 0 };
let threads = [];
let messages = [];
const CHANNELS = {
  web: { id: 'web', tenantId: 'T', providerType: 'WEBCHAT' },
  wa: { id: 'wa', tenantId: 'T', providerType: 'META_CLOUD' }
};

const asDoc = (data) => ({ ...data, toObject: () => ({ ...data }) });
const chain = (rows) => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => rows });
inject(fromRoot('src/models/mongo/ChatThread'), {
  findOne: async (q) => threads.find(t => (q._id ? t._id.toString() === String(q._id) : t.channelId === q.channelId && t.contactPhone === q.contactPhone)) || null,
  create: async (data) => { const t = asDoc({ ...data, _id: { toString: () => `th${threads.length + 1}` } }); threads.push(t); return t; },
  findOneAndUpdate: async (q) => threads.find(t => t._id === q._id),
  updateOne: async () => {}
});
inject(fromRoot('src/models/mongo/ChatMessage'), {
  exists: async () => false,
  findOne: async () => null,
  find: () => chain([]),
  create: async (data) => { messages.push(data); return asDoc({ ...data, _id: `m${messages.length}` }); }
});
inject(fromRoot('src/models/mongo/CampaignDelivery'), { find: () => chain([]), updateMany: async () => {} });
inject('@prisma/client', {
  PrismaClient: class {
    constructor() {
      this.whatsAppChannel = { findUnique: async ({ where }) => CHANNELS[where.id] || null };
      this.contact = { findFirst: async () => { calls.contacts++; return null; } };
    }
  }
});
const metaCall = (name) => async (...args) => { calls.meta.push(name); return { messages: [{ id: `wamid.${name}` }] }; };
inject(fromRoot('src/modules/meta/meta.service'), {
  sendText: metaCall('text'), sendMedia: metaCall('media'), sendButtons: metaCall('buttons'),
  sendList: metaCall('list'), sendLinkButton: metaCall('link'), sendTemplate: metaCall('template')
});
inject(fromRoot('src/modules/billing/billing.service'), {
  checkLimit: async () => { calls.billing.push('check'); return true; },
  incrementUsage: async () => { calls.billing.push('use'); }
});
inject(fromRoot('src/modules/webhook/webhook.service'), { syncCrmContact: async (tenantId, phone) => { calls.crm.push(phone); return null; } });
inject(fromRoot('src/modules/tickets/tickets.service'), {
  getActiveTicket: async () => null, autoCreateTicketIfNeeded: async () => ({ id: 'tk1' }), getRecentClosedUnratedTicket: async () => null
});
inject(fromRoot('src/modules/chat/chat.stage.service'), { applyEntryStage: async (tenantId, t) => t });
inject(fromRoot('src/modules/flows/flow.engine'), { wouldHandle: async () => false, handleInbound: async () => false });
inject(fromRoot('src/modules/workforce/hours.service'), { sendAwayMessageIfClosed: async () => {} });
inject(fromRoot('src/services/socket.service'), { emitToTenant() {} });
inject(fromRoot('src/utils/keyLock'), { withLock: async (key, fn) => fn() });

const chatService = require(fromRoot('src/modules/chat/chat.service'));
const kinds = require(fromRoot('src/modules/channels/channel.kinds'));

beforeEach(() => {
  threads = [];
  messages = [];
  calls.meta = []; calls.billing = []; calls.crm = []; calls.contacts = 0;
});

const visitor = { address: 'web:0123456789abcdef01234567', name: 'سارة', phone: null, info: { phone: '966500000001', pageUrl: 'https://shop.com/p/1', ref: 'W-012345' } };

test('what each channel can do', () => {
  assert.deepStrictEqual(kinds.LIVE_CHAT_PROVIDERS.sort(), ['META_CLOUD', 'WEBCHAT']);
  assert.strictEqual(kinds.capabilitiesOf(CHANNELS.web).templates, false);
  assert.strictEqual(kinds.capabilitiesOf(CHANNELS.wa).templates, true);
  assert.strictEqual(kinds.capabilitiesOf({}).providerType, 'META_CLOUD', 'old conversations are WhatsApp');
  assert.strictEqual(kinds.phoneOf({ contactPhone: '966511111111' }, CHANNELS.wa), '966511111111');
  assert.strictEqual(kinds.phoneOf({ contactPhone: visitor.address, contactInfo: { phone: '9665' } }, CHANNELS.web), '9665');
  assert.strictEqual(kinds.phoneOf({ contactPhone: visitor.address }, CHANNELS.web), null);
});

test('a website visitor\'s message opens a conversation like WhatsApp, without CRM or contact lookups', async () => {
  const result = await chatService.receiveMessage('T', 'web', visitor, { id: 'webin.1', type: 'TEXT', content: 'مرحبا' });
  assert.strictEqual(result.flowHandled, false);
  assert.strictEqual(threads.length, 1);
  assert.strictEqual(threads[0].contactPhone, visitor.address);
  assert.strictEqual(threads[0].contactName, 'سارة');
  assert.deepStrictEqual(threads[0].contactInfo, visitor.info);
  assert.strictEqual(messages[0].direction, 'INBOUND');
  assert.strictEqual(messages[0].ticketId, 'tk1', 'tickets work the same');
  assert.deepStrictEqual(calls.crm, [], 'a typed number is not verified: no CRM sync');
  assert.strictEqual(calls.contacts, 0);
});

test('a WhatsApp message still syncs the CRM by phone', async () => {
  await chatService.handleIncomingMessage('T', 'wa', '966522222222', 'Ali', { id: 'wamid.in1', type: 'text', text: { body: 'hi' } });
  assert.deepStrictEqual(calls.crm, ['966522222222']);
  assert.strictEqual(calls.contacts, 1);
});

test('replying to a visitor sends nothing to Meta and uses no message quota', async () => {
  await chatService.receiveMessage('T', 'web', visitor, { id: 'webin.1', type: 'TEXT', content: 'مرحبا' });
  const threadId = threads[0]._id.toString();
  await chatService.sendMessage('T', threadId, { content: 'أهلاً سارة', type: 'text', senderId: 'A1' });
  await chatService.sendInteractiveMessage('T', threadId, { body: 'اختر', options: [{ id: 'F:a:1', title: 'الأسعار' }], source: 'FLOW' });
  await chatService.sendLinkButton('T', threadId, { body: 'المتجر', buttonText: 'افتح', url: 'https://shop.com', source: 'FLOW' });

  assert.deepStrictEqual(calls.meta, []);
  assert.deepStrictEqual(calls.billing, []);
  assert.deepStrictEqual(calls.crm, []);
  const [reply, question, link] = messages.slice(1);
  assert.match(reply.metaMessageId, /^web\./);
  assert.deepStrictEqual(question.interactive, { body: 'اختر', options: [{ id: 'F:a:1', title: 'الأسعار' }] }, 'the widget draws the buttons');
  assert.deepStrictEqual(link.interactive, { body: 'المتجر', link: { text: 'افتح', url: 'https://shop.com' } });
});

test('WhatsApp replies still go to Meta and count', async () => {
  await chatService.handleIncomingMessage('T', 'wa', '966522222222', 'Ali', { id: 'wamid.in1', type: 'text', text: { body: 'hi' } });
  await chatService.sendMessage('T', threads[0]._id.toString(), { content: 'hello', type: 'text', senderId: 'A1' });
  assert.deepStrictEqual(calls.meta, ['text']);
  assert.deepStrictEqual(calls.billing, ['check', 'use']);
});

test('templates are refused outside WhatsApp', async () => {
  await chatService.receiveMessage('T', 'web', visitor, { id: 'webin.1', type: 'TEXT', content: 'مرحبا' });
  await assert.rejects(chatService.sendTemplateMessage('T', threads[0]._id.toString(), { templateName: 'promo', language: 'ar' }), (e) => e.status === 400);
  assert.deepStrictEqual(calls.meta, []);
});
