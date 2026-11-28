// Which numbers an account may work on: the owner, API keys and ADMIN employees every number; other
// employees their assigned number and their teams' numbers (every number when they have neither). The
// guard refuses another number in a route, body or query, and sending never uses another company's number.
const { test } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

let teams = [];
inject(fromRoot('src/models/mongo/Team'), { find: () => ({ select: () => ({ lean: async () => teams }) }) });

const lookups = [];
inject(fromRoot('src/config/prisma'), {
  whatsAppChannel: {
    findFirst: async ({ where }) => { lookups.push(where); return where.tenantId === 'T1' && where.id === 'c1' ? { id: 'c1', tenantId: 'T1', providerType: 'META_CLOUD' } : null; }
  }
});
inject(fromRoot('src/modules/whatsapp/whatsapp.service'), {});
inject(fromRoot('src/modules/meta/meta.service'), {});
inject(fromRoot('src/modules/billing/billing.service'), {});

const { allowedChannelIds, channelGuard } = require(fromRoot('src/modules/channels/channel.access'));
const messageService = require(fromRoot('src/modules/message/message.service'));

const employee = (subUser) => ({ isSubUser: true, tenant: { id: 'T1' }, subUser: { id: 'u1', role: 'AGENT', channelId: null, ...subUser } });

test('the owner, API keys and ADMIN employees have every number', async () => {
  teams = [{ channelIds: ['c2'] }];
  assert.strictEqual(await allowedChannelIds({ isSubUser: false, tenant: { id: 'T1' } }), null);
  assert.strictEqual(await allowedChannelIds({ isSubUser: false, isApiKey: true, tenant: { id: 'T1' } }), null);
  assert.strictEqual(await allowedChannelIds(employee({ role: 'ADMIN', channelId: 'c1' })), null);
});

test('other employees: their assigned number and their teams\' numbers, or every number with neither', async () => {
  teams = [{ channelIds: ['c2', 'c3'] }, { channelIds: ['c3'] }];
  assert.deepStrictEqual(await allowedChannelIds(employee({ channelId: 'c1' })), ['c1', 'c2', 'c3']);
  teams = [];
  assert.deepStrictEqual(await allowedChannelIds(employee({ role: 'MANAGER', channelId: 'c1' })), ['c1']);
  assert.strictEqual(await allowedChannelIds(employee({})), null);
});

test('the guard refuses another number in the route, body or query, and lets requests without one through', async () => {
  teams = [];
  const run = async (req) => {
    let status = null;
    let passed = false;
    await channelGuard(req, { status: (s) => { status = s; return { json: () => {} }; } }, () => { passed = true; });
    return passed ? 'next' : status;
  };
  const base = () => employee({ channelId: 'c1' });
  assert.strictEqual(await run({ ...base(), params: { channelId: 'c1' } }), 'next');
  assert.strictEqual(await run({ ...base(), params: { channelId: 'c2' } }), 403);
  assert.strictEqual(await run({ ...base(), body: { channel_id: 'c2' } }), 403);
  assert.strictEqual(await run({ ...base(), query: { channelId: 'c2' } }), 403);
  assert.strictEqual(await run({ ...base(), body: { phone: '9665' } }), 'next');
  assert.strictEqual(await run({ isSubUser: false, tenant: { id: 'T1' }, params: { channelId: 'c2' } }), 'next');
});

test('sending looks the number up within the company only', async () => {
  assert.strictEqual((await messageService._getChannel('c1', 'T1'))?.id, 'c1');
  assert.strictEqual(await messageService._getChannel('c1', 'T2'), null, 'another company\'s number is not used');
  assert.deepStrictEqual(lookups.at(-1), { id: 'c1', tenantId: 'T2' });
  await assert.rejects(messageService.sendMetaTemplate.call(messageService, 'T2', '9665', 'hello', 'en', [], 'c1', { campaign: true }),
    (err) => err.status === 400 && /Invalid Meta Cloud channel/.test(err.message));
});
