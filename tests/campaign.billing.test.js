// Campaign charges in both "who pays Meta" modes, refunds of failed messages (including late failures),
// paying again for a retry, and the sweep. Runs the real campaign and wallet code on a throwaway MySQL
// database. Needs TEST_MYSQL_URL (a user that may create databases).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { ROOT, inject, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const dbName = `wakeel_test_billing_${Date.now().toString(36)}`;

// The queues are not under test: record what would be queued instead of talking to Redis
const queued = [];
const fakeQueue = { addBulk: async (jobs) => { queued.push(...jobs); } };
inject(fromRoot('src/workers/campaign.worker.js'), { campaignQueue: fakeQueue, campaignWorker: null });
inject(fromRoot('src/workers/meta.campaign.worker.js'), { metaCampaignQueue: fakeQueue, worker: null });

let admin;
let prisma;
let campaigns;
let billing;
let wallet;

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
  billing = require(fromRoot('src/modules/campaign/campaign.billing'));
  wallet = require(fromRoot('src/modules/wallet/wallet.service'));

  // Meta rates are USD; 1 USD = 3.75 SAR
  await prisma.systemSetting.create({
    data: { id: 'GLOBAL', data: { marketingBaseCost: 0.05, marketingMarkupPercent: 20, qrMessagePrice: 0.05, exchangeRateUsdToSar: 3.75 } }
  });
});

after(async () => {
  if (skip) return;
  await prisma?.$disconnect();
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
  await admin.$disconnect();
});

let n = 0;
async function tenantWith({ balance = 10, contacts = 4, currency = 'SAR', customFeatures = null }) {
  const id = `T${++n}`;
  await prisma.tenant.create({
    data: { id, name: id, email: `${id}@test`, passwordHash: 'x', walletBalance: balance, currency, ...(customFeatures && { customFeatures }) }
  });
  await prisma.contact.createMany({
    data: Array.from({ length: contacts }, (_, i) => ({ tenantId: id, name: 'Unknown', phone: `96650000${n}${i}` }))
  });
  return id;
}
const createMeta = (tenantId) => campaigns.createCampaign({
  tenantId, name: 'Offer', message: 'offer_template', templateLanguage: 'ar', campaignType: 'META', metaCategory: 'MARKETING', contactGroupId: 'all'
});
const balanceOf = async (id) => Math.round((await prisma.tenant.findUnique({ where: { id } })).walletBalance * 10000) / 10000;
const targetsOf = (campaignId) => prisma.campaignTarget.findMany({ where: { campaignId }, orderBy: { phone: 'asc' } });
const setStatus = (ids, status) => prisma.campaignTarget.updateMany({ where: { id: { in: ids } }, data: { status, error: status === 'FAILED' ? '[131026] Message undeliverable' : null } });

test('price of one message in each mode and currency', { skip }, () => {
  const settings = { marketingBaseCost: 0.05, marketingMarkupPercent: 20, qrMessagePrice: 0.05, exchangeRateUsdToSar: 3.75 };
  const price = (tenant, extra = {}, isMeta = true) => billing.unitPrice({ isMeta, category: 'MARKETING', settings: { ...settings, ...extra }, tenant });

  assert.strictEqual(price({ currency: 'SAR' }), 0.0375, 'customer pays Meta (default): only the 20% markup, in SAR');
  assert.strictEqual(price({ currency: 'SAR' }, { metaFeesPaidBy: 'PLATFORM' }), 0.225, 'we pay Meta: rate + markup, USD turned into SAR');
  assert.strictEqual(price({ currency: 'USD' }), 0.01);
  assert.strictEqual(price({ currency: 'SAR', customFeatures: { billing: { metaFeesPaidBy: 'PLATFORM' } } }), 0.225, 'the account setting wins');
  assert.strictEqual(price({ currency: 'SAR' }, { marketingMarkupPercent: 0 }), 0, 'a 0% markup is free, not the 20% default');
  assert.strictEqual(price({ currency: 'SAR' }, {}, false), 0.05, 'QR price is already SAR');
  assert.strictEqual(price({ currency: 'USD' }, {}, false), 0.0133);
});

test('failed messages are refunded once; a retry is paid first; late failures are refunded too', { skip, timeout: 60000 }, async () => {
  const tenantId = await tenantWith({ balance: 10, contacts: 4 });
  const { campaignId, totalCost } = await createMeta(tenantId);
  assert.strictEqual(totalCost, 0.15, '4 × 0.0375');
  assert.strictEqual(await balanceOf(tenantId), 9.85);

  const [a, b, c, d] = await targetsOf(campaignId);
  await setStatus([a.id], 'FAILED'); // Meta refused it right away
  await setStatus([b.id, c.id, d.id], 'SENT');
  await setStatus([b.id], 'FAILED'); // accepted, then a "failed" status webhook

  let r = await billing.settle(campaignId);
  assert.strictEqual(r.refunded, 0.075, 'two failed messages back');
  assert.strictEqual(await balanceOf(tenantId), 9.925);
  assert.strictEqual((await prisma.campaign.findUnique({ where: { id: campaignId } })).totalCost, 0.075, 'the campaign shows what it really cost');

  r = await billing.settle(campaignId);
  assert.strictEqual(r.refunded, 0, 'settling again changes nothing');
  assert.strictEqual(await balanceOf(tenantId), 9.925);

  queued.length = 0;
  await campaigns.retryFailed(tenantId, campaignId);
  assert.strictEqual(await balanceOf(tenantId), 9.85, 'the two retried messages are paid again');
  assert.strictEqual(queued.length, 2);
  assert.deepStrictEqual((await targetsOf(campaignId)).map(t => t.status), ['PENDING', 'PENDING', 'SENT', 'SENT']);

  await setStatus([a.id], 'SENT');
  await setStatus([b.id], 'FAILED');
  r = await billing.settle(campaignId);
  assert.strictEqual(r.refunded, 0.0375);
  assert.strictEqual(await balanceOf(tenantId), 9.8875);

  const rows = await prisma.walletTransaction.findMany({ where: { tenantId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  assert.deepStrictEqual(rows.map(t => [t.type, t.amount]), [
    ['CAMPAIGN_CHARGE', -0.15], ['REFUND', 0.075], ['CAMPAIGN_CHARGE', -0.075], ['REFUND', 0.0375]
  ]);
  assert.ok(rows.every(t => t.referenceType === 'CAMPAIGN' && t.referenceId === campaignId), 'every row points at the campaign');
  assert.strictEqual((await wallet.getSummary(tenantId)).spentThisMonth, 0.1125, '3 messages delivered × 0.0375');
});

test('"we pay Meta" accounts pay rate + markup; a retry the wallet cannot cover is refused and nothing changes', { skip, timeout: 60000 }, async () => {
  const tenantId = await tenantWith({ balance: 1, contacts: 2, customFeatures: { billing: { metaFeesPaidBy: 'PLATFORM' } } });
  const { campaignId, totalCost } = await createMeta(tenantId);
  assert.strictEqual(totalCost, 0.45, '2 × (0.05 × 1.2 × 3.75)');

  const [a, b] = await targetsOf(campaignId);
  await setStatus([a.id], 'FAILED');
  await setStatus([b.id], 'SENT');
  await billing.settle(campaignId);
  assert.strictEqual(await balanceOf(tenantId), 0.775);

  await prisma.tenant.update({ where: { id: tenantId }, data: { walletBalance: 0.1 } });
  queued.length = 0;
  await assert.rejects(campaigns.retryFailed(tenantId, campaignId), (e) => e.code === 'INSUFFICIENT_BALANCE');
  assert.strictEqual(await balanceOf(tenantId), 0.1);
  assert.strictEqual(queued.length, 0, 'nothing was queued');
  assert.strictEqual((await targetsOf(campaignId))[0].status, 'FAILED', 'the recipient stays failed');
});

test('the sweep completes finished campaigns and refunds their failures; uncharged accounts are left alone', { skip, timeout: 60000 }, async () => {
  const tenantId = await tenantWith({ balance: 5, contacts: 3 });
  const { campaignId } = await createMeta(tenantId);
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'RUNNING' } });
  const [a, b, c] = await targetsOf(campaignId);
  await setStatus([a.id, b.id], 'SENT');
  await setStatus([c.id], 'FAILED');

  const free = await tenantWith({ balance: 0, contacts: 2 });
  await prisma.tenant.update({ where: { id: free }, data: { deductBalance: false } });
  const freeCampaign = await createMeta(free);
  assert.strictEqual(freeCampaign.totalCost, 0.075);
  assert.strictEqual(await balanceOf(free), 0, 'wallet deduction off: nothing charged');

  await billing.sweep();
  assert.strictEqual((await prisma.campaign.findUnique({ where: { id: campaignId } })).status, 'COMPLETED');
  assert.strictEqual(await balanceOf(tenantId), 4.925, '5 − 3 × 0.0375 + 1 failed × 0.0375');
  assert.strictEqual(await billing.settle(freeCampaign.campaignId), null, 'never charged, never refunded');
});
