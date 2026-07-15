const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

// Admin credentials are stored in env variables (no DB table needed for single admin)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@wakeel.tech';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

class AdminService {
  async login(email, password) {
    if (email !== ADMIN_EMAIL) {
      throw new Error('Invalid credentials');
    }

    // If no hash set, use a default password for first-time setup
    if (!ADMIN_PASSWORD_HASH) {
      if (password !== 'admin123456') {
        throw new Error('Invalid credentials');
      }
    } else {
      const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      if (!valid) throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { role: 'ADMIN', email },
      config.jwt.secret,
      { expiresIn: '8h' }
    );

    return { token, email, role: 'ADMIN' };
  }

  async getStats() {
    const [totalTenants, activeTenants, totalMessages, failedMessages] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.messageLog.count({ where: { status: 'SENT' } }),
      prisma.messageLog.count({ where: { status: 'FAILED' } }),
    ]);

    const planCounts = await prisma.tenant.groupBy({
      by: ['plan'],
      _count: { plan: true }
    });

    const recentSignups = await prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, plan: true, isActive: true, createdAt: true }
    });

    return {
      totalTenants,
      activeTenants,
      totalMessages,
      failedMessages,
      planCounts,
      recentSignups
    };
  }

  async getTenants({ page = 1, limit = 20, search = '' } = {}) {
    const skip = (page - 1) * limit;
    const where = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, plan: true, isActive: true,
          sessionStatus: true, createdAt: true,
          _count: { select: { messageLogs: true, apiKeys: true } }
        }
      }),
      prisma.tenant.count({ where })
    ]);

    return { tenants, total, page, pages: Math.ceil(total / limit) };
  }

  async getTenantById(id) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        apiKeys: { select: { id: true, keyPrefix: true, label: true, createdAt: true, lastUsedAt: true, isActive: true } },
        usageRecords: { orderBy: { month: 'desc' }, take: 6 },
        messageLogs: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
    if (!tenant) throw new Error('Tenant not found');
    return tenant;
  }

  async updateTenantPlan(id, plan) {
    const validPlans = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
    if (!validPlans.includes(plan)) throw new Error('Invalid plan');

    const limits = { FREE: 100, STARTER: 1000, PRO: 10000, ENTERPRISE: 0 };

    return prisma.tenant.update({
      where: { id },
      data: { plan, monthlyLimit: limits[plan] }
    });
  }

  async toggleTenant(id) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    return prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive }
    });
  }
}

module.exports = new AdminService();
