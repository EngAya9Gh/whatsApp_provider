// Admin "log in as customer" through the real HTTP API on a throwaway MySQL database: the session token,
// what is blocked inside it, the list of changes, ending it, and running out of time.
// Needs TEST_MYSQL_URL (a user that may create databases).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { ROOT, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const dbName = `wakeel_test_imp_${Date.now().toString(36)}`;

let admin;
let prisma;
let server;
let url;
let jwt;
const adminToken = () => jwt.sign({ role: 'ADMIN', email: 'support@wakeel.cc' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const call = async (method, path, token, body) => {
  const res = await fetch(`${url}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

before(async () => {
  if (skip) return;
  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  admin = new PrismaClient({ datasources: { db: { url: `${base}/mysql` } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\``);
  process.env.DATABASE_URL = `${base}/${dbName}`;
  execFileSync(fromRoot('node_modules/.bin/prisma'), ['db', 'push', '--skip-generate'], { cwd: ROOT, env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, stdio: 'pipe' });
  prisma = new PrismaClient();
  jwt = require(fromRoot('node_modules/jsonwebtoken'));
  await prisma.tenant.create({ data: { id: 'T', name: 'Perfume shop', email: 'owner@shop.sa', passwordHash: 'unchanged-hash', customFeatures: { aiSettings: { geminiKey: 'k' } } } });

  const app = require(fromRoot('src/app'));
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (skip) return;
  server?.close();
  await prisma?.$disconnect();
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
  await admin.$disconnect();
});

test('an admin opens the account for 30 minutes; password, email and API keys are locked; changes are listed', { skip, timeout: 30000 }, async () => {
  assert.strictEqual((await call('POST', '/api/admin/tenants/T/impersonate', null)).status, 401, 'admins only');
  const start = await call('POST', '/api/admin/tenants/T/impersonate', adminToken());
  assert.strictEqual(start.status, 200);
  const { token, expiresAt } = start.body.data;
  const minutes = (new Date(expiresAt) - Date.now()) / 60000;
  assert.ok(minutes > 29 && minutes <= 30, `about 30 minutes (${minutes})`);

  const me = await call('GET', '/api/auth/me', token);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.data.id, 'T');
  assert.strictEqual(me.body.data.impersonation.by, 'support@wakeel.cc', 'the dashboard can show the banner');

  const pw = await call('PUT', '/api/auth/profile', token, { password: 'hacked123' });
  assert.strictEqual(pw.status, 403);
  assert.strictEqual(pw.body.code, 'SUPPORT_SESSION_FORBIDDEN');
  assert.strictEqual((await call('POST', '/api/keys', token, { name: 'x' })).status, 403);
  assert.strictEqual((await prisma.tenant.findUnique({ where: { id: 'T' } })).passwordHash, 'unchanged-hash');

  const rename = await call('PUT', '/api/auth/profile', token, { name: 'Perfume shop KSA' });
  assert.strictEqual(rename.status, 200, JSON.stringify(rename.body));
  await new Promise(resolve => setTimeout(resolve, 150));
  const [session] = (await call('GET', '/api/admin/tenants/T/impersonations', adminToken())).body.data;
  assert.strictEqual(session.adminEmail, 'support@wakeel.cc');
  assert.deepStrictEqual(session.actions.map(a => [a.method, a.path, a.status]), [
    ['PUT', '/api/auth/profile', 403], ['POST', '/api/keys', 403], ['PUT', '/api/auth/profile', 200]
  ], 'blocked attempts and the change are all listed');
  assert.ok(session.actions.some(a => a.method === 'PUT' && a.path === '/api/auth/profile' && a.status === 200), 'the rename is listed');
  assert.ok(!session.actions.some(a => a.method === 'GET'), 'reading is not listed');

  // Ending it locks the token at once
  assert.strictEqual((await call('POST', '/api/auth/impersonation/end', token)).status, 200);
  const after = await call('GET', '/api/auth/me', token);
  assert.strictEqual(after.status, 401);
  assert.match(after.body.error, /Support session ended/);
});

test('a session that ran out stops working; the owner\'s own login is not affected', { skip }, async () => {
  const { token } = (await call('POST', '/api/admin/tenants/T/impersonate', adminToken())).body.data;
  await prisma.adminImpersonation.updateMany({ where: { endedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.strictEqual((await call('GET', '/api/auth/me', token)).status, 401);

  const owner = jwt.sign({ tenantId: 'T', email: 'owner@shop.sa' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const me = await call('GET', '/api/auth/me', owner);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.data.impersonation, null);
  assert.strictEqual((await call('GET', '/api/admin/tenants/T/impersonations', owner)).status, 403, 'customers cannot read the admin log');
});
