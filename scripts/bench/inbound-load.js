#!/usr/bin/env node
// Sends fake WhatsApp messages to the Meta webhook of a running server, the way Meta would (signed with
// the app secret), at a steady rate from many customers, and reports how fast the server acknowledged
// them. With ADMIN_TOKEN it then waits for the webhook queue to empty and prints System health's speed
// table. See README.md. Never point it at production.
const crypto = require('crypto');

const env = (name, fallback) => (process.env[name] === undefined || process.env[name] === '' ? fallback : process.env[name]);
const BASE_URL = env('BASE_URL', 'http://localhost:3000').replace(/\/+$/, '');
const PHONE_NUMBER_ID = env('PHONE_NUMBER_ID');
const APP_SECRET = env('APP_SECRET');
const RATE = Number(env('RATE', 20));
const SECONDS = Number(env('SECONDS', 30));
const CUSTOMERS = Number(env('CUSTOMERS', 200));
const PHONE_PREFIX = env('PHONE_PREFIX', '96655');
const ADMIN_TOKEN = env('ADMIN_TOKEN');

if (!PHONE_NUMBER_ID || !APP_SECRET) {
  console.error('Set PHONE_NUMBER_ID (a Meta number of a test account on that server) and APP_SECRET (its META_APP_SECRET).');
  process.exit(1);
}

const runId = Date.now().toString(36);
const phoneOf = (i) => PHONE_PREFIX + String(i % CUSTOMERS).padStart(7, '0');

function webhookBody(n) {
  const phone = phoneOf(n);
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'BENCH_WABA',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '0', phone_number_id: PHONE_NUMBER_ID },
          contacts: [{ profile: { name: `Load test ${n % CUSTOMERS}` }, wa_id: phone }],
          messages: [{
            from: phone,
            id: `wamid.bench.${runId}.${n}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: 'text',
            text: { body: `load test message ${n}` }
          }]
        }
      }]
    }]
  });
}

const ackTimes = [];
let errors = 0;

async function send(n) {
  const body = webhookBody(n);
  const signature = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
  const started = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/v1/meta/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': signature },
      body
    });
    if (res.status !== 200) errors++;
  } catch {
    errors++;
  }
  ackTimes.push(Date.now() - started);
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: sorted.length, p50: percentile(sorted, 0.5), p95: percentile(sorted, 0.95), max: sorted[sorted.length - 1] };
};

async function health() {
  const res = await fetch(`${BASE_URL}/api/admin/system/health`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
  if (!res.ok) throw new Error(`System health answered ${res.status}: check ADMIN_TOKEN`);
  return (await res.json()).data;
}

(async () => {
  console.log(`Sending ${RATE} messages/s for ${SECONDS} s from ${CUSTOMERS} customers to ${BASE_URL} (number ${PHONE_NUMBER_ID})`);
  const startedAt = Date.now();
  let n = 0;
  const inFlight = new Set();
  for (let second = 0; second < SECONDS; second++) {
    const tick = Date.now();
    for (let i = 0; i < RATE; i++) {
      const p = send(n++).finally(() => inFlight.delete(p));
      inFlight.add(p);
    }
    const wait = 1000 - (Date.now() - tick);
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    if ((second + 1) % 10 === 0) console.log(`  ${second + 1} s: ${n} sent, ${errors} errors, ack p95 so far ${stats(ackTimes).p95} ms`);
  }
  await Promise.all(inFlight);
  const ack = stats(ackTimes);
  console.log(`\nSent ${n} messages in ${((Date.now() - startedAt) / 1000).toFixed(1)} s, ${errors} errors`);
  console.log(`Webhook acknowledged in: p50 ${ack.p50} ms, p95 ${ack.p95} ms, max ${ack.max} ms`);

  if (!ADMIN_TOKEN) {
    console.log('\nNow read System health → Platform speed (set ADMIN_TOKEN to have it printed here).');
    return;
  }
  process.stdout.write('\nWaiting for the webhook queue to empty');
  const deadline = Date.now() + 10 * 60 * 1000;
  let h;
  for (;;) {
    h = await health();
    const q = h.queues.find(x => x.name === 'meta-webhook-queue');
    const pending = (q?.counts?.waiting || 0) + (q?.counts?.active || 0) + (q?.counts?.delayed || 0);
    if (!pending || Date.now() > deadline) {
      console.log(pending ? ` (gave up with ${pending} still pending)` : ' done.');
      console.log(`Queue: ${q?.workers || 0} workers, ${q?.counts?.failed || 0} failed jobs in total`);
      break;
    }
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  console.log(`\nPlatform speed over the last ${h.latency?.[0]?.windowMinutes || 5} minutes (ms):`);
  console.table((h.latency || []).map(m => ({ path: m.en, count: m.count, p50: m.p50 ?? '', p95: m.p95 ?? '', max: m.max ?? '' })));
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
