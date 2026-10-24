const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');
const entitlementService = require('../../services/entitlement.service');

const QR_FEATURES = ['BAILEYS_SEND_MESSAGE', 'BAILEYS_CAMPAIGN', 'BAILEYS_AUTORESPONDER'];

// The regular (QR) page is available with any of the QR features
const requireAnyQrFeature = async (req, res, next) => {
  try {
    const features = await entitlementService.getTenantFeatures(req.tenant.id);
    if (QR_FEATURES.some(f => features.includes(f))) return next();
    return res.status(403).json({ success: false, error: 'Feature locked', message: 'Upgrade your plan to access QR analytics' });
  } catch (error) {
    next(error);
  }
};

router.use(authMiddleware);
router.use(requirePermission('can_view_analytics'));

router.get('/meta', requireFeature('META_API'), analyticsController.getMeta.bind(analyticsController));
router.get('/qr', requireAnyQrFeature, analyticsController.getQr.bind(analyticsController));

module.exports = router;
