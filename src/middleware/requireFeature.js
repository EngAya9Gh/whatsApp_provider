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

/**
 * Same check, passing when the tenant has ANY of the listed features (e.g. a new key and its legacy name).
 */
requireFeature.any = (features, label = features.join(' / ')) => {
  return async (req, res, next) => {
    try {
      const owned = await entitlementService.getTenantFeatures(req.tenant.id);
      if (features.some(f => owned.includes(f))) return next();
      return res.status(403).json({
        success: false,
        error: 'Feature locked',
        message: `Upgrade your plan to access this feature: ${label}`
      });
    } catch (error) {
      logger.error('Error in requireFeature.any middleware:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error verifying feature access' });
    }
  };
};

// Everything that unlocks the QR (WhatsApp Web) area; the dashboard's QR_FEATURES (utils/qr-access.js) is the same list.
requireFeature.QR_FEATURES = ['BAILEYS_SEND_MESSAGE', 'SEND_MESSAGE', 'BAILEYS_CAMPAIGN', 'TEMPLATES', 'BAILEYS_AUTORESPONDER'];

module.exports = requireFeature;
