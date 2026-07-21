const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

class EntitlementService {
  /**
   * Get all allowed features for a tenant (Plan features + Custom Overrides)
   */
  async getTenantFeatures(tenantId) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          plan: true,
          customFeatures: true
        }
      });

      if (!tenant) return [];

      // Get plan default features
      const planSetting = await prisma.planSetting.findUnique({
        where: { planCode: tenant.plan },
        select: { featureFlags: true }
      });

      const planFeatures = Array.isArray(planSetting?.featureFlags) ? planSetting.featureFlags : [];
      
      // Get custom features (object where keys are features and values are boolean overrides)
      // Example: { "EXCEL_EXPORT": true, "API_ACCESS": false }
      const customFeatures = tenant.customFeatures || {};

      let finalFeatures = new Set(planFeatures);

      // Apply custom overrides
      for (const [feature, isEnabled] of Object.entries(customFeatures)) {
        if (isEnabled) {
          finalFeatures.add(feature);
        } else {
          finalFeatures.delete(feature);
        }
      }

      return Array.from(finalFeatures);
    } catch (error) {
      logger.error('Error fetching tenant features:', error);
      return [];
    }
  }

  /**
   * Check if a tenant has a specific feature
   */
  async hasFeature(tenantId, feature) {
    const features = await this.getTenantFeatures(tenantId);
    return features.includes(feature);
  }
}

module.exports = new EntitlementService();
