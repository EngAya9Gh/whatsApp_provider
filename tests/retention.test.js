// Data retention: rows older than the admin's periods go, newer ones stay, and a kind without a period
// is never touched. Needs TEST_MYSQL_URL; the MongoDB part also needs TEST_MONGO_URL.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const { ROOT, fromRoot, skipUnless, mongoUrl } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL');
const skipMongo = skip || skipUnless('TEST_MONGO_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const dbName = `wakeel_test_retention_${process.pid}`;
const ago = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

let admin;
let prisma;
let retention;
let mongoose;
before(async () => {
  if (skip) return;
  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  admin = new PrismaClient({ datasources: { db: { url: `${base}/mysql` } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\``);
  process.env.DATABASE_URL = `${base}/${dbName}`;
  execFileSync(fromRoot('node_modules/.bin/prisma'), ['db', 'push', '--skip-generate'], { cwd: ROOT, env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, stdio: 'pipe' });
  prisma = require(fromRoot('src/config/prisma'));
  retention = require(fromRoot('src/services/retentionScheduler'));
  await prisma.tenant.create({ data: { id: 'T', name: 'Shop', email: 's@t', passwordHash: 'x' } });
  if (!skipMongo) {
    mongoose = require(fromRoot('node_modules/mongoose'));
    await mongoose.connect(mongoUrl('retention'));
    await mongoose.connection.db.dropDatabase();
  }
});
after(async () => {
  if (skip) return;
  if (mongoose) {
    await mongoose.connection.db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
  await prisma?.$disconnect();
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
  await admin.$disconnect();
});

test('periods: empty or 0 = keep forever, delivery ticks default to 90 days', () => {
  const { daysOf } = require(fromRoot('src/services/retentionScheduler'));
  assert.strictEqual(daysOf({}, 'retentionMessageLogsDays'), null);
  assert.strictEqual(daysOf({ retentionMessageLogsDays: '' }, 'retentionMessageLogsDays'), null);
  assert.strictEqual(daysOf({ retentionMessageLogsDays: 0 }, 'retentionMessageLogsDays'), null);
  assert.strictEqual(daysOf({ retentionMessageLogsDays: '45.7' }, 'retentionMessageLogsDays'), 45);
  assert.strictEqual(daysOf({}, 'retentionCampaignDeliveriesDays'), 90);
  assert.strictEqual(daysOf({ retentionCampaignDeliveriesDays: null }, 'retentionCampaignDeliveriesDays'), 90);
  assert.strictEqual(daysOf({ retentionCampaignDeliveriesDays: 0 }, 'retentionCampaignDeliveriesDays'), null);
});

test('old send logs go, recent ones and kinds without a period stay', { skip, timeout: 60000 }, async () => {
  const log = (days) => prisma.messageLog.create({ data: { tenantId: 'T', phone: '966500000001', status: 'SENT', createdAt: ago(days) } });
  await Promise.all([log(100), log(40), log(5)]);
  const ai = (days) => prisma.aiUsage.create({ data: { tenantId: 'T', feature: 'reply', model: 'gemini', createdAt: ago(days) } });
  await Promise.all([ai(100), ai(5)]);

  // No periods set yet: nothing in MySQL is deleted
  let out = await retention.run();
  assert.strictEqual(out.messageLogs, undefined);
  assert.strictEqual(await prisma.messageLog.count(), 3);

  await prisma.systemSetting.upsert({ where: { id: 'GLOBAL' }, update: { data: { retentionMessageLogsDays: 30 } }, create: { id: 'GLOBAL', data: { retentionMessageLogsDays: 30 } } });
  out = await retention.run();
  assert.strictEqual(out.messageLogs, 2);
  assert.strictEqual(await prisma.messageLog.count(), 1);
  assert.strictEqual(out.aiUsage, undefined, 'AI records have no period');
  assert.strictEqual(await prisma.aiUsage.count(), 2);

  await prisma.systemSetting.update({ where: { id: 'GLOBAL' }, data: { data: { retentionMessageLogsDays: 30, retentionAiUsageDays: 30 } } });
  out = await retention.run();
  assert.deepStrictEqual([out.messageLogs, out.aiUsage], [0, 1]);
  assert.strictEqual(await prisma.aiUsage.count(), 1);
});

test('old chat messages go while the conversations stay; delivery ticks older than 90 days go by default', { skip: skipMongo, timeout: 60000 }, async () => {
  const ChatThread = require(fromRoot('src/models/mongo/ChatThread'));
  const ChatMessage = require(fromRoot('src/models/mongo/ChatMessage'));
  const CampaignDelivery = require(fromRoot('src/models/mongo/CampaignDelivery'));
  const thread = await ChatThread.create({ tenantId: 'T', channelId: 'C', contactPhone: '966500000001', lastMessageAt: ago(400) });
  await ChatMessage.insertMany([
    { threadId: thread._id, direction: 'INBOUND', content: 'old', createdAt: ago(400), updatedAt: ago(400) },
    { threadId: thread._id, direction: 'OUTBOUND', content: 'new', createdAt: ago(2), updatedAt: ago(2) }
  ]);
  await CampaignDelivery.insertMany([
    { wamid: 'w-old', tenantId: 'T', campaignId: 'c', targetId: 't', createdAt: ago(200), updatedAt: ago(200) },
    { wamid: 'w-new', tenantId: 'T', campaignId: 'c', targetId: 't', createdAt: ago(10), updatedAt: ago(10) }
  ]);

  await prisma.systemSetting.update({ where: { id: 'GLOBAL' }, data: { data: { retentionChatMessagesDays: 365 } } });
  const out = await retention.run();
  assert.strictEqual(out.chatMessages, 1);
  assert.strictEqual(out.campaignDeliveries, 1);
  assert.deepStrictEqual((await ChatMessage.find().lean()).map(m => m.content), ['new']);
  assert.strictEqual(await ChatThread.countDocuments(), 1, 'the conversation stays');
  assert.deepStrictEqual((await CampaignDelivery.find().lean()).map(d => d.wamid), ['w-new']);
});
