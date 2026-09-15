const express = require('express');
const whatsappController = require('./whatsapp.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// Dashboard protected routes
router.use(authMiddleware);

router.post('/connect', whatsappController.connect);
router.post('/disconnect', whatsappController.disconnect);
router.get('/status', whatsappController.getStatus);
router.get('/qr', whatsappController.getQr);
router.get('/groups', whatsappController.getGroups);

module.exports = router;
