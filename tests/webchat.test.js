// Website chat widget: its settings and the sites it may run on, the visitor's signed identity, what the
// visitor may see (never the team's notes), how their message reaches Live Chat, "continue on WhatsApp",
// and the WhatsApp message that links both conversations. Databases and Live Chat are test doubles.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

process.env.APP_URL = 'https://provider.wakeel.cc';
const ID = '11111111-2222-3333-4444-555555555555';
let channel;
let threads = [];
let lastQuery = null;
let rows = [];
const notes = [];
const received = [];
const updates = [];

inject('@prisma/client', {
  PrismaClient: class {
    constructor() {
      this.whatsAppChannel = { findFirst: async ({ where }) => (channel && where.id === channel.id ? { ...channel } : null) };
      this.ticket = { count: async () => 0 };
    }
  }
});
const chain = (result) => ({ sort() { return this; }, limit() { return this; }, lean: async () => result() });
inject(fromRoot('src/models/mongo/ChatThread'), {
  findOne: (q) => {
    const find = () => threads.find(t => (q.contactPhone?.$regex ? new RegExp(q.contactPhone.$regex).test(t.contactPhone) : t.contactPhone === q.contactPhone)) || null;
    const p = Promise.resolve().then(find);
    p.sort = () => p;
    return p;
  },
  updateOne: async (q, u) => { updates.push(u); }
});
inject(fromRoot('src/models/mongo/ChatMessage'), {
  find: (q) => { lastQuery = q; return chain(() => rows); },
  updateMany: async () => {},
  create: async (data) => { notes.push(data); return { toObject: () => ({ ...data, _id: 'n' }) }; }
});
inject(fromRoot('src/modules/chat/chat.service'), { receiveMessage: async (...args) => { received.push(args); return { flowHandled: false }; } });
inject(fromRoot('src/modules/workforce/hours.service'), { isChannelOpen: async () => false });
inject(fromRoot('src/services/socket.service'), { emitToTenant() {} });

const webchat = require(fromRoot('src/modules/webchat/webchat.service'));
const { normalizeSettings, originAllowed, normalizePhone } = require(fromRoot('src/modules/webchat/webchat.settings'));

beforeEach(() => {
  channel = { id: ID, tenantId: 'T', name: 'Store', settings: normalizeSettings({ whatsappNumber: '966500000000' }).settings };
  webchat.cache.clear();
  threads = [];
  rows = [];
  notes.length = 0;
  received.length = 0;
  updates.length = 0;
});

test('settings: defaults, checks, and website addresses', () => {
  const { settings, errors } = normalizeSettings({ allowedDomains: 'https://www.MyStore.com/ar, shop.mystore.com', whatsappNumber: '0501234567' });
  assert.deepStrictEqual(errors, []);
  assert.deepStrictEqual(settings.allowedDomains, ['mystore.com', 'shop.mystore.com']);
  assert.strictEqual(settings.whatsappNumber, '966501234567');
  assert.strictEqual(settings.askPhone, 'OPTIONAL');

  const bad = normalizeSettings({ title: '', color: 'orange', whatsappNumber: '12', allowedDomains: ['not a site'] });
  assert.strictEqual(bad.errors.length, 4);
  assert.strictEqual(normalizePhone('+966 50 000 0001'), '966500000001');
  assert.strictEqual(normalizePhone('123'), null);
});

test('the widget runs only on the listed sites, their subdomains, and our own preview page', () => {
  const s = { allowedDomains: ['mystore.com'] };
  assert.strictEqual(originAllowed(s, 'https://mystore.com'), true);
  assert.strictEqual(originAllowed(s, 'https://ar.mystore.com'), true);
  assert.strictEqual(originAllowed(s, 'https://evil-mystore.com'), false);
  assert.strictEqual(originAllowed(s, undefined), false);
  assert.strictEqual(originAllowed(s, 'https://provider.wakeel.cc', ['provider.wakeel.cc']), true);
  assert.strictEqual(originAllowed({ allowedDomains: [] }, 'https://anything.io'), true);
});

test('a visitor keeps one signed identity; a forged one is replaced', async () => {
  const first = await webchat.startSession(ID, 'https://x.com', {});
  assert.match(first.visitorId, /^[0-9a-f]{24}$/);
  assert.match(first.ref, /^W-[0-9A-F]{6}$/);
  assert.deepStrictEqual(await webchat.startSession(ID, 'https://x.com', first), first);
  const forged = await webchat.startSession(ID, 'https://x.com', { visitorId: first.visitorId, token: 'nope' });
  assert.notStrictEqual(forged.visitorId, first.visitorId);
  assert.strictEqual(webchat.verifyVisitor('other-widget', first.visitorId, first.token), false, 'a token is for one widget');
});

test('public config: off widgets and other websites get nothing', async () => {
  const config = await webchat.publicConfig(ID, 'https://x.com');
  assert.strictEqual(config.online, false);
  assert.strictEqual(config.whatsapp, true);
  assert.strictEqual(config.whatsappNumber, undefined, 'the number itself is not exposed');

  channel.settings = { ...channel.settings, allowedDomains: ['mystore.com'] };
  webchat.cache.clear();
  await assert.rejects(webchat.publicConfig(ID, 'https://x.com'), (e) => e.status === 403);
  channel.settings = { ...channel.settings, enabled: false };
  webchat.cache.clear();
  await assert.rejects(webchat.publicConfig(ID, 'https://mystore.com'), (e) => e.status === 404);
});

test('a visitor message reaches Live Chat with what they told us, not as a verified phone', async () => {
  const me = await webchat.startSession(ID, 'https://x.com', {});
  await webchat.visitorSend(ID, 'https://x.com', me, { text: ' مرحبا ', name: 'سارة', phone: '0500000001', pageUrl: 'https://x.com/p', pageTitle: 'منتج' });
  const [tenantId, channelId, contact, message] = received[0];
  assert.strictEqual(tenantId, 'T');
  assert.strictEqual(channelId, ID);
  assert.strictEqual(contact.address, `web:${me.visitorId}`);
  assert.strictEqual(contact.phone, null);
  assert.strictEqual(contact.info.phone, '966500000001');
  assert.strictEqual(contact.info.ref, me.ref);
  assert.strictEqual(message.content, 'مرحبا');
  assert.strictEqual(message.type, 'TEXT');

  await webchat.visitorSend(ID, 'https://x.com', me, { text: 'الأسعار', interactiveId: 'F:q:1' });
  assert.strictEqual(received[1][3].type, 'INTERACTIVE', 'a tapped button answers the flow');
  assert.match(received[1][2].name, /^زائر W-/, 'no name given: a visitor label');

  await assert.rejects(webchat.visitorSend(ID, 'https://x.com', { ...me, token: 'x' }, { text: 'hi' }), (e) => e.status === 401);
  await assert.rejects(webchat.visitorSend(ID, 'https://x.com', me, { text: '' }), (e) => e.status === 400);
  await assert.rejects(webchat.visitorSend(ID, 'https://x.com', me, { text: 'x'.repeat(2001) }), (e) => e.status === 400);
});

test('a required phone is asked before the first message', async () => {
  channel.settings = { ...channel.settings, askPhone: 'REQUIRED' };
  const me = await webchat.startSession(ID, 'https://x.com', {});
  await assert.rejects(webchat.visitorSend(ID, 'https://x.com', me, { text: 'hi' }), (e) => e.code === 'PHONE_REQUIRED');
  await assert.rejects(webchat.visitorSend(ID, 'https://x.com', me, { text: 'hi', phone: '12' }), (e) => e.code === 'BAD_PHONE');
  await webchat.visitorSend(ID, 'https://x.com', me, { text: 'hi', phone: '+966500000001' });
  assert.strictEqual(received.length, 1);
});

test('the visitor never sees the team\'s notes, and sees the flow\'s buttons', async () => {
  const me = await webchat.startSession(ID, 'https://x.com', {});
  threads = [{ _id: 'th1', contactPhone: `web:${me.visitorId}` }];
  rows = [
    { _id: 'm2', direction: 'OUTBOUND', isAutomated: true, content: 'اختر\n• أ', interactive: { body: 'اختر', options: [{ id: 'F:q:1', title: 'أ' }] }, createdAt: new Date(2) },
    { _id: 'm1', direction: 'INBOUND', content: 'مرحبا', createdAt: new Date(1) }
  ];
  const { messages } = await webchat.visitorMessages(ID, 'https://x.com', me, { after: new Date(0).toISOString() });
  assert.strictEqual(lastQuery.isInternal.$ne, true);
  assert.strictEqual(lastQuery.type.$ne, 'INTERNAL_NOTE');
  assert.deepStrictEqual(messages.map(m => [m.from, m.text]), [['visitor', 'مرحبا'], ['bot', 'اختر']]);
  assert.deepStrictEqual(messages[1].options, [{ id: 'F:q:1', title: 'أ' }]);
});

test('continue on WhatsApp: the link carries the visitor\'s code, and the WhatsApp message links both chats', async () => {
  const me = await webchat.startSession(ID, 'https://x.com', {});
  const { url } = await webchat.whatsappLink(ID, 'https://x.com', me);
  assert.ok(url.startsWith('https://wa.me/966500000000?text='));
  assert.ok(decodeURIComponent(url).includes(me.ref));

  threads = [{ _id: 'web1', contactPhone: `web:${me.visitorId}`, contactName: 'سارة' }];
  const linked = await webchat.linkFromWhatsApp('T', `مرحباً، أكمل محادثتي من الموقع (رمز ${me.ref})`, { threadId: 'wa1', phone: '966500000001' });
  assert.strictEqual(linked, 'web1');
  assert.strictEqual(updates[0].$set['contactInfo.phone'], '966500000001');
  assert.strictEqual(notes.length, 2);
  assert.ok(notes.every(n => n.isInternal), 'team notes only');
  assert.strictEqual(await webchat.linkFromWhatsApp('T', 'no code here', { threadId: 'wa1', phone: '1' }), null);
});
