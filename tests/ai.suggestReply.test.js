// "Suggest a reply" in Live Chat: built from the business info + the conversation (never team notes),
// with the chosen tone, and placeholders for unknown facts. Gemini is faked. Needs TEST_MONGO_URL.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot, mongoUrl, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MONGO_URL');
const requests = [];
inject('axios', {
  post: async (url, body) => {
    requests.push(body);
    return { data: { candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: 'أهلاً محمد، الباقة المميزة بسعر [سعر الباقة] شهرياً.', missing: 'سعر الباقة المميزة' }) }] }, finishReason: 'STOP' }] } };
  }
});
inject('@prisma/client', { PrismaClient: class { constructor() { this.tenant = { findUnique: async () => ({ customFeatures: { aiSettings: { geminiKey: 'k' } } }) }; } } });

const mongoose = require(fromRoot('node_modules/mongoose'));
const aiService = require(fromRoot('src/modules/ai/ai.service'));
const ChatThread = require(fromRoot('src/models/mongo/ChatThread'));
const ChatMessage = require(fromRoot('src/models/mongo/ChatMessage'));
const AiAgent = require(fromRoot('src/models/mongo/AiAgent'));

before(async () => {
  if (skip) return;
  await mongoose.connect(mongoUrl('suggest_reply'));
  await mongoose.connection.db.dropDatabase();
});
after(async () => {
  if (skip) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('the draft uses the business info, the tone and the conversation, never team notes', { skip }, async () => {
  await AiAgent.create({ tenantId: 'T', instructions: 'نادِ العميل باسمه', knowledge: [{ id: '1', title: 'التوصيل', content: 'نوصل لجدة خلال يومين' }] });
  const thread = await ChatThread.create({ tenantId: 'T', channelId: 'ch', contactPhone: '9665', contactName: 'محمد' });
  await ChatMessage.create({ threadId: thread._id, direction: 'INBOUND', content: 'كم سعر الباقة المميزة؟' });
  await ChatMessage.create({ threadId: thread._id, direction: 'OUTBOUND', content: 'سري: هذا العميل مزعج', isInternal: true, type: 'INTERNAL_NOTE' });

  const draft = await aiService.suggestReply('T', thread._id.toString(), { tone: 'formal' });
  assert.deepStrictEqual(draft, { text: 'أهلاً محمد، الباقة المميزة بسعر [سعر الباقة] شهرياً.', missing: 'سعر الباقة المميزة', hasKnowledge: true });

  const body = requests[0];
  const system = body.systemInstruction.parts[0].text;
  assert.ok(system.includes('نوصل لجدة خلال يومين'), 'business info is in the prompt');
  assert.ok(system.includes('نادِ العميل باسمه'), 'the business instructions too');
  assert.ok(system.includes('رسمياً'), 'the chosen tone');
  assert.ok(system.includes('أقواس مربعة'), 'unknown facts become placeholders, not inventions');
  const conversation = body.contents.map(c => c.parts[0].text).join('\n');
  assert.ok(conversation.includes('كم سعر الباقة المميزة؟'));
  assert.ok(!conversation.includes('سري'), 'team notes never reach the AI');
});

test('refuses conversations without a customer message, and other accounts\' conversations', { skip }, async () => {
  const empty = await ChatThread.create({ tenantId: 'T', channelId: 'ch', contactPhone: '9666' });
  await assert.rejects(aiService.suggestReply('T', empty._id.toString()), (e) => e.status === 400);
  const other = await ChatThread.findOne({ contactPhone: '9665' });
  await assert.rejects(aiService.suggestReply('OTHER', other._id.toString()), (e) => e.status === 404);
});
