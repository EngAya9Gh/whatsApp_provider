// One wallet, spend per channel: a paid channel (website widget) takes its monthly fee from the wallet
// with the channel on the ledger row, stops when the wallet does not cover it and starts again once it
// does; free kinds cost nothing; the Billing page gets what each channel cost this month, campaigns
// included. Prisma and the wallet are in-memory test doubles.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

let settings = {};
let tenant = {};
let channels = [];
let ledger = [];
let rows = [];
let balance = 0;

const fakePrisma = {
  systemSetting: { findUnique: async () => ({ data: settings }) },
  tenant: { findUnique: async () => tenant },
  whatsAppChannel: {
    create: async ({ data }) => { const c = { id: `ch${channels.length + 1}`, createdAt: new Date(), paidUntil: null, billingState: null, ...data }; channels.push(c); return c; },
    delete: async ({ where }) => { channels = channels.filter(c => c.id !== where.id); },
    update: async ({ where, data }) => Object.assign(channels.find(c => c.id === where.id), data),
    updateMany: async ({ where, data }) => {
      const hit = channels.filter(c => where.providerType.in.includes(c.providerType) && c.billingState !== null);
      hit.forEach(c => Object.assign(c, data));
      return { count: hit.length };
    },
    findMany: async ({ where }) => channels.filter(c => (where.tenantId ? c.tenantId === where.tenantId : true)
      && (!where.providerType || where.providerType.in.includes(c.providerType))
      && (!where.OR || c.paidUntil === null || c.paidUntil <= where.OR[1].paidUntil.lte))
  },
  walletTransaction: { findMany: async () => rows },
  campaign: { findMany: async () => [{ id: 'camp1', channelId: 'wa1', campaignType: 'META' }] }
};
inject('@prisma/client', { PrismaClient: class { constructor() { return fakePrisma; } } });
inject(fromRoot('src/modules/wallet/wallet.service'), {
  TYPES: { CAMPAIGN_CHARGE: 'CAMPAIGN_CHARGE', CHANNEL_FEE: 'CHANNEL_FEE', REFUND: 'REFUND' },
  debit: async (tenantId, entry) => {
    if (balance < entry.amount) throw { status: 400, code: 'INSUFFICIENT_BALANCE', message: 'Insufficient wallet balance' };
    balance -= entry.amount;
    ledger.push({ tenantId, ...entry });
    return entry;
  }
});

const billing = require(fromRoot('src/modules/channels/channel.billing'));
const webchat = require(fromRoot('src/modules/webchat/webchat.service'));

const NOW = new Date('2026-11-18T10:00:00Z');
const widget = (extra = {}) => {
  const c = { id: `w${channels.length + 1}`, tenantId: 'T', providerType: 'WEBCHAT', name: 'موقع المتجر', paidUntil: null, billingState: null, ...extra };
  channels.push(c);
  return c;
};

beforeEach(() => {
  settings = { channelPriceWebchat: 49 };
  tenant = { deductBalance: true };
  channels = [];
  ledger = [];
  rows = [];
  balance = 100;
});

test('a month later is the same day next month, or the month\'s last day', () => {
  assert.strictEqual(billing.addMonth(new Date('2026-01-31T09:00:00Z')).toISOString(), '2026-02-28T09:00:00.000Z');
  assert.strictEqual(billing.addMonth(new Date('2026-11-18T10:00:00Z')).toISOString(), '2026-12-18T10:00:00.000Z');
});

test('the fee comes from the one wallet, and the ledger row says which channel it was for', async () => {
  const c = widget();
  const out = await billing.chargeChannel(c, { now: NOW });
  assert.strictEqual(out.charged, true);
  assert.strictEqual(balance, 51);
  assert.strictEqual(ledger[0].type, 'CHANNEL_FEE');
  assert.strictEqual(ledger[0].channelKind, 'WEBCHAT');
  assert.strictEqual(ledger[0].channelId, c.id);
  assert.match(ledger[0].description, /ويدجت الموقع «موقع المتجر» — اشتراك شهري حتى 2026-12-18/);
  assert.strictEqual(c.billingState, 'ACTIVE');
  assert.strictEqual(c.paidUntil.toISOString(), '2026-12-18T10:00:00.000Z');
});

test('not enough balance: stopped, and on again once the wallet covers it', async () => {
  balance = 10;
  const c = widget({ paidUntil: new Date('2026-11-01T00:00:00Z'), billingState: 'ACTIVE' });
  assert.strictEqual((await billing.chargeChannel(c, { now: NOW })).state, 'UNPAID');
  assert.strictEqual(billing.isStopped(c), true);
  assert.strictEqual(ledger.length, 0);

  balance = 60;
  const result = await billing.chargeDue(NOW);
  assert.strictEqual(result.charged, 1);
  assert.strictEqual(c.billingState, 'ACTIVE');
  assert.strictEqual(c.paidUntil.toISOString(), '2026-12-18T10:00:00.000Z', 'a new month from today, not from the unpaid days');
});

test('still inside a paid month: it keeps working even if the next charge fails', async () => {
  balance = 0;
  const c = widget({ paidUntil: new Date('2026-11-25T00:00:00Z'), billingState: 'ACTIVE' });
  assert.strictEqual((await billing.chargeChannel(c, { now: NOW })).state, 'ACTIVE');
});

test('free kinds, and accounts without wallet charges, pay nothing', async () => {
  settings = {};
  const c = widget({ billingState: 'UNPAID' });
  assert.strictEqual((await billing.chargeDue(NOW)).freed, 1, 'a kind that became free switches its channels back on');
  assert.strictEqual(c.billingState, null);

  settings = { channelPriceWebchat: 49 };
  tenant = { deductBalance: false };
  const out = await billing.chargeChannel(widget(), { now: NOW });
  assert.strictEqual(out.charged, false);
  assert.strictEqual(balance, 100);
});

test('creating a paid widget takes its first month; without the balance it is not created', async () => {
  const created = await webchat.createWidget('T', { name: 'متجري' });
  assert.deepStrictEqual([created.billing.price, created.billing.state], [49, 'ACTIVE']);
  assert.strictEqual(balance, 51);

  balance = 5;
  await assert.rejects(webchat.createWidget('T', { name: 'ثاني' }), (e) => e.status === 402 && e.code === 'INSUFFICIENT_BALANCE');
  assert.strictEqual(channels.length, 1, 'the unpaid widget was removed');
});

test('spend this month per channel: fees, campaigns (also older untagged rows), refunds taken off', async () => {
  const c = widget({ id: 'web1', billingState: 'ACTIVE', paidUntil: new Date('2026-12-18T00:00:00Z') });
  channels.push({ id: 'wa1', tenantId: 'T', providerType: 'META_CLOUD', name: 'Rushd Ai', paidUntil: null, billingState: null });
  rows = [
    { amount: -49, channelKind: 'WEBCHAT', channelId: 'web1', referenceType: 'CHANNEL', referenceId: 'web1' },
    { amount: -12.5, channelKind: null, channelId: null, referenceType: 'CAMPAIGN', referenceId: 'camp1' },
    { amount: 2.5, channelKind: null, channelId: null, referenceType: 'CAMPAIGN', referenceId: 'camp1' }
  ];
  const out = await billing.spendByChannel('T', new Date('2026-11-01T00:00:00Z'));
  assert.deepStrictEqual(out.spentByKind, [{ kind: 'WEBCHAT', spent: 49 }, { kind: 'WHATSAPP', spent: 10 }]);
  assert.deepStrictEqual(out.spentByChannel.map(e => [e.kind, e.channelName, e.spent]), [['WEBCHAT', 'موقع المتجر', 49], ['WHATSAPP', 'Rushd Ai', 10]]);
  assert.deepStrictEqual(out.paidChannels.map(p => [p.id, p.kind, p.price, p.state]), [[c.id, 'WEBCHAT', 49, 'ACTIVE']]);
  assert.strictEqual(out.channelPrices.WEBCHAT, 49);
  assert.strictEqual(out.channelPrices.INSTAGRAM, null);
});
