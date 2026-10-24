const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DEFAULT_PLANS = require('../../config/defaultPlans');

class PlanService {
  async initPlans() {
    const plansCount = await prisma.planSetting.count();
    if (plansCount > 0) return;

    for (const p of DEFAULT_PLANS) {
      await prisma.planSetting.create({ data: p });
    }
  }

  async getAllPlans() {
    return prisma.planSetting.findMany({
      orderBy: { sortOrder: 'asc' }
    });
  }

  async updatePlan(id, data) {
    const updateData = {
      name: data.name,
      price: parseFloat(data.price),
      limit: parseInt(data.limit, 10),
      features: typeof data.features === 'string' ? data.features : JSON.stringify(data.features),
    };

    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
    if (data.featuresAr !== undefined) updateData.featuresAr = typeof data.featuresAr === 'string' ? data.featuresAr : JSON.stringify(data.featuresAr);
    if (data.featuresEn !== undefined) updateData.featuresEn = typeof data.featuresEn === 'string' ? data.featuresEn : JSON.stringify(data.featuresEn);
    if (data.sortOrder !== undefined) updateData.sortOrder = parseInt(data.sortOrder, 10);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.isPopular !== undefined) updateData.isPopular = Boolean(data.isPopular);
    if (data.buttonTextAr !== undefined) updateData.buttonTextAr = data.buttonTextAr;
    if (data.buttonTextEn !== undefined) updateData.buttonTextEn = data.buttonTextEn;
    if (data.featureFlags !== undefined) updateData.featureFlags = data.featureFlags;

    return prisma.planSetting.update({
      where: { id },
      data: updateData
    });
  }
}

module.exports = new PlanService();
