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

    return {
      plan: tenant.plan,
      monthlyLimit: tenant.monthlyLimit,
      messagesSent: usage.messagesSent,
      messagesFailed: usage.messagesFailed,
      remaining: Math.max(0, tenant.monthlyLimit - usage.messagesSent),
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
    
    // Check if the plan is unlimited (e.g. ENTERPRISE) or if they haven't reached the limit
    if (usage.plan === 'ENTERPRISE') return true;
    
    if (usage.messagesSent >= usage.monthlyLimit) {
      return false;
    }
    
    return true;
  }
}

module.exports = new BillingService();
