// Coupons on subscription invoices. There is no payment gateway: subscriptions are paid by bank transfer and
// invoices are issued by the admin, so a coupon is applied to an unpaid invoice — it gets a discount line,
// and its VAT and total are recalculated. One coupon per invoice, and each account uses a coupon once.
const { Prisma } = require('@prisma/client');
const prisma = require('../../config/prisma');

const PLANS = ['FREE', 'STARTER', 'ADVANCED', 'PRO', 'ENTERPRISE'];
const OPEN_STATUSES = ['UNPAID', 'PENDING'];
const round2 = (n) => Math.round(n * 100) / 100;
const bad = (message, status = 400) => ({ status, message });

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

function cleanCoupon(data = {}) {
  const code = normalizeCode(data.code);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw bad('The code must be 3-40 letters, numbers, - or _');
  const type = data.type === 'FIXED' ? 'FIXED' : 'PERCENT';
  const value = Number(data.value);
  if (!(value > 0) || (type === 'PERCENT' && value > 100)) throw bad(type === 'PERCENT' ? 'The discount must be between 1 and 100%' : 'The discount must be more than 0');
  const maxUses = data.maxUses === undefined || data.maxUses === null || data.maxUses === '' ? null : Math.floor(Number(data.maxUses));
  if (maxUses !== null && !(maxUses > 0)) throw bad('The number of uses must be 1 or more, or empty for no limit');
  let expiresAt = null;
  if (data.expiresAt) {
    expiresAt = new Date(data.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) throw bad('The expiry date is not valid');
  }
  let plans = null;
  if (Array.isArray(data.plans) && data.plans.length) {
    plans = [...new Set(data.plans.map(p => String(p).toUpperCase()))];
    if (plans.some(p => !PLANS.includes(p))) throw bad('Unknown plan in the list');
  }
  return {
    code, type, value: round2(value), maxUses, expiresAt, plans,
    firstInvoiceOnly: !!data.firstInvoiceOnly,
    note: data.note ? String(data.note).slice(0, 255) : null
  };
}

async function createCoupon(data) {
  try {
    return await prisma.coupon.create({ data: cleanCoupon(data) });
  } catch (err) {
    if (err.code === 'P2002') throw bad('A coupon with this code already exists', 409);
    throw err;
  }
}

async function setActive(id, isActive) {
  const found = await prisma.coupon.findUnique({ where: { id } });
  if (!found) throw bad('Coupon not found', 404);
  return prisma.coupon.update({ where: { id }, data: { isActive: !!isActive } });
}

async function listCoupons() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  const sums = await prisma.couponRedemption.groupBy({ by: ['couponId'], _sum: { discount: true }, _count: { _all: true } });
  const byId = new Map(sums.map(s => [s.couponId, s]));
  return coupons.map(c => ({ ...c, totalDiscount: round2(byId.get(c.id)?._sum.discount || 0) }));
}

/** The invoice lines before VAT; invoices made without lines get one line from their total */
function linesOf(invoice) {
  if (Array.isArray(invoice.items) && invoice.items.length) return invoice.items;
  const rate = Number(invoice.taxRate ?? 15);
  const total = parseFloat(String(invoice.amount).replace(/[^0-9.]/g, '')) || 0;
  const subtotal = round2(total / (1 + rate / 100));
  return [{ name: invoice.description || 'Subscription', description: '', rate: subtotal, qty: 1, total: subtotal }];
}

/** Applies a coupon code to one of the account's unpaid invoices; returns the updated invoice */
async function applyToInvoice(tenantId, invoiceId, rawCode, now = new Date()) {
  const code = normalizeCode(rawCode);
  if (!code) throw bad('Enter the coupon code');
  try {
    return await prisma.$transaction(async (db) => {
      const invoice = await db.invoice.findFirst({ where: { id: invoiceId, tenantId } });
      if (!invoice) throw bad('Invoice not found', 404);
      if (!OPEN_STATUSES.includes(invoice.status)) throw bad('A coupon can only be applied to an unpaid invoice', 409);
      if (await db.couponRedemption.findUnique({ where: { invoiceId } })) throw bad('A coupon is already applied to this invoice', 409);

      const coupon = await db.coupon.findUnique({ where: { code } });
      if (!coupon || !coupon.isActive) throw bad('This coupon does not exist or is no longer active', 404);
      if (coupon.expiresAt && coupon.expiresAt <= now) throw bad('This coupon has expired', 409);
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw bad('This coupon has been used up', 409);
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
      if (Array.isArray(coupon.plans) && coupon.plans.length && !coupon.plans.includes(tenant.plan)) throw bad('This coupon is not for your plan', 409);
      if (coupon.firstInvoiceOnly && await db.invoice.count({ where: { tenantId, status: 'PAID' } }) > 0) throw bad('This coupon is for the first invoice only', 409);
      if (await db.couponRedemption.findFirst({ where: { couponId: coupon.id, tenantId } })) throw bad('You have already used this coupon', 409);

      const lines = linesOf(invoice);
      const subtotal = round2(lines.reduce((sum, l) => sum + (parseFloat(l.total) || 0), 0));
      const discount = round2(coupon.type === 'PERCENT' ? subtotal * coupon.value / 100 : Math.min(coupon.value, subtotal));
      if (!(discount > 0)) throw bad('Nothing to discount on this invoice', 409);
      const rate = Number(invoice.taxRate ?? 15);
      const net = round2(subtotal - discount);
      const tax = round2(net * rate / 100);

      // Counts the use only while uses are left (two customers at once cannot pass the limit)
      const counted = await db.$executeRaw`UPDATE coupons SET used_count = used_count + 1 WHERE id = ${coupon.id} AND (max_uses IS NULL OR used_count < max_uses)`;
      if (counted === 0) throw bad('This coupon has been used up', 409);
      await db.couponRedemption.create({ data: { couponId: coupon.id, tenantId, invoiceId, discount } });

      const label = coupon.type === 'PERCENT' ? `${coupon.value}%` : `${coupon.value}`;
      return db.invoice.update({
        where: { id: invoiceId },
        data: {
          items: [...lines, { name: `خصم كوبون ${code}`, description: coupon.note || `Coupon ${code} (${label})`, rate: -discount, qty: 1, total: -discount, coupon: code }],
          taxAmount: tax.toFixed(2),
          amount: round2(net + tax).toFixed(2)
        }
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw bad('A coupon is already applied to this invoice', 409);
    throw err;
  }
}

module.exports = { PLANS, normalizeCode, cleanCoupon, createCoupon, setActive, listCoupons, applyToInvoice };
