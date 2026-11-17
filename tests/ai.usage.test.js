// AI usage reports on a throwaway MySQL database: an account's month per feature, the admin view of every
// account (shared key first), the estimated cost from the admin's prices, and month boundaries.
// Needs TEST_MYSQL_URL (a user that may create databases).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { ROOT, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const dbName = `wakeel_test_aiusage_${Date.now().toString(36)}`;
let quota;

let admin;
let prisma;
let usage;
before(async () => {
  if (skip) return;
  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  admin = new PrismaClient({ datasources: { db: { url: `${base}/mysql` } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\``);
  process.env.DATABASE_URL = `${base}/${dbName}`;
  execFileSync(fromRoot('node_modules/.bin/prisma'), ['db', 'push', '--skip-generate'], { cwd: ROOT, env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, stdio: 'pipe' });
  prisma = new PrismaClient();
  usage = require(fromRoot('src/modules/ai/ai.usage'));
  quota = require(fromRoot('src/modules/ai/ai.quota'));

  await prisma.tenant.createMany({ data: ['A', 'B'].map(id => ({ id, name: `Shop ${id}`, email: `${id}@t`, passwordHash: 'x' })) });
  const row = (tenantId, feature, sharedKey, inputTokens, outputTokens, createdAt) => ({ tenantId, feature, model: 'gemini-3.6-flash', sharedKey, inputTokens, outputTokens, createdAt: new Date(createdAt) });
  await prisma.aiUsage.createMany({
    data: [
      row('A', 'agent_reply', true, 1000, 100, '2026-11-02T10:00:00Z'),
      row('A', 'agent_reply', true, 3000, 300, '2026-11-20T10:00:00Z'),
      row('A', 'suggest_reply', true, 500, 50, '2026-11-30T23:59:59Z'),
      row('A', 'agent_reply', true, 9999, 999, '2026-10-31T23:59:59Z'), // last month
      row('B', 'chat_summary', false, 800, 80, '2026-11-05T10:00:00Z'),
      row('B', 'stage_suggestion', true, 200, 20, '2026-11-06T10:00:00Z')
    ]
  });
});
after(async () => {
  if (skip) return;
  await prisma?.$disconnect();
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
  await admin.$disconnect();
});

test('an account sees its month per feature', { skip }, async () => {
  const a = await usage.tenantUsage('A', '2026-11');
  assert.strictEqual(a.requests, 3);
  assert.strictEqual(a.inputTokens, 4500);
  assert.strictEqual(a.outputTokens, 450);
  assert.deepStrictEqual(a.byFeature.map(f => [f.feature, f.requests]), [['agent_reply', 2], ['suggest_reply', 1]]);
  assert.strictEqual(a.shared.estimatedCostUsd, null, 'no prices entered yet');
  assert.strictEqual((await usage.tenantUsage('A', '2026-10')).requests, 1);
  await assert.rejects(async () => usage.tenantUsage('A', '2026-13'), (e) => e.status === 400);
});

test('admin: every account, shared-key users first, cost from the entered prices', { skip }, async () => {
  await prisma.systemSetting.create({ data: { id: 'GLOBAL', data: { aiInputPricePerMillionUsd: 0.5, aiOutputPricePerMillionUsd: 3 } } });
  const all = await usage.platformUsage('2026-11');
  assert.strictEqual(all.pricesSet, true);
  assert.deepStrictEqual(all.tenants.map(t => [t.tenantId, t.shared.requests, t.own.requests]), [['A', 3, 0], ['B', 1, 1]]);
  // A: (4500 × 0.5 + 450 × 3) / 1M
  assert.strictEqual(all.tenants[0].shared.estimatedCostUsd, 0.0036);
  assert.strictEqual(all.tenants[0].name, 'Shop A');
  assert.strictEqual(all.totals.requests, 5);
  assert.strictEqual(all.totals.shared.requests, 4, 'B\'s own-key summary is not on the platform bill');
});

test('quotas: per plan, a custom one for an account, none for an own key; the request is refused once used up', { skip }, async () => {
  const thisMonth = new Date();
  await prisma.tenant.createMany({ data: [
    { id: 'Q1', name: 'Quota shop', email: 'q1@t', passwordHash: 'x', plan: 'STARTER' },
    { id: 'Q2', name: 'Custom', email: 'q2@t', passwordHash: 'x', plan: 'STARTER', customFeatures: { aiQuota: { monthlyTokens: 5000 } } },
    { id: 'Q3', name: 'Own key', email: 'q3@t', passwordHash: 'x', plan: 'STARTER', customFeatures: { aiSettings: { geminiKey: 'own' } } },
    { id: 'Q4', name: 'Pro', email: 'q4@t', passwordHash: 'x', plan: 'PRO' }
  ] });
  await prisma.aiUsage.createMany({ data: ['Q1', 'Q2', 'Q4'].map(tenantId => ({ tenantId, feature: 'agent_reply', model: 'm', sharedKey: true, inputTokens: 900, outputTokens: 100, createdAt: thisMonth })) });

  assert.strictEqual((await quota.quotaFor('Q1')).limit, null, 'no quota set yet: no limit');
  await assert.rejects(quota.savePlanQuotas({ STARTER: -5 }), (e) => e.status === 400);
  const saved = await quota.savePlanQuotas({ STARTER: 1000, PRO: '' });
  assert.deepStrictEqual(saved, { FREE: null, STARTER: 1000, ADVANCED: null, PRO: null, ENTERPRISE: null });
  assert.strictEqual((await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } })).data.aiInputPricePerMillionUsd, 0.5, 'the other settings are kept');

  const q1 = await quota.quotaFor('Q1');
  assert.deepStrictEqual([q1.limit, q1.used, q1.percent, q1.source], [1000, 1000, 100, 'plan']);
  await assert.rejects(quota.assertWithinQuota('Q1'), (e) => e.code === 'AI_QUOTA_EXCEEDED' && e.status === 429);

  const q2 = await quota.quotaFor('Q2');
  assert.deepStrictEqual([q2.limit, q2.source, q2.percent], [5000, 'account', 20]);
  await quota.assertWithinQuota('Q2');
  assert.strictEqual((await quota.quotaFor('Q3')).ownKey, true);
  await quota.assertWithinQuota('Q4');

  const report = await usage.platformUsage();
  assert.strictEqual(report.planQuotas.STARTER, 1000);
  assert.strictEqual(report.tenants.find(t => t.tenantId === 'Q1').quota.percent, 100);
  assert.strictEqual((await usage.tenantUsage('Q2')).quota.limit, 5000, 'the account sees its quota');
});
