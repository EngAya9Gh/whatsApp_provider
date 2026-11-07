const express = require('express');
const billingController = require('./billing.controller');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(requirePermission('can_view_billing'));

router.get('/usage', billingController.getUsage);
router.get('/history', billingController.getHistory);
router.get('/invoices', billingController.getInvoices);
router.get('/wallet', billingController.getWallet);
router.get('/wallet/transactions', billingController.getWalletTransactions);

module.exports = router;
