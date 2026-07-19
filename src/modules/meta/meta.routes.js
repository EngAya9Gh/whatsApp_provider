const express = require('express');
const metaController = require('./meta.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public Webhook Routes (Meta calls these)
router.get('/webhook', metaController.verifyWebhook);
router.post('/webhook', express.json(), metaController.handleWebhook);

// Protected Channel Routes (Dashboard calls these)
router.use(authMiddleware);
router.post('/channel', metaController.addChannel);
router.get('/channels', metaController.getChannels);
router.delete('/channel/:id', metaController.deleteChannel);

module.exports = router;
