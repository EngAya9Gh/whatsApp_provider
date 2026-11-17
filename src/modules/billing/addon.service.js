// Plan limits for team members and official numbers, and add-ons on top of them.
// Limits come from the plan (plan_settings.max_users / max_numbers; null = no limit, the default), plus the
// account's ACTIVE add-ons. Add-on prices (SAR per month, before VAT) are set by the admin in Settings; no price
// = not for sale. Buying creates an invoice for the rest of this month + VAT; the add-on turns on when the
// invoice is marked paid, and stays until an admin cancels it.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const KINDS = {
  USERS: { priceKey: 'addonUserPrice', planKey: 'maxUsers', ar: 'موظف إضافي', en: 'Extra team member' },
  NUMBERS: { priceKey: 'addonNumberPrice', planKey: 'maxNumbers', ar: 'رقم واتساب إضافي', en: 'Extra WhatsApp number' }
};
const round2 = (n) => Math.round(n * 100) / 100;
const bad = (message, status = 400, code) => ({ status, message, ...(code && { code }) });

async function settingsData() {
  return (await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } }))?.data || {};
}

function priceOf(data, kind) {
  const n = Number(data[KINDS[kind].priceKey]);
  return n > 0 ? round2(n) : null;
}

const usedOf = (tenantId, kind) => (kind === 'USERS'
  ? prisma.subUser.count({ where: { tenantId, isActive: true } })
  : prisma.whatsAppChannel.count({ where: { tenantId, providerType: 'META_CLOUD' } }));

/** { USERS: { included, extra, limit, used, price }, NUMBERS: {…} }; limit null = no limit */
async function limits(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  if (!tenant) throw bad('Tenant not found', 404);
  const [plan, data, active] = await Promise.all([
    prisma.planSetting.findUnique({ where: { planCode: tenant.plan } }),
    settingsData(),
    prisma.addonPurchase.groupBy({ by: ['kind'], where: { tenantId, status: 'ACTIVE' }, _sum: { quantity: true } })
  ]);
  const extraOf = Object.fromEntries(active.map(a => [a.kind, a._sum.quantity || 0]));
  const out = {};
  for (const kind of Object.keys(KINDS)) {
    const included = plan?.[KINDS[kind].planKey] ?? null;
    const extra = extraOf[kind] || 0;
    out[kind] = { included, extra, limit: included === null ? null : included + extra, used: await usedOf(tenantId, kind), price: priceOf(data, kind) };
  }
  return out;
}

/** Throws 402 LIMIT_REACHED when one more team member / number would pass the account's limit */
async function assertCanAdd(tenantId, kind) {
  const l = (await limits(tenantId))[kind];
  if (l.limit !== null && l.used >= l.limit) {
    const what = kind === 'USERS' ? 'team members' : 'WhatsApp numbers';
    throw bad(`Your plan includes ${l.limit} ${what}. Buy an add-on from Billing or upgrade the plan.`, 402, 'LIMIT_REACHED');
  }
  return l;
}

/** The part of a monthly price left from today to the end of the month (today included) */
function prorate(monthly, now = new Date()) {
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const daysLeft = daysInMonth - now.getUTCDate() + 1;
  return { amount: round2(monthly * daysLeft / daysInMonth), daysLeft, daysInMonth };
}

async function quote(kind, quantity, now = new Date()) {
  if (!KINDS[kind]) throw bad('Unknown add-on');
  const qty = Math.floor(Number(quantity));
  if (!(qty >= 1 && qty <= 20)) throw bad('Choose between 1 and 20');
  const data = await settingsData();
  const price = priceOf(data, kind);
  if (price === null) throw bad('This add-on is not for sale yet', 409);
  const taxRate = Number(data.taxRate ?? 15);
  const { amount, daysLeft, daysInMonth } = prorate(price, now);
  const subtotal = round2(amount * qty);
  const tax = round2(subtotal * taxRate / 100);
  return { kind, quantity: qty, monthlyPrice: price, firstPeriod: { daysLeft, daysInMonth, unit: amount }, subtotal, taxRate, tax, total: round2(subtotal + tax) };
}

/** The customer buys an add-on: an unpaid invoice now, the add-on once it is paid */
async function request(tenantId, kind, quantity, now = new Date()) {
  const q = await quote(kind, quantity, now);
  const AdminService = require('../admin/admin.service');
  const adminService = typeof AdminService === 'function' ? new AdminService() : AdminService;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const period = `${now.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`;
  const invoice = await adminService.createInvoice(
    tenantId, q.total.toFixed(2), `${KINDS[kind].ar} × ${q.quantity} (${period})`, 'Monthly', 'PENDING',
    [{ name: KINDS[kind].ar, description: `${KINDS[kind].en} — ${q.firstPeriod.daysLeft}/${q.firstPeriod.daysInMonth} days of ${q.monthlyPrice} SAR/month`, rate: q.firstPeriod.unit, qty: q.quantity, total: q.subtotal, addon: kind }],
    q.taxRate, q.tax.toFixed(2)
  );
  const purchase = await prisma.addonPurchase.create({ data: { tenantId, kind, quantity: q.quantity, unitPrice: q.monthlyPrice, invoiceId: invoice.id } });
  return { invoice, purchase, quote: q };
}

/** Called when an invoice becomes PAID: its add-on turns on */
async function onInvoicePaid(invoice) {
  const r = await prisma.addonPurchase.updateMany({ where: { invoiceId: invoice.id, status: 'PENDING' }, data: { status: 'ACTIVE', activatedAt: new Date() } });
  return r.count;
}

async function list(tenantId) {
  return prisma.addonPurchase.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
}

async function cancel(id) {
  const found = await prisma.addonPurchase.findUnique({ where: { id } });
  if (!found) throw bad('Add-on not found', 404);
  return prisma.addonPurchase.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
}

module.exports = { KINDS, limits, assertCanAdd, prorate, quote, request, onInvoicePaid, list, cancel };
