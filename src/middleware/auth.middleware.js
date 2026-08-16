const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { resolvePermissions } = require('../modules/subuser/subuser.service');

const prisma = new PrismaClient();

/**
 * Middleware رئيسي للمصادقة — يدعم:
 *  1. حسابات الـ Tenant (الأوونر)
 *  2. حسابات الـ SubUser (المستخدمون الفرعيون)
 *
 * بعد التحقق يضيف للـ request:
 *  - req.tenant     → بيانات الـ tenant دائماً
 *  - req.subUser    → بيانات المستخدم الفرعي (إذا كان sub-user login)
 *  - req.isSubUser  → boolean
 *  - req.channelId  → رقم القناة المخصصة (للـ sub-users)
 *  - req.userPerms  → كائن الصلاحيات المحلولة (للـ sub-users)
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // ── حساب Sub-User ──────────────────────────────────────────
    if (decoded.isSubUser && decoded.subUserId) {
      const subUser = await prisma.subUser.findUnique({
        where: { id: decoded.subUserId },
        include: {
          tenant: {
            select: {
              id: true, name: true, email: true, isActive: true,
              plan: true, metaEnabled: true, customFeatures: true,
              sessionStatus: true, companyName: true
            }
          }
        }
      });

      if (!subUser) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }
      if (!subUser.isActive) {
        return res.status(403).json({ error: 'Forbidden: Your account is disabled' });
      }
      if (!subUser.tenant.isActive) {
        return res.status(403).json({ error: 'Forbidden: Company account is suspended' });
      }

      const resolvedPermissions = resolvePermissions(subUser.role, subUser.permissions);

      req.tenant    = { ...subUser.tenant };
      req.subUser   = subUser;
      req.isSubUser = true;
      req.channelId = subUser.channelId;   // القناة المخصصة للمستخدم الفرعي
      req.userPerms = resolvedPermissions;
      return next();
    }

    // ── حساب Tenant (الأوونر) ──────────────────────────────────
    const tenant = await prisma.tenant.findUnique({
      where: { id: decoded.tenantId },
      select: {
        id: true, name: true, email: true, isActive: true,
        sessionStatus: true, plan: true, metaEnabled: true, customFeatures: true
      }
    });

    if (!tenant) {
      return res.status(401).json({ error: 'Unauthorized: Tenant not found' });
    }
    if (!tenant.isActive) {
      return res.status(403).json({ error: 'Forbidden: Account is disabled' });
    }

    req.tenant    = tenant;
    req.isSubUser = false;
    req.userPerms = null; // الأوونر لا يحتاج permissions — له كل الصلاحيات
    next();

  } catch (error) {
    logger.error('Auth middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }
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

module.exports = { authMiddleware, ownerOnly, requirePermission };
