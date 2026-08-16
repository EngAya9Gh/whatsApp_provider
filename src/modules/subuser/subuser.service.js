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

class SubUserService {
  /**
   * إنشاء مستخدم فرعي جديد
   */
  async create(tenantId, data) {
    const { name, email, password, role = 'AGENT', channelId, permissions } = data;

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
  async list(tenantId) {
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
      resolvedPermissions: resolvePermissions(u.role, u.permissions)
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
  async update(tenantId, subUserId, data) {
    const existing = await prisma.subUser.findFirst({ where: { id: subUserId, tenantId } });
    if (!existing) throw { status: 404, message: 'Sub-user not found' };

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
  async resetPassword(tenantId, subUserId, newPassword) {
    const existing = await prisma.subUser.findFirst({ where: { id: subUserId, tenantId } });
    if (!existing) throw { status: 404, message: 'Sub-user not found' };

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
  async delete(tenantId, subUserId) {
    const existing = await prisma.subUser.findFirst({ where: { id: subUserId, tenantId } });
    if (!existing) throw { status: 404, message: 'Sub-user not found' };

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
