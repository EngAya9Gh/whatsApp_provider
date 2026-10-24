const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');
const entitlementService = require('../../services/entitlement.service');

const QR_FEATURES = ['BAILEYS_SEND_MESSAGE', 'BAILEYS_CAMPAIGN', 'BAILEYS_AUTORESPONDER'];
const META_FEATURES = ['META_API', 'META_CAMPAIGN', 'META_AUTORESPONDER', 'META_SEND_MESSAGE', 'META_TEMPLATES'];

// Each page is available with any feature of its connection type
const requireAnyFeature = (list, label) => async (req, res, next) => {
  try {
    const features = await entitlementService.getTenantFeatures(req.tenant.id);
    if (list.some(f => features.includes(f))) return next();
    return res.status(403).json({ success: false, error: 'Feature locked', message: `Upgrade your plan to access ${label} analytics` });
  } catch (error) {
    next(error);
  }
};

router.use(authMiddleware);
router.use(requirePermission('can_view_analytics'));

router.get('/meta', requireAnyFeature(META_FEATURES, 'Meta'), analyticsController.getMeta.bind(analyticsController));
router.get('/qr', requireAnyFeature(QR_FEATURES, 'QR'), analyticsController.getQr.bind(analyticsController));

module.exports = router;
