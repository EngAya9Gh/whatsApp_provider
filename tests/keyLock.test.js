// withLock: one call at a time per key, in order, released after errors; with Redis it also waits for
// another process that holds the key.
const { test } = require('node:test');
const assert = require('node:assert');
const { fromRoot } = require('./helpers/env');

const { withLock } = require(fromRoot('src/utils/keyLock'));
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test('same key: one at a time, in arrival order; other keys run in parallel', async () => {
  const log = [];
  const job = (key, name, ms) => withLock(key, async () => { log.push(`${name}+`); await sleep(ms); log.push(`${name}-`); return name; });
  const results = await Promise.all([job('a', 'a1', 30), job('a', 'a2', 5), job('b', 'b1', 5), job('a', 'a3', 1)]);
  assert.deepStrictEqual(results, ['a1', 'a2', 'b1', 'a3']);
  const onA = log.filter(l => l.startsWith('a'));
  assert.deepStrictEqual(onA, ['a1+', 'a1-', 'a2+', 'a2-', 'a3+', 'a3-'], 'no overlap on the same key');
  assert.ok(log.indexOf('b1+') < log.indexOf('a1-'), 'key b did not wait for key a');
});

test('an error releases the key and reaches the caller', async () => {
  await assert.rejects(withLock('e', async () => { throw new Error('boom'); }), /boom/);
  assert.strictEqual(await withLock('e', async () => 'next'), 'next');
});

test('with Redis: waits while another process holds the key', { skip: !process.env.TEST_REDIS_HOST && 'TEST_REDIS_HOST is not set' }, async () => {
  const { redisClient } = require(fromRoot('src/config/redis'));
  await redisClient.connect();
  try {
    await redisClient.set('lock:shared', 'someone-else', 'PX', 5000);
    setTimeout(() => redisClient.del('lock:shared'), 300); // the other process finishes
    const started = Date.now();
    await withLock('shared', async () => {
      assert.ok(Date.now() - started >= 250, 'waited for the other process');
      assert.notStrictEqual(await redisClient.get('lock:shared'), 'someone-else', 'now holds the key itself');
    });
    assert.strictEqual(await redisClient.get('lock:shared'), null, 'released afterwards');
  } finally {
    await redisClient.quit();
  }
});
