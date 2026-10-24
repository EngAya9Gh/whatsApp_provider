const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// الصلاحيات الافتراضية لكل دور
const DEFAULT_PERMISSIONS = {
  ADMIN: {
    can_send_message:        true,
    can_view_campaigns:      true,
    can_create_campaigns:    true,
    can_view_templates:      true,
    can_create_templates:    true,
    can_view_chatbot:        true,
    can_manage_chatbot:      true,
    can_view_logs:           true,
    can_view_live_chat:      true,
    can_view_analytics:      true,
    can_manage_settings:     false,
    can_view_api_keys:       false,
    can_view_billing:        false,
    can_manage_sub_users:    false,
    can_manage_contacts:     true,
    // Conversation visibility: ALL | TEAM | ASSIGNED
    chat_scope:              'ALL',
  },
  MANAGER: {
    can_send_message:        true,
    can_view_campaigns:      true,
    can_create_campaigns:    true,
    can_view_templates:      true,
    can_create_templates:    true,
    can_view_chatbot:        true,
    can_manage_chatbot:      false,
    can_view_logs:           true,
    can_view_live_chat:      true,
    can_view_analytics:      true,
    can_manage_settings:     false,
    can_view_api_keys:       false,
    can_view_billing:        false,
    can_manage_sub_users:    false,
    can_manage_contacts:     true,
    chat_scope:              'ALL',
  },
  AGENT: {
    can_send_message:        true,
    can_view_campaigns:      false,
    can_create_campaigns:    false,
    can_view_templates:      true,
    can_create_templates:    false,
    can_view_chatbot:        false,
    can_manage_chatbot:      false,
    can_view_logs:           false,
    can_view_live_chat:      true,
    can_view_analytics:      false,
    can_manage_settings:     false,
    can_view_api_keys:       false,
    can_view_billing:        false,
    can_manage_sub_users:    false,
    can_manage_contacts:     false,
    chat_scope:              'ALL',
  },
};

/**
 * دمج الصلاحيات: الدور الافتراضي + الصلاحيات المخصصة (override)
 */
function resolvePermissions(role, customPermissions) {
  const base = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.AGENT;
  if (!customPermissions || typeof customPermissions !== 'object') return base;
  return { ...base, ...customPermissions };
}

const ROLES = ['ADMIN', 'MANAGER', 'AGENT'];
const ROLE_RANK = { ADMIN: 3, MANAGER: 2, AGENT: 1 };
const SCOPE_RANK = { ALL: 3, TEAM: 2, ASSIGNED: 1 };
const PERMISSION_KEYS = Object.keys(DEFAULT_PERMISSIONS.AGENT);

/** Keeps only known permission keys with valid values */
function sanitizePermissions(permissions) {
  if (permissions === null || permissions === undefined) return null;
  if (typeof permissions !== 'object' || Array.isArray(permissions)) throw { status: 400, message: 'permissions must be an object' };
  const clean = {};
  for (const key of PERMISSION_KEYS) {
    if (!(key in permissions)) continue;
    if (key === 'chat_scope') {
      if (!SCOPE_RANK[permissions[key]]) throw { status: 400, message: 'chat_scope must be ALL, TEAM or ASSIGNED' };
      clean[key] = permissions[key];
    } else {
      clean[key] = !!permissions[key];
    }
  }
  return clean;
}

/**
 * The owner manages everyone. A sub-user with can_manage_sub_users may only manage people below
 * their own role, never themselves, and can only hand out permissions they hold themselves.
 * actor: { isOwner, id, role, perms }
 */
function assertCanManage(actor, { target = null, role = null, permissions = undefined } = {}) {
  if (actor.isOwner) return;
  const deny = (message) => { throw { status: 403, message }; };

  if (target) {
    if (target.id === actor.id) deny('You cannot change your own account here — ask the owner');
    if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role]) deny('You can only manage users with a lower role than yours');
  }
  const finalRole = role || target?.role;
  if (finalRole && ROLE_RANK[finalRole] >= ROLE_RANK[actor.role]) deny('You can only give roles lower than yours');

  if (permissions !== undefined || role) {
    const granted = resolvePermissions(finalRole, permissions !== undefined ? permissions : target?.permissions);
    for (const key of PERMISSION_KEYS) {
      if (key === 'chat_scope') {
        if (SCOPE_RANK[granted.chat_scope || 'ALL'] > SCOPE_RANK[actor.perms.chat_scope || 'ALL']) deny('You cannot give wider conversation visibility than your own');
      } else if (granted[key] && !actor.perms[key]) {
        deny(`You cannot give a permission you do not have (${key})`);
      }
    }
  }
}

/** Actor description from an authenticated request */
function actorFromRequest(req) {
  return req.isSubUser
    ? { isOwner: false, id: req.subUser.id, role: req.subUser.role, perms: req.userPerms || {} }
    : { isOwner: true };
}

/** Whether the actor may edit this user (used by the UI to show the actions) */
function canManageUser(actor, user) {
  try {
    assertCanManage(actor, { target: user });
    return true;
  } catch {
    return false;
  }
}

class SubUserService {
  /**
   * إنشاء مستخدم فرعي جديد
   */
  async create(tenantId, data, actor = { isOwner: true }) {
    const { name, email, password, role = 'AGENT', channelId } = data;
    if (!ROLES.includes(role)) throw { status: 400, message: 'Invalid role' };
    const permissions = sanitizePermissions(data.permissions);
    assertCanManage(actor, { role, permissions: permissions || undefined });

    const existing = await prisma.subUser.findUnique({ where: { email } });
    if (existing) throw { status: 409, message: 'Email already in use' };

    // التحقق من أن الـ channel تابع لنفس الـ tenant
    if (channelId) {
      const channel = await prisma.whatsAppChannel.findFirst({
        where: { id: channelId, tenantId }
      });
      if (!channel) throw { status: 400, message: 'Channel not found or does not belong to this account' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const subUser = await prisma.subUser.create({
      data: {
        tenantId,
        name,
        email,
        passwordHash,
        role,
        channelId: channelId || null,
        permissions: permissions || null,
      },
      select: this._selectFields(),
    });

    return { ...subUser, resolvedPermissions: resolvePermissions(subUser.role, subUser.permissions) };
  }

  /**
   * قائمة المستخدمين الفرعيين للـ tenant
   */
  async list(tenantId, actor = { isOwner: true }) {
    const subUsers = await prisma.subUser.findMany({
      where: { tenantId },
      select: {
        ...this._selectFields(),
        channel: {
          select: { id: true, name: true, phoneNumber: true, displayPhoneNumber: true, providerType: true, status: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return subUsers.map(u => ({
      ...u,
      resolvedPermissions: resolvePermissions(u.role, u.permissions),
      manageable: canManageUser(actor, u)
    }));
  }

  /**
   * تفاصيل مستخدم واحد
   */
  async getById(tenantId, subUserId) {
    const subUser = await prisma.subUser.findFirst({
      where: { id: subUserId, tenantId },
      select: {
        ...this._selectFields(),
        channel: {
          select: { id: true, name: true, phoneNumber: true, displayPhoneNumber: true, providerType: true, status: true }
        }
      }
    });

    if (!subUser) throw { status: 404, message: 'Sub-user not found' };
    return { ...subUser, resolvedPermissions: resolvePermissions(subUser.role, subUser.permissions) };
  }

  /**
   * تحديث بيانات / صلاحيات مستخدم
   */
  async update(tenantId, subUserId, data, actor = { isOwner: true }) {
    const existing = await prisma.subUser.findFirst({ where: { id: subUserId, tenantId } });
    if (!existing) throw { status: 404, message: 'Sub-user not found' };
    if (data.role !== undefined && !ROLES.includes(data.role)) throw { status: 400, message: 'Invalid role' };
    if (data.permissions !== undefined) data = { ...data, permissions: sanitizePermissions(data.permissions) };
    assertCanManage(actor, {
      target: existing,
      role: data.role !== undefined ? data.role : null,
      permissions: data.permissions !== undefined ? data.permissions : undefined
    });

    // التحقق من الـ channel إذا تم تغييره
    if (data.channelId && data.channelId !== existing.channelId) {
      const channel = await prisma.whatsAppChannel.findFirst({
        where: { id: data.channelId, tenantId }
      });
      if (!channel) throw { status: 400, message: 'Channel not found or does not belong to this account' };
    }

    const updateData = {};
    if (data.name !== undefined)        updateData.name = data.name;
    if (data.role !== undefined)        updateData.role = data.role;
    if (data.channelId !== undefined)   updateData.channelId = data.channelId || null;
    if (data.permissions !== undefined) updateData.permissions = data.permissions;
    if (data.isActive !== undefined)    updateData.isActive = data.isActive;
    
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(data.password, salt);
    }

    const updated = await prisma.subUser.update({
      where: { id: subUserId },
      data: updateData,
      select: {
        ...this._selectFields(),
        channel: {
          select: { id: true, name: true, phoneNumber: true, displayPhoneNumber: true, providerType: true, status: true }
        }
      }
    });

    return { ...updated, resolvedPermissions: resolvePermissions(updated.role, updated.permissions) };
  }

  /**
   * إعادة تعيين كلمة المرور
   */
  async resetPassword(tenantId, subUserId, newPassword, actor = { isOwner: true }) {
    const existing = await prisma.subUser.findFirst({ where: { id: subUserId, tenantId } });
    if (!existing) throw { status: 404, message: 'Sub-user not found' };
    assertCanManage(actor, { target: existing });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.subUser.update({
      where: { id: subUserId },
      data: { passwordHash }
    });

    return { success: true };
  }

  /**
   * حذف مستخدم فرعي
   */
  async delete(tenantId, subUserId, actor = { isOwner: true }) {
    const existing = await prisma.subUser.findFirst({ where: { id: subUserId, tenantId } });
    if (!existing) throw { status: 404, message: 'Sub-user not found' };
    assertCanManage(actor, { target: existing });

    await prisma.subUser.delete({ where: { id: subUserId } });
    return { success: true };
  }

  /**
   * تسجيل دخول مستخدم فرعي
   */
  async login(email, password) {
    const subUser = await prisma.subUser.findUnique({
      where: { email },
      include: {
        tenant: {
          select: {
            id: true, name: true, email: true, companyName: true,
            plan: true, isActive: true, metaEnabled: true, customFeatures: true
          }
        },
        channel: {
          select: { id: true, name: true, phoneNumber: true, displayPhoneNumber: true, providerType: true, status: true }
        }
      }
    });

    if (!subUser) throw { status: 401, message: 'Invalid credentials' };
    if (!subUser.isActive) throw { status: 403, message: 'Account is disabled. Contact your administrator.' };
    if (!subUser.tenant.isActive) throw { status: 403, message: 'Company account is suspended.' };

    const isMatch = await bcrypt.compare(password, subUser.passwordHash);
    if (!isMatch) throw { status: 401, message: 'Invalid credentials' };

    // تحديث آخر تسجيل دخول
    await prisma.subUser.update({
      where: { id: subUser.id },
      data: { lastLoginAt: new Date() }
    });

    const resolvedPermissions = resolvePermissions(subUser.role, subUser.permissions);

    return {
      subUser: {
        id: subUser.id,
        name: subUser.name,
        email: subUser.email,
        role: subUser.role,
        permissions: resolvedPermissions,
        channelId: subUser.channelId,
        channel: subUser.channel,
        isSubUser: true,
      },
      tenant: {
        id: subUser.tenant.id,
        name: subUser.tenant.name,
        email: subUser.tenant.email,
        companyName: subUser.tenant.companyName,
        plan: subUser.tenant.plan,
        metaEnabled: subUser.tenant.metaEnabled,
      }
    };
  }

  /**
   * قائمة أعضاء الفريق للإسناد في التذاكر
   */
  async getTeam(tenantId) {
    return prisma.subUser.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * الحقول المشتركة للـ select
   */
  _selectFields() {
    return {
      id: true,
      tenantId: true,
      channelId: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}

module.exports = new SubUserService();
module.exports.DEFAULT_PERMISSIONS = DEFAULT_PERMISSIONS;
module.exports.resolvePermissions = resolvePermissions;
module.exports.assertCanManage = assertCanManage;
module.exports.actorFromRequest = actorFromRequest;
module.exports.sanitizePermissions = sanitizePermissions;
