const express = require('express');
const whatsappController = require('./whatsapp.controller');
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');

const router = express.Router();

// Dashboard protected routes
router.use(authMiddleware);

// Linking a number by QR needs a QR feature on the account. Disconnecting stays open so an account whose QR
// access was switched off can still unlink its phone; status is read-only.
const qrEnabled = requireFeature.any(requireFeature.QR_FEATURES, 'QR Connection');

router.post('/connect', requirePermission('can_manage_settings'), qrEnabled, whatsappController.connect);
router.post('/disconnect', requirePermission('can_manage_settings'), whatsappController.disconnect);
router.get('/status', whatsappController.getStatus);
router.get('/qr', requirePermission('can_manage_settings'), qrEnabled, whatsappController.getQr);
router.get('/groups', requireAnyPermission('can_manage_settings', 'can_send_message', 'can_view_campaigns'), whatsappController.getGroups);

module.exports = router;
