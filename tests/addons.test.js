// Plan limits for team members / numbers and add-ons on a throwaway MySQL database: no limit by default,
// the plan limit blocks one more member, the add-on invoice for the rest of the month + VAT, the add-on turning
// on when that invoice is paid, and cancelling it. Needs TEST_MYSQL_URL.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { ROOT, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const dbName = `wakeel_test_addons_${Date.now().toString(36)}`;

let admin;
let prisma;
let addons;
let subUsers;
before(async () => {
  if (skip) return;
  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  admin = new PrismaClient({ datasources: { db: { url: `${base}/mysql` } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\``);
  process.env.DATABASE_URL = `${base}/${dbName}`;
  execFileSync(fromRoot('node_modules/.bin/prisma'), ['db', 'push', '--skip-generate'], { cwd: ROOT, env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, stdio: 'pipe' });
  prisma = new PrismaClient();
  addons = require(fromRoot('src/modules/billing/addon.service'));
  subUsers = require(fromRoot('src/modules/subuser/subuser.service'));
  await prisma.planSetting.create({ data: { planCode: 'STARTER', name: 'Starter', price: 99, limit: 1000, features: '[]' } });
  await prisma.tenant.create({ data: { id: 'T', name: 'Shop', email: 's@t', passwordHash: 'x', plan: 'STARTER' } });
});
after(async () => {
  if (skip) return;
  await prisma?.$disconnect();
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
  await admin.$disconnect();
});

const addMember = (n) => subUsers.create('T', { name: `Agent ${n}`, email: `a${n}@t`, password: 'secret12', role: 'AGENT' });

test('no limit until the admin sets one; then the plan limit blocks one more member', { skip, timeout: 30000 }, async () => {
  const l = await addons.limits('T');
  assert.deepStrictEqual([l.USERS.limit, l.NUMBERS.limit, l.USERS.price], [null, null, null], 'default: no limits, nothing for sale');
  await addMember(1);
  await addMember(2);

  await prisma.planSetting.update({ where: { planCode: 'STARTER' }, data: { maxUsers: 2 } });
  await assert.rejects(addMember(3), (e) => e.status === 402 && e.code === 'LIMIT_REACHED');
  const off = await prisma.subUser.findFirst({ where: { email: 'a2@t' } });
  await subUsers.update('T', off.id, { isActive: false });
  await addMember(3);
  await assert.rejects(subUsers.update('T', off.id, { isActive: true }), (e) => e.code === 'LIMIT_REACHED', 'turning a member back on needs a seat');
});

test('an add-on: invoice for the rest of the month + VAT, on when paid, off when cancelled', { skip, timeout: 30000 }, async () => {
  await assert.rejects(addons.quote('USERS', 1), (e) => e.status === 409, 'not for sale without a price');
  await prisma.systemSetting.create({ data: { id: 'GLOBAL', data: { addonUserPrice: 30, taxRate: 15 } } });

  assert.deepStrictEqual(addons.prorate(30, new Date('2026-11-17T09:00:00Z')), { amount: 14, daysLeft: 14, daysInMonth: 30 });
  const { invoice, purchase, quote } = await addons.request('T', 'USERS', 2, new Date('2026-11-17T09:00:00Z'));
  assert.deepStrictEqual([quote.subtotal, quote.tax, quote.total], [28, 4.2, 32.2]);
  assert.deepStrictEqual([invoice.amount, invoice.taxAmount, invoice.status], ['32.20', '4.20', 'PENDING']);
  assert.strictEqual(invoice.items[0].qty, 2);
  assert.strictEqual(purchase.status, 'PENDING');
  assert.strictEqual((await addons.limits('T')).USERS.limit, 2, 'not on before payment');

  const AdminService = require(fromRoot('src/modules/admin/admin.service'));
  await (typeof AdminService === 'function' ? new AdminService() : AdminService).updateInvoiceStatus(invoice.id, 'PAID');
  const l = await addons.limits('T');
  assert.deepStrictEqual([l.USERS.included, l.USERS.extra, l.USERS.limit], [2, 2, 4]);
  await addMember(4);

  await addons.cancel(purchase.id);
  assert.strictEqual((await addons.limits('T')).USERS.limit, 2);
  await assert.rejects(addons.quote('USERS', 50), (e) => e.status === 400);
});
