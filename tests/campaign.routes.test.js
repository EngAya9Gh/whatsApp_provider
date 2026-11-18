// Meta campaign screens through the real HTTP API on a throwaway MySQL database: the sample file of a template,
// the check of an uploaded file before anything is charged, creating from a wrong file (refused, nothing
// charged), launching, pausing and stopping with a refund. Needs TEST_MYSQL_URL.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('node:child_process');
const { ROOT, inject, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const dbName = `wakeel_test_camproutes_${Date.now().toString(36)}`;

const fakeQueue = { addBulk: async () => {}, client: Promise.resolve({ mget: async (k) => k.map(() => null) }) };
inject(fromRoot('src/workers/campaign.worker.js'), { campaignQueue: fakeQueue, campaignWorker: null });
inject(fromRoot('src/workers/meta.campaign.worker.js'), { metaCampaignQueue: fakeQueue, worker: null });
inject(fromRoot('src/modules/meta/meta.templateLookup.js'), {
  lookup: async (channel, name) => ({
    reachable: true,
    template: name === 'offer'
      ? { name: 'offer', language: 'ar', category: 'MARKETING', status: 'APPROVED', components: [{ type: 'BODY', text: 'أهلاً {{1}}، خصم {{2}}', example: { body_text: [['سارة', '25%']] } }] }
      : null
  }),
  approvedVersions: async () => []
});

let admin;
let prisma;
let server;
let url;
let token;
let xlsx;
const UPLOADS = path.join(ROOT, 'uploads');
const uploadsCount = () => (fs.existsSync(UPLOADS) ? fs.readdirSync(UPLOADS).filter(f => f.startsWith('file-')).length : 0);

const json = async (method, p, body) => {
  const res = await fetch(`${url}${p}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
const multipart = async (p, fields, rows) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (rows) {
    const sheet = xlsx.utils.aoa_to_sheet(rows);
    const buf = xlsx.write({ SheetNames: ['s'], Sheets: { s: sheet } }, { type: 'buffer', bookType: 'xlsx' });
    fd.append('file', new Blob([buf]), 'customers.xlsx');
  }
  const res = await fetch(`${url}${p}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

let channelId;
before(async () => {
  if (skip) return;
  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  admin = new PrismaClient({ datasources: { db: { url: `${base}/mysql` } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\``);
  process.env.DATABASE_URL = `${base}/${dbName}`;
  execFileSync(fromRoot('node_modules/.bin/prisma'), ['db', 'push', '--skip-generate'], { cwd: ROOT, env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, stdio: 'pipe' });
  prisma = new PrismaClient();
  xlsx = require(fromRoot('node_modules/xlsx'));
  const jwt = require(fromRoot('node_modules/jsonwebtoken'));
  await prisma.systemSetting.create({ data: { id: 'GLOBAL', data: { marketingBaseCost: 0.05, marketingMarkupPercent: 20, exchangeRateUsdToSar: 3.75 } } });
  await prisma.tenant.create({ data: { id: 'T', name: 'Shop', email: 'o@shop.sa', passwordHash: 'x', metaEnabled: true, walletBalance: 10 } });
  channelId = (await prisma.whatsAppChannel.create({
    data: { tenantId: 'T', providerType: 'META_CLOUD', status: 'CONNECTED', metaPhoneNumberId: 'pn', metaWabaId: 'w', metaAccessToken: 't', displayPhoneNumber: '966500000000' }
  })).id;
  token = jwt.sign({ tenantId: 'T', email: 'o@shop.sa' }, process.env.JWT_SECRET, { expiresIn: '1h' });

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

test('the sample file of a template has its columns', { skip, timeout: 30000 }, async () => {
  const res = await fetch(`${url}/api/v1/campaigns/sample-file?channelId=${channelId}&templateName=offer&templateLanguage=ar`, { headers: { Authorization: `Bearer ${token}` } });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /campaign-offer\.xlsx/);
  const book = xlsx.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
  const header = xlsx.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 })[0];
  assert.strictEqual(header.length, 3);
  assert.match(header[2], /\{\{2\}\}.*25%/);

  const missing = await json('GET', `/api/v1/campaigns/sample-file?channelId=${channelId}&templateName=nope&templateLanguage=ar`);
  assert.strictEqual(missing.status, 400);
  assert.strictEqual(missing.body.error.code, 'TEMPLATE_NOT_FOUND');
});

test('an uploaded file is checked against the template before anything is charged; a wrong one is refused', { skip, timeout: 30000 }, async () => {
  const before = uploadsCount();
  const fields = { channelId, templateName: 'offer', templateLanguage: 'ar', campaignType: 'META', name: 'Offer' };

  const preview = await multipart('/api/v1/campaigns/audience-preview', fields, [
    ['الجوال', 'الاسم', 'الخصم'], ['0501234567', 'سارة', '25%'], [966501234568, 'علي', '10%'], ['966501234568', 'مكرر', '1%'], ['abc', 'x', 'y']
  ]);
  assert.strictEqual(preview.status, 200, JSON.stringify(preview.body));
  const p = preview.body.data;
  assert.strictEqual(p.report.valid, 2);
  assert.strictEqual(p.report.converted, 1);
  assert.strictEqual(p.report.duplicates, 1);
  assert.strictEqual(p.report.invalidCount, 1);
  assert.strictEqual(p.report.blocking, null);
  assert.deepStrictEqual(p.cost, { unit: 0.0375, total: 0.075, currency: 'SAR', charged: true, balance: 10, enough: true }, '0.05 USD × 20% markup × 3.75');
  assert.deepStrictEqual(p.eta, { perSecond: 50, seconds: 1 });
  assert.deepStrictEqual(p.report.sample[0], { phone: '966501234567', variables: ['سارة', '25%'], row: 2 });

  const wrong = await multipart('/api/v1/campaigns', fields, [['966501234567', 'سارة'], ['966501234568', 'علي']]);
  assert.strictEqual(wrong.status, 400);
  assert.strictEqual(wrong.body.error.code, 'COLUMNS_MISSING');
  assert.strictEqual((await prisma.tenant.findUnique({ where: { id: 'T' } })).walletBalance, 10, 'nothing charged');
  assert.strictEqual(await prisma.campaign.count(), 0);
  assert.strictEqual(uploadsCount(), before, 'uploaded files are removed after reading');
});

test('create, launch (sent in waves), pause, and stop with a refund', { skip, timeout: 30000 }, async () => {
  const created = await multipart('/api/v1/campaigns', { channelId, templateName: 'offer', templateLanguage: 'ar', campaignType: 'META', name: 'Offer', countryCode: '966' }, [
    ['0501234567', 'سارة', '25%'], ['0551234567', 'علي', '10%'], ['0561234567', 'منى', '5%']
  ]);
  assert.strictEqual(created.status, 201, JSON.stringify(created.body));
  const id = created.body.campaignId;
  const targets = await prisma.campaignTarget.findMany({ where: { campaignId: id }, orderBy: { phone: 'asc' } });
  assert.deepStrictEqual(targets.map(t => [t.phone, JSON.parse(t.variables)]), [
    ['966501234567', ['سارة', '25%']], ['966551234567', ['علي', '10%']], ['966561234567', ['منى', '5%']]
  ]);

  const started = await json('POST', `/api/v1/campaigns/${id}/start`);
  assert.strictEqual(started.body.status, 'RUNNING');
  const one = await json('GET', `/api/v1/campaigns/${id}`);
  assert.strictEqual(one.body.data.canPause, true);
  assert.ok(one.body.data.launchedAt);

  assert.strictEqual((await json('POST', `/api/v1/campaigns/${id}/pause`)).body.status, 'PAUSED');
  const stats = await json('GET', `/api/v1/campaigns/${id}/stats`);
  assert.deepStrictEqual([stats.body.data.status, stats.body.data.stats.pending], ['PAUSED', 3]);

  await prisma.campaignTarget.updateMany({ where: { campaignId: id, phone: '966501234567' }, data: { status: 'SENT' } });
  const stopped = await json('POST', `/api/v1/campaigns/${id}/stop`);
  assert.deepStrictEqual([stopped.body.status, stopped.body.cancelled, stopped.body.refunded], ['CANCELLED', 2, 0.075]);
  assert.strictEqual(Math.round((await prisma.tenant.findUnique({ where: { id: 'T' } })).walletBalance * 10000) / 10000, 9.9625, 'only the sent message is paid');
});
