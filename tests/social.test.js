// Instagram and Messenger: Meta's webhook events become Live Chat messages (with the person's name the first
// time), our replies go out through the Send API (buttons as quick replies), and connecting a page creates
// its channels once per page, never on two accounts. Meta, the databases and Live Chat are test doubles.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

const posts = [];
const gets = [];
inject('axios', {
  post: async (url, body, opts) => { posts.push({ url, body, params: opts?.params }); return { data: { message_id: 'm.out.1', success: true } }; },
  get: async (url, opts) => {
    gets.push({ url, params: opts?.params });
    if (url.endsWith('/oauth/access_token')) return { data: { access_token: opts.params.fb_exchange_token ? 'long-user-token' : 'user-token' } };
    if (url.endsWith('/me/accounts')) {
      return { data: { data: [{ id: 'PAGE1', name: 'Wakeel', access_token: 'page-token', picture: { data: { url: 'p.png' } }, instagram_business_account: { id: 'IG1', username: 'wakeel.cc', profile_picture_url: 'ig.png' } }] } };
    }
    return { data: { first_name: 'Sara', last_name: 'Ali', profile_pic: 'sara.png', name: 'Sara Ali', username: 'sara' } };
  },
  delete: async () => ({ data: {} })
});

let channels = [];
const fakePrisma = {
  whatsAppChannel: {
    findUnique: async ({ where }) => channels.find(c => c.id === where.id) || null,
    findFirst: async ({ where }) => channels.find(c => (!where.providerType || c.providerType === where.providerType) && (!where.externalId || c.externalId === where.externalId)) || null,
    findMany: async ({ where }) => channels.filter(c => (!where.externalId || where.externalId.in.includes(c.externalId)) && (!where.tenantId || c.tenantId === where.tenantId)),
    create: async ({ data }) => { const c = { id: `c${channels.length + 1}`, createdAt: new Date(), paidUntil: null, billingState: null, ...data }; channels.push(c); return c; },
    update: async ({ where, data }) => Object.assign(channels.find(c => c.id === where.id), data),
    delete: async ({ where }) => { channels = channels.filter(c => c.id !== where.id); }
  },
  systemSetting: { findUnique: async () => ({ data: {} }) },
  tenant: { findUnique: async () => ({ deductBalance: true }) }
};
inject('@prisma/client', { PrismaClient: class { constructor() { return fakePrisma; } } });
const received = [];
inject(fromRoot('src/modules/chat/chat.service'), { receiveMessage: async (...args) => { received.push(args); return { flowHandled: false, threadId: 'th1' }; } });
inject(fromRoot('src/modules/chatbot/autoReply'), { replyIfMatched: async () => null });
let knownThread = false;
inject(fromRoot('src/models/mongo/ChatThread'), { exists: async () => knownThread });

const inbound = require(fromRoot('src/modules/social/social.inbound'));
const sender = require(fromRoot('src/modules/social/social.sender'));
const socialService = require(fromRoot('src/modules/social/social.service'));

beforeEach(() => {
  posts.length = 0;
  gets.length = 0;
  received.length = 0;
  channels = [];
  knownThread = false;
});

test('webhook events in the common message shape; our own echoes are skipped', () => {
  assert.deepStrictEqual(inbound.normalizeEvent({ sender: { id: '42' }, message: { mid: 'm1', text: 'السلام عليكم' } }).message,
    { id: 'm1', type: 'TEXT', content: 'السلام عليكم', interactiveId: null, hasMedia: false, mediaUrl: null, mediaMime: null });
  const tap = inbound.normalizeEvent({ sender: { id: '42' }, message: { mid: 'm2', text: 'الأسعار', quick_reply: { payload: 'F:q:1' } } }).message;
  assert.deepStrictEqual([tap.type, tap.interactiveId], ['INTERACTIVE', 'F:q:1']);
  const photo = inbound.normalizeEvent({ sender: { id: '42' }, message: { mid: 'm3', attachments: [{ type: 'image', payload: { url: 'https://cdn/x.jpg' } }] } }).message;
  assert.deepStrictEqual([photo.type, photo.hasMedia, photo.mediaUrl], ['IMAGE', true, 'https://cdn/x.jpg']);
  assert.match(inbound.normalizeEvent({ sender: { id: '42' }, message: { mid: 'm4', text: 'حلو', reply_to: { story: { url: 'https://story' } } } }).message.content, /رد على ستوري/);
  assert.strictEqual(inbound.normalizeEvent({ sender: { id: '42' }, postback: { title: 'ابدأ', payload: 'START' } }).message.interactiveId, 'START');
  assert.strictEqual(inbound.normalizeEvent({ sender: { id: 'PAGE1' }, message: { mid: 'm5', text: 'رد', is_echo: true } }).kind, 'skip');
});

test('an Instagram message reaches Live Chat as "ig:<id>" with the person\'s name the first time', async () => {
  channels = [{ id: 'ig', tenantId: 'T', providerType: 'INSTAGRAM', externalId: 'IG1', metaAccessToken: 'page-token' }];
  await inbound.processEntry('ig', { entry: { id: 'IG1', messaging: [{ sender: { id: '777' }, message: { mid: 'm1', text: 'مرحبا' } }] } });
  const [tenantId, channelId, contact, message] = received[0];
  assert.deepStrictEqual([tenantId, channelId, contact.address, contact.name, contact.phone], ['T', 'ig', 'ig:777', 'Sara Ali', null]);
  assert.deepStrictEqual(contact.info, { username: 'sara', avatarUrl: 'sara.png' });
  assert.strictEqual(message.content, 'مرحبا');
  assert.strictEqual(gets.at(-1).params.fields, 'name,username,profile_pic');

  knownThread = true;
  gets.length = 0;
  await inbound.processEntry('ig', { entry: { id: 'IG1', messaging: [{ sender: { id: '777' }, message: { mid: 'm2', text: 'ثاني' } }] } });
  assert.strictEqual(gets.length, 0, 'the profile is read once');
});

test('replies: text, buttons as quick replies, a Messenger link button, Instagram link as text', async () => {
  const fb = { providerType: 'MESSENGER', metaAccessToken: 'page-token' };
  const ig = { providerType: 'INSTAGRAM', metaAccessToken: 'page-token' };
  const res = await sender.sendText(fb, 'fb:42', 'أهلاً');
  assert.deepStrictEqual(res, { messages: [{ id: 'm.out.1' }] });
  assert.match(posts[0].url, /\/me\/messages$/);
  assert.deepStrictEqual(posts[0].body, { recipient: { id: '42' }, messaging_type: 'RESPONSE', message: { text: 'أهلاً' } });
  assert.strictEqual(posts[0].params.access_token, 'page-token');

  await sender.sendButtons(ig, 'ig:9', 'اختر', [{ id: 'F:q:1', text: 'الأسعار والعروض الخاصة جداً' }]);
  assert.deepStrictEqual(posts[1].body.message.quick_replies, [{ content_type: 'text', title: 'الأسعار والعروض الخ…', payload: 'F:q:1' }]);

  await sender.sendLinkButton(fb, 'fb:42', 'متجرنا', 'افتح', 'https://x.co');
  assert.strictEqual(posts[2].body.message.attachment.payload.template_type, 'button');
  await sender.sendLinkButton(ig, 'ig:9', 'متجرنا', 'افتح', 'https://x.co');
  assert.strictEqual(posts[3].body.message.text, 'متجرنا\n\nافتح: https://x.co');
});

test('connecting a page: its Messenger and Instagram become channels, subscribed once, never on two accounts', async () => {
  const start = await socialService.startConnect('T', 'code-1');
  assert.deepStrictEqual(start.pages.map(p => [p.id, p.messenger, p.instagram.username, p.instagram.state]), [['PAGE1', 'FREE', 'wakeel.cc', 'FREE']]);
  assert.strictEqual(JSON.stringify(start).includes('page-token'), false, 'tokens never reach the browser');

  const done = await socialService.finishConnect('T', { sessionId: start.sessionId, pageId: 'PAGE1', messenger: true, instagram: true });
  assert.deepStrictEqual(done.map(c => [c.kind, c.name, c.externalId]), [['MESSENGER', 'Wakeel', 'PAGE1'], ['INSTAGRAM', '@wakeel.cc', 'IG1']]);
  assert.ok(channels.every(c => c.metaAccessToken === 'page-token' && c.status === 'CONNECTED'));
  assert.ok(posts.some(p => p.url.endsWith('/PAGE1/subscribed_apps') && p.params.subscribed_fields === 'messages,messaging_postbacks'));

  // The same page from another Wakeel account is refused
  const other = await socialService.startConnect('OTHER', 'code-2');
  assert.strictEqual(other.pages[0].messenger, 'ELSEWHERE');
  await assert.rejects(socialService.finishConnect('OTHER', { sessionId: other.sessionId, pageId: 'PAGE1', messenger: true }), (e) => e.status === 409);
  // Someone else's login session cannot be used
  await assert.rejects(socialService.finishConnect('OTHER', { sessionId: start.sessionId, pageId: 'PAGE1', messenger: true }), (e) => e.code === 'SESSION_EXPIRED');
});
