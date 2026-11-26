// TikTok: a business connects its account on TikTok's page and comes back with a code that becomes the
// channel's tokens (renewed before they expire); signed webhook messages reach Live Chat on "tt:<conversation>";
// our replies go to the conversation, buttons as TikTok's Q&A card (or a numbered list). TikTok, the
// databases and Live Chat are test doubles.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { inject, fromRoot } = require('./helpers/env');

process.env.TIKTOK_APP_ID = 'TTAPP';
process.env.TIKTOK_APP_SECRET = 'tt-secret';
process.env.TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize?client_key=TTAPP&scope=user.info.basic,message.list.send&response_type=code&redirect_uri=https%3A%2F%2Fprovider.wakeel.cc%2Fconnect-social';
process.env.APP_URL = 'https://provider.wakeel.cc';

const posts = [];
let refreshCalls = 0;
inject('axios', {
  post: async (url, body, opts) => {
    posts.push({ url, body, headers: opts?.headers });
    if (url.endsWith('/tt_user/oauth2/token/')) {
      if (body.auth_code === 'bad') return { data: { code: 40001, message: 'auth_code is invalid' } };
      return { data: { code: 0, data: { access_token: 'acc-1', refresh_token: 'ref-1', open_id: 'BIZ1', expires_in: 86400, refresh_token_expires_in: 31536000, scope: 'message.list.send' } } };
    }
    if (url.endsWith('/tt_user/oauth2/refresh_token/')) {
      refreshCalls++;
      return { data: { code: 0, data: { access_token: 'acc-2', refresh_token: 'ref-2', open_id: 'BIZ1', expires_in: 86400 } } };
    }
    if (url.endsWith('/business/webhook/update/')) return { data: { code: 0, data: { event_type: 'DIRECT_MESSAGE' } } };
    if (url.endsWith('/business/message/send/')) return { data: { code: 0, data: { message: { message_id: `msg${posts.length}` } } } };
    return { data: { code: 0, data: {} } };
  },
  get: async (url) => {
    if (url.endsWith('/business/get/')) return { data: { code: 0, data: { username: 'wakeel.cc', display_name: 'Wakeel', profile_image: 'tt.png' } } };
    return { data: { code: 0, data: {} } };
  }
});

let channels = [];
const fakePrisma = {
  whatsAppChannel: {
    findUnique: async ({ where }) => channels.find(c => c.id === where.id) || null,
    findFirst: async ({ where }) => channels.find(c => c.providerType === where.providerType && c.externalId === where.externalId && (!where.status || c.status === where.status)) || null,
    findMany: async () => [],
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
const autoReplies = [];
inject(fromRoot('src/modules/chatbot/autoReply'), { replyIfMatched: async (...args) => { autoReplies.push(args); return null; } });
inject(fromRoot('src/utils/keyLock'), { withLock: async (key, fn) => fn() });
const queued = [];
inject(fromRoot('src/workers/meta.webhook.worker'), { metaWebhookQueue: { add: async (name, data) => { queued.push(data); } } });

const api = require(fromRoot('src/modules/tiktok/tiktok.api'));
const tiktokService = require(fromRoot('src/modules/tiktok/tiktok.service'));
const sender = require(fromRoot('src/modules/tiktok/tiktok.sender'));
const inbound = require(fromRoot('src/modules/tiktok/tiktok.inbound'));
const channelSender = require(fromRoot('src/modules/channels/channel.sender'));
const kinds = require(fromRoot('src/modules/channels/channel.kinds'));

beforeEach(() => {
  posts.length = 0;
  received.length = 0;
  autoReplies.length = 0;
  refreshCalls = 0;
});

const ttChannel = (over = {}) => ({
  id: 'tt1', tenantId: 'T', providerType: 'TIKTOK', externalId: 'BIZ1', status: 'CONNECTED',
  metaAccessToken: 'acc-1', refreshToken: 'ref-1', tokenExpiresAt: new Date(Date.now() + 3600e3), ...over
});

test('TikTok is a Live Chat channel without phone, quota or templates, replying within 48 hours', () => {
  assert.ok(kinds.LIVE_CHAT_PROVIDERS.includes('TIKTOK'));
  const c = kinds.capabilitiesOf('TIKTOK');
  assert.deepStrictEqual([c.metered, c.templates, c.hasPhone, c.windowHours, c.replyButtons, c.addressPrefix], [false, false, false, 48, 3, 'tt:']);
});

test('connecting: TikTok\'s page with a one-time state, then the code becomes a channel with its tokens', async () => {
  channels = [];
  const { url } = await tiktokService.connectUrl('T');
  const u = new URL(url);
  assert.strictEqual(u.searchParams.get('client_key'), 'TTAPP');
  assert.strictEqual(u.searchParams.get('disable_auto_auth'), '1', 'the permissions page shows every time, so a code comes back');
  const state = u.searchParams.get('state');
  assert.match(state, /^[0-9a-f]{32}$/);

  const done = await tiktokService.finishConnect('T', { code: 'good', state });
  assert.deepStrictEqual([done.kind, done.name, done.webhook], ['TIKTOK', '@wakeel.cc', true]);
  const token = posts.find(p => p.url.endsWith('/tt_user/oauth2/token/')).body;
  assert.deepStrictEqual([token.grant_type, token.auth_code, token.redirect_uri], ['authorization_code', 'good', 'https://provider.wakeel.cc/connect-social']);
  const webhook = posts.find(p => p.url.endsWith('/business/webhook/update/')).body;
  assert.deepStrictEqual([webhook.event_type, webhook.callback_url], ['DIRECT_MESSAGE', 'https://provider.wakeel.cc/api/v1/tiktok/webhook']);

  const c = channels[0];
  assert.deepStrictEqual([c.providerType, c.externalId, c.metaAccessToken, c.refreshToken, c.status], ['TIKTOK', 'BIZ1', 'acc-1', 'ref-1', 'CONNECTED']);
  assert.ok(c.tokenExpiresAt > new Date(Date.now() + 23 * 3600e3));
  assert.strictEqual(JSON.stringify(done).includes('ref-1') || JSON.stringify(done).includes('acc-1'), false, 'tokens never reach the browser');

  // A state works once, and only for the account that started it
  await assert.rejects(tiktokService.finishConnect('T', { code: 'good', state }), (e) => e.code === 'SESSION_EXPIRED');
  const other = new URL((await tiktokService.connectUrl('OTHER')).url).searchParams.get('state');
  await assert.rejects(tiktokService.finishConnect('T', { code: 'good', state: other }), (e) => e.code === 'SESSION_EXPIRED');
  // The same TikTok account cannot be on two Wakeel accounts
  const again = new URL((await tiktokService.connectUrl('OTHER')).url).searchParams.get('state');
  await assert.rejects(tiktokService.finishConnect('OTHER', { code: 'good', state: again }), (e) => e.status === 409);
  // TikTok's refusal is shown in words
  const bad = new URL((await tiktokService.connectUrl('T')).url).searchParams.get('state');
  await assert.rejects(tiktokService.finishConnect('T', { code: 'bad', state: bad }), (e) => e.status === 400 && /auth_code is invalid/.test(e.message));
});

test('the access token is renewed (once, and saved) only when it is about to expire', async () => {
  channels = [ttChannel()];
  assert.strictEqual(await tiktokService.accessTokenOf(channels[0]), 'acc-1');
  assert.strictEqual(refreshCalls, 0);

  channels = [ttChannel({ tokenExpiresAt: new Date(Date.now() + 60e3) })];
  assert.strictEqual(await tiktokService.accessTokenOf(channels[0]), 'acc-2');
  assert.deepStrictEqual([channels[0].metaAccessToken, channels[0].refreshToken, refreshCalls], ['acc-2', 'ref-2', 1]);
  assert.strictEqual(await tiktokService.accessTokenOf(channels[0]), 'acc-2', 'the saved token is used next time');
  assert.strictEqual(refreshCalls, 1);

  channels = [ttChannel({ tokenExpiresAt: new Date(0), refreshToken: null })];
  await assert.rejects(tiktokService.accessTokenOf(channels[0]), (e) => e.code === 'RECONNECT');
});

const sign = (body, t = Math.floor(Date.now() / 1000), secret = 'tt-secret') => {
  const raw = JSON.stringify(body);
  return { raw: Buffer.from(raw), header: `t=${t},s=${crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')}` };
};

test('webhooks are accepted only with TikTok\'s signature and a recent time', () => {
  const body = { event: 'im_receive_msg', user_openid: 'BIZ1', content: '{}' };
  const ok = sign(body);
  assert.strictEqual(api.validSignature(ok.header, ok.raw, body), true);
  assert.strictEqual(api.validSignature(ok.header, null, body), true, 'the parsed body works too');
  assert.strictEqual(api.validSignature(sign(body, undefined, 'other').header, ok.raw, body), false, 'another secret');
  assert.strictEqual(api.validSignature(ok.header, Buffer.from('{"event":"x"}'), body), false, 'a changed body');
  const old = sign(body, Math.floor(Date.now() / 1000) - 3600);
  assert.strictEqual(api.validSignature(old.header, old.raw, body), false, 'replayed later');
  assert.strictEqual(api.validSignature(undefined, ok.raw, body), false);
});

const dm = (content, event = 'im_receive_msg') => ({
  client_key: 'TTAPP', event, create_time: 1, user_openid: 'BIZ1',
  content: JSON.stringify({ from: 'sara.k', to: 'wakeel.cc', unique_identifier: 'U9', from_user: { id: 'U9', role: 'personal_account' }, to_user: { id: 'BIZ1', role: 'business_account' }, conversation_id: 'CONV1', message_id: 'M1', timestamp: 1, ...content })
});

test('a customer\'s TikTok message reaches Live Chat on "tt:<conversation>" with their @username', async () => {
  channels = [ttChannel()];
  await inbound.processEvent(dm({ type: 'text', text: { body: 'مرحبا' } }));
  assert.strictEqual(received.length, 1);
  const [tenantId, channelId, contact, message] = received[0];
  assert.deepStrictEqual([tenantId, channelId, contact.address, contact.name, contact.info.username], ['T', 'tt1', 'tt:CONV1', 'sara.k', 'sara.k']);
  assert.deepStrictEqual([message.id, message.type, message.content], ['tt.M1', 'TEXT', 'مرحبا']);
  assert.strictEqual(autoReplies.length, 1, 'keyword replies answer when no flow did');

  assert.strictEqual(inbound.normalizeEvent(dm({ type: 'text', text: { body: 'x' } }, 'im_send_msg')).kind, 'skip', 'our own sends come back and are skipped');
  assert.strictEqual(inbound.normalizeEvent(dm({ type: 'text', text: { body: 'x' }, from_user: { id: 'BIZ1', role: 'business_account' } })).kind, 'skip');
  assert.match(inbound.normalizeEvent(dm({ type: 'share_post', share_post: { embed_url: 'https://tiktok.com/embed/1' } })).message.content, /embed\/1/);
  assert.strictEqual(inbound.normalizeEvent(dm({ type: 'reaction' })).kind, 'skip');

  // A message for an account that is not connected is dropped
  channels = [];
  await inbound.processEvent(dm({ type: 'text', text: { body: 'hi' } }));
  assert.strictEqual(received.length, 1);
});

test('replies go to the conversation; buttons as a Q&A card, more options as a numbered list', async () => {
  channels = [ttChannel()];
  const c = channels[0];
  const r = await channelSender.sendText(c, 'tt:CONV1', 'أهلاً');
  assert.ok(r.messages[0].id);
  const text = posts[0];
  assert.strictEqual(text.headers['Access-Token'], 'acc-1');
  assert.deepStrictEqual([text.body.business_id, text.body.recipient_type, text.body.recipient, text.body.message_type, text.body.text.body], ['BIZ1', 'CONVERSATION', 'CONV1', 'TEXT', 'أهلاً']);

  await sender.sendButtons(c, 'tt:CONV1', 'اختر خدمة', [{ id: 'F:a:1', text: 'الأسعار' }, { id: 'F:a:2', text: 'الدعم' }]);
  const card = posts[1].body;
  assert.strictEqual(card.message_type, 'TEMPLATE');
  assert.deepStrictEqual(card.template, { type: 'QA_BUTTON_CARD', title: 'اختر خدمة', buttons: [{ type: 'REPLY', title: 'الأسعار', id: 'F:a:1' }, { type: 'REPLY', title: 'الدعم', id: 'F:a:2' }] });

  posts.length = 0;
  await sender.sendButtons(c, 'tt:CONV1', 'اختر', [1, 2, 3, 4].map(i => ({ id: `o${i}`, text: `خيار ${i}` })));
  assert.deepStrictEqual([posts.length, posts[0].body.message_type, posts[0].body.text.body], [1, 'TEXT', 'اختر\n\n1. خيار 1\n2. خيار 2\n3. خيار 3\n4. خيار 4']);

  posts.length = 0;
  await sender.sendLinkButton(c, 'tt:CONV1', 'متجرنا', 'افتح', 'https://x.co');
  assert.strictEqual(posts[0].body.text.body, 'متجرنا\n\nافتح: https://x.co');
});

test('the webhook route: signed customer messages are queued, others answered without work, unsigned refused', async () => {
  const express = require('express');
  const app = express();
  app.use(express.json({ verify: require(fromRoot('src/middleware/rawBody')).captureWebhookRawBody }));
  app.use('/api/v1/tiktok', require(fromRoot('src/modules/tiktok/tiktok.routes')));
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/tiktok/webhook`;
  // TikTok's own spacing: the signature covers the exact bytes it sent
  const send = (raw, header) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(header && { 'TikTok-Signature': header }) }, body: raw });
  const signRaw = (raw, t = Math.floor(Date.now() / 1000)) => `t=${t},s=${crypto.createHmac('sha256', 'tt-secret').update(`${t}.${raw}`).digest('hex')}`;
  try {
    queued.length = 0;
    const raw = JSON.stringify(dm({ type: 'text', text: { body: 'hi' } }), null, 1);
    assert.strictEqual((await send(raw, signRaw(raw))).status, 200);
    assert.deepStrictEqual(queued.map(q => [q.type, q.payload.user_openid]), [['TIKTOK_EVENT', 'BIZ1']]);

    const echo = JSON.stringify(dm({ type: 'text', text: { body: 'x' } }, 'im_send_msg'));
    assert.strictEqual((await send(echo, signRaw(echo))).status, 200);
    assert.strictEqual(queued.length, 1, 'only customer messages are queued');

    assert.strictEqual((await send(raw)).status, 401);
    assert.strictEqual((await send(raw, signRaw(raw + ' '))).status, 401);
    assert.strictEqual(queued.length, 1);
  } finally {
    server.close();
  }
});
