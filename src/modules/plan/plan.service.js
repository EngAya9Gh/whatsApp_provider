const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PlanService {
  async initPlans() {
    const plansCount = await prisma.planSetting.count();
    if (plansCount > 0) return;

    const defaultPlans = [
      {
        planCode: 'FREE',
        name: 'Free Trial',
        price: 0,
        limit: 10,
        features: JSON.stringify(['API Access', 'Basic Support'])
      },
      {
        planCode: 'STARTER',
        name: 'Starter',
        price: 20,
        limit: 1000,
        features: JSON.stringify(['API Access', 'Standard Support', 'Bulk Campaigns'])
      },
      {
        planCode: 'ADVANCED',
        name: 'Advanced',
        price: 30,
        limit: 5000,
        features: JSON.stringify(['API Access', 'Priority Support', 'Bulk Campaigns'])
      },
      {
        planCode: 'PRO',
        name: 'Professional',
        price: 49,
        limit: 10000,
        features: JSON.stringify(['API Access', '24/7 Support', 'Bulk Campaigns', 'Custom Templates'])
      },
      {
        planCode: 'ENTERPRISE',
        name: 'Enterprise',
        price: 99,
        limit: 50000,
        features: JSON.stringify(['API Access', 'Dedicated Account Manager', 'Bulk Campaigns', 'Custom Templates', 'Unlimited Devices'])
      }
    ];

    for (const p of defaultPlans) {
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
