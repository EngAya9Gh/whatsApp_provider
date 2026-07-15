const express = require('express');
const apiKeyController = require('./apiKey.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// All API key management routes require dashboard authentication
router.use(authMiddleware);

router.post('/', apiKeyController.generateKey);
router.get('/', apiKeyController.listKeys);
router.delete('/:id', apiKeyController.deleteKey);

module.exports = router;
