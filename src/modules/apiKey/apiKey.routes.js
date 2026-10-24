const express = require('express');
const apiKeyController = require('./apiKey.controller');
const { authMiddleware, ownerOnly, requirePermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');

const router = express.Router();

// All API key management routes require dashboard authentication and API_ACCESS feature
router.use(authMiddleware);
router.use(requireFeature('API_ACCESS'));
router.use(requirePermission('can_view_api_keys'));

router.post('/', ownerOnly, apiKeyController.generateKey);
router.get('/', apiKeyController.listKeys);
router.delete('/:id', ownerOnly, apiKeyController.deleteKey);

module.exports = router;
