// Alerts: which facts of a System health report count as a problem worth a message.
const { test } = require('node:test');
const assert = require('node:assert');
const { fromRoot } = require('./helpers/env');

const { problems, WAITING_LIMIT } = require(fromRoot('src/services/alertScheduler'));

const healthy = () => ({
  redis: { connected: true },
  mysql: { connected: true },
  mongo: { connected: true },
  process: { qrSessionsRemote: false },
  queues: [
    { name: 'meta-webhook-queue', en: 'Incoming Meta messages', workers: 2, counts: { waiting: 3 } },
    { name: 'meta-campaign-queue', en: 'Meta campaigns', workers: 1, counts: { waiting: 0 } },
    { name: 'campaign-queue', en: 'QR campaigns', workers: 0, counts: { waiting: 0 } },
    { name: 'wa-session-rpc', en: 'QR number calls', workers: 0, counts: { waiting: 0 } }
  ],
  latency: [
    { name: 'inbound.total', en: 'Incoming message', count: 50, p95: 900, targetMs: 2000, windowMinutes: 5 },
    { name: 'inbox.list', en: 'Opening the inbox', count: 3, p95: 5000, targetMs: 300, windowMinutes: 5 }
  ]
});

test('a healthy platform raises nothing: QR campaigns and session calls need no worker here, few slow samples do not count', () => {
  assert.deepStrictEqual(problems(healthy()), []);
});

test('a missing worker, a backlog, a slow path and a database down are each one problem', () => {
  const h = healthy();
  h.queues[0].workers = 0;
  h.queues[1].counts.waiting = WAITING_LIMIT + 1;
  h.latency[0].p95 = 4500;
  h.mongo.connected = false;
  const keys = problems(h).map(p => p.key);
  assert.deepStrictEqual(keys, ['mongo', 'noworker:meta-webhook-queue', 'backlog:meta-campaign-queue', 'slow:inbound.total']);
  assert.match(problems(h).find(p => p.key === 'slow:inbound.total').text, /p95 4500 ms .*target 2000 ms/);
});

test('with the QR numbers in their own process, their call queue needs a worker', () => {
  const h = healthy();
  h.process.qrSessionsRemote = true;
  assert.deepStrictEqual(problems(h).map(p => p.key), ['noworker:wa-session-rpc']);
  h.queues[3].workers = 1;
  assert.deepStrictEqual(problems(h), []);
});
