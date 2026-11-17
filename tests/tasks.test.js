// Team tasks on a throwaway MySQL (and Mongo for the conversation link): who sees what, assignees must be
// active team members, the conversation link, done / reopen, deleting, and the sidebar badge.
// Needs TEST_MYSQL_URL and TEST_MONGO_URL.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { ROOT, fromRoot, mongoUrl, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL') || skipUnless('TEST_MONGO_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const dbName = `wakeel_test_tasks_${Date.now().toString(36)}`;

let admin;
let prisma;
let tasks;
let mongoose;
const owner = { key: 'owner', seesAll: true };
const agentA = { key: 'A', seesAll: false };
const agentB = { key: 'B', seesAll: false };

before(async () => {
  if (skip) return;
  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  admin = new PrismaClient({ datasources: { db: { url: `${base}/mysql` } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\``);
  process.env.DATABASE_URL = `${base}/${dbName}`;
  execFileSync(fromRoot('node_modules/.bin/prisma'), ['db', 'push', '--skip-generate'], { cwd: ROOT, env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, stdio: 'pipe' });
  prisma = new PrismaClient();
  tasks = require(fromRoot('src/modules/tasks/tasks.service'));
  mongoose = require(fromRoot('node_modules/mongoose'));
  await mongoose.connect(mongoUrl('tasks'));
  await mongoose.connection.db.dropDatabase();

  await prisma.tenant.createMany({ data: [{ id: 'T', name: 'Shop', email: 's@t', passwordHash: 'x' }, { id: 'X', name: 'Other', email: 'x@t', passwordHash: 'x' }] });
  await prisma.subUser.createMany({ data: [
    { id: 'A', tenantId: 'T', name: 'Ahmed', email: 'a@t', passwordHash: 'x', role: 'AGENT' },
    { id: 'B', tenantId: 'T', name: 'Badr', email: 'b@t', passwordHash: 'x', role: 'AGENT' },
    { id: 'OFF', tenantId: 'T', name: 'Left', email: 'off@t', passwordHash: 'x', role: 'AGENT', isActive: false },
    { id: 'Z', tenantId: 'X', name: 'Other shop', email: 'z@t', passwordHash: 'x', role: 'AGENT' }
  ] });
});
after(async () => {
  if (skip) return;
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  await prisma?.$disconnect();
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => {});
  await admin.$disconnect();
});

test('create, see, finish and delete tasks; agents only see their own', { skip, timeout: 30000 }, async () => {
  const ChatThread = require(fromRoot('src/models/mongo/ChatThread'));
  const thread = await ChatThread.create({ tenantId: 'T', channelId: 'c1', contactPhone: '966500000001', contactName: 'سارة' });

  await assert.rejects(tasks.create('T', owner, { title: '  ' }), (e) => e.status === 400);
  await assert.rejects(tasks.create('T', owner, { title: 'x', assigneeId: 'OFF' }), (e) => /active member/.test(e.message), 'not a deactivated member');
  await assert.rejects(tasks.create('T', owner, { title: 'x', assigneeId: 'Z' }), (e) => e.status === 400, 'not another account’s member');
  await assert.rejects(tasks.create('T', owner, { title: 'x', threadId: '000000000000000000000000' }), (e) => e.status === 404);

  const late = await tasks.create('T', owner, { title: 'اتصل بسارة', assigneeId: 'A', dueAt: new Date(Date.now() - 3600e3).toISOString(), threadId: thread._id.toString() });
  assert.deepStrictEqual([late.contactName, late.contactPhone, late.createdBy], ['سارة', '966500000001', 'owner']);
  await tasks.create('T', agentA, { title: 'أرسل عرض السعر', dueAt: new Date(Date.now() + 86400e3).toISOString() });
  await tasks.create('T', agentA, { title: 'بلا موعد' });
  await tasks.create('T', agentB, { title: 'مهمة بدر' });

  assert.deepStrictEqual((await tasks.list('T', agentA, { view: 'mine' })).map(t => t.title), ['اتصل بسارة', 'أرسل عرض السعر', 'بلا موعد'], 'by due time, undated last');
  assert.strictEqual((await tasks.list('T', agentA, { view: 'all' })).length, 3, 'an agent never sees Badr’s task');
  assert.strictEqual((await tasks.list('T', owner, { view: 'all' })).length, 4);
  assert.deepStrictEqual(await tasks.summary('T', agentA), { open: 3, overdue: 1 });
  assert.strictEqual((await tasks.list('T', owner, { threadId: thread._id.toString() })).length, 1, 'tasks of one conversation');

  await assert.rejects(tasks.update('T', agentB, late.id, { status: 'DONE' }), (e) => e.status === 404, 'Badr cannot touch Ahmed’s task');
  const done = await tasks.update('T', agentA, late.id, { status: 'DONE' });
  assert.strictEqual(done.completedBy, 'A');
  assert.ok(done.completedAt);
  assert.strictEqual((await tasks.list('T', agentA, { view: 'done' })).length, 1);
  const reopened = await tasks.update('T', agentA, late.id, { status: 'OPEN' });
  assert.strictEqual(reopened.completedAt, null);

  await tasks.update('T', owner, late.id, { assigneeId: 'B' });
  assert.ok((await tasks.list('T', agentB, { view: 'mine' })).some(t => t.id === late.id), 'reassigned to Badr');
  await assert.rejects(tasks.remove('T', agentB, late.id), (e) => e.status === 403, 'only the creator or a manager deletes');
  await tasks.remove('T', owner, late.id);
  assert.strictEqual((await tasks.list('T', owner, { view: 'all' })).length, 3);
  assert.strictEqual((await tasks.list('X', { key: 'owner', seesAll: true }, { view: 'all' })).length, 0, 'other accounts see nothing');
});
