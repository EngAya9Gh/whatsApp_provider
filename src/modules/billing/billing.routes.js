const express = require('express');
const billingController = require('./billing.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/usage', billingController.getUsage);
router.get('/history', billingController.getHistory);

module.exports = router;
