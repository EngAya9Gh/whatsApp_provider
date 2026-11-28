// Timings of the paths that decide how fast the platform feels: a customer's message from Meta to the
// agent's screen, delivery statuses, the webhook handler, and opening the inbox. Each sample goes to a
// Redis list per metric per minute, kept 15 minutes; System health shows the last WINDOW_MINUTES as
// count / p50 / p95 / max. Every process (api, worker) writes to the same keys, so the page sees the
// platform as a whole. Recording never throws and never waits: a Redis problem must not slow down the
// very paths it measures.
const { redisClient } = require('../config/redis');

// targetMs: what p95 should stay under (System health shows it in red above that; alerts fire at twice it)
const METRICS = [
  { name: 'webhook.handle', ar: 'استلام Webhook من ميتا ووضعه في الطابور', en: 'Meta webhook: received and queued', targetMs: 500 },
  { name: 'inbound.wait', ar: 'رسالة واردة: الانتظار في الطابور', en: 'Incoming message: queue wait', targetMs: 1000 },
  { name: 'inbound.total', ar: 'رسالة واردة: من ميتا حتى شاشة الموظف', en: 'Incoming message: Meta → agent screen', targetMs: 2000 },
  { name: 'status.total', ar: 'حالة تسليم: من ميتا حتى تحديثها', en: 'Delivery status: Meta → updated', targetMs: 3000 },
  { name: 'inbox.list', ar: 'فتح قائمة المحادثات', en: 'Opening the inbox', targetMs: 300 },
  { name: 'inbox.messages', ar: 'فتح محادثة', en: 'Opening a conversation', targetMs: 300 }
];
const WINDOW_MINUTES = 5;
const KEEP_SECONDS = 15 * 60;
const MAX_SAMPLES_PER_MINUTE = 5000;

const minuteKey = (name, minute) => `metrics:${name}:${minute}`;
const currentMinute = () => Math.floor(Date.now() / 60000);

/** Stores one duration in milliseconds. Fire-and-forget. */
function record(name, ms) {
  if (redisClient.status !== 'ready') return;
  const key = minuteKey(name, currentMinute());
  redisClient.multi()
    .lpush(key, Math.max(0, Math.round(ms)))
    .ltrim(key, 0, MAX_SAMPLES_PER_MINUTE - 1)
    .expire(key, KEEP_SECONDS)
    .exec()
    .catch(() => {});
}

/** Runs fn and records how long it took, whether it returned or threw */
async function timed(name, fn) {
  const started = Date.now();
  try {
    return await fn();
  } finally {
    record(name, Date.now() - started);
  }
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];

/** Count, p50, p95 and max of every metric over the last WINDOW_MINUTES minutes */
async function summary() {
  if (redisClient.status !== 'ready') return METRICS.map(m => ({ ...m, count: 0, windowMinutes: WINDOW_MINUTES }));
  const now = currentMinute();
  const pipeline = redisClient.pipeline();
  for (const m of METRICS) {
    for (let i = 0; i < WINDOW_MINUTES; i++) pipeline.lrange(minuteKey(m.name, now - i), 0, -1);
  }
  const results = await pipeline.exec();
  return METRICS.map((m, index) => {
    const values = [];
    for (let i = 0; i < WINDOW_MINUTES; i++) {
      const [err, list] = results[index * WINDOW_MINUTES + i] || [null, []];
      if (!err && list) for (const v of list) values.push(Number(v));
    }
    if (!values.length) return { ...m, count: 0, windowMinutes: WINDOW_MINUTES };
    values.sort((a, b) => a - b);
    return {
      ...m,
      windowMinutes: WINDOW_MINUTES,
      count: values.length,
      p50: percentile(values, 0.5),
      p95: percentile(values, 0.95),
      max: values[values.length - 1]
    };
  });
}

module.exports = { METRICS, WINDOW_MINUTES, record, timed, summary };
