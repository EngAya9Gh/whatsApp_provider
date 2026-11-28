// The api without the QR sessions (PROCESS_ROLE=api, QR_SESSIONS=remote): session calls go to the
// sessions process, reads of the database stay local, and the QR campaign worker is not started here.
const { test } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

process.env.PROCESS_ROLE = 'api';
process.env.QR_SESSIONS = 'remote';

const calls = [];
inject(fromRoot('src/modules/whatsapp/session.rpc'), { call: async (method, args) => { calls.push([method, args]); return { ok: method }; } });
inject('@prisma/client', { PrismaClient: class { constructor() { this.tenant = { findUnique: async () => ({ sessionStatus: 'CONNECTED', whatsappPhone: '966500000000' }) }; } } });

test('roles: api with remote sessions holds no sessions; the sessions role holds them and nothing else', () => {
  const roles = require(fromRoot('src/config/processRole'));
  assert.deepStrictEqual([roles.role, roles.servesHttp, roles.runsBackground, roles.runsSessions], ['api', true, false, false]);
});

test('session calls are forwarded, database reads are not', async () => {
  const service = require(fromRoot('src/modules/whatsapp/whatsapp.service'));
  assert.deepStrictEqual(await service.sendTextMessage('t1', '966500000001', 'hello'), { ok: 'sendTextMessage' });
  assert.deepStrictEqual(await service.getQr('t1'), { ok: 'getQr' });
  assert.deepStrictEqual(calls, [['sendTextMessage', ['t1', '966500000001', 'hello']], ['getQr', ['t1']]]);
  assert.deepStrictEqual(await service.getStatus('t1'), { sessionStatus: 'CONNECTED', whatsappPhone: '966500000000' });
  assert.strictEqual(calls.length, 2, 'getStatus stayed local');
});

test('the QR campaign worker only runs where the sessions are', () => {
  const { campaignWorker } = require(fromRoot('src/workers/campaign.worker'));
  assert.strictEqual(campaignWorker, null);
});
