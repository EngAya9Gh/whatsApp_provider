// Campaign messages in Live Chat: a campaign does not open conversations, but when a customer replies,
// the campaign messages they got recently join their conversation at the time they were sent, before the
// reply, once. Tapping a template's quick-reply button shows its text. Databases and Meta are test doubles.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

const DAY = 24 * 60 * 60 * 1000;
const ago = (ms) => new Date(Date.now() - ms);
let deliveries = [];
let messages = [];
const events = [];
const thread = {
  _id: { toString: () => 'th1' }, tenantId: 'T', channelId: 'ch', contactPhone: '966500000001', crmSyncedAt: new Date(),
  toObject() { return { _id: 'th1', contactPhone: this.contactPhone }; }
};

const chain = (rows) => ({ sort() { return this; }, limit(n) { rows = rows.slice(0, n); return this; }, select() { return this; }, lean: async () => rows });
inject(fromRoot('src/models/mongo/CampaignDelivery'), {
  find: (q) => chain(deliveries
    .filter(d => d.tenantId === q.tenantId && d.channelId === q.channelId && d.phone === q.phone && d.inChatAt === null && d.createdAt >= q.createdAt.$gte)
    .sort((a, b) => b.createdAt - a.createdAt)),
  updateMany: async ({ _id }, { $set }) => { deliveries.filter(d => _id.$in.includes(d._id)).forEach(d => Object.assign(d, $set)); }
});
const asDoc = (data) => ({ ...data, toObject: () => ({ ...data, _id: `m${messages.length}` }) });
inject(fromRoot('src/models/mongo/ChatMessage'), {
  exists: async () => false,
  findOne: async () => null,
  find: (q) => chain(messages.filter(m => q.metaMessageId.$in.includes(m.metaMessageId))),
  insertMany: async (docs) => { messages.push(...docs); events.push(...docs.map(d => `campaign:${d.metaMessageId}`)); return docs.map(asDoc); },
  create: async (data) => { messages.push(data); events.push(`inbound:${data.content}`); return asDoc(data); }
});
inject(fromRoot('src/models/mongo/ChatThread'), { findOne: async () => thread, findOneAndUpdate: async () => thread });
inject('@prisma/client', { PrismaClient: class { constructor() { this.whatsAppChannel = { findUnique: async () => ({ id: 'ch' }) }; } } });
inject(fromRoot('src/modules/chat/chat.stage.service'), { applyEntryStage: async (tenantId, t) => t });
inject(fromRoot('src/modules/tickets/tickets.service'), { getRecentClosedUnratedTicket: async () => null, autoCreateTicketIfNeeded: async () => null });
inject(fromRoot('src/modules/flows/flow.engine'), { wouldHandle: async () => false, handleInbound: async () => false });
inject(fromRoot('src/modules/workforce/hours.service'), { sendAwayMessageIfClosed: async () => {} });
inject(fromRoot('src/modules/webhook/webhook.service'), { syncCrmContact: async () => null });
inject(fromRoot('src/services/socket.service'), { emitToTenant() {} });
inject(fromRoot('src/utils/keyLock'), { withLock: async (key, fn) => fn() });

const chatService = require(fromRoot('src/modules/chat/chat.service'));
const { templatePreview } = require(fromRoot('src/modules/campaign/campaign.preview'));

const delivery = (wamid, sentAgo, extra = {}) => ({
  _id: wamid, wamid, tenantId: 'T', channelId: 'ch', phone: '966500000001', campaignId: 'c1', status: 'read',
  preview: `عرض ${wamid}`, campaignName: 'عروض الصيف', inChatAt: null, createdAt: ago(sentAgo), ...extra
});
const tap = (text, id = 'wamid.in1') => ({ id, type: 'button', button: { text, payload: text } });

beforeEach(() => {
  messages = [];
  events.length = 0;
  deliveries = [
    delivery('w.old', 40 * DAY), // too old to bring back
    delivery('w.1', 3 * DAY, { status: 'delivered' }),
    delivery('w.2', 2 * DAY),
    delivery('w.other', 1 * DAY, { phone: '966511111111' }), // someone else
    delivery('w.shown', 1 * DAY, { inChatAt: ago(DAY) }) // already in the conversation
  ];
});

test('a reply brings the campaign messages into the conversation, before the reply', async () => {
  await chatService.handleIncomingMessage('T', 'ch', '966500000001', 'Sara', tap('مهتم'));
  assert.deepStrictEqual(events, ['campaign:w.1', 'campaign:w.2', 'inbound:مهتم'], 'oldest first, then the reply');

  const [first, second, reply] = messages;
  assert.strictEqual(first.direction, 'OUTBOUND');
  assert.strictEqual(first.source, 'CAMPAIGN');
  assert.strictEqual(first.campaignName, 'عروض الصيف');
  assert.strictEqual(first.content, 'عرض w.1');
  assert.strictEqual(first.isAutomated, true, 'not counted as a person\'s reply');
  assert.strictEqual(first.status, 'DELIVERED');
  assert.strictEqual(second.status, 'READ');
  assert.strictEqual(+first.createdAt, +deliveries[1].createdAt, 'shown at the time it was sent');

  assert.strictEqual(reply.type, 'INTERACTIVE', 'a template button tap');
  assert.strictEqual(reply.content, 'مهتم');
  assert.ok(deliveries[1].inChatAt && deliveries[2].inChatAt);
  assert.strictEqual(deliveries[0].inChatAt, null);
  assert.strictEqual(deliveries[3].inChatAt, null);
});

test('the next reply does not add them again', async () => {
  await chatService.handleIncomingMessage('T', 'ch', '966500000001', 'Sara', tap('مهتم', 'wamid.in1'));
  await chatService.handleIncomingMessage('T', 'ch', '966500000001', 'Sara', { id: 'wamid.in2', type: 'text', text: { body: 'كم السعر؟' } });
  assert.deepStrictEqual(events, ['campaign:w.1', 'campaign:w.2', 'inbound:مهتم', 'inbound:كم السعر؟']);
});

test('a campaign message already in the conversation is not doubled', async () => {
  messages.push({ metaMessageId: 'w.2', content: 'already here' });
  await chatService.attachCampaignMessages('T', 'ch', thread);
  assert.deepStrictEqual(events, ['campaign:w.1']);
  assert.ok(deliveries[2].inChatAt, 'still marked as shown');
});

test('the template text as the customer got it', () => {
  const components = [
    { type: 'HEADER', format: 'TEXT', text: 'أهلاً {{1}}' },
    { type: 'BODY', text: 'خصم {{2}} على كل الطلبات حتى {{3}}' },
    { type: 'FOOTER', text: 'للإلغاء أرسل توقف' },
    { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'مهتم' }, { type: 'URL', text: 'تسوق الآن', url: 'https://x.co' }] }
  ];
  assert.strictEqual(templatePreview(components, ['سارة', '20%']),
    'أهلاً سارة\nخصم 20% على كل الطلبات حتى {{3}}\nللإلغاء أرسل توقف\n• مهتم\n• تسوق الآن');
  assert.strictEqual(templatePreview([{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'جديدنا' }]), '🖼️ [صورة]\nجديدنا');
  assert.strictEqual(templatePreview(undefined, ['x']), '', 'unknown template');
});
