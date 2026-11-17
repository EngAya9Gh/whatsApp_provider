// Coupons on unpaid invoices (discount line, VAT recalculated, the limits) and referrals (invite code at
// sign-up, reward to the inviter's wallet on the first paid invoice, once). Real services on a throwaway
// MySQL database. Needs TEST_MYSQL_URL (a user that may create databases).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { ROOT, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const dbName = `wakeel_test_coupons_${Date.now().toString(36)}`;

let admin;
let prisma;
let coupons;
let referrals;
before(async () => {
  if (skip) return;
  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  admin = new PrismaClient({ datasources: { db: { url: `${base}/mysql` } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\``);
  process.env.DATABASE_URL = `${base}/${dbName}`;
  execFileSync(fromRoot('node_modules/.bin/prisma'), ['db', 'push', '--skip-generate'], { cwd: ROOT, env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, stdio: 'pipe' });
  prisma = new PrismaClient();
  coupons = require(fromRoot('src/modules/billing/coupon.service'));
  referrals = require(fromRoot('src/modules/billing/referral.service'));
  await prisma.tenant.createMany({ data: [
    { id: 'T1', name: 'One', email: 'one@t', passwordHash: 'x', plan: 'PRO' },
    { id: 'T2', name: 'Two', email: 'two@t', passwordHash: 'x', plan: 'STARTER' }
  ] });
});
after(async () => {
  if (skip) return;
  await prisma?.$disconnect();
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
  await admin.$disconnect();
});

const invoice = (tenantId, data = {}) => prisma.invoice.create({
  data: { tenantId, amount: '115.00', description: 'PRO monthly', status: 'PENDING', taxRate: 15, items: [{ name: 'PRO', description: '', rate: 100, qty: 1, total: 100 }], taxAmount: '15.00', ...data }
});

test('a percent coupon adds a discount line and recalculates VAT and total; each account uses it once', { skip }, async () => {
  await assert.rejects(coupons.createCoupon({ code: 'x', value: 10 }), (e) => e.status === 400);
  await assert.rejects(coupons.createCoupon({ code: 'BIG', type: 'PERCENT', value: 150 }), (e) => e.status === 400);
  await coupons.createCoupon({ code: 'ramadan25', type: 'PERCENT', value: 25, note: 'عرض رمضان' });
  await assert.rejects(coupons.createCoupon({ code: 'RAMADAN25', value: 5 }), (e) => e.status === 409);

  const inv = await invoice('T1');
  const updated = await coupons.applyToInvoice('T1', inv.id, ' Ramadan25 ');
  assert.strictEqual(updated.amount, '86.25', '(100 − 25) × 1.15');
  assert.strictEqual(updated.taxAmount, '11.25');
  assert.deepStrictEqual(updated.items.at(-1), { name: 'خصم كوبون RAMADAN25', description: 'عرض رمضان', rate: -25, qty: 1, total: -25, coupon: 'RAMADAN25' });
  assert.strictEqual((await prisma.coupon.findUnique({ where: { code: 'RAMADAN25' } })).usedCount, 1);

  await assert.rejects(coupons.applyToInvoice('T1', inv.id, 'RAMADAN25'), (e) => e.status === 409, 'one coupon per invoice');
  const second = await invoice('T1');
  await assert.rejects(coupons.applyToInvoice('T1', second.id, 'RAMADAN25'), (e) => e.status === 409 && /already used/.test(e.message));
  await assert.rejects(coupons.applyToInvoice('T2', inv.id, 'RAMADAN25'), (e) => e.status === 404, "not another account's invoice");
});

test('fixed amount on an invoice without lines; the limits: uses, expiry, plan, first invoice, paid invoices', { skip }, async () => {
  await coupons.createCoupon({ code: 'FIXED30', type: 'FIXED', value: 30, maxUses: 1 });
  const plain = await invoice('T2', { items: null, taxAmount: null });
  const updated = await coupons.applyToInvoice('T2', plain.id, 'FIXED30');
  assert.strictEqual(updated.amount, '80.50', '115 → 100 before VAT, − 30 = 70, + 15%');
  assert.strictEqual(updated.items.length, 2);
  await assert.rejects(coupons.applyToInvoice('T1', (await invoice('T1')).id, 'FIXED30'), (e) => e.status === 409 && /used up/.test(e.message));

  await coupons.createCoupon({ code: 'OLD', value: 10, expiresAt: '2020-01-01' });
  await assert.rejects(coupons.applyToInvoice('T1', (await invoice('T1')).id, 'OLD'), (e) => /expired/.test(e.message));
  await coupons.createCoupon({ code: 'STARTERONLY', value: 10, plans: ['STARTER'] });
  await assert.rejects(coupons.applyToInvoice('T1', (await invoice('T1')).id, 'STARTERONLY'), (e) => /plan/.test(e.message));
  await coupons.createCoupon({ code: 'WELCOME', value: 10, firstInvoiceOnly: true });
  await invoice('T1', { status: 'PAID' });
  await assert.rejects(coupons.applyToInvoice('T1', (await invoice('T1')).id, 'WELCOME'), (e) => /first invoice/.test(e.message));
  await assert.rejects(coupons.applyToInvoice('T1', (await invoice('T1', { status: 'PAID' })).id, 'STARTERONLY'), (e) => /unpaid/.test(e.message));
  await coupons.setActive((await prisma.coupon.findUnique({ where: { code: 'STARTERONLY' } })).id, false);
  await assert.rejects(coupons.applyToInvoice('T2', (await invoice('T2')).id, 'STARTERONLY'), (e) => e.status === 404);

  const list = await coupons.listCoupons();
  assert.strictEqual(list.find(c => c.code === 'FIXED30').totalDiscount, 30);
});

test('referrals: off without a reward; sign-up with the code; the first paid invoice rewards the inviter once', { skip, timeout: 30000 }, async () => {
  assert.deepStrictEqual(await referrals.summary('T1'), { enabled: false });
  await prisma.systemSetting.create({ data: { id: 'GLOBAL', data: { referralRewardAmount: 20 } } });
  const card = await referrals.summary('T1');
  assert.strictEqual(card.enabled, true);
  assert.match(card.code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.strictEqual(card.link, `http://localhost/register?ref=${card.code}`);
  assert.strictEqual((await referrals.summary('T1')).code, card.code, 'the same code every time');

  const authService = require(fromRoot('src/modules/auth/auth.service'));
  await authService.register({ name: 'Friend', email: 'friend@t', password: 'secret12', referralCode: card.code.toLowerCase() });
  await authService.register({ name: 'Nobody', email: 'nobody@t', password: 'secret12', referralCode: 'NOTACODE' });
  const friend = await prisma.tenant.findUnique({ where: { email: 'friend@t' } });
  assert.strictEqual((await prisma.referral.findUnique({ where: { referredId: friend.id } })).status, 'PENDING');
  assert.strictEqual(await prisma.referral.count(), 1, 'an unknown code is ignored');
  assert.strictEqual(await referrals.recordSignup('T1', card.code), null, 'no inviting yourself');

  const AdminService = require(fromRoot('src/modules/admin/admin.service'));
  const adminService = typeof AdminService === 'function' ? new AdminService() : AdminService;
  const first = await invoice(friend.id);
  await adminService.updateInvoiceStatus(first.id, 'PAID');
  await adminService.updateInvoiceStatus(first.id, 'PAID');
  await adminService.updateInvoiceStatus((await invoice(friend.id)).id, 'PAID');

  const inviter = await prisma.tenant.findUnique({ where: { id: 'T1' } });
  assert.strictEqual(inviter.walletBalance, 20, 'rewarded once');
  const tx = await prisma.walletTransaction.findMany({ where: { tenantId: 'T1' } });
  assert.deepStrictEqual(tx.map(t => [t.type, t.amount, t.referenceType]), [['REFERRAL_REWARD', 20, 'REFERRAL']]);
  const after = await referrals.summary('T1');
  assert.deepStrictEqual([after.invited, after.rewarded, after.earned], [1, 1, 20]);
});
