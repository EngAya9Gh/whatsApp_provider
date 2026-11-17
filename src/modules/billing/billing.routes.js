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

// Coupon on one of the account's unpaid invoices (account owner only)
router.post('/invoices/:id/coupon', async (req, res, next) => {
  try {
    if (req.isSubUser) return res.status(403).json({ success: false, message: 'Only the account owner can apply a coupon' });
    const invoice = await require('./coupon.service').applyToInvoice(req.tenant.id, req.params.id, req.body?.code);
    res.json({ success: true, data: invoice });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
});

// Plan limits (team members, numbers) and add-ons: see them, price them, buy them (owner only)
const addons = () => require('./addon.service');
const sendErr = (res, next) => (err) => (err.status ? res.status(err.status).json({ success: false, message: err.message, code: err.code }) : next(err));
router.get('/addons', (req, res, next) => Promise.all([addons().limits(req.tenant.id), addons().list(req.tenant.id)])
  .then(([limits, purchases]) => res.json({ success: true, data: { limits, purchases } })).catch(sendErr(res, next)));
router.get('/addons/quote', (req, res, next) => addons().quote(String(req.query.kind || ''), req.query.quantity).then(data => res.json({ success: true, data })).catch(sendErr(res, next)));
router.post('/addons', (req, res, next) => {
  if (req.isSubUser) return res.status(403).json({ success: false, message: 'Only the account owner can buy add-ons' });
  return addons().request(req.tenant.id, String(req.body?.kind || ''), req.body?.quantity).then(data => res.json({ success: true, data })).catch(sendErr(res, next));
});

// Invite link and rewards ("invite a friend")
router.get('/referral', async (req, res, next) => {
  try {
    if (req.isSubUser) return res.json({ success: true, data: { enabled: false } });
    res.json({ success: true, data: await require('./referral.service').summary(req.tenant.id) });
  } catch (err) { next(err); }
});

module.exports = router;
