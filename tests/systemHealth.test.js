// Admin "System health": Redis details, queue counts with the latest failure reasons, and clearing old
// failures. Needs TEST_REDIS_HOST.
const { test, after } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_REDIS_HOST');
inject('@prisma/client', { PrismaClient: class { async $queryRaw() { return [{ 1: 1 }]; } } });

let redisClient;
let queue;
let health;
after(async () => {
  if (skip) return;
  await queue?.obliterate({ force: true }).catch(() => {});
  await queue?.close();
  await health?.close();
  await redisClient?.quit();
});

test('health shows failures with their reason and age; clearing removes them', { skip, timeout: 20000 }, async () => {
  ({ redisClient } = require(fromRoot('src/config/redis')));
  await redisClient.connect();
  const { Queue, Worker } = require(fromRoot('node_modules/bullmq'));
  const { bullConnection } = require(fromRoot('src/config/redis'));
  health = require(fromRoot('src/modules/admin/system.health'));

  queue = new Queue('meta-webhook-queue', { connection: bullConnection });
  await queue.obliterate({ force: true }).catch(() => {});
  const worker = new Worker('meta-webhook-queue', async () => { throw new Error('text is not defined'); }, { connection: bullConnection });
  await queue.addBulk([1, 2, 3].map(i => ({ name: 'x', data: { phone: `96650000000${i}` } })));
  for (let i = 0; i < 40 && (await queue.getJobCounts('failed')).failed < 3; i++) await new Promise(r => setTimeout(r, 100));

  let h = await health.getHealth();
  assert.strictEqual(h.redis.connected, true);
  assert.ok(h.redis.version);
  const webhook = h.queues.find(q => q.name === 'meta-webhook-queue');
  assert.strictEqual(webhook.workers, 1);
  assert.strictEqual(webhook.counts.failed, 3);
  assert.strictEqual(webhook.recentFailures[0].reason, 'text is not defined');
  assert.ok(webhook.recentFailures[0].at, 'the failure time is there for "last one X ago"');
  assert.ok(!JSON.stringify(webhook.recentFailures).includes('9665'), 'no customer data in the health report');
  await worker.close();

  assert.strictEqual(await health.cleanFailed('meta-webhook-queue'), 3);
  h = await health.getHealth();
  assert.strictEqual(h.queues.find(q => q.name === 'meta-webhook-queue').counts.failed, 0);
  await assert.rejects(health.cleanFailed('not-a-queue'), (e) => e.status === 404);
});
