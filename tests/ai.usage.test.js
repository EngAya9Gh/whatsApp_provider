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
