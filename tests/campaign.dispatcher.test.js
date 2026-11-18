// Meta campaigns sent in waves (campaign.dispatcher.js) on a throwaway MySQL database: one wave per number per
// second, never more than a few seconds of work in the queue, campaigns on one number taking turns, scheduled
// starts, pause / resume, a number Meta asked to slow down, lost jobs sent again, and completion.
// The send queue is a stand-in that records the jobs. Needs TEST_MYSQL_URL.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { ROOT, inject, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const dbName = `wakeel_test_waves_${Date.now().toString(36)}`;
process.env.META_CAMPAIGN_RATE_PER_NUMBER = '10';
process.env.META_CAMPAIGN_RATE_PER_COEX_NUMBER = '3';
process.env.META_CAMPAIGN_RATE_PER_SECOND = '100';

const queued = [];
const kv = new Map();
const fakeRedis = {
  mget: async (keys) => keys.map(k => kv.get(k) ?? null),
  set: async (k, v, px, ms, nx) => { if (nx === 'NX' && kv.has(k)) return null; kv.set(k, v); return 'OK'; },
  get: async (k) => kv.get(k) ?? null,
  pexpire: async () => 1,
  del: async (k) => kv.delete(k)
};
const fakeQueue = { addBulk: async (jobs) => { queued.push(...jobs); }, client: Promise.resolve(fakeRedis) };
inject(fromRoot('src/workers/campaign.worker.js'), { campaignQueue: fakeQueue, campaignWorker: null });
inject(fromRoot('src/workers/meta.campaign.worker.js'), { metaCampaignQueue: fakeQueue, worker: null });
inject(fromRoot('src/modules/meta/meta.templateLookup.js'), {
  lookup: async () => ({
    reachable: true,
    template: { name: 'hello', language: 'ar', category: 'UTILITY', status: 'APPROVED', components: [{ type: 'BODY', text: 'أهلاً {{1}}' }] }
  }),
  approvedVersions: async () => []
});

let admin;
let prisma;
let campaigns;
let dispatcher;

before(async () => {
  if (skip) return;
  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  admin = new PrismaClient({ datasources: { db: { url: `${base}/mysql` } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\``);
  process.env.DATABASE_URL = `${base}/${dbName}`;
  execFileSync(fromRoot('node_modules/.bin/prisma'), ['db', 'push', '--skip-generate'], {
    cwd: ROOT, env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, stdio: 'pipe'
  });
  prisma = new PrismaClient();
  campaigns = require(fromRoot('src/modules/campaign/campaign.service'));
  dispatcher = require(fromRoot('src/modules/campaign/campaign.dispatcher'));
  await prisma.systemSetting.create({ data: { id: 'GLOBAL', data: { enableWalletDeduction: false } } });
});

after(async () => {
  if (skip) return;
  await prisma?.$disconnect();
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
  await admin.$disconnect();
});

let n = 0;
/** An account with one Meta number and `count` contacts; returns { tenantId, channelId } */
async function account({ count, coexistence = false }) {
  const tenantId = `T${++n}`;
  await prisma.tenant.create({ data: { id: tenantId, name: tenantId, email: `${tenantId}@test`, passwordHash: 'x' } });
  const channel = await prisma.whatsAppChannel.create({
    data: { tenantId, providerType: 'META_CLOUD', status: 'CONNECTED', metaPhoneNumberId: `pn${n}`, metaWabaId: 'w', metaAccessToken: 't', displayPhoneNumber: '966500000000', isCoexistence: coexistence }
  });
  await prisma.contact.createMany({
    data: Array.from({ length: count }, (_, i) => ({ tenantId, name: `عميل ${i}`, phone: `9665${String(n).padStart(2, '0')}${String(i).padStart(6, '0')}` }))
  });
  return { tenantId, channelId: channel.id };
}
const create = async ({ tenantId, channelId }, extra = {}) => (await campaigns.createCampaign({
  tenantId, channelId, name: 'c', message: 'hello', templateLanguage: 'ar', campaignType: 'META', contactGroupId: 'all', ...extra
})).campaignId;
const counts = async (campaignId) => Object.fromEntries((await prisma.campaignTarget.groupBy({ by: ['status'], where: { campaignId }, _count: { _all: true } })).map(r => [r.status, r._count._all]));
const markSent = async (campaignId, howMany) => {
  const rows = await prisma.campaignTarget.findMany({ where: { campaignId, status: 'QUEUED' }, take: howMany, select: { id: true } });
  await prisma.campaignTarget.updateMany({ where: { id: { in: rows.map(r => r.id) } }, data: { status: 'SENT', sentAt: new Date() } });
};
const reset = async () => {
  queued.length = 0;
  kv.clear();
  // Earlier tests' campaigns stop taking part
  await prisma.campaign.updateMany({ where: { status: { in: ['RUNNING', 'SCHEDULED', 'PAUSED'] } }, data: { status: 'COMPLETED' } });
};

test('one wave per second per number, at most three seconds of work in the queue, then completed', { skip, timeout: 60000 }, async () => {
  await reset();
  const acc = await account({ count: 35 });
  const id = await create(acc);
  const started = await campaigns.startCampaign(acc.tenantId, id);
  assert.strictEqual(started.status, 'RUNNING');
  assert.deepStrictEqual(started.eta, { perSecond: 10, seconds: 4 });

  let r = await dispatcher.tick();
  assert.strictEqual(r.released, 10, 'the number sends 10 a second');
  assert.deepStrictEqual(await counts(id), { QUEUED: 10, PENDING: 25 });
  const job = queued[0];
  assert.strictEqual(job.name, 'send-meta-campaign-message');
  assert.strictEqual(job.data.templateName, 'hello');
  assert.strictEqual(job.data.templateLanguage, 'ar');
  assert.match(job.data.variables[0], /^عميل \d+$/, '{{1}} = the contact name');

  assert.strictEqual((await dispatcher.tick()).released, 10);
  assert.strictEqual((await dispatcher.tick()).released, 10);
  assert.strictEqual((await dispatcher.tick()).released, 0, 'the queue already holds 3 seconds of work: wait for the sender');
  assert.deepStrictEqual(await counts(id), { QUEUED: 30, PENDING: 5 });

  await markSent(id, 15);
  assert.strictEqual((await dispatcher.tick()).released, 5, 'the last 5');
  await markSent(id, 20);
  r = await dispatcher.tick();
  assert.strictEqual(r.completed, 1);
  const done = await prisma.campaign.findUnique({ where: { id } });
  assert.strictEqual(done.status, 'COMPLETED');
  assert.ok(done.completedAt);
  assert.strictEqual(queued.length, 35, 'every recipient queued exactly once');
  assert.strictEqual(new Set(queued.map(j => j.data.targetId)).size, 35);
});

test('campaigns on one number take turns; numbers do not wait for each other; a shared number is slower', { skip, timeout: 60000 }, async () => {
  await reset();
  const big = await account({ count: 100 });
  const bigId = await create(big);
  await campaigns.startCampaign(big.tenantId, bigId);
  const smallId = await create(big);
  await campaigns.startCampaign(big.tenantId, smallId);
  const other = await account({ count: 20 });
  const otherId = await create(other);
  await campaigns.startCampaign(other.tenantId, otherId);
  const coex = await account({ count: 20, coexistence: true });
  const coexId = await create(coex);
  await campaigns.startCampaign(coex.tenantId, coexId);

  await dispatcher.tick();
  const per = (id) => queued.filter(j => j.data.campaignId === id).length;
  assert.strictEqual(per(bigId) + per(smallId), 10, 'one number: 10 a second shared by its campaigns');
  assert.strictEqual(per(bigId), 5);
  assert.strictEqual(per(smallId), 5, 'the second campaign does not wait for the first');
  assert.strictEqual(per(otherId), 10, 'another number at its own pace');
  assert.strictEqual(per(coexId), 3, 'a number shared with the WhatsApp Business app sends less');
});

test('scheduled start, pause and resume, and a number Meta asked to slow down', { skip, timeout: 60000 }, async () => {
  await reset();
  const acc = await account({ count: 30 });
  const id = await create(acc, { startDate: new Date(Date.now() + 60 * 60 * 1000) });
  const started = await campaigns.startCampaign(acc.tenantId, id);
  assert.strictEqual(started.status, 'SCHEDULED');
  assert.strictEqual((await dispatcher.tick()).released, 0, 'not before its time');

  await prisma.campaign.update({ where: { id }, data: { startDate: new Date(Date.now() - 1000) } });
  assert.strictEqual((await dispatcher.tick()).released, 10, 'its time came: it runs');
  assert.strictEqual((await prisma.campaign.findUnique({ where: { id } })).status, 'RUNNING');

  await campaigns.pauseCampaign(acc.tenantId, id);
  assert.strictEqual((await dispatcher.tick()).released, 0, 'paused: no new wave');
  await assert.rejects(campaigns.pauseCampaign(acc.tenantId, id), (e) => e.status === 400);
  assert.strictEqual((await campaigns.resumeCampaign(acc.tenantId, id)).status, 'RUNNING');
  assert.strictEqual((await dispatcher.tick()).released, 10);

  kv.set(dispatcher.THROTTLE_KEY(acc.channelId), '1');
  await markSent(id, 20);
  assert.strictEqual((await dispatcher.tick()).released, 0, 'Meta asked this number to slow down');
  kv.clear();
  assert.strictEqual((await dispatcher.tick()).released, 10, 'the pause is over');

  const stats = await campaigns.getCampaignStats(acc.tenantId, id);
  assert.deepStrictEqual([stats.stats.total, stats.stats.sent, stats.stats.queued, stats.stats.pending], [30, 20, 10, 10]);
  assert.deepStrictEqual(stats.eta, { perSecond: 10, seconds: 1 });
});

test('a recipient whose job was lost is sent again; older campaigns (sent without waves) are left alone', { skip, timeout: 60000 }, async () => {
  await reset();
  const acc = await account({ count: 12 });
  const id = await create(acc);
  await campaigns.startCampaign(acc.tenantId, id);
  await dispatcher.tick();
  const lost = await prisma.campaignTarget.findFirst({ where: { campaignId: id, status: 'QUEUED' } });
  await prisma.campaignTarget.update({ where: { id: lost.id }, data: { queuedAt: new Date(Date.now() - 20 * 60 * 1000) } });
  assert.strictEqual(await dispatcher.recoverStale(), 1);
  assert.strictEqual((await prisma.campaignTarget.findUnique({ where: { id: lost.id } })).status, 'PENDING');

  const legacy = await create(acc);
  await prisma.campaign.update({ where: { id: legacy }, data: { status: 'RUNNING' } }); // launchedAt stays empty
  queued.length = 0;
  await dispatcher.tick();
  assert.ok(queued.every(j => j.data.campaignId !== legacy), 'its jobs are already in the queue');
});

test('a campaign is not closed while a retry puts failed recipients back', { skip, timeout: 60000 }, async () => {
  await reset();
  const acc = await account({ count: 2 });
  const id = await create(acc);
  await campaigns.startCampaign(acc.tenantId, id);
  await prisma.campaignTarget.updateMany({ where: { campaignId: id }, data: { status: 'FAILED', error: 'x' } });
  await prisma.campaignTarget.updateMany({ where: { campaignId: id }, data: { status: 'PENDING' } }); // the retry
  assert.strictEqual(await dispatcher.completeIfDone(id), false);
  await prisma.campaignTarget.updateMany({ where: { campaignId: id }, data: { status: 'SENT' } });
  assert.strictEqual(await dispatcher.completeIfDone(id), true);
});
