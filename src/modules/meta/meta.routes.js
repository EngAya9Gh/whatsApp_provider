const express = require('express');
const metaController = require('./meta.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const requireMetaEnabled = (req, res, next) => {
  if (req.tenant && req.tenant.metaEnabled === true) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Feature requires Meta Cloud to be enabled by Admin' });
  }
};

const router = express.Router();

// Public Webhook Routes (Meta calls these)
router.get('/webhook', metaController.verifyWebhook);
router.post('/webhook', express.json(), metaController.handleWebhook);

// Protected Channel Routes (Dashboard calls these)
router.use(authMiddleware);
router.use(requireMetaEnabled);
router.post('/channel', metaController.addChannel);
router.get('/channels', metaController.getChannels);
router.delete('/channel/:id', metaController.deleteChannel);
router.get('/channel/:id/templates', metaController.getTemplates);

module.exports = router;
