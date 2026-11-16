// Tickets end to end: customer messages from Meta, per-customer ordering, ticket numbers,
// open / assign / close / reopen, auto-close, the flow hand-off, the ticket list and ticket settings.
// Needs MongoDB (TEST_MONGO_URL). Prisma (MySQL) and Meta are replaced by in-memory fakes.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot, mongoUrl, skipUnless } = require('./helpers/env');
const { createFakePrisma } = require('./helpers/fakePrisma');

const skip = skipUnless('TEST_MONGO_URL');

// ── Data and fakes ──
const db = {
  whatsAppChannel: [{ id: 'ch1', tenantId: 'T', providerType: 'META_CLOUD', autoCreateTickets: false, phoneNumber: '9661', name: 'Sales', status: 'CONNECTED' }],
  tenant: [{ id: 'T', name: 'Rushd', customFeatures: { ticketSettings: { autoCreateTickets: true } } }, { id: 'OTHER', customFeatures: {} }],
  subUser: [
    { id: 'A', tenantId: 'T', name: 'Ahmed Ali', isActive: true, email: 'a@x' },
    { id: 'B', tenantId: 'T', name: 'Batoul', isActive: true, email: 'b@x' },
    { id: 'C', tenantId: 'T', name: 'Off Duty', isActive: false, email: 'c@x' },
    { id: 'X', tenantId: 'OTHER', name: 'Stranger', isActive: true, email: 'x@x' }
  ],
  ticket: [],
  ticketCategory: [{ id: 'cat1', tenantId: 'T', name: 'مبيعات' }, { id: 'catX', tenantId: 'OTHER', name: 'other' }]
};
inject('@prisma/client', { PrismaClient: createFakePrisma(db) });

const sent = [];
inject(fromRoot('src/modules/meta/meta.service'), {
  sendText: async (ch, phone, text) => { sent.push({ kind: 'text', phone, text }); return { messages: [{ id: `w${sent.length}` }] }; },
  sendButtons: async (ch, phone, text) => { sent.push({ kind: 'buttons', phone, text }); return { messages: [{ id: `wb${sent.length}` }] }; },
  sendList: async (ch, phone, title, text) => { sent.push({ kind: 'list', phone, text }); return { messages: [{ id: `wl${sent.length}` }] }; }
});
inject(fromRoot('src/modules/billing/billing.service'), { checkLimit: async () => true, incrementUsage: async () => {} });
const crm = [];
inject(fromRoot('src/modules/webhook/webhook.service'), {
  syncCrmContact: async () => null,
  syncCrmTicket: async (tenantId, data) => { crm.push(data); return null; },
  sendTicketRated: async () => null
});
inject(fromRoot('src/modules/ai/ai.service'), { summarizeTicket: async () => 'ملخص' });

const mongoose = require(fromRoot('node_modules/mongoose'));
const chatService = require(fromRoot('src/modules/chat/chat.service'));
const ticketsService = require(fromRoot('src/modules/tickets/tickets.service'));
const ticketsController = require(fromRoot('src/modules/tickets/tickets.controller'));
const flowService = require(fromRoot('src/modules/flows/flow.service'));
const shiftService = require(fromRoot('src/modules/workforce/shift.service'));
const teamService = require(fromRoot('src/modules/workforce/team.service'));
const ChatThread = require(fromRoot('src/models/mongo/ChatThread'));
const ChatMessage = require(fromRoot('src/models/mongo/ChatMessage'));

// ── Helpers ──
const T = 'T';
let wamid = 0;
const text = (body, id) => ({ id: id || `wamid.in${++wamid}`, type: 'text', text: { body } });
const receive = (phone, body, id) => chatService.handleIncomingMessage(T, 'ch1', phone, 'Customer', text(body, id));
const threadOf = (phone) => ChatThread.findOne({ tenantId: T, channelId: 'ch1', contactPhone: phone }).lean();
const ticketsOf = (threadId) => db.ticket.filter(t => t.threadId === String(threadId));
const activeOf = (threadId) => ticketsOf(threadId).find(t => ['OPEN', 'PENDING'].includes(t.status));
const notes = async (threadId) => (await ChatMessage.find({ threadId, isInternal: true }).sort({ createdAt: 1 }).lean()).map(m => m.content);
const setTickets = (values) => Object.assign(db.tenant[0].customFeatures.ticketSettings, values);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function expectStatus(promise, status) {
  try { await promise; } catch (e) { assert.strictEqual(e.status, status, `${e.status} ${e.message}`); return e; }
  throw new Error(`expected an error with status ${status}`);
}

/** Calls a controller method the way Express would */
async function call(method, { body = {}, params = {}, query = {}, subUser = null } = {}) {
  const req = { tenant: { id: T }, body, params, query, isSubUser: !!subUser, subUser };
  const out = { status: 200, body: null, error: null };
  const res = { status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } };
  await ticketsController[method](req, res, (err) => { out.error = err; out.status = err.status || 500; });
  return out;
}

before(async () => {
  if (skip) return;
  await mongoose.connect(mongoUrl('tickets'));
  await mongoose.connection.db.dropDatabase();
  await Promise.all(mongoose.modelNames().map(n => mongoose.model(n).init()));
  // Team "Sales" owns ch1; A and B are on shift all day
  const allDay = await shiftService.createShift(T, { name: 'كامل', startTime: '00:00', endTime: '00:00', days: [0, 1, 2, 3, 4, 5, 6] });
  const today = shiftService.localClock('Asia/Riyadh').date;
  for (const u of ['A', 'B']) await shiftService.assignShift(T, { subUserId: u, shiftId: allDay.id, effectiveFrom: today }, 'OWNER');
  await teamService.createTeam(T, { name: 'Sales', memberIds: ['A', 'B'], channelIds: ['ch1'] });
});

after(async () => {
  if (skip) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('a burst of messages from a new customer: one conversation, one ticket, original order', { skip }, async () => {
  // The number's old auto_create_tickets column is false (as for every Embedded Signup number): it must not matter
  await Promise.all(['مرحبا', 'عندي سؤال', 'عن الأسعار', 'وكم التوصيل', 'شكراً'].map(m => receive('c1', m)));
  const c1 = await threadOf('c1');
  assert.strictEqual(await ChatThread.countDocuments({ contactPhone: 'c1' }), 1);
  assert.strictEqual(ticketsOf(c1._id).length, 1, 'one ticket, not five');
  const msgs = await ChatMessage.find({ threadId: c1._id, direction: 'INBOUND' }).sort({ createdAt: 1 }).lean();
  assert.deepStrictEqual(msgs.map(m => m.content), ['مرحبا', 'عندي سؤال', 'عن الأسعار', 'وكم التوصيل', 'شكراً']);
  assert.ok(msgs.every(m => m.ticketId === ticketsOf(c1._id)[0].id), 'all messages belong to the ticket');
  assert.strictEqual(c1.unreadCount, 5);
  assert.ok(['A', 'B'].includes(ticketsOf(c1._id)[0].assignedToId), 'routed to the team');
});

test('Meta delivering the same message twice is handled once', { skip }, async () => {
  const first = await receive('c1', 'مرة', 'wamid.same');
  const second = await receive('c1', 'مرة', 'wamid.same');
  assert.ok(!first.duplicate && second.duplicate);
  assert.strictEqual(await ChatMessage.countDocuments({ metaMessageId: 'wamid.same' }), 1);
  assert.strictEqual((await threadOf('c1')).unreadCount, 6, 'unread counted once');
});

test('ticket numbers stay unique under load and continue after the highest one', { skip }, async () => {
  await Promise.all(Array.from({ length: 12 }, (_, i) => receive(`n${i}`, 'hello')));
  const numbers = db.ticket.map(t => t.ticketNumber);
  assert.strictEqual(new Set(numbers).size, numbers.length, numbers.join(','));
  assert.strictEqual(numbers.length, 13);
  db.ticket = db.ticket.filter(t => t.ticketNumber !== '#TK-0005'); // a deleted ticket leaves a gap
  await receive('n-after', 'hi');
  assert.strictEqual(db.ticket[db.ticket.length - 1].ticketNumber, '#TK-0014');
});

test('opening by hand: goes to whoever opened it; 409 when one is open; people and categories are checked', { skip }, async () => {
  await receive('m1', 'أريد التحدث');
  const m1 = await threadOf('m1');
  let r = await call('createTicket', { body: { channelId: 'ch1', threadId: m1._id.toString() }, subUser: { id: 'B', name: 'Batoul' } });
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.body.data.id, activeOf(m1._id).id);
  assert.strictEqual(ticketsOf(m1._id).length, 1);

  setTickets({ autoCreateTickets: false });
  await receive('m2', 'hello');
  const m2 = await threadOf('m2');
  assert.strictEqual(ticketsOf(m2._id).length, 0, 'automatic tickets off → none');
  setTickets({ autoCreateTickets: true });

  r = await call('createTicket', { body: { channelId: 'ch1', threadId: m2._id.toString(), subject: 'استفسار' }, subUser: { id: 'B', name: 'Batoul' } });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.data.assignedToId, 'B', 'assigned to whoever opened it');
  assert.ok((await notes(m2._id)).some(n => n.includes('فتح Batoul') && n.includes('أُسندت إلى Batoul')));

  setTickets({ autoCreateTickets: false });
  await receive('m6', 'hi');
  await receive('m7', 'hi');
  setTickets({ autoCreateTickets: true });
  const m6 = await threadOf('m6');
  const m7 = await threadOf('m7');
  r = await call('createTicket', { body: { channelId: 'ch1', threadId: m6._id.toString() } });
  assert.ok(['A', 'B'].includes(r.body.data.assignedToId), 'the owner → team routing');
  assert.ok((await notes(m6._id)).some(n => n.includes('فتح مدير الحساب')));
  for (const body of [{ assignedToId: 'C' }, { assignedToId: 'X' }, { categoryId: 'catX' }]) {
    r = await call('createTicket', { body: { channelId: 'ch1', threadId: m7._id.toString(), ...body } });
    assert.strictEqual(r.status, 400, JSON.stringify(body));
  }
  r = await call('createTicket', { body: { channelId: 'ch1', threadId: m7._id.toString(), assignedToId: null, categoryId: 'cat1' } });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.data.assignedToId, null, 'null → nobody, no routing');
  assert.strictEqual(r.body.data.categoryId, 'cat1');
});

test('assigning: active members of this account only, a note for the team, a reply takes an unassigned ticket', { skip }, async () => {
  const m7 = await threadOf('m7');
  const t7 = activeOf(m7._id);
  await expectStatus(ticketsService.assignTicket(T, t7.id, 'C'), 400);
  await expectStatus(ticketsService.assignTicket(T, t7.id, 'X'), 400);
  await expectStatus(ticketsService.assignTicket('OTHER', t7.id, 'X'), 404);
  let r = await call('assignTicket', { params: { id: t7.id }, body: { assignedToId: 'A' }, subUser: { id: 'B', name: 'Batoul' } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(activeOf(m7._id).assignedToId, 'A');
  assert.ok((await notes(m7._id)).some(n => n.includes('أسند Batoul') && n.includes('إلى Ahmed Ali')));
  r = await call('assignTicket', { params: { id: t7.id }, body: { assignedToId: null } });
  assert.strictEqual(activeOf(m7._id).assignedToId, null);

  await chatService.sendMessage(T, m7._id.toString(), { content: 'ملاحظة', type: 'text', isInternal: true, senderId: 'B' });
  assert.strictEqual(activeOf(m7._id).assignedToId, null, 'a team note does not take it');
  await chatService.sendMessage(T, m7._id.toString(), { content: 'أهلاً، كيف أخدمك؟', type: 'text', senderId: 'B' });
  assert.strictEqual(activeOf(m7._id).assignedToId, 'B', 'the first reply takes it');

  r = await call('getAssignees', { subUser: { id: 'A', name: 'Ahmed Ali' } });
  const listed = Object.fromEntries(r.body.data.members.map(m => [m.id, m]));
  assert.strictEqual(r.body.data.me, 'A');
  assert.ok(!listed.X, 'only this account');
  assert.strictEqual(listed.C.isActive, false);
  assert.strictEqual(listed.A.onShift, true);
});

test('closing: note with category and resolution, one rating request, none after 24h, 409 on a second close', { skip }, async () => {
  const m7 = await threadOf('m7');
  const t7 = activeOf(m7._id);
  sent.length = 0;
  let r = await call('closeTicket', { params: { id: t7.id }, body: { description: 'تم إرسال رابط الدفع', categoryId: 'cat1' }, subUser: { id: 'B', name: 'Batoul' } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.data.ratingRequest, 'SENT');
  assert.strictEqual(sent.filter(s => s.kind === 'list').length, 1);
  const note = (await notes(m7._id)).find(n => n.startsWith('✅'));
  assert.ok(note.includes('أغلق Batoul') && note.includes('التصنيف: مبيعات') && note.includes('الحل: تم إرسال رابط الدفع'), note);
  r = await call('closeTicket', { params: { id: t7.id }, body: {} });
  assert.strictEqual(r.status, 409);
  assert.strictEqual(sent.filter(s => s.kind === 'list').length, 1, 'no second rating request');
  await sleep(50);
  assert.strictEqual(db.ticket.find(t => t.id === t7.id).summary, 'ملخص', 'AI summary saved after the close');
  assert.ok(crm.some(c => c.ticket_id === t7.id && c.status === 'closed' && c.summary === 'ملخص' && c.category_name === 'مبيعات'));

  const m6 = await threadOf('m6');
  await ChatThread.updateOne({ _id: m6._id }, { $set: { lastInboundAt: new Date(Date.now() - 30 * 3600 * 1000) } });
  sent.length = 0;
  const closed = await ticketsService.closeTicket(T, activeOf(m6._id).id, { actor: { key: 'owner', name: 'مدير الحساب' } });
  assert.strictEqual(closed.ratingRequest, 'WINDOW_CLOSED', 'Meta would refuse it after 24h');
  assert.strictEqual(sent.length, 0);
});

test('reopening: a customer reply reopens the same ticket; 409 when one is open; a deactivated agent is replaced', { skip }, async () => {
  const m7 = await threadOf('m7');
  const t7Id = ticketsOf(m7._id)[0].id;
  await receive('m7', 'سؤال آخر');
  assert.strictEqual(ticketsOf(m7._id).length, 1, 'no new ticket');
  assert.strictEqual(activeOf(m7._id).id, t7Id);
  assert.strictEqual(activeOf(m7._id).assignedToId, 'B', 'back to the same agent');
  assert.ok((await notes(m7._id)).some(n => n.includes('لأن العميل راسل من جديد')));

  const m2 = await threadOf('m2');
  const t2 = activeOf(m2._id);
  await ticketsService.closeTicket(T, t2.id, { sendRating: false });
  await expectStatus(ticketsService.reopenTicket(T, activeOf(m7._id).id), 409);
  db.subUser.find(u => u.id === 'B').isActive = false;
  const reopened = await ticketsService.reopenTicket(T, t2.id, { actor: { key: 'A', name: 'Ahmed Ali' } });
  assert.strictEqual(reopened.assignedToId, 'A', 'deactivated owner → someone active');
  db.subUser.find(u => u.id === 'B').isActive = true;

  const m6 = await threadOf('m6');
  ticketsOf(m6._id)[0].rating = 5;
  await receive('m6', 'رجعت');
  assert.strictEqual(ticketsOf(m6._id).length, 2, 'a rated ticket stays closed, a new one opens');
});

test('auto-close: only silent customers; a team note never counts as our answer', { skip }, async () => {
  await receive('ac1', 'مرحبا');
  await receive('ac2', 'مرحبا');
  const ac1 = await threadOf('ac1');
  const ac2 = await threadOf('ac2');
  await chatService.sendMessage(T, ac1._id.toString(), { content: 'تفضل', type: 'text', senderId: 'A' });
  await chatService.sendMessage(T, ac2._id.toString(), { content: 'سأتابع غداً', type: 'text', isInternal: true, senderId: 'A' });
  const old = new Date(Date.now() - 25 * 3600 * 1000);
  await ChatMessage.collection.updateMany({ threadId: { $in: [ac1._id, ac2._id] }, direction: 'OUTBOUND' }, { $set: { createdAt: old } });
  await ChatMessage.collection.updateMany({ threadId: { $in: [ac1._id, ac2._id] }, direction: 'INBOUND' }, { $set: { createdAt: new Date(old.getTime() - 60000) } });
  await ChatThread.updateMany({ _id: { $in: [ac1._id, ac2._id] } }, { $set: { lastInboundAt: old } });
  await ticketsService.autoCloseInactiveTickets();
  assert.strictEqual(ticketsOf(ac1._id)[0].status, 'CLOSED', 'we answered, the customer went quiet');
  assert.strictEqual(ticketsOf(ac2._id)[0].status, 'OPEN', 'the customer is still waiting');
});

test('the ticket list: customer name and phone, unassigned and category filters, search by phone', { skip }, async () => {
  let r = await call('getTickets', { query: { status: 'ACTIVE', search: 'c1' } });
  assert.ok(r.body.data.length >= 1 && r.body.data[0].contact.phone === 'c1');
  r = await call('getTickets', { query: { assignedToId: 'none', status: 'ACTIVE' } });
  assert.ok(r.body.data.every(t => !t.assignedToId));
  r = await call('getTickets', { query: { categoryId: 'cat1' } });
  assert.ok(r.body.data.length >= 1 && r.body.data.every(t => t.category?.name === 'مبيعات'));
});

test('ticket settings: per-number switch, reopen window (0 = always new), rating off, validation', { skip }, async () => {
  let r = await call('getSettings');
  assert.deepStrictEqual(
    { on: r.body.data.autoCreateTickets, hours: r.body.data.reopenHours, rating: r.body.data.ratingEnabled, numbers: r.body.data.channels.map(c => [c.id, c.autoCreateTickets]) },
    { on: true, hours: 24, rating: true, numbers: [['ch1', true]] },
    'a number opens tickets unless switched off here (the old column is ignored)'
  );
  assert.strictEqual((await call('saveSettings', { body: { reopenHours: 999 } })).status, 400);
  assert.strictEqual((await call('saveSettings', { body: { ratingType: 'NOPE' } })).status, 400);

  r = await call('saveSettings', { body: { channels: [{ id: 'ch1', autoCreateTickets: false }, { id: 'not-mine', autoCreateTickets: false }] } });
  assert.strictEqual(r.body.data.channels[0].autoCreateTickets, false);
  assert.deepStrictEqual(db.tenant[0].customFeatures.ticketSettings.ticketlessChannelIds, ['ch1'], "another account's number is ignored");
  await receive('s1', 'hi');
  assert.strictEqual(ticketsOf((await threadOf('s1'))._id).length, 0, 'number switched off → no ticket');
  await call('saveSettings', { body: { channels: [{ id: 'ch1', autoCreateTickets: true }] } });

  await call('saveSettings', { body: { reopenHours: 0, ratingEnabled: false } });
  await receive('s2', 'مشكلة');
  const s2 = await threadOf('s2');
  sent.length = 0;
  const closed = await ticketsService.closeTicket(T, activeOf(s2._id).id, {});
  assert.strictEqual(closed.ratingRequest, 'OFF');
  assert.strictEqual(sent.length, 0);
  await receive('s2', 'المشكلة رجعت');
  assert.strictEqual(ticketsOf(s2._id).length, 2, 'reopenHours 0 → a new ticket');

  await call('saveSettings', { body: { reopenHours: 48 } });
  const latest = activeOf(s2._id);
  await ticketsService.closeTicket(T, latest.id, {});
  ticketsOf(s2._id).filter(t => t.id !== latest.id).forEach(t => { t.resolvedAt = new Date(Date.now() - 50 * 3600 * 1000); });
  db.ticket.find(t => t.id === latest.id).resolvedAt = new Date(Date.now() - 30 * 3600 * 1000);
  await receive('s2', 'ما زالت');
  assert.strictEqual(activeOf(s2._id).id, latest.id, 'within 48h → the same ticket');

  // Saving the business tab in Settings keeps the ticket settings it does not know about
  const authService = require(fromRoot('src/modules/auth/auth.service'));
  await authService.updateProfile(T, { companyName: 'Rushd AI' }).catch(() => {});
  assert.strictEqual(db.tenant[0].customFeatures.ticketSettings.reopenHours, 48);
  assert.deepStrictEqual(db.tenant[0].customFeatures.ticketSettings.ticketlessChannelIds, []);
});

test('flow step "hand to one agent" really goes to that agent', { skip }, async () => {
  await flowService.saveDraft(T, 'ch1', {
    nodes: [
      { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, data: { inactivityHours: 24 } },
      { id: 'msg', type: 'message', position: { x: 0, y: 100 }, data: { text: 'أهلاً' } },
      { id: 'toB', type: 'assign', position: { x: 0, y: 200 }, data: { mode: 'AGENT', agentId: 'B' } }
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'msg', sourceHandle: 'out' },
      { id: 'e2', source: 'msg', target: 'toB', sourceHandle: 'out' }
    ]
  });
  await flowService.publish(T, 'ch1');
  await flowService.setActive(T, 'ch1', true);
  setTickets({ autoCreateTickets: false }); // the flow opens the ticket itself
  await receive('f1', 'مرحبا');
  assert.strictEqual(activeOf((await threadOf('f1'))._id).assignedToId, 'B');
  await flowService.setActive(T, 'ch1', false);
  setTickets({ autoCreateTickets: true });
});
