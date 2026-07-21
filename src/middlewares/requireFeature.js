const entitlementService = require('../services/entitlement.service');
const logger = require('../utils/logger');

const requireFeature = (feature) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.tenant.id;
      
      const hasAccess = await entitlementService.hasFeature(tenantId, feature);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Feature locked',
          message: `Upgrade your plan to access this feature: ${feature}`
        });
      }
      
      next();
    } catch (error) {
      logger.error('Error in requireFeature middleware:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error verifying feature access' });
    }
  };
};

module.exports = requireFeature;
