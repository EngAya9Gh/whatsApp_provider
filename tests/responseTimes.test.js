// Team response time (Meta analytics): measured in seconds, from the customer's first unanswered message,
// or from the moment a WhatsApp flow / its AI agent handed the chat to a person. Time the bot spent
// answering is not the team's. Also: a name the team gave a customer survives their next message.
const { test } = require('node:test');
const assert = require('node:assert');
const { pathToFileURL } = require('node:url');
const { fromRoot } = require('./helpers/env');

const { responseTimes } = require(fromRoot('src/modules/analytics/analytics.service'));
const { inboundName } = require(fromRoot('src/modules/chat/chat.service'));

const T0 = new Date('2026-11-17T09:00:00Z').getTime();
const at = (sec) => new Date(T0 + sec * 1000);
const msg = (sec, direction, extra = {}) => ({ threadId: 'th', direction, createdAt: at(sec), ...extra });
const inbound = (sec) => msg(sec, 'INBOUND');
const human = (sec, senderId = 'agent-1') => msg(sec, 'OUTBOUND', { senderId });
const bot = (sec, source = 'FLOW') => msg(sec, 'OUTBOUND', { isAutomated: true, source });
const handoff = (sec) => msg(sec, 'OUTBOUND', { isAutomated: true, isInternal: true, source: 'FLOW_HANDOFF' });
const seconds = (list) => responseTimes(list).pairs.map(p => p.ms / 1000);

test('a person answering: from the customer message to the reply, in seconds', () => {
  assert.deepStrictEqual(seconds([inbound(0), inbound(20), human(95)]), [95]);
});

test('while the flow and its AI agent answer, the team is not waiting; the clock starts at the hand-off', () => {
  const list = [inbound(0), bot(2), inbound(60), bot(63, 'FLOW_AI'), inbound(600), handoff(605), bot(606), human(665)];
  assert.deepStrictEqual(seconds(list), [60]);
  assert.strictEqual(responseTimes(list).pairs[0].senderId, 'agent-1');
});

test('the customer writing again after the hand-off does not restart the clock', () => {
  assert.deepStrictEqual(seconds([inbound(0), handoff(10), inbound(40), human(130)]), [120]);
});

test('an away message or keyword reply does not stop the clock', () => {
  assert.deepStrictEqual(seconds([inbound(0), msg(1, 'OUTBOUND', { isAutomated: true }), human(300)]), [300]);
});

test('a chat the AI agent fully answered leaves nobody waiting; one handed off and unanswered is waiting', () => {
  assert.strictEqual(responseTimes([inbound(0), bot(3, 'FLOW_AI')]).waiting.size, 0);
  const left = responseTimes([inbound(0), bot(3, 'FLOW_AI'), inbound(50), handoff(52)]);
  assert.deepStrictEqual([...left.waiting.values()], [at(52)]);
});

test('the dashboard shows seconds and minutes', async () => {
  const { useAnalyticsFormat } = await import(pathToFileURL(fromRoot('dashboard/src/composables/useAnalyticsFormat.js')).href);
  const ar = useAnalyticsFormat({ value: true });
  const en = useAnalyticsFormat({ value: false });
  assert.strictEqual(ar.duration(0.75), '45 ث');
  assert.strictEqual(en.duration(0.75), '45s');
  assert.strictEqual(ar.duration(200 / 60), '3د 20ث');
  assert.strictEqual(en.duration(5), '5 min');
  assert.strictEqual(en.duration(90), '1h 30m');
  assert.strictEqual(en.duration(null), '—');
});

test('a name the team set is kept when the customer writes again', () => {
  assert.strictEqual(inboundName({ contactName: 'زيد - عميل VIP', nameEditedAt: new Date() }, 'zaid'), 'زيد - عميل VIP');
  assert.strictEqual(inboundName({ contactName: '966500000001', nameEditedAt: null }, 'zaid'), 'zaid');
  assert.strictEqual(inboundName({ contactName: 'zaid', nameEditedAt: null }, null), 'zaid');
});
