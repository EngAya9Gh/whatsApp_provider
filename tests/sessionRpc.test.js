// Calls on the WhatsApp QR sessions from another process (api → whatsapp-sessions): results come back,
// the service's errors come back as thrown, images survive the trip, and a missing sessions process
// answers 503 instead of hanging. Needs TEST_REDIS_HOST.
const { test, after } = require('node:test');
const assert = require('node:assert');
const { fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_REDIS_HOST');
process.env.QR_SESSION_RPC_TIMEOUT_MS = '1500';

let rpc;
after(async () => {
  if (skip) return;
  await rpc?.close();
});

test('api → sessions process → api', { skip, timeout: 30000 }, async () => {
  rpc = require(fromRoot('src/modules/whatsapp/session.rpc'));
  const { Queue } = require(fromRoot('node_modules/bullmq'));
  const { bullConnection } = require(fromRoot('src/config/redis'));
  const q = new Queue(rpc.QUEUE_NAME, { connection: bullConnection });
  await q.obliterate({ force: true }).catch(() => {});
  await q.close();

  // Nobody holds the sessions: a clear error after the timeout, and the call is withdrawn
  const started = Date.now();
  await assert.rejects(rpc.call('sendTextMessage', ['t1', '966500000001', 'hello']), (e) => e.status === 503 && /sessions process/.test(e.message));
  assert.ok(Date.now() - started >= 1400, 'waited for the timeout');

  const seen = [];
  rpc.startWorker({
    sendTextMessage: async (tenantId, phone, text) => { seen.push([tenantId, phone, text]); return { key: { id: 'ABC', remoteJid: `${phone}@s.whatsapp.net` }, status: 1 }; },
    sendButtons: async (tenantId, phone, text, buttons, image) => ({ bytes: image.length, isBuffer: Buffer.isBuffer(image), buttons: buttons.length }),
    getGroups: async () => { throw { status: 400, message: 'WhatsApp session is not connected' }; },
    getQr: async () => undefined,
    boom: async () => { throw new Error('socket closed'); }
  });

  assert.deepStrictEqual(await rpc.call('sendTextMessage', ['t1', '966500000002', 'hi']), { key: { id: 'ABC', remoteJid: '966500000002@s.whatsapp.net' }, status: 1 });
  assert.deepStrictEqual(seen, [['t1', '966500000002', 'hi']], 'the withdrawn call never ran');
  assert.deepStrictEqual(await rpc.call('sendButtons', ['t1', '966500000002', 'x', [{ text: 'A' }], Buffer.alloc(10, 1)]), { bytes: 10, isBuffer: true, buttons: 1 });
  assert.strictEqual(await rpc.call('getQr', ['t1']), null, 'no QR yet');
  await assert.rejects(rpc.call('getGroups', ['t1']), (e) => e.status === 400 && /not connected/.test(e.message));
  await assert.rejects(rpc.call('boom', []), (e) => e.status === 500 && /socket closed/.test(e.message));
  await assert.rejects(rpc.call('nope', []), (e) => e.status === 400 && /Unknown/.test(e.message));
});
