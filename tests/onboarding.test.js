// "Set up your account" checklist: each step ticks from the account's own data, and hiding it is remembered
// without losing the account's other settings. Needs TEST_MONGO_URL.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot, mongoUrl, skipUnless } = require('./helpers/env');
const { createFakePrisma } = require('./helpers/fakePrisma');

const skip = skipUnless('TEST_MONGO_URL');
const db = {
  tenant: [{ id: 'T', customFeatures: { aiSettings: { geminiKey: 'k' } } }],
  whatsAppChannel: [], contact: [], subUser: [], messageLog: []
};
inject('@prisma/client', { PrismaClient: createFakePrisma(db) });

const mongoose = require(fromRoot('node_modules/mongoose'));
const onboarding = require(fromRoot('src/modules/dashboard/onboarding.service'));
const doneKeys = async () => (await onboarding.getChecklist('T')).steps.filter(s => s.done).map(s => s.key);

before(async () => {
  if (skip) return;
  await mongoose.connect(mongoUrl('onboarding'));
  await mongoose.connection.db.dropDatabase();
});
after(async () => {
  if (skip) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('steps tick themselves from the account data', { skip }, async () => {
  assert.deepStrictEqual((await onboarding.getChecklist('T')).steps.map(s => s.key), ['connect', 'contacts', 'team', 'hours', 'aiAgent', 'firstMessage']);
  assert.deepStrictEqual(await doneKeys(), []);

  db.whatsAppChannel.push({ id: 'c1', tenantId: 'T' });
  db.contact.push({ id: 'p1', tenantId: 'T' });
  db.subUser.push({ id: 'u1', tenantId: 'T' });
  const ChannelHours = require(fromRoot('src/models/mongo/ChannelHours'));
  const AiAgent = require(fromRoot('src/models/mongo/AiAgent'));
  await ChannelHours.create({ tenantId: 'T', channelId: 'c1', enabled: false });
  await AiAgent.create({ tenantId: 'T', knowledge: [{ id: 'k1', title: 'من نحن', content: '   ' }] });
  assert.deepStrictEqual(await doneKeys(), ['connect', 'contacts', 'team'], 'hours switched off and an empty business info do not count');

  await ChannelHours.updateOne({ tenantId: 'T' }, { enabled: true });
  await AiAgent.updateOne({ tenantId: 'T' }, { knowledge: [{ id: 'k1', title: 'من نحن', content: 'متجر عطور' }] });
  const ChatThread = require(fromRoot('src/models/mongo/ChatThread'));
  const ChatMessage = require(fromRoot('src/models/mongo/ChatMessage'));
  const thread = await ChatThread.create({ tenantId: 'T', channelId: 'c1', contactPhone: '9665', contactName: 'A' });
  await ChatMessage.create({ threadId: thread._id, direction: 'INBOUND', type: 'TEXT', content: 'مرحبا' });
  assert.ok(!(await doneKeys()).includes('firstMessage'), 'a customer message alone is not our first message');
  await ChatMessage.create({ threadId: thread._id, direction: 'OUTBOUND', type: 'TEXT', content: 'أهلاً' });
  assert.deepStrictEqual(await doneKeys(), ['connect', 'contacts', 'team', 'hours', 'aiAgent', 'firstMessage']);
});

test('hiding is remembered and keeps the other account settings', { skip }, async () => {
  const { dismissedAt } = await onboarding.dismiss('T');
  assert.ok(dismissedAt);
  assert.strictEqual((await onboarding.getChecklist('T')).dismissedAt, dismissedAt);
  assert.deepStrictEqual(db.tenant[0].customFeatures.aiSettings, { geminiKey: 'k' });
});
