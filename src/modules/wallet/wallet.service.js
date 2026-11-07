const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TYPES = {
  TOP_UP: 'TOP_UP',                     // money added (admin top-up)
  ADMIN_DEDUCTION: 'ADMIN_DEDUCTION',   // money removed by an admin
  ADMIN_SET: 'ADMIN_SET',               // balance set to a value by an admin
  CAMPAIGN_CHARGE: 'CAMPAIGN_CHARGE',   // campaign cost, charged when the campaign is created
  REFUND: 'REFUND'                      // a charge handed back
};

const round = (n) => Math.round(n * 10000) / 10000;
const fmt = (n) => Number(n).toFixed(4);
const MAX_PAGE_SIZE = 100;

const formatTransaction = (t) => ({
  id: t.id,
  type: t.type,
  amount: t.amount,
  balanceAfter: t.balanceAfter,
  currency: t.currency,
  description: t.description,
  referenceType: t.referenceType,
  referenceId: t.referenceId,
  createdAt: t.createdAt
});

const notFound = () => ({ status: 404, message: 'Tenant not found' });

/**
 * Moves the balance by `delta` and writes the ledger row, inside the caller's transaction.
 * A debit only succeeds while the balance covers it, so concurrent charges can never overdraw.
 */
async function apply(db, tenantId, delta, { type, description = null, referenceType = null, referenceId = null, createdBy = null }) {
  const amount = round(delta);
  if (amount < 0) {
    const debited = await db.tenant.updateMany({
      where: { id: tenantId, walletBalance: { gte: -amount } },
      data: { walletBalance: { decrement: -amount } }
    });
    if (debited.count === 0) {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { walletBalance: true, currency: true } });
      if (!tenant) throw notFound();
      const currency = tenant.currency || 'SAR';
      throw {
        status: 400,
        code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient wallet balance. Estimated cost: ${fmt(-amount)} ${currency}, Available: ${fmt(tenant.walletBalance)} ${currency}`
      };
    }
  } else if (amount > 0) {
    const credited = await db.tenant.updateMany({ where: { id: tenantId }, data: { walletBalance: { increment: amount } } });
    if (credited.count === 0) throw notFound();
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { walletBalance: true, currency: true } });
  if (!tenant) throw notFound();
  return db.walletTransaction.create({
    data: {
      tenantId,
      type,
      amount,
      balanceAfter: round(tenant.walletBalance),
      currency: tenant.currency || 'SAR',
      description,
      referenceType,
      referenceId,
      createdBy
    }
  });
}

class WalletService {
  /** Adds money to the wallet */
  async credit(tenantId, { amount, type = TYPES.TOP_UP, ...meta }) {
    if (!(amount > 0)) throw { status: 400, message: 'Amount must be greater than zero' };
    return prisma.$transaction((db) => apply(db, tenantId, amount, { type, ...meta }));
  }

  /** Spends money from the wallet; throws INSUFFICIENT_BALANCE when it does not cover it */
  async debit(tenantId, { amount, type = TYPES.CAMPAIGN_CHARGE, ...meta }) {
    if (!(amount > 0)) throw { status: 400, message: 'Amount must be greater than zero' };
    return prisma.$transaction((db) => apply(db, tenantId, -amount, { type, ...meta }));
  }

  /** Admin deduction: takes at most what the wallet holds (never below zero). Returns null if there was nothing to take. */
  async deductUpTo(tenantId, amount, meta = {}) {
    if (!(amount > 0)) throw { status: 400, message: 'Amount must be greater than zero' };
    return prisma.$transaction(async (db) => {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { walletBalance: true } });
      if (!tenant) throw notFound();
      const take = Math.min(round(amount), round(tenant.walletBalance));
      if (take <= 0) return null;
      return apply(db, tenantId, -take, { type: TYPES.ADMIN_DEDUCTION, ...meta });
    });
  }

  /** Admin "set balance": records the difference. Returns null when the balance already equals the value. */
  async setBalance(tenantId, newBalance, meta = {}) {
    if (!(newBalance >= 0)) throw { status: 400, message: 'Balance cannot be negative' };
    return prisma.$transaction(async (db) => {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { walletBalance: true, currency: true } });
      if (!tenant) throw notFound();
      const target = round(newBalance);
      const delta = round(target - tenant.walletBalance);
      if (delta === 0) return null;
      // Set exactly (not by increment) so the balance equals the requested value
      await db.tenant.update({ where: { id: tenantId }, data: { walletBalance: target } });
      return db.walletTransaction.create({
        data: {
          tenantId,
          type: TYPES.ADMIN_SET,
          amount: delta,
          balanceAfter: target,
          currency: tenant.currency || 'SAR',
          description: meta.description || `Balance set to ${target}`,
          createdBy: meta.createdBy || null
        }
      });
    });
  }

  /** Attaches the thing a charge paid for (e.g. the campaign created right after the charge) */
  async linkReference(transactionId, referenceType, referenceId) {
    await prisma.walletTransaction.update({ where: { id: transactionId }, data: { referenceType, referenceId } });
  }

  /** Hands a charge back in full. Safe to call twice: a charge is only refunded once. */
  async refundCharge(charge, description) {
    return prisma.$transaction(async (db) => {
      const already = await db.walletTransaction.findFirst({
        where: { tenantId: charge.tenantId, type: TYPES.REFUND, referenceType: 'TRANSACTION', referenceId: charge.id }
      });
      if (already) return null;
      return apply(db, charge.tenantId, Math.abs(charge.amount), {
        type: TYPES.REFUND,
        description,
        referenceType: 'TRANSACTION',
        referenceId: charge.id,
        createdBy: 'SYSTEM'
      });
    });
  }

  async list(tenantId, { page = 1, limit = 20, type = null } = {}) {
    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), MAX_PAGE_SIZE);
    const current = Math.max(parseInt(page, 10) || 1, 1);
    const where = { tenantId, ...(type && TYPES[type] ? { type } : {}) };
    const [rows, total] = await Promise.all([
      prisma.walletTransaction.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (current - 1) * take, take }),
      prisma.walletTransaction.count({ where })
    ]);
    return { transactions: rows.map(formatTransaction), pagination: { total, page: current, pages: Math.ceil(total / take) } };
  }

  /** Balance, and what was spent on campaigns so far this month (refunds taken off) */
  async getSummary(tenantId, now = new Date()) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { walletBalance: true, currency: true, deductBalance: true } });
    if (!tenant) throw notFound();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
    const spent = await prisma.walletTransaction.aggregate({
      where: { tenantId, type: { in: [TYPES.CAMPAIGN_CHARGE, TYPES.REFUND] }, createdAt: { gte: monthStart } },
      _sum: { amount: true }
    });
    return {
      balance: round(tenant.walletBalance) || 0,
      currency: tenant.currency || 'SAR',
      // Campaigns are only charged to the wallet when both the platform and this account have it on
      chargesEnabled: settings?.data?.enableWalletDeduction !== false && tenant.deductBalance !== false,
      // `|| 0` turns a negative zero into a plain zero
      spentThisMonth: round(-(spent._sum.amount || 0)) || 0
    };
  }
}

module.exports = new WalletService();
module.exports.TYPES = TYPES;
