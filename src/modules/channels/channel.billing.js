// Channels sold per channel (website widget now; Instagram and Messenger next) cost a monthly fee that is
// paid from the account's one wallet. Every wallet movement carries its channel, so the Billing page shows
// what each channel costs without a separate balance per channel.
//
// Prices are set by the admin (Settings → Channel prices, SAR per month); no price = free. The fee is
// charged when the channel is created and then every month; when the wallet does not cover it the channel
// is stopped (UNPAID) and starts again by itself once the wallet is topped up (hourly retry, or "Renew").
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');

const PRICE_KEYS = {
  WEBCHAT: 'channelPriceWebchat',
  INSTAGRAM: 'channelPriceInstagram',
  MESSENGER: 'channelPriceMessenger'
};
const PAID_PROVIDERS = Object.keys(PRICE_KEYS);
const LABEL_AR = { WEBCHAT: 'ويدجت الموقع', INSTAGRAM: 'انستغرام', MESSENGER: 'ماسنجر', WHATSAPP: 'واتساب', WHATSAPP_QR: 'واتساب (باركود)' };
// Kind of a channel in the wallet (WhatsApp Cloud numbers are "WHATSAPP")
const KIND_OF_PROVIDER = { META_CLOUD: 'WHATSAPP', BAILEYS: 'WHATSAPP_QR', WEBCHAT: 'WEBCHAT', INSTAGRAM: 'INSTAGRAM', MESSENGER: 'MESSENGER' };

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

async function settingsData() {
  return (await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } }))?.data || {};
}

/** Monthly price of a channel kind, or null when it is free */
function priceFrom(data, providerType) {
  const n = Number(data?.[PRICE_KEYS[providerType]]);
  return n > 0 ? round2(n) : null;
}

/** Same as campaigns: nothing is charged when wallet charges are off for the platform or the account */
const chargesOn = (data, tenant) => data?.enableWalletDeduction !== false && tenant?.deductBalance !== false;

/** One calendar month later (31 Jan → 28/29 Feb) */
function addMonth(date) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

const dayLabel = (d) => d.toISOString().slice(0, 10);

/**
 * Charges one month of a channel. Returns { charged, state, paidUntil, price }; never throws for a wallet
 * that does not cover it (the channel becomes UNPAID instead).
 */
async function chargeChannel(channel, { now = new Date(), data = null, tenant = null } = {}) {
  data = data || await settingsData();
  tenant = tenant || await prisma.tenant.findUnique({ where: { id: channel.tenantId }, select: { deductBalance: true } });
  const price = priceFrom(data, channel.providerType);
  if (!price || !chargesOn(data, tenant)) {
    if (channel.billingState) await prisma.whatsAppChannel.update({ where: { id: channel.id }, data: { billingState: null } });
    return { charged: false, state: null, paidUntil: channel.paidUntil || null, price: null };
  }

  const from = channel.paidUntil && new Date(channel.paidUntil) > now ? new Date(channel.paidUntil) : now;
  const until = addMonth(from);
  const walletService = require('../wallet/wallet.service');
  try {
    await walletService.debit(channel.tenantId, {
      amount: price,
      type: walletService.TYPES.CHANNEL_FEE,
      description: `${LABEL_AR[channel.providerType]} «${channel.name || ''}» — اشتراك شهري حتى ${dayLabel(until)}`,
      referenceType: 'CHANNEL',
      referenceId: channel.id,
      channelKind: KIND_OF_PROVIDER[channel.providerType],
      channelId: channel.id,
      createdBy: 'SYSTEM'
    });
  } catch (err) {
    if (err?.code !== 'INSUFFICIENT_BALANCE') throw err;
    // Still inside a paid month: keep it running until then
    const stillPaid = channel.paidUntil && new Date(channel.paidUntil) > now;
    const state = stillPaid ? 'ACTIVE' : 'UNPAID';
    await prisma.whatsAppChannel.update({ where: { id: channel.id }, data: { billingState: state } });
    return { charged: false, state, paidUntil: channel.paidUntil || null, price, insufficient: true };
  }
  await prisma.whatsAppChannel.update({ where: { id: channel.id }, data: { billingState: 'ACTIVE', paidUntil: until } });
  return { charged: true, state: 'ACTIVE', paidUntil: until, price };
}

/**
 * Every paid channel whose month is over: charge the next month. Channels of kinds that became free are
 * switched back on. Run by services/channelBillingScheduler.js.
 */
async function chargeDue(now = new Date()) {
  const data = await settingsData();
  const result = { charged: 0, unpaid: 0, freed: 0 };
  const freeProviders = PAID_PROVIDERS.filter(p => !priceFrom(data, p));
  if (freeProviders.length) {
    const freed = await prisma.whatsAppChannel.updateMany({ where: { providerType: { in: freeProviders }, billingState: { not: null } }, data: { billingState: null } });
    result.freed = freed.count;
  }
  const paidProviders = PAID_PROVIDERS.filter(p => priceFrom(data, p));
  if (!paidProviders.length) return result;

  const due = await prisma.whatsAppChannel.findMany({
    where: { providerType: { in: paidProviders }, OR: [{ paidUntil: null }, { paidUntil: { lte: now } }] },
    select: { id: true, tenantId: true, providerType: true, name: true, paidUntil: true, billingState: true },
    take: 500
  });
  const tenants = new Map();
  for (const channel of due) {
    try {
      if (!tenants.has(channel.tenantId)) tenants.set(channel.tenantId, await prisma.tenant.findUnique({ where: { id: channel.tenantId }, select: { deductBalance: true } }));
      const out = await chargeChannel(channel, { now, data, tenant: tenants.get(channel.tenantId) });
      if (out.charged) result.charged++;
      else if (out.state === 'UNPAID') result.unpaid++;
    } catch (err) {
      logger.error(`[ChannelBilling] Could not charge channel ${channel.id}: ${err.message || err}`);
    }
  }
  return result;
}

/** A channel the wallet stopped paying for does not work (the website widget disappears) */
const isStopped = (channel) => channel?.billingState === 'UNPAID';

/** Monthly price of a channel kind now (null = free) */
async function priceNow(providerType) {
  return priceFrom(await settingsData(), providerType);
}

/** Price and paid-until of one channel, for its settings page */
async function billingOf(channel) {
  const data = await settingsData();
  const price = priceFrom(data, channel.providerType);
  return { price, paidUntil: channel.paidUntil || null, state: price ? channel.billingState || null : null };
}

/**
 * What each channel cost since `since` (charges minus refunds), and the price of each paid channel.
 * Campaign movements recorded before channels were tagged are attributed through their campaign.
 */
async function spendByChannel(tenantId, since) {
  const walletService = require('../wallet/wallet.service');
  const { CAMPAIGN_CHARGE, CHANNEL_FEE, REFUND } = walletService.TYPES;
  const [rows, channels, data] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { tenantId, type: { in: [CAMPAIGN_CHARGE, CHANNEL_FEE, REFUND] }, createdAt: { gte: since } },
      select: { amount: true, channelKind: true, channelId: true, referenceType: true, referenceId: true },
      take: 5000
    }),
    prisma.whatsAppChannel.findMany({
      where: { tenantId },
      select: { id: true, providerType: true, name: true, phoneNumber: true, displayPhoneNumber: true, paidUntil: true, billingState: true }
    }),
    settingsData()
  ]);

  const campaignIds = [...new Set(rows.filter(r => !r.channelKind && r.referenceType === 'CAMPAIGN' && r.referenceId).map(r => r.referenceId))];
  const campaigns = campaignIds.length
    ? await prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, channelId: true, campaignType: true } })
    : [];
  const campaignOf = Object.fromEntries(campaigns.map(c => [c.id, c]));

  const byKey = new Map();
  for (const row of rows) {
    let kind = row.channelKind;
    let channelId = row.channelId;
    if (!kind) {
      const campaign = row.referenceType === 'CAMPAIGN' ? campaignOf[row.referenceId] : null;
      kind = campaign ? (['META', 'META_CLOUD'].includes(campaign.campaignType) ? 'WHATSAPP' : 'WHATSAPP_QR') : 'OTHER';
      channelId = campaign?.channelId || null;
    }
    const key = `${kind}:${channelId || ''}`;
    const entry = byKey.get(key) || { kind, channelId, spent: 0 };
    entry.spent += -row.amount;
    byKey.set(key, entry);
  }

  const channelById = Object.fromEntries(channels.map(c => [c.id, c]));
  const nameOf = (c) => (c ? c.name || c.displayPhoneNumber || c.phoneNumber || '' : '');
  const spentByChannel = [...byKey.values()]
    .map(e => ({ kind: e.kind, channelId: e.channelId, channelName: nameOf(channelById[e.channelId]), spent: round4(e.spent) || 0 }))
    .filter(e => e.spent !== 0)
    .sort((a, b) => b.spent - a.spent);
  const spentByKind = Object.entries(spentByChannel.reduce((acc, e) => ({ ...acc, [e.kind]: (acc[e.kind] || 0) + e.spent }), {}))
    .map(([kind, spent]) => ({ kind, spent: round4(spent) }))
    .sort((a, b) => b.spent - a.spent);

  const paidChannels = channels
    .filter(c => priceFrom(data, c.providerType))
    .map(c => ({ id: c.id, kind: KIND_OF_PROVIDER[c.providerType], name: nameOf(c), price: priceFrom(data, c.providerType), paidUntil: c.paidUntil, state: c.billingState || null }));
  const prices = Object.fromEntries(PAID_PROVIDERS.map(p => [KIND_OF_PROVIDER[p], priceFrom(data, p)]));

  return { spentByKind, spentByChannel, paidChannels, channelPrices: prices };
}

module.exports = {
  PRICE_KEYS,
  KIND_OF_PROVIDER,
  priceFrom,
  priceNow,
  addMonth,
  chargeChannel,
  chargeDue,
  isStopped,
  billingOf,
  spendByChannel
};
