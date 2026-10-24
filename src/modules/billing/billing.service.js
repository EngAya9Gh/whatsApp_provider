const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

class BillingService {
  async getUsage(tenantId) {
    const now = new Date();
    const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    let usage = await prisma.usageRecord.findUnique({
      where: {
        tenantId_month: {
          tenantId,
          month: currentMonth
        }
      }
    });

    if (!usage) {
      try {
        usage = await prisma.usageRecord.create({
          data: {
            tenantId,
            month: currentMonth,
            messagesSent: 0,
            messagesFailed: 0
          }
        });
      } catch (error) {
        // If it fails with Unique Constraint, it means another request just created it.
        // So we can safely fetch it again.
        if (error.code === 'P2002') {
          usage = await prisma.usageRecord.findUnique({
            where: {
              tenantId_month: { tenantId, month: currentMonth }
            }
          });
        } else {
          throw error;
        }
      }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { monthlyLimit: true, plan: true }
    });

    // Use the tenant's specific monthly limit from DB (customizable in admin panel).
    // Fallback to the plan's limit in plan_settings if not set.
    let dynamicLimit = tenant.monthlyLimit;
    if (dynamicLimit === undefined || dynamicLimit === null) {
      const planSetting = await prisma.planSetting.findUnique({ where: { planCode: tenant.plan } });
      dynamicLimit = planSetting ? planSetting.limit : 0;
    }

    // A limit of 0 (or the ENTERPRISE plan) means no monthly cap
    const unlimited = tenant.plan === 'ENTERPRISE' || dynamicLimit <= 0;

    return {
      plan: tenant.plan,
      monthlyLimit: dynamicLimit,
      unlimited,
      messagesSent: usage.messagesSent,
      messagesFailed: usage.messagesFailed,
      remaining: unlimited ? null : Math.max(0, dynamicLimit - usage.messagesSent),
      month: currentMonth
    };
  }

  async getHistory(tenantId) {
    return prisma.usageRecord.findMany({
      where: { tenantId },
      orderBy: { month: 'desc' },
      take: 12 // Last 12 months
    });
  }

  async getInvoices(tenantId) {
    return prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async incrementUsage(tenantId, type = 'sent') {
    const now = new Date();
    const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const updateData = type === 'sent' 
      ? { messagesSent: { increment: 1 } }
      : { messagesFailed: { increment: 1 } };

    try {
      await prisma.usageRecord.upsert({
        where: {
          tenantId_month: {
            tenantId,
            month: currentMonth
          }
        },
        update: updateData,
        create: {
          tenantId,
          month: currentMonth,
          messagesSent: type === 'sent' ? 1 : 0,
          messagesFailed: type === 'failed' ? 1 : 0
        }
      });
    } catch (error) {
      logger.error(`Failed to increment usage for tenant ${tenantId}`, error);
    }
  }

  async checkLimit(tenantId) {
    const usage = await this.getUsage(tenantId);
    
    // Check if the plan is unlimited (ENTERPRISE or a 0 limit) or if they haven't reached the limit
    if (usage.unlimited) return true;

    if (usage.messagesSent >= usage.monthlyLimit) {
      return false;
    }
    
    return true;
  }
}

module.exports = new BillingService();
