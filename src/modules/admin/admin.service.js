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
        messageLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        invoices: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!tenant) throw new Error('Tenant not found');
    return tenant;
  }

  async updateTenantPlan(id, plan) {
    const plansConfig = require('../../config/plans');
    const validPlans = Object.keys(plansConfig);
    if (!validPlans.includes(plan)) throw new Error('Invalid plan');

    return prisma.tenant.update({
      where: { id },
      data: { plan, monthlyLimit: plansConfig[plan].limit }
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

  async updateSettings(id, data) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    return prisma.tenant.update({
      where: { id },
      data: {
        monthlyLimit: data.monthlyLimit !== undefined ? data.monthlyLimit : tenant.monthlyLimit,
        metaEnabled: data.metaEnabled !== undefined ? data.metaEnabled : tenant.metaEnabled,
        customFeatures: data.customFeatures !== undefined ? data.customFeatures : tenant.customFeatures
      }
    });
  }

  async createInvoice(tenantId, amount, description, billingCycle = 'Monthly', status = 'PENDING', items = null, taxRate = 15.0, taxAmount = '0', buyerDetails = null, sellerDetails = null) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    // Auto-fetch seller and buyer details if not provided to make invoice immutable
    let finalSellerDetails = sellerDetails;
    if (!finalSellerDetails) {
      const settings = await this.getSystemSettings();
      finalSellerDetails = settings.data;
    }

    let finalBuyerDetails = buyerDetails;
    if (!finalBuyerDetails) {
      const tenantDetails = tenant.customFeatures?.companyDetails || {};
      finalBuyerDetails = {
        name: tenant.companyName || tenant.name,
        vatNumber: tenantDetails.vatNumber || '',
        crn: tenantDetails.crn || '',
        street: tenantDetails.street || '',
        district: tenantDetails.district || '',
        city: tenantDetails.city || '',
        country: tenantDetails.country || '',
        buildingNo: tenantDetails.buildingNo || '',
        postalCode: tenantDetails.postalCode || ''
      };
    }

    return prisma.invoice.create({
      data: {
        tenantId,
        amount: amount.toString(),
        description,
        billingCycle,
        status,
        items,
        taxRate,
        taxAmount: taxAmount.toString(),
        buyerDetails: finalBuyerDetails,
        sellerDetails: finalSellerDetails
      }
    });
  }

  async getSystemSettings() {
    let settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          id: 'GLOBAL',
          data: {
            sellerName: 'شركة وكيـل لتقنية المعلومات المحدودة',
            sellerStreet: 'طريق الملك فهد - العليا',
            sellerDistrict: 'حي العليا / Olaya',
            sellerCity: 'الرياض / Riyadh',
            sellerCountry: 'المملكة العربية السعودية KSA',
            sellerBuildingNo: '7233',
            sellerPostalCode: '23448',
            sellerVatNumber: '300300775500003',
            sellerCrn: '4030394715',
            bankName: 'البنك الأهلي السعودي',
            bankAddress: 'الرياض - السعودية',
            bankAccountName: 'WAKEEL INFORMATION TECHNOLOGY CO.',
            bankAccountNumber: '15500001405110',
            bankIban: 'SA5410000015500001405110',
            bankSwift: 'NCBKSAJE',
            taxRate: 15.0,
            utilityBaseCost: 0.0107,
            utilityMarkupPercent: 20,
            marketingBaseCost: 0.0501,
            marketingMarkupPercent: 20,
            authenticationBaseCost: 0.0107,
            authenticationMarkupPercent: 20,
            serviceBaseCost: 0.0150,
            serviceMarkupPercent: 20
          }
        }
      });
    }
    return settings;
  }

  async updateSystemSettings(data) {
    return prisma.systemSetting.upsert({
      where: { id: 'GLOBAL' },
      update: { data },
      create: { id: 'GLOBAL', data }
    });
  }

  async calculateUnbilledUsage(tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    const settings = await this.getSystemSettings();
    const config = settings.data;
    const utilityBaseCost = parseFloat(config.utilityBaseCost || 0.0107);
    const utilityMarkup = parseFloat(config.utilityMarkupPercent || 20) / 100;
    
    const marketingBaseCost = parseFloat(config.marketingBaseCost || 0.0501);
    const marketingMarkup = parseFloat(config.marketingMarkupPercent || 20) / 100;
    
    const authenticationBaseCost = parseFloat(config.authenticationBaseCost || 0.0107);
    const authenticationMarkup = parseFloat(config.authenticationMarkupPercent || 20) / 100;
    
    const serviceBaseCost = parseFloat(config.serviceBaseCost || 0.0150);
    const serviceMarkup = parseFloat(config.serviceMarkupPercent || 20) / 100;

    // We fetch current month usage as unbilled proxy
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const messageGroups = await prisma.messageLog.groupBy({
      by: ['messageType'],
      where: {
        tenantId,
        createdAt: { gte: startOfMonth },
        status: { in: ['SENT', 'DELIVERED', 'READ'] }
      },
      _count: {
        id: true
      }
    });

    const campaigns = await prisma.campaign.findMany({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth }
      },
      include: {
        _count: { select: { targets: true } }
      }
    });

    const items = [];
    
    // Add Normal Messages grouped by Type
    for (const group of messageGroups) {
      const count = group._count.id;
      if (count > 0) {
        let baseCost = 0;
        let markup = 0;
        let name = '';
        
        if (group.messageType === 'OTP') {
          baseCost = count * authenticationBaseCost;
          markup = authenticationMarkup;
          name = 'رسائل توثيق / Authentication Messages';
        } else if (group.messageType === 'INTERACTIVE') {
          baseCost = count * utilityBaseCost;
          markup = utilityMarkup;
          name = 'رسائل تفاعلية / Utility Messages';
        } else {
          baseCost = count * serviceBaseCost;
          markup = serviceMarkup;
          name = 'رسائل خدمة / Service Messages';
        }
        
        const totalCost = baseCost + (baseCost * markup);
        items.push({
          id: `msg-${group.messageType}-${Date.now()}`,
          name: name,
          description: `رسائل خلال الشهر الحالي`,
          qty: count,
          rate: (totalCost / count).toFixed(4),
          total: totalCost.toFixed(2)
        });
      }
    }

    // Add Campaigns
    let campIdx = 1;
    for (const camp of campaigns) {
      const count = camp._count.targets;
      if (count > 0) {
        const baseCost = count * marketingBaseCost;
        const totalCost = baseCost + (baseCost * marketingMarkup);
        items.push({
          id: 'camp-' + camp.id,
          name: `حملة إعلانية / Campaign: ${camp.name}`,
          description: `إرسال إلى ${count} مستهدف`,
          qty: count,
          rate: (totalCost / count).toFixed(4),
          total: totalCost.toFixed(2)
        });
        campIdx++;
      }
    }

    // Add Base Subscription fee if needed, or leave it to Admin
    items.push({
      id: 'sub-' + Date.now(),
      name: `باقة الاشتراك / Subscription Plan`,
      description: `باقة ${tenant.plan}`,
      qty: 1,
      rate: '0.00', // Admin fills this
      total: '0.00'
    });

    return items;
  }

  async updateInvoiceStatus(id, status) {
    const validStatuses = ['PENDING', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(status)) throw new Error('Invalid status');

    return prisma.invoice.update({
      where: { id },
      data: { status }
    });
  }

  async resetTenantPassword(id, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.tenant.update({
      where: { id },
      data: { passwordHash }
    });

    return { message: 'Password updated successfully' };
  }
}

module.exports = new AdminService();
