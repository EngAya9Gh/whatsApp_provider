// What Live Chat stores for messages a WhatsApp flow sends: its questions and texts are marked as the
// flow's (so the team sees who answered and response time skips the bot), a person's message never is,
// and a person writing stops the running flow. Meta, the databases and billing are test doubles.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

const created = [];
const threadUpdates = [];
let thread;

inject(fromRoot('src/models/mongo/ChatThread'), {
  findOne: async () => thread,
  updateOne: async (filter, update) => { threadUpdates.push(update); }
});
inject(fromRoot('src/models/mongo/ChatMessage'), {
  create: async (data) => {
    created.push(data);
    return { ...data, toObject: () => ({ ...data, _id: `m${created.length}` }) };
  }
});
inject('@prisma/client', {
  PrismaClient: class { constructor() { this.whatsAppChannel = { findUnique: async () => ({ id: 'ch', tenantId: 'T' }) }; } }
});
const wamid = async () => ({ messages: [{ id: 'wamid.1' }] });
inject(fromRoot('src/modules/meta/meta.service'), { sendButtons: wamid, sendList: wamid, sendText: wamid, sendMedia: wamid });
inject(fromRoot('src/modules/billing/billing.service'), { checkLimit: async () => true, incrementUsage: async () => {} });
inject(fromRoot('src/modules/webhook/webhook.service'), { syncCrmContact: async () => null });
inject(fromRoot('src/modules/tickets/tickets.service'), { getActiveTicket: async () => null, assignTicket: async () => {} });
inject(fromRoot('src/services/socket.service'), { emitToTenant() {} });

const chatService = require(fromRoot('src/modules/chat/chat.service'));

beforeEach(() => {
  created.length = 0;
  threadUpdates.length = 0;
  thread = { _id: 'th1', tenantId: 'T', channelId: 'ch', contactPhone: '966500000001', crmSyncedAt: new Date(), flowState: { nodeId: 'ai' } };
});

test('a flow question is stored as the flow\'s', async () => {
  await chatService.sendInteractiveMessage('T', 'th1', { body: 'كيف نساعدك؟', options: [{ id: 'F:a:1', title: 'الأسعار' }], buttonLabel: 'الخيارات', source: 'FLOW' });
  assert.strictEqual(created[0].source, 'FLOW');
  assert.strictEqual(created[0].isAutomated, true);
  assert.strictEqual(created[0].status, 'SENT');

  await chatService.sendInteractiveMessage('T', 'th1', { body: 'x', options: [{ id: '1', title: 'a' }], source: 'ANYTHING' });
  assert.strictEqual(created[1].source, null, 'only the flow sources are kept');
});

test('the AI agent\'s reply and the hand-off note keep their marks, and do not stop the flow', async () => {
  await chatService.sendMessage('T', 'th1', { content: 'نفتح من 9', type: 'text', isAutomated: true, source: 'FLOW_AI' });
  await chatService.sendMessage('T', 'th1', { content: 'حوّل الموظف الذكي…', type: 'text', isInternal: true, isAutomated: true, source: 'FLOW_HANDOFF' });
  assert.deepStrictEqual(created.map(m => m.source), ['FLOW_AI', 'FLOW_HANDOFF']);
  assert.ok(!threadUpdates.some(u => u.$set && 'flowState' in u.$set));
});

test('a person\'s message is never marked as the flow\'s, and it stops the running flow', async () => {
  await chatService.sendMessage('T', 'th1', { content: '😏', type: 'text', senderId: 'A1', source: 'FLOW_AI' });
  assert.strictEqual(created[0].source, null);
  assert.strictEqual(created[0].isAutomated, false);
  assert.ok(threadUpdates.some(u => u.$set && u.$set.flowState === null), 'the flow stopped');
});
