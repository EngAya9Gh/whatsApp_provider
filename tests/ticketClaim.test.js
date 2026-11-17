// Taking tickets: opening a conversation gives its unassigned ticket to that team member, two people
// opening it together cannot both get it, automatic routing never overwrites someone who already took it,
// and the pick-up time is recorded once. Prisma and Mongo are in-memory test doubles.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

// ─── Tiny in-memory Prisma: just what the ticket code uses ───
let tickets = [];
let settings = {};
const members = [
  { id: 'A', name: 'Ahmad', isActive: true, tenantId: 'T' },
  { id: 'B', name: 'Basma', isActive: true, tenantId: 'T' },
  { id: 'X', name: 'Old', isActive: false, tenantId: 'T' }
];
const matches = (row, where = {}) => Object.entries(where).every(([key, cond]) => {
  if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
    if ('in' in cond) return cond.in.includes(row[key]);
    if ('not' in cond) return row[key] !== cond.not;
  }
  return (row[key] ?? null) === cond;
});
const delay = () => new Promise(resolve => setImmediate(resolve));
const fakePrisma = {
  subUser: {
    findFirst: async ({ where }) => members.find(m => matches(m, where)) || null,
    findMany: async ({ where }) => members.filter(m => matches(m, where))
  },
  ticket: {
    findFirst: async ({ where }) => { await delay(); return tickets.find(t => matches(t, where)) || null; },
    // A conditional UPDATE is atomic in MySQL; here one JS turn does the same
    updateMany: async ({ where, data }) => {
      await delay();
      const hit = tickets.filter(t => matches(t, where));
      hit.forEach(t => Object.assign(t, data));
      return { count: hit.length };
    }
  },
  tenant: { findUnique: async () => ({ customFeatures: { ticketSettings: settings } }) }
};
inject('@prisma/client', { PrismaClient: class { constructor() { return fakePrisma; } } });

const notes = [];
inject(fromRoot('src/models/mongo/ChatMessage'), {
  create: async (data) => { notes.push(data.content); return { toObject: () => ({ ...data, _id: 'n' }) }; }
});
let threadFlowState = null;
inject(fromRoot('src/models/mongo/ChatThread'), {
  findOne: () => ({ select() { return this; }, lean: async () => ({ flowState: threadFlowState }) })
});
inject(fromRoot('src/models/mongo/Team'), {
  findOne: () => ({ lean: async () => ({ _id: 'team', name: 'Sales', memberIds: ['B'], routing: { mode: 'ROUND_ROBIN', onlyOnShift: false, stickyOwner: false } }) }),
  updateOne: async () => {}
});
inject(fromRoot('src/services/socket.service'), { emitToTenant() {} });

const ticketsService = require(fromRoot('src/modules/tickets/tickets.service'));
const routingService = require(fromRoot('src/modules/workforce/routing.service'));
const ticketsController = require(fromRoot('src/modules/tickets/tickets.controller'));

const THREAD = '64b000000000000000000001';
beforeEach(() => {
  settings = {};
  threadFlowState = null;
  notes.length = 0;
  tickets = [{ id: 'tk1', tenantId: 'T', threadId: THREAD, channelId: 'ch', ticketNumber: '#TK-0001', status: 'OPEN', assignedToId: null, createdAt: new Date(), readyAt: new Date(), firstAssignedAt: null, assignedVia: null }];
});

test('two people opening the same conversation together: exactly one gets the ticket', async () => {
  const [a, b] = await Promise.all([
    ticketsService.claimTicket('T', 'tk1', 'A', 'OPEN'),
    ticketsService.claimTicket('T', 'tk1', 'B', 'OPEN')
  ]);
  assert.strictEqual([a, b].filter(r => r.claimed).length, 1);
  const winner = a.claimed ? a : b;
  const loser = a.claimed ? b : a;
  assert.strictEqual(tickets[0].assignedToId, winner.assignee.id);
  assert.deepStrictEqual(loser.assignee, winner.assignee, 'the other one is told who has it');
  assert.strictEqual(tickets[0].assignedVia, 'OPEN');
  assert.ok(tickets[0].firstAssignedAt instanceof Date);
  assert.strictEqual(notes.length, 1, 'one note for the team');
  assert.match(notes[0], /عند فتح المحادثة/);
});

test('a closed ticket, or a deactivated member, cannot be taken', async () => {
  tickets[0].status = 'CLOSED';
  assert.strictEqual((await ticketsService.claimTicket('T', 'tk1', 'A')).claimed, false);
  tickets[0].status = 'OPEN';
  await assert.rejects(ticketsService.claimTicket('T', 'tk1', 'X'), (err) => err.status === 400);
});

test('routing never overwrites someone who took the ticket meanwhile', async () => {
  const stale = { ...tickets[0] }; // read before the claim
  await ticketsService.claimTicket('T', 'tk1', 'A', 'OPEN');
  assert.strictEqual(await routingService.autoAssignTicket('T', stale), null);
  assert.strictEqual(tickets[0].assignedToId, 'A');
  assert.strictEqual(tickets[0].assignedVia, 'OPEN', 'the first way it was taken stays');
});

test('routing a free ticket records it as automatic', async () => {
  assert.strictEqual(await routingService.autoAssignTicket('T', { ...tickets[0] }), 'B');
  assert.strictEqual(tickets[0].assignedVia, 'ROUTING');
});

// ─── What opening a conversation in Live Chat does ───
const call = async (req) => {
  let body = null;
  let status = 200;
  const res = { status(code) { status = code; return this; }, json(data) { body = data; return this; } };
  await ticketsController.claimOnOpen({ tenant: { id: 'T' }, body: { threadId: THREAD }, ...req }, res, (err) => { throw err; });
  return { status, data: body.data };
};
const asMember = (id) => ({ isSubUser: true, subUser: { id, name: members.find(m => m.id === id).name } });

test('opening takes the ticket; the second person learns who has it', async () => {
  assert.strictEqual((await call(asMember('A'))).data.claimed, true);
  const second = await call(asMember('B'));
  assert.strictEqual(second.data.claimed, false);
  assert.strictEqual(second.data.reason, 'TAKEN');
  assert.strictEqual(second.data.assignee.name, 'Ahmad');
  assert.strictEqual((await call(asMember('A'))).data.reason, 'MINE');
});

test('opening does not take it: the owner, the "first reply" setting, or while the bot is answering', async () => {
  assert.strictEqual((await call({ isSubUser: false })).data.reason, 'OWNER');
  settings = { claimOn: 'REPLY' };
  assert.strictEqual((await call(asMember('A'))).data.reason, 'SETTING');
  settings = {};
  threadFlowState = { nodeId: 'ai' };
  assert.strictEqual((await call(asMember('A'))).data.reason, 'FLOW');
  assert.strictEqual(tickets[0].assignedToId, null);
  tickets[0].status = 'CLOSED';
  threadFlowState = null;
  assert.strictEqual((await call(asMember('A'))).data.reason, 'NO_TICKET');
});

test('the setting defaults to "when they open it" and saves only known values', () => {
  assert.strictEqual(ticketsService.ticketSettingsOf({}).claimOn, 'OPEN');
  assert.strictEqual(ticketsService.ticketSettingsOf({ ticketSettings: { claimOn: 'REPLY' } }).claimOn, 'REPLY');
  assert.strictEqual(ticketsService.ticketSettingsOf({ ticketSettings: { claimOn: 'x' } }).claimOn, 'OPEN');
});
