const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { resolvePermissions } = require('../modules/subuser/subuser.service');

const prisma = new PrismaClient();

/**
 * Middleware رئيسي للمصادقة — يدعم:
 *  1. حسابات الـ Tenant (الأوونر) — JWT
 *  2. حسابات الـ SubUser (المستخدمون الفرعيون) — JWT
 *  3. مفاتيح API الخارجية (sk_...) — للعملاء الذين يربطون مشاريعهم (CRM, etc.)
 *
 * بعد التحقق يضيف للـ request:
 *  - req.tenant     → بيانات الـ tenant دائماً
 *  - req.subUser    → بيانات المستخدم الفرعي (إذا كان sub-user login)
 *  - req.isSubUser  → boolean
 *  - req.isApiKey   → boolean (true إذا كان المصدر API Key خارجي)
 *  - req.channelId  → رقم القناة المخصصة (للـ sub-users)
 *  - req.userPerms  → كائن الصلاحيات المحلولة (للـ sub-users)
 */
class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolves a token (API key "sk_..." or dashboard JWT) to an identity.
 * Shared by HTTP requests, the send API and socket connections.
 * Returns { tenant, subUser, isSubUser, isApiKey, userPerms, channelId }; throws AuthError.
 */
const resolveToken = async (token) => {
  if (!token) throw new AuthError(401, 'Unauthorized: No token provided');

  // ── API Key (sk_...) — External Client Access ─────────────────────────
  // Allows clients using their API Key to access dashboard endpoints
  // programmatically (e.g., for CRM integrations, chat widgets, invoices, etc.)
  if (token.startsWith('sk_')) {
    const crypto = require('crypto');
    const rawKey = token.replace('sk_', '');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.findFirst({
      where: { keyHash, isActive: true },
      include: {
        tenant: {
          select: {
            id: true, name: true, email: true, isActive: true,
            sessionStatus: true, plan: true, metaEnabled: true,
            customFeatures: true, companyName: true
          }
        }
      }
    });

    if (!apiKey) throw new AuthError(401, 'Unauthorized: Invalid API Key');
    if (!apiKey.tenant.isActive) throw new AuthError(403, 'Forbidden: Account is disabled');

    // Async update last used (fire and forget)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    }).catch(err => logger.error('Failed to update API key lastUsedAt', err));

    // API Key grants full owner-level access
    return { tenant: apiKey.tenant, subUser: null, isSubUser: false, isApiKey: true, userPerms: null, channelId: null };
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new AuthError(401, error.name === 'TokenExpiredError' ? 'Unauthorized: Token expired' : 'Unauthorized: Invalid token');
  }

  // ── حساب Sub-User ──────────────────────────────────────────
  if (decoded.isSubUser && decoded.subUserId) {
    const subUser = await prisma.subUser.findUnique({
      where: { id: decoded.subUserId },
      include: {
        tenant: {
          select: {
            id: true, name: true, email: true, isActive: true,
            plan: true, metaEnabled: true, customFeatures: true,
            sessionStatus: true, companyName: true,
            webhookUrl: true, webhookEvents: true,
            crmBaseUrl: true, crmApiToken: true
          }
        }
      }
    });

    if (!subUser) throw new AuthError(401, 'Unauthorized: User not found');
    if (!subUser.isActive) throw new AuthError(403, 'Forbidden: Your account is disabled');
    if (!subUser.tenant.isActive) throw new AuthError(403, 'Forbidden: Company account is suspended');

    return {
      tenant: { ...subUser.tenant },
      subUser,
      isSubUser: true,
      isApiKey: false,
      userPerms: resolvePermissions(subUser.role, subUser.permissions),
      channelId: subUser.channelId // القناة المخصصة للمستخدم الفرعي
    };
  }

  // ── حساب Tenant (الأوونر) ──────────────────────────────────
  const tenant = await prisma.tenant.findUnique({
    where: { id: decoded.tenantId },
    select: {
      id: true, name: true, email: true, isActive: true,
      sessionStatus: true, plan: true, metaEnabled: true, customFeatures: true,
      companyName: true, webhookUrl: true, webhookEvents: true,
      crmBaseUrl: true, crmApiToken: true
    }
  });

  if (!tenant) throw new AuthError(401, 'Unauthorized: Tenant not found');
  if (!tenant.isActive) throw new AuthError(403, 'Forbidden: Account is disabled');

  // الأوونر لا يحتاج permissions — له كل الصلاحيات
  return { tenant, subUser: null, isSubUser: false, isApiKey: false, userPerms: null, channelId: null };
};

const applyIdentity = (req, identity) => {
  req.tenant    = identity.tenant;
  req.tenantId  = identity.tenant.id;
  req.subUser   = identity.subUser || undefined;
  req.isSubUser = identity.isSubUser;
  req.isApiKey  = identity.isApiKey;
  req.userPerms = identity.userPerms;
  if (identity.isSubUser) req.channelId = identity.channelId;
};

const authMiddleware = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    applyIdentity(req, await resolveToken(token));
    next();
  } catch (error) {
    if (error instanceof AuthError) return res.status(error.status).json({ error: error.message });
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Middleware للتحقق أن المستخدم هو الأوونر (ليس sub-user)
 * يُستخدم لحماية endpoints إدارة المستخدمين والإعدادات الحساسة
 */
const ownerOnly = (req, res, next) => {
  if (req.isSubUser) {
    return res.status(403).json({ error: 'Forbidden: This action requires the owner account' });
  }
  next();
};

/**
 * Middleware للتحقق من صلاحية معينة
 * الاستخدام: requirePermission('can_view_campaigns')
 */
const requirePermission = (permission) => (req, res, next) => {
  // الأوونر يملك كل الصلاحيات
  if (!req.isSubUser) return next();

  if (!req.userPerms || !req.userPerms[permission]) {
    return res.status(403).json({
      error: `Forbidden: You don't have permission to perform this action (${permission})`
    });
  }
  next();
};

/**
 * Passes when the user has at least one of the permissions (for data several pages read,
 * e.g. the template list is needed to send messages, run campaigns and manage templates)
 */
const requireAnyPermission = (...permissions) => (req, res, next) => {
  if (!req.isSubUser) return next();
  if (req.userPerms && permissions.some(p => req.userPerms[p])) return next();
  return res.status(403).json({
    error: `Forbidden: You don't have permission to perform this action (${permissions.join(' | ')})`
  });
};

/** Identity of the person behind a request for per-person features: 'owner', a sub-user id, or null (API key) */
const memberKey = (req) => {
  if (req.isApiKey) return null;
  return req.isSubUser ? req.subUser.id : 'owner';
};

module.exports = { authMiddleware, ownerOnly, requirePermission, requireAnyPermission, resolveToken, applyIdentity, memberKey, AuthError };
