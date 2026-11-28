const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

class DashboardController {
  async getStats(req, res, next) {
    try {
      const tenantId = req.tenant.id;

      // 1. Get Tenant Wallet Balance & Currency
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { walletBalance: true, plan: true, currency: true }
      });

      // Standard message cost based on plan (fallback 0.05 SAR/msg if not found)
      const BASE_MSG_COST = 0.05; 
      const estimatedRemainingMessages = Math.floor((tenant?.walletBalance || 0) / BASE_MSG_COST);

      // 2. Get Message Stats for date range
      let { startDate, endDate } = req.query;
      
      let queryStart, queryEnd;
      if (startDate && endDate) {
        queryStart = new Date(startDate);
        queryEnd = new Date(endDate);
        queryEnd.setHours(23, 59, 59, 999);
      } else {
        queryStart = new Date();
        queryStart.setDate(1);
        queryStart.setHours(0, 0, 0, 0);
        
        queryEnd = new Date();
        queryEnd.setHours(23, 59, 59, 999);
      }

      const messageLogs = await prisma.messageLog.findMany({
        where: {
          tenantId,
          createdAt: { gte: queryStart, lte: queryEnd }
        },
        select: {
          status: true,
          channel: {
            select: {
              providerType: true
            }
          }
        }
      });

      let totalSent = messageLogs.length;
      let totalDeliveredOrRead = 0;
      
      let categories = {
        META: {
          MARKETING: 0,
          UTILITY: 0,
          AUTHENTICATION: 0,
          SERVICE: 0,
          UNCATEGORIZED: 0
        },
        QR: {
          MARKETING: 0, // usually not used for QR, but kept for structure
          UTILITY: 0,
          AUTHENTICATION: 0,
          SERVICE: 0,
          UNCATEGORIZED: 0
        }
      };

      for (const log of messageLogs) {
        if (['DELIVERED', 'READ', 'SENT'].includes(log.status)) {
          totalDeliveredOrRead++;
        }

        const isMeta = log.channel?.providerType === 'META_CLOUD';
        const providerObj = isMeta ? categories.META : categories.QR;

        if (log.category) {
          const cat = log.category.toUpperCase();
          if (providerObj[cat] !== undefined) providerObj[cat]++;
          else providerObj.UNCATEGORIZED++;
        } else {
          providerObj.SERVICE++;
        }
      }

      // Merge CampaignTargets: counted per campaign and status in the database (not one row per recipient);
      // cancelled recipients (a stopped campaign) were never sent
      const targetGroups = await prisma.campaignTarget.groupBy({
        by: ['campaignId', 'status'],
        where: { status: { not: 'CANCELLED' }, campaign: { tenantId, createdAt: { gte: queryStart, lte: queryEnd } } },
        _count: { _all: true }
      });
      const campaignInfo = targetGroups.length
        ? Object.fromEntries((await prisma.campaign.findMany({
          where: { id: { in: [...new Set(targetGroups.map(g => g.campaignId))] } },
          select: { id: true, campaignType: true, metaCategory: true }
        })).map(c => [c.id, c]))
        : {};

      for (const group of targetGroups) {
        const count = group._count._all;
        const campaign = campaignInfo[group.campaignId];
        totalSent += count;
        if (['DELIVERED', 'READ', 'SENT'].includes(group.status)) totalDeliveredOrRead += count;

        const isMeta = campaign?.campaignType === 'META' || campaign?.campaignType === 'META_CLOUD';
        const providerObj = isMeta ? categories.META : categories.QR;

        if (campaign?.metaCategory) {
          const cat = campaign.metaCategory.toUpperCase();
          if (providerObj[cat] !== undefined) providerObj[cat] += count;
          else providerObj.UNCATEGORIZED += count;
        } else {
          providerObj.MARKETING += count; // Default for campaigns is usually Marketing
        }
      }

      // No messages → no rate (null), rather than a misleading 100%
      const deliveryRate = totalSent > 0 ? ((totalDeliveredOrRead / totalSent) * 100).toFixed(1) : null;

      res.status(200).json({
        success: true,
        data: {
          walletBalance: tenant?.walletBalance || 0,
          currency: tenant?.currency || 'SAR',
          estimatedRemainingMessages,
          deliveryRate: deliveryRate === null ? null : parseFloat(deliveryRate),
          categories
        }
      });
    } catch (error) {
      logger.error('Dashboard Stats error:', error);
      next(error);
    }
  }
}

module.exports = new DashboardController();
