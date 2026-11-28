// Platform speed on System health: timings recorded per minute in Redis and summarised as count / p50 /
// p95 / max over the last minutes. Needs TEST_REDIS_HOST.
const { test, after } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_REDIS_HOST');
inject('@prisma/client', { PrismaClient: class { async $queryRaw() { return [{ 1: 1 }]; } } });

let redisClient;
let health;
after(async () => {
  if (skip) return;
  await health?.close();
  await redisClient?.quit();
});

test('timings are summarised per metric and shown by System health', { skip, timeout: 20000 }, async () => {
  ({ redisClient } = require(fromRoot('src/config/redis')));
  const metrics = require(fromRoot('src/services/metrics'));

  // Before Redis is connected recording is a no-op, not an error, and the summary is empty
  metrics.record('inbox.list', 12);
  assert.deepStrictEqual((await metrics.summary()).map(m => m.count), metrics.METRICS.map(() => 0));

  await redisClient.connect();
  const old = await redisClient.keys('metrics:*');
  if (old.length) await redisClient.del(old);

  for (const ms of [10, 20, 30, 40, 50, 60, 70, 80, 90, 1000]) metrics.record('inbox.list', ms);
  await metrics.timed('inbound.total', () => new Promise(resolve => setTimeout(resolve, 30)));
  await assert.rejects(metrics.timed('inbound.total', async () => { throw new Error('boom'); }), /boom/);
  await new Promise(resolve => setTimeout(resolve, 100)); // the fire-and-forget writes

  const rows = await metrics.summary();
  const inbox = rows.find(r => r.name === 'inbox.list');
  assert.strictEqual(inbox.count, 10);
  assert.strictEqual(inbox.p50, 50);
  assert.strictEqual(inbox.p95, 1000, 'one slow case out of ten shows up in p95');
  assert.strictEqual(inbox.max, 1000);
  assert.ok(inbox.ar && inbox.en, 'labels in both languages');
  const inbound = rows.find(r => r.name === 'inbound.total');
  assert.strictEqual(inbound.count, 2, 'a call that threw is timed too');
  assert.ok(inbound.max >= 25, `max ${inbound.max} covers the 30 ms wait`);
  assert.strictEqual(rows.find(r => r.name === 'status.total').count, 0);

  health = require(fromRoot('src/modules/admin/system.health'));
  const h = await health.getHealth();
  assert.strictEqual(h.latency.find(r => r.name === 'inbox.list').p95, 1000);
});
