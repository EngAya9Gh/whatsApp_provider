// "Log in as customer": an admin opens a customer's dashboard for a limited time, without their password.
// The session is a normal owner token that also names the session (imp) and the admin (impBy); every request
// checks the session is still open, so ending it (or its 30 minutes running out) locks the token at once.
// Changes made during the session are listed on it (the first MAX_ACTIONS); the password, email and API keys
// cannot be changed.
const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const logger = require('../../utils/logger');

const prisma = require('../../config/prisma');
const SESSION_MINUTES = 30;
const MAX_ACTIONS = 300;

/** Requests blocked while an admin is inside the account */
function blockedReason(req) {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (path.startsWith('/api/keys') && req.method !== 'GET') return 'API keys cannot be changed in a support session';
  if (path === '/api/auth/profile' && req.body && (req.body.password !== undefined || req.body.email !== undefined)) {
    return 'The password and email cannot be changed in a support session';
  }
  return null;
}

async function start(adminEmail, tenantId, { ip, userAgent } = {}) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, email: true, isActive: true } });
  if (!tenant) throw { status: 404, message: 'Tenant not found' };
  if (!tenant.isActive) throw { status: 400, message: 'This account is disabled: enable it first' };

  const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60 * 1000);
  const session = await prisma.adminImpersonation.create({
    data: {
      tenantId,
      adminEmail: String(adminEmail || 'admin').slice(0, 191),
      ip: ip ? String(ip).slice(0, 64) : null,
      userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
      expiresAt
    }
  });
  const token = jwt.sign({ tenantId, email: tenant.email, imp: session.id, impBy: session.adminEmail }, config.jwt.secret, { expiresIn: SESSION_MINUTES * 60 });
  logger.info(`[Impersonation] ${session.adminEmail} entered account ${tenantId} until ${expiresAt.toISOString()}`);
  return { token, sessionId: session.id, expiresAt: expiresAt.toISOString() };
}

/** The open session of a token, or null when it was ended or ran out */
async function activeSession(id) {
  const session = await prisma.adminImpersonation.findUnique({ where: { id } });
  if (!session || session.endedAt || session.expiresAt <= new Date()) return null;
  return session;
}

async function end(id) {
  await prisma.adminImpersonation.updateMany({ where: { id, endedAt: null }, data: { endedAt: new Date() } });
}

/** Adds one change made during the session, in one atomic UPDATE (requests can finish at the same time) */
async function recordAction(id, action) {
  try {
    await prisma.$executeRaw`UPDATE admin_impersonations
      SET actions = JSON_ARRAY_APPEND(COALESCE(actions, JSON_ARRAY()), '$', CAST(${JSON.stringify(action)} AS JSON))
      WHERE id = ${id} AND (actions IS NULL OR JSON_LENGTH(actions) < ${MAX_ACTIONS})`;
  } catch (err) {
    logger.warn(`[Impersonation] Could not record an action of session ${id}: ${err.message}`);
  }
}

/** Express middleware, after the identity is known: blocks the forbidden changes and records the others */
function guard(req, res, next) {
  const session = req.impersonation;
  if (!session) return next();
  // Every change, and every blocked attempt, is listed on the session (reading is not)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    res.on('finish', () => {
      logger.info(`[Impersonation] ${session.by} in ${req.tenant?.id}: ${req.method} ${path} → ${res.statusCode}`);
      recordAction(session.id, { at: new Date().toISOString(), method: req.method, path, status: res.statusCode });
    });
  }
  const reason = blockedReason(req);
  if (reason) return res.status(403).json({ error: reason, code: 'SUPPORT_SESSION_FORBIDDEN' });
  next();
}

async function list(tenantId, { limit = 20 } = {}) {
  const rows = await prisma.adminImpersonation.findMany({
    where: { tenantId }, orderBy: { startedAt: 'desc' }, take: Math.min(Math.max(Number(limit) || 20, 1), 100)
  });
  return rows.map(r => ({
    id: r.id,
    adminEmail: r.adminEmail,
    ip: r.ip,
    startedAt: r.startedAt,
    expiresAt: r.expiresAt,
    endedAt: r.endedAt,
    actions: Array.isArray(r.actions) ? r.actions : []
  }));
}

module.exports = { SESSION_MINUTES, start, end, activeSession, recordAction, guard, list, blockedReason };
