const crypto = require('crypto');
const logger = require('./logger');

/**
 * Runs work on one key (a conversation, a ticket, a tenant's ticket counter) one call at a time.
 * Inside this process calls queue up in order; across processes a Redis lock (SET NX PX) keeps
 * them apart. Without Redis it still protects everything inside this process.
 *
 * Do not nest withLock calls on the same key: the inner call would wait for the outer one forever.
 */

const local = new Map(); // key → promise that settles when the last queued call is done

async function withLocalLock(key, fn) {
  const previous = local.get(key) || Promise.resolve();
  let release;
  const mine = new Promise(resolve => { release = resolve; });
  const tail = previous.then(() => mine);
  local.set(key, tail);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (local.get(key) === tail) local.delete(key);
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Delete the lock only if it is still ours (it may have expired and been taken by someone else)
const RELEASE_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

function redis() {
  try {
    const { redisClient } = require('../config/redis');
    return redisClient && redisClient.status === 'ready' ? redisClient : null;
  } catch {
    return null;
  }
}

async function withLock(key, fn, { ttlMs = 30000, waitMs = 20000 } = {}) {
  return withLocalLock(key, async () => {
    const client = redis();
    if (!client) return fn();

    const redisKey = `lock:${key}`;
    const token = crypto.randomUUID();
    const deadline = Date.now() + waitMs;
    let acquired = false;
    try {
      while (!acquired) {
        acquired = (await client.set(redisKey, token, 'PX', ttlMs, 'NX')) === 'OK';
        if (acquired || Date.now() > deadline) break;
        await sleep(40 + Math.random() * 60);
      }
    } catch (err) {
      logger.warn(`[Lock] Redis lock on ${key} failed: ${err.message}`);
    }
    // Better to go on than to drop a customer message; the database checks still apply
    if (!acquired) logger.warn(`[Lock] ${key} still busy after ${waitMs}ms, continuing without the lock`);

    try {
      return await fn();
    } finally {
      if (acquired) client.eval(RELEASE_SCRIPT, 1, redisKey, token).catch(() => {});
    }
  });
}

module.exports = { withLock };
