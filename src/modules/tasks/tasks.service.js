// Team tasks: follow-ups with a due time and a person in charge, optionally on a Live Chat conversation.
// People are 'owner' or a sub-user id. The owner and ADMIN / MANAGER members see every task; an AGENT sees
// the tasks given to them or created by them.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bad = (message, status = 400) => ({ status, message });
const LIMIT = 300;

/** Who is asking: { key: 'owner' | sub-user id, seesAll } */
function viewerOf(req) {
  if (!req.isSubUser) return { key: 'owner', seesAll: true };
  return { key: req.subUser.id, seesAll: ['ADMIN', 'MANAGER'].includes(req.subUser.role) };
}

const visibleTo = (viewer) => (viewer.seesAll ? {} : { OR: [{ assigneeId: viewer.key }, { createdBy: viewer.key }] });

async function checkAssignee(tenantId, assigneeId) {
  if (assigneeId === null || assigneeId === 'owner') return assigneeId;
  const member = await prisma.subUser.findFirst({ where: { id: String(assigneeId), tenantId, isActive: true }, select: { id: true } });
  if (!member) throw bad('Choose an active member of your team');
  return member.id;
}

function cleanDue(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw bad('The due time is not valid');
  return d;
}

function cleanTitle(value) {
  const title = String(value ?? '').trim();
  if (!title) throw bad('Write what needs to be done');
  if (title.length > 200) throw bad('The title is too long (max 200 characters)');
  return title;
}

async function threadInfo(tenantId, threadId) {
  if (!threadId) return {};
  const ChatThread = require('../../models/mongo/ChatThread');
  let thread = null;
  try { thread = await ChatThread.findOne({ _id: threadId, tenantId }).select('contactName contactPhone').lean(); } catch { thread = null }
  if (!thread) throw bad('Conversation not found', 404);
  return { threadId: String(threadId), contactName: thread.contactName || null, contactPhone: thread.contactPhone || null };
}

/** view: 'mine' (open, given to me), 'all' (open, everyone I can see), 'done'; threadId: tasks of one conversation */
async function list(tenantId, viewer, { view = 'mine', threadId } = {}) {
  const where = { tenantId, ...visibleTo(viewer) };
  if (threadId) where.threadId = String(threadId);
  if (view === 'done') where.status = 'DONE';
  else if (!threadId) {
    where.status = 'OPEN';
    if (view === 'mine') where.assigneeId = viewer.key;
  }
  const rows = await prisma.task.findMany({
    where,
    orderBy: view === 'done' ? [{ completedAt: 'desc' }] : [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
    take: LIMIT
  });
  // Open tasks without a due time go after the dated ones
  if (view !== 'done') rows.sort((a, b) => (a.status !== b.status ? (a.status === 'OPEN' ? -1 : 1) : (!a.dueAt) - (!b.dueAt)));
  return rows;
}

/** For the sidebar badge: my open tasks and how many are late */
async function summary(tenantId, viewer, now = new Date()) {
  const mine = { tenantId, status: 'OPEN', assigneeId: viewer.key };
  const [open, overdue] = await Promise.all([
    prisma.task.count({ where: mine }),
    prisma.task.count({ where: { ...mine, dueAt: { lt: now } } })
  ]);
  return { open, overdue };
}

async function create(tenantId, viewer, data = {}) {
  const assigneeId = await checkAssignee(tenantId, data.assigneeId === undefined ? viewer.key : (data.assigneeId || null));
  return prisma.task.create({
    data: {
      tenantId,
      title: cleanTitle(data.title),
      notes: data.notes ? String(data.notes).slice(0, 5000) : null,
      dueAt: cleanDue(data.dueAt) ?? null,
      assigneeId,
      createdBy: viewer.key,
      ...(await threadInfo(tenantId, data.threadId))
    }
  });
}

async function findVisible(tenantId, viewer, id) {
  const task = await prisma.task.findFirst({ where: { id, tenantId, ...visibleTo(viewer) } });
  if (!task) throw bad('Task not found', 404);
  return task;
}

async function update(tenantId, viewer, id, data = {}) {
  await findVisible(tenantId, viewer, id);
  const patch = {};
  if (data.title !== undefined) patch.title = cleanTitle(data.title);
  if (data.notes !== undefined) patch.notes = data.notes ? String(data.notes).slice(0, 5000) : null;
  if (data.dueAt !== undefined) patch.dueAt = cleanDue(data.dueAt);
  if (data.assigneeId !== undefined) patch.assigneeId = await checkAssignee(tenantId, data.assigneeId || null);
  if (data.status !== undefined) {
    if (!['OPEN', 'DONE'].includes(data.status)) throw bad('status must be OPEN or DONE');
    patch.status = data.status;
    patch.completedAt = data.status === 'DONE' ? new Date() : null;
    patch.completedBy = data.status === 'DONE' ? viewer.key : null;
  }
  return prisma.task.update({ where: { id }, data: patch });
}

async function remove(tenantId, viewer, id) {
  const task = await findVisible(tenantId, viewer, id);
  if (!viewer.seesAll && task.createdBy !== viewer.key) throw bad('Only whoever created the task can delete it', 403);
  await prisma.task.delete({ where: { id } });
  return { deleted: true };
}

module.exports = { viewerOf, list, summary, create, update, remove };
