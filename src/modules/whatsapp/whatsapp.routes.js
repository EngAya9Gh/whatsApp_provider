const express = require('express');
const whatsappController = require('./whatsapp.controller');
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/auth.middleware');

const router = express.Router();

// Dashboard protected routes
router.use(authMiddleware);

router.post('/connect', requirePermission('can_manage_settings'), whatsappController.connect);
router.post('/disconnect', requirePermission('can_manage_settings'), whatsappController.disconnect);
router.get('/status', whatsappController.getStatus);
router.get('/qr', requirePermission('can_manage_settings'), whatsappController.getQr);
router.get('/groups', requireAnyPermission('can_manage_settings', 'can_send_message', 'can_view_campaigns'), whatsappController.getGroups);

module.exports = router;
