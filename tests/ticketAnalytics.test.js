// Ticket analytics: pick-up time counts only tickets a person took (routing is instant and shown apart),
// from when the ticket became the team's (not while a flow talked); first reply likewise; opening time is
// measured for every ticket, whoever got it and whatever the take-on setting; per agent.
const { test } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

const NOW = Date.now();
const ago = (min) => new Date(NOW - min * 60000);
const base = { tenantId: 'T', channelId: 'ch', status: 'OPEN', rating: null, categoryId: null, resolvedAt: null, firstResponseAt: null };
const TICKETS = [
  // Opened 60 min ago, the bot talked for 20 min, handed over (ready), Ahmad opened it 90 s later and replied 30 s after
  { ...base, id: 't1', createdAt: ago(60), readyAt: ago(40), firstOpenedAt: ago(38.5), firstOpenedById: 'A', firstAssignedAt: ago(38.5), assignedVia: 'OPEN', assignedToId: 'A', firstResponseAt: ago(38) },
  // Routed at once to Basma, who opened it 2 min later, replied 4 min later, then closed it with 5 stars
  { ...base, id: 't2', createdAt: ago(30), readyAt: ago(30), firstOpenedAt: ago(28), firstOpenedById: 'B', firstAssignedAt: ago(30), assignedVia: 'ROUTING', assignedToId: 'B', firstResponseAt: ago(26), status: 'CLOSED', resolvedAt: ago(10), rating: 5, categoryId: 'c1' },
  // Waiting for somebody for 15 minutes; Ahmad looked at it after a minute but did not take it ("first reply" setting)
  { ...base, id: 't3', createdAt: ago(15), readyAt: ago(15), firstOpenedAt: ago(14), firstOpenedById: 'A', firstAssignedAt: null, assignedVia: null, assignedToId: null },
  // From before pick-up times were recorded: counted as opened, not in the speed figures
  { ...base, id: 't4', createdAt: ago(100), readyAt: null, firstAssignedAt: null, assignedVia: null, assignedToId: 'A' }
];
const fakePrisma = {
  whatsAppChannel: { findMany: async () => [{ id: 'ch', name: 'Main' }] },
  ticket: { findMany: async ({ where }) => (where.status ? TICKETS.filter(t => where.status.in.includes(t.status)) : TICKETS) },
  subUser: { findMany: async () => [{ id: 'A', name: 'Ahmad', isActive: true }, { id: 'B', name: 'Basma', isActive: true }] },
  ticketCategory: { findMany: async () => [{ id: 'c1', name: 'المبيعات' }] }
};
inject('@prisma/client', { PrismaClient: class { constructor() { return fakePrisma; } } });

const analytics = require(fromRoot('src/modules/analytics/analytics.service'));
const shiftService = require(fromRoot('src/modules/workforce/shift.service'));
shiftService.getTimezone = async () => 'Asia/Riyadh';
shiftService.getOnShiftUserIds = async () => ['A'];

test('pick-up and first reply in seconds, routing apart, the bot\'s time not counted', async () => {
  const data = await analytics.getTicketAnalytics('T', { days: 7 });
  const s = data.summary;
  assert.strictEqual(s.opened, 4);
  assert.strictEqual(s.closed, 1);
  assert.strictEqual(s.openNow, 3);
  assert.strictEqual(s.unassignedNow, 1);
  assert.ok(Math.abs(s.longestUnassignedMinutes - 15) < 0.1);

  assert.strictEqual(s.pickedCount, 1, 'routing is not a person picking it up');
  assert.strictEqual(s.avgPickupMinutes, 1.5); // 90 seconds, not 21.5 minutes from the ticket's creation
  assert.strictEqual(s.repliedCount, 2);
  assert.strictEqual(s.avgFirstReplyMinutes, 3); // t1: 2 min after the hand-off, t2: 4 min → 3 min
  assert.deepStrictEqual(data.howTaken, [{ key: 'OPEN', count: 1 }, { key: 'ROUTING', count: 1 }]);
  assert.deepStrictEqual(data.byCategory.map(c => [c.name, c.count]), [[null, 3], ['المبيعات', 1]]);

  const ahmad = data.agents.find(a => a.id === 'A');
  assert.deepStrictEqual([ahmad.openNow, ahmad.taken, ahmad.takenByOpening, ahmad.avgPickupMinutes, ahmad.avgFirstReplyMinutes, ahmad.onShiftNow], [2, 1, 1, 1.5, 2, true]);
  const basma = data.agents.find(a => a.id === 'B');
  assert.deepStrictEqual([basma.closed, basma.avgRating, basma.avgPickupMinutes, basma.avgFirstReplyMinutes], [1, 5, null, 4]);
  assert.strictEqual(data.tracked, true);
});

test('time to open: every ticket a team member opened, by whoever opened it first', async () => {
  const data = await analytics.getTicketAnalytics('T', { days: 7 });
  assert.strictEqual(data.summary.openedByTeamCount, 3, 'routed and untaken tickets count too');
  assert.strictEqual(data.summary.avgOpenMinutes, 1.5); // 1.5, 2 and 1 minutes
  assert.strictEqual(data.summary.medianOpenMinutes, 1.5);
  const ahmad = data.agents.find(a => a.id === 'A');
  assert.deepStrictEqual([ahmad.openedFirst, ahmad.avgOpenMinutes], [2, 1.25]);
  const basma = data.agents.find(a => a.id === 'B');
  assert.deepStrictEqual([basma.openedFirst, basma.avgOpenMinutes], [1, 2]);
});
