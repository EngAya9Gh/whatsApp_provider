// Meta campaign worker on a real Redis: the send rate limit, retries of temporary errors, immediate
// failure of permanent ones, and the pause when Meta asks to slow down. Needs TEST_REDIS_HOST.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_REDIS_HOST');
process.env.META_CAMPAIGN_RATE_PER_SECOND = '5';
process.env.META_CAMPAIGN_THROTTLE_PAUSE_MS = '1500';
process.env.PROCESS_ROLE = 'all';

const targets = {};
const campaignStatus = {}; // targetId → status of its campaign (RUNNING when not set)
inject('@prisma/client', {
  PrismaClient: class {
    constructor() {
      this.whatsAppChannel = { findUnique: async () => ({ id: 'ch', providerType: 'META_CLOUD', metaAccessToken: 'tok', metaPhoneNumberId: 'pn', metaWabaId: 'w' }) };
      this.campaignTarget = {
        findUnique: async ({ where }) => ({
          status: targets[where.id]?.status || 'QUEUED',
          campaign: { status: campaignStatus[where.id] || 'RUNNING' }
        }),
        update: async ({ where, data }) => { targets[where.id] = { ...(targets[where.id] || {}), ...data }; },
        updateMany: async ({ where, data }) => {
          const now = targets[where.id]?.status || 'QUEUED';
          const allowed = typeof where.status === 'string' ? [where.status] : where.status.in;
          if (!allowed.includes(now)) return { count: 0 };
          targets[where.id] = { ...(targets[where.id] || {}), ...data };
          return { count: 1 };
        }
      };
      this.campaign = { findUnique: async () => ({ name: 'Campaign' }) };
    }
  }
});
inject(fromRoot('src/models/mongo/CampaignDelivery'), { create: async () => ({}) });

const calls = {};
const payloads = {};
const sendTimes = [];
const metaErr = (status, code, message) => Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data: { error: { code, message } } } });
const plan = {
  222: [metaErr(503, 131000, 'Something went wrong')], // temporary, once
  333: [metaErr(400, 131026, 'Message undeliverable')], // permanent
  444: [metaErr(400, 130429, 'Rate limit hit')], // Meta asks to slow down
  555: [1, 2, 3, 4, 5].map(() => metaErr(500, 2, 'Service temporarily unavailable'))
};
inject('axios', {
  get: async () => ({ data: { data: [{ name: 'promo', language: 'ar', status: 'APPROVED' }] } }),
  post: async (url, payload) => {
    const phone = payload.to;
    calls[phone] = (calls[phone] || 0) + 1;
    payloads[phone] = payload;
    sendTimes.push(Date.now());
    const next = plan[phone]?.shift();
    if (next) throw next;
    return { data: { messages: [{ id: `wamid.${phone}.${calls[phone]}` }] } };
  }
});

let queue;
let worker;
let classifyError;
let processJob;
before(async () => {
  if (skip) return;
  ({ metaCampaignQueue: queue, worker, classifyError, processJob } = require(fromRoot('src/workers/meta.campaign.worker')));
  await queue.obliterate({ force: true }).catch(() => {});
});
after(async () => {
  if (skip) return;
  await queue.obliterate({ force: true }).catch(() => {});
  await worker.close();
  await queue.close();
});

test('error kinds', { skip }, () => {
  assert.strictEqual(classifyError(metaErr(400, 132001, 'Template does not exist')), 'PERMANENT');
  assert.strictEqual(classifyError(metaErr(400, 131026, 'Message undeliverable')), 'PERMANENT');
  assert.strictEqual(classifyError(metaErr(503, 131000, 'Something went wrong')), 'TEMPORARY');
  assert.strictEqual(classifyError(Object.assign(new Error('socket hang up'), { isAxiosError: true })), 'TEMPORARY');
  assert.strictEqual(classifyError(metaErr(400, 130429, 'Rate limit hit')), 'THROTTLED');
});

test('a campaign: rate limit, retries, permanent failures and Meta throttling', { skip, timeout: 60000 }, async () => {
  const job = (phone) => ({
    name: 'send-meta-campaign-message',
    data: { campaignId: 'c', targetId: `t${phone}`, tenantId: 'T', channelId: 'ch', phone, variables: [], templateName: 'promo', templateLanguage: 'ar' },
    opts: { backoff: { type: 'fixed', delay: 200 } }
  });
  const phones = ['111', '222', '333', '444', '555', ...Array.from({ length: 10 }, (_, i) => `6${i}`)];
  const started = Date.now();
  await queue.addBulk(phones.map(job));
  for (let i = 0; i < 160; i++) {
    const c = await queue.getJobCounts('completed', 'failed');
    if (c.completed + c.failed === phones.length) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const elapsed = Date.now() - started;

  assert.strictEqual(targets.t111.status, 'SENT');
  assert.strictEqual(calls['222'], 2, 'temporary error → tried again');
  assert.strictEqual(targets.t222.status, 'SENT');
  assert.strictEqual(calls['333'], 1, 'permanent error → not retried');
  assert.strictEqual(targets.t333.status, 'FAILED');
  assert.match(targets.t333.error, /undeliverable/);
  assert.strictEqual(calls['444'], 2);
  assert.strictEqual(targets.t444.status, 'SENT');
  const throttled = (await queue.getJobs(['completed'])).find(j => j.data.phone === '444');
  assert.strictEqual(throttled.attemptsMade, 1, 'the pause did not use up an attempt');
  assert.strictEqual(calls['555'], 4, 'four attempts, then it gives up');
  assert.strictEqual(targets.t555.status, 'FAILED');
  for (let i = 0; i < 10; i++) assert.strictEqual(targets[`t6${i}`].status, 'SENT');

  const perSecond = {};
  for (const t of sendTimes) {
    const s = Math.floor((t - sendTimes[0]) / 1000);
    perSecond[s] = (perSecond[s] || 0) + 1;
  }
  assert.ok(Object.values(perSecond).every(n => n <= 6), `at most the limit per second: ${JSON.stringify(perSecond)}`);
  assert.ok(elapsed >= 3000, `the limit slows the campaign down (${elapsed}ms)`);
});

test('a media-header template campaign sends the same image to every recipient, before the body values', { skip, timeout: 30000 }, async () => {
  const headerMedia = { type: 'image', id: '1234567890' };
  await queue.addBulk(['901', '902'].map(phone => ({
    name: 'send-meta-campaign-message',
    data: { campaignId: 'm', targetId: `t${phone}`, tenantId: 'T', channelId: 'ch', phone, variables: ['Sara'], templateName: 'offer', templateLanguage: 'ar', headerMedia }
  })));
  for (let i = 0; i < 80 && !(targets.t901?.status && targets.t902?.status); i++) await new Promise(resolve => setTimeout(resolve, 100));

  for (const phone of ['901', '902']) {
    assert.strictEqual(targets[`t${phone}`].status, 'SENT');
    assert.deepStrictEqual(payloads[phone].template.components, [
      { type: 'header', parameters: [{ type: 'image', image: { id: '1234567890' } }] },
      { type: 'body', parameters: [{ type: 'text', text: 'Sara' }] }
    ]);
  }
});

test('before sending: a paused campaign puts the recipient back, a stopped one cancels it, a sent one is not sent again', { skip }, async () => {
  const job = (phone) => ({ data: { campaignId: 'p', targetId: `t${phone}`, tenantId: 'T', channelId: 'ch', phone, variables: [], templateName: 'promo', templateLanguage: 'ar' }, opts: { attempts: 4 }, attemptsMade: 0 });
  campaignStatus.t701 = 'PAUSED';
  targets.t701 = { status: 'QUEUED' };
  assert.deepStrictEqual(await processJob(job('701')), { skipped: 'PAUSED' });
  assert.strictEqual(targets.t701.status, 'PENDING', 'sent when the campaign is resumed');
  assert.strictEqual(targets.t701.queuedAt, null);

  campaignStatus.t702 = 'CANCELLED';
  targets.t702 = { status: 'QUEUED' };
  assert.deepStrictEqual(await processJob(job('702')), { skipped: 'CANCELLED' });
  assert.strictEqual(targets.t702.status, 'CANCELLED');

  targets.t703 = { status: 'SENT' };
  assert.deepStrictEqual(await processJob(job('703')), { skipped: 'SENT' });
  assert.strictEqual(calls['701'] || calls['702'] || calls['703'], undefined, 'nothing reached Meta');

  const sent = await processJob(job('704'));
  assert.ok(sent.wamid);
  assert.strictEqual(targets.t704.status, 'SENT');
  assert.ok(targets.t704.sentAt instanceof Date);
});
