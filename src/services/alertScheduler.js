// Tells someone when the platform is in trouble, so nobody has to watch System health: every minute the
// background process checks the same facts the page shows and posts a message to ALERT_WEBHOOK_URL
// (a Slack / Discord / Google Chat incoming webhook, or any URL that takes JSON { text, content }).
// A problem is reported once per ALERT_REPEAT_MINUTES (default 30) while it lasts, and once more when it
// is over. Without ALERT_WEBHOOK_URL the alerts only go to the log.
const logger = require('../utils/logger');

const CHECK_MS = 60 * 1000;
const REPEAT_MS = Number(process.env.ALERT_REPEAT_MINUTES || 30) * 60 * 1000;
const WAITING_LIMIT = Number(process.env.ALERT_QUEUE_WAITING || 500);
const MIN_SAMPLES = 20;
const LOCK_KEY = 'lock:alerts';
const ACTIVE_KEY = 'alerts:active';

let intervalId = null;
let running = false;

/** The problems in a health report (admin/system.health.js getHealth()): [{ key, text }] */
function problems(h) {
  const out = [];
  if (!h.redis?.connected) out.push({ key: 'redis', text: 'Redis is not connected' });
  if (!h.mysql?.connected) out.push({ key: 'mysql', text: 'MySQL is not connected' });
  if (!h.mongo?.connected) out.push({ key: 'mongo', text: 'MongoDB is not connected' });
  for (const q of h.queues || []) {
    if (q.error) continue;
    // QR campaigns only have a worker while a QR number is connected; the session calls only when the
    // numbers run in their own process
    const needsWorker = q.name !== 'campaign-queue' && (q.name !== 'wa-session-rpc' || h.process?.qrSessionsRemote);
    if (needsWorker && q.workers === 0) out.push({ key: `noworker:${q.name}`, text: `No worker on ${q.en} (${q.name})` });
    if ((q.counts?.waiting || 0) > WAITING_LIMIT) out.push({ key: `backlog:${q.name}`, text: `${q.counts.waiting} jobs waiting on ${q.en} (${q.name})` });
  }
  for (const m of h.latency || []) {
    if (m.targetMs && m.count >= MIN_SAMPLES && m.p95 > 2 * m.targetMs) {
      out.push({ key: `slow:${m.name}`, text: `${m.en}: p95 ${m.p95} ms over the last ${m.windowMinutes} min (target ${m.targetMs} ms)` });
    }
  }
  return out;
}

async function notify(text) {
  logger.warn(`[Alerts] ${text}`);
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text }) });
    if (!res.ok) logger.error(`[Alerts] The webhook answered ${res.status}`);
  } catch (err) {
    logger.error(`[Alerts] The webhook failed: ${err.message}`);
  }
}

/** One check: new problems are announced, ones that went away are announced as resolved */
async function run() {
  const { redisClient } = require('../config/redis');
  if (redisClient.status !== 'ready') return null;
  const locked = (await redisClient.set(LOCK_KEY, String(process.pid), 'PX', CHECK_MS - 5000, 'NX')) === 'OK';
  if (!locked) return null;

  const health = await require('../modules/admin/system.health').getHealth();
  const current = problems(health);
  const currentKeys = new Set(current.map(p => p.key));
  const active = await redisClient.smembers(ACTIVE_KEY);

  const fresh = [];
  for (const p of current) {
    // Once per REPEAT_MS per problem
    if ((await redisClient.set(`alerts:sent:${p.key}`, '1', 'PX', REPEAT_MS, 'NX')) === 'OK') fresh.push(p);
  }
  const resolved = active.filter(k => !currentKeys.has(k));
  if (current.length) await redisClient.sadd(ACTIVE_KEY, ...current.map(p => p.key));
  if (resolved.length) {
    await redisClient.srem(ACTIVE_KEY, ...resolved);
    await redisClient.del(...resolved.map(k => `alerts:sent:${k}`));
  }

  if (fresh.length) await notify(`🚨 Wakeel: ${fresh.map(p => p.text).join(' · ')}`);
  if (resolved.length) await notify(`✅ Wakeel: resolved — ${resolved.join(', ')}`);
  return { problems: current, announced: fresh.map(p => p.key), resolved };
}

async function tick() {
  if (running) return;
  running = true;
  try {
    await run();
  } catch (err) {
    logger.error(`[Alerts] Check failed: ${err.message}`);
  } finally {
    running = false;
  }
}

function start() {
  if (intervalId) return;
  setTimeout(tick, 90 * 1000).unref();
  intervalId = setInterval(tick, CHECK_MS);
  intervalId.unref();
  logger.info(`[Alerts] Platform checks every minute${process.env.ALERT_WEBHOOK_URL ? ', sent to the alert webhook' : ' (log only: set ALERT_WEBHOOK_URL to be notified)'}`);
}

function stop() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

module.exports = { start, stop, run, problems, WAITING_LIMIT };
