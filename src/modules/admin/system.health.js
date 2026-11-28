const { Queue } = require('bullmq');
const mongoose = require('mongoose');
const config = require('../../config/env');
const { redisClient, bullConnection } = require('../../config/redis');
const { role } = require('../../config/processRole');

const prisma = require('../../config/prisma');

// The background queues and what they carry
const QUEUES = [
  { name: 'meta-webhook-queue', ar: 'رسائل العملاء الواردة من Meta', en: 'Incoming Meta messages' },
  { name: 'meta-campaign-queue', ar: 'حملات Meta', en: 'Meta campaigns' },
  { name: 'campaign-queue', ar: 'حملات الربط بالباركود', en: 'QR campaigns' }
];
const queues = new Map(); // one read-only Queue object per name, reused between calls

const queueOf = (name) => {
  if (!queues.has(name)) queues.set(name, new Queue(name, { connection: bullConnection }));
  return queues.get(name);
};

/** "key:value" lines of Redis INFO → object */
const parseInfo = (text) => Object.fromEntries(
  String(text || '').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#') && line.includes(':'))
    .map(line => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1)])
);

const timed = async (fn) => {
  const started = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - started };
};

async function redisHealth() {
  const base = { host: config.redis.host, port: config.redis.port, status: redisClient.status };
  if (redisClient.status !== 'ready') return { ...base, connected: false, error: 'The server is not connected to Redis' };
  try {
    const ping = await timed(() => redisClient.ping());
    const [info, memory, policy, keys] = await Promise.all([
      redisClient.info('server'),
      redisClient.info('memory'),
      redisClient.config('GET', 'maxmemory-policy').catch(() => null),
      redisClient.dbsize()
    ]);
    const server = parseInfo(info);
    const mem = parseInfo(memory);
    const clients = parseInfo(await redisClient.info('clients'));
    return {
      ...base,
      connected: ping.value === 'PONG',
      pingMs: ping.ms,
      version: server.redis_version,
      uptimeSeconds: Number(server.uptime_in_seconds) || 0,
      usedMemory: mem.used_memory_human,
      maxMemory: mem.maxmemory_human,
      // BullMQ needs "noeviction": with any other policy Redis may delete queued jobs when memory is full
      evictionPolicy: Array.isArray(policy) ? policy[1] : mem.maxmemory_policy || null,
      connectedClients: Number(clients.connected_clients) || 0,
      keys
    };
  } catch (err) {
    return { ...base, connected: false, error: err.message };
  }
}

async function queueHealth(def) {
  const queue = queueOf(def.name);
  try {
    const [counts, workers, paused, failed] = await Promise.all([
      queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed', 'paused', 'prioritized'),
      queue.getWorkers(),
      queue.isPaused(),
      queue.getFailed(0, 4)
    ]);
    return {
      ...def,
      workers: workers.length,
      paused,
      counts: { ...counts, waiting: (counts.waiting || 0) + (counts.prioritized || 0) },
      // Reason and time only: job data holds customers' phone numbers and messages
      recentFailures: failed.filter(Boolean).map(job => ({
        id: job.id,
        reason: String(job.failedReason || '').slice(0, 300),
        attempts: job.attemptsMade,
        at: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
      }))
    };
  } catch (err) {
    return { ...def, error: err.message };
  }
}

/** Removes the failed jobs of one queue (their reasons were already shown); returns how many */
async function cleanFailed(name) {
  if (!QUEUES.some(q => q.name === name)) throw { status: 404, message: 'Unknown queue' };
  let removed = 0;
  // In batches, so a long list does not block Redis
  for (;;) {
    const batch = await queueOf(name).clean(0, 1000, 'failed');
    removed += batch.length;
    if (batch.length < 1000) return removed;
  }
}

async function getHealth() {
  const [redis, queueList, mysql] = await Promise.all([
    redisHealth(),
    Promise.all(QUEUES.map(queueHealth)),
    timed(() => prisma.$queryRaw`SELECT 1`).then(r => ({ connected: true, pingMs: r.ms })).catch(err => ({ connected: false, error: err.message }))
  ]);
  return {
    checkedAt: new Date().toISOString(),
    process: {
      role,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      node: process.version
    },
    redis,
    mysql,
    mongo: { connected: mongoose.connection.readyState === 1 },
    queues: queueList
  };
}

/** Close the Queue objects opened above (graceful shutdown and tests) */
async function close() {
  await Promise.all([...queues.values()].map(q => q.close().catch(() => {})));
  queues.clear();
}

module.exports = { getHealth, cleanFailed, close, QUEUES };
