const express = require('express');
const apiKeyController = require('./apiKey.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middlewares/requireFeature');

const router = express.Router();

// All API key management routes require dashboard authentication and API_ACCESS feature
router.use(authMiddleware);
router.use(requireFeature('API_ACCESS'));

router.post('/', apiKeyController.generateKey);
router.get('/', apiKeyController.listKeys);
router.delete('/:id', apiKeyController.deleteKey);

module.exports = router;
