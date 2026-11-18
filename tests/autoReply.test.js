// Keyword auto-replies on every channel: the rule of the channel wins over the general one, dates and
// campaigns are respected, the website widget gets files as links and Instagram / Messenger as files,
// WhatsApp templates are never sent elsewhere. Prisma and Live Chat are test doubles.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

process.env.APP_URL = 'https://provider.wakeel.cc';
let rules = [];
let lastWhere = null;
inject('@prisma/client', { PrismaClient: class { constructor() { this.autoResponder = { findMany: async ({ where }) => { lastWhere = where; return rules; } }; } } });
const sent = [];
inject(fromRoot('src/modules/chat/chat.service'), { sendMessage: async (tenantId, threadId, payload) => { sent.push(payload); } });
const { pickRule, replyIfMatched } = require(fromRoot('src/modules/chatbot/autoReply'));

const rule = (extra) => ({ id: extra.id, keyword: 'سعر', matchType: 'CONTAINS', channelId: null, campaignId: null, responseType: 'TEXT', message: 'الأسعار هنا', ...extra });
beforeEach(() => { rules = []; sent.length = 0; });

test('which rule answers', () => {
  const general = rule({ id: 'g' });
  const mine = rule({ id: 'c', channelId: 'web1' });
  assert.strictEqual(pickRule([general, mine], 'كم السعر؟').id, 'c', 'the channel\'s own rule first');
  assert.strictEqual(pickRule([rule({ id: 'x', matchType: 'EXACT' })], 'كم السعر؟'), null);
  assert.strictEqual(pickRule([rule({ id: 'old', endDate: new Date(Date.now() - 1000) })], 'السعر'), null, 'expired');
  assert.strictEqual(pickRule([rule({ id: 'camp', campaignId: 'c1' })], 'السعر'), null, 'campaign rules only for that campaign');
  assert.strictEqual(pickRule([rule({ id: 'camp', campaignId: 'c1' })], 'السعر', { campaignId: 'c1' }).id, 'camp');
});

test('the widget gets text, with a file as a link; Instagram gets the file itself', async () => {
  rules = [rule({ id: 'img', responseType: 'IMAGE', mediaUrl: '/uploads/menu.png', message: 'المنيو' })];
  await replyIfMatched('T', { id: 'web1', providerType: 'WEBCHAT' }, 'th1', 'السعر؟');
  assert.deepStrictEqual(sent[0], { content: 'المنيو\nhttps://provider.wakeel.cc/uploads/menu.png', type: 'text', isAutomated: true });

  await replyIfMatched('T', { id: 'ig1', providerType: 'INSTAGRAM' }, 'th2', 'السعر؟');
  assert.deepStrictEqual([sent[1].hasMedia, sent[1].mediaUrl, sent[1].type, sent[1].content], [true, 'https://provider.wakeel.cc/uploads/menu.png', 'image', 'المنيو']);
});

test('the QR bot\'s rules (no channel) stay out of the new channels: only this channel\'s and "all channels" rules', async () => {
  rules = [rule({ id: 'all', allChannels: true })];
  await replyIfMatched('T', { id: 'web1', providerType: 'WEBCHAT' }, 'th1', 'السعر');
  assert.deepStrictEqual(lastWhere.OR, [{ channelId: 'web1' }, { allChannels: true }]);
  assert.strictEqual(lastWhere.campaignId, null);
  assert.strictEqual(sent.length, 1);
});

test('WhatsApp templates and texts without a match send nothing', async () => {
  rules = [rule({ id: 't', responseType: 'META_TEMPLATE', metaTemplateName: 'promo' })];
  assert.strictEqual(await replyIfMatched('T', { id: 'web1', providerType: 'WEBCHAT' }, 'th1', 'السعر'), null);
  rules = [rule({ id: 'g' })];
  assert.strictEqual(await replyIfMatched('T', { id: 'web1', providerType: 'WEBCHAT' }, 'th1', 'مرحبا'), null);
  assert.strictEqual(sent.length, 0);
});
