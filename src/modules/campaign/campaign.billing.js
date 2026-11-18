// What a campaign costs the wallet, and settling that cost with what was really sent.
//
// Who pays Meta's message fees decides the price of a Meta campaign message:
//  - CUSTOMER: the customer's own card in Meta pays Meta (the only option for a Tech Provider's customers),
//    so the wallet only pays our commission: the markup part of Meta's rate.
//  - PLATFORM: we pay Meta (a shared credit line), so the wallet pays Meta's rate plus the markup.
// Meta rates in the admin settings are in USD; the QR message price is in SAR.
//
// A campaign is charged up front for every recipient. settle() then makes the money match the
// recipients that were not failed or cancelled (a stopped campaign): those are refunded, and retrying
// failed ones charges again.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const walletService = require('../wallet/wallet.service');
const { TYPES } = require('../wallet/wallet.service');
const { withLock } = require('../../utils/keyLock');
const logger = require('../../utils/logger');

const META_FEES_PAID_BY = { CUSTOMER: 'CUSTOMER', PLATFORM: 'PLATFORM' };
const DEFAULT_RATES = {
  marketing: { base: 0.0501, markup: 20 },
  utility: { base: 0.0107, markup: 20 },
  authentication: { base: 0.0107, markup: 20 },
  service: { base: 0, markup: 0 }
};
const DEFAULT_QR_PRICE_SAR = 0.05;
const DEFAULT_USD_TO_SAR = 3.75;

const round = (n) => Math.round(n * 10000) / 10000;
const num = (v, fallback) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));

/** The account's own choice (set by an admin) wins over the platform default */
function metaFeesPaidBy(settings = {}, tenant = {}) {
  const own = tenant?.customFeatures?.billing?.metaFeesPaidBy;
  if (META_FEES_PAID_BY[own]) return own;
  return META_FEES_PAID_BY[settings.metaFeesPaidBy] || META_FEES_PAID_BY.CUSTOMER;
}

/** Price of one campaign message, in the account's currency */
function unitPrice({ isMeta, category, settings = {}, tenant = {} }) {
  const rate = num(settings.exchangeRateUsdToSar, DEFAULT_USD_TO_SAR) || DEFAULT_USD_TO_SAR;
  const usd = tenant?.currency === 'USD';

  if (!isMeta) {
    const sar = num(settings.qrMessagePrice, DEFAULT_QR_PRICE_SAR);
    return round(usd ? sar / rate : sar);
  }

  const cat = DEFAULT_RATES[(category || 'marketing').toLowerCase()] ? (category || 'marketing').toLowerCase() : 'marketing';
  const base = num(settings[`${cat}BaseCost`], DEFAULT_RATES[cat].base);
  const markup = num(settings[`${cat}MarkupPercent`], DEFAULT_RATES[cat].markup);
  const priceUsd = metaFeesPaidBy(settings, tenant) === META_FEES_PAID_BY.PLATFORM
    ? base * (1 + markup / 100)
    : base * (markup / 100);
  return round(usd ? priceUsd : priceUsd * rate);
}

/**
 * Makes the campaign's wallet total equal its price × the recipients that were not failed or cancelled.
 * includeFailed: count the failed ones too (used before retrying them, so the retry is paid first).
 * Returns null for a campaign that was never charged.
 */
async function settle(campaignId, { includeFailed = false } = {}) {
  return withLock(`campaign-billing:${campaignId}`, async () => {
    const rows = await prisma.walletTransaction.findMany({
      where: { referenceType: 'CAMPAIGN', referenceId: campaignId, type: { in: [TYPES.CAMPAIGN_CHARGE, TYPES.REFUND] } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });
    const first = rows.find(r => r.type === TYPES.CAMPAIGN_CHARGE);
    if (!first) return null;

    const [total, failed, cancelled] = await Promise.all([
      prisma.campaignTarget.count({ where: { campaignId } }),
      prisma.campaignTarget.count({ where: { campaignId, status: 'FAILED' } }),
      prisma.campaignTarget.count({ where: { campaignId, status: 'CANCELLED' } })
    ]);
    if (total === 0) return null;

    // The first charge paid for every recipient at the price of the day
    const unit = Math.abs(first.amount) / total;
    const billable = total - cancelled - (includeFailed ? 0 : failed);
    const due = round(unit * billable);
    const paid = round(-rows.reduce((sum, r) => sum + r.amount, 0));
    const diff = round(paid - due);

    let refunded = 0;
    let charged = 0;
    if (diff > 0) {
      await walletService.credit(first.tenantId, {
        amount: diff,
        type: TYPES.REFUND,
        description: cancelled
          ? `Refund: ${failed} failed and ${cancelled} cancelled campaign messages`
          : `Refund: ${failed} failed campaign message${failed === 1 ? '' : 's'}`,
        referenceType: 'CAMPAIGN',
        referenceId: campaignId,
        createdBy: 'SYSTEM'
      });
      refunded = diff;
    } else if (diff < 0) {
      // Throws INSUFFICIENT_BALANCE when the wallet does not cover the retry
      await walletService.debit(first.tenantId, {
        amount: -diff,
        type: TYPES.CAMPAIGN_CHARGE,
        description: `Retry: ${failed} failed campaign message${failed === 1 ? '' : 's'}`,
        referenceType: 'CAMPAIGN',
        referenceId: campaignId,
        createdBy: 'SYSTEM'
      });
      charged = -diff;
    }

    await prisma.campaign.updateMany({ where: { id: campaignId, NOT: { totalCost: due } }, data: { totalCost: due } })
      .catch(err => logger.warn(`[CampaignBilling] Could not store the cost of campaign ${campaignId}: ${err.message}`));
    if (refunded) logger.info(`[CampaignBilling] Campaign ${campaignId}: refunded ${refunded} for ${failed} failed messages`);
    return { due, paid: round(paid - refunded + charged), refunded, charged, failed, cancelled, total };
  });
}

/** Marks finished campaigns COMPLETED and settles the recently charged ones (run every few minutes) */
async function sweep({ days = 14 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Older scheduled campaigns stay SCHEDULED while their messages go out (newer ones turn RUNNING)
  const running = await prisma.campaign.findMany({ where: { status: { in: ['RUNNING', 'SCHEDULED'] } }, select: { id: true, status: true } });
  for (const c of running) {
    const open = await prisma.campaignTarget.count({ where: { campaignId: c.id, status: { in: ['PENDING', 'QUEUED'] } } });
    if (open === 0) await prisma.campaign.updateMany({ where: { id: c.id, status: c.status }, data: { status: 'COMPLETED', completedAt: new Date() } });
  }

  const charged = await prisma.walletTransaction.findMany({
    where: { referenceType: 'CAMPAIGN', type: TYPES.CAMPAIGN_CHARGE, createdAt: { gte: since } },
    select: { referenceId: true },
    distinct: ['referenceId']
  });
  let refunded = 0;
  for (const { referenceId } of charged) {
    try {
      const result = await settle(referenceId);
      refunded = round(refunded + (result?.refunded || 0));
    } catch (err) {
      logger.error(`[CampaignBilling] Settling campaign ${referenceId} failed: ${err.message}`);
    }
  }
  return { campaigns: charged.length, refunded };
}

module.exports = { META_FEES_PAID_BY, metaFeesPaidBy, unitPrice, settle, sweep };
