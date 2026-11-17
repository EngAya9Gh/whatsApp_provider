const express = require('express');
const adminController = require('./admin.controller');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');

const router = express.Router();

// Admin Auth Middleware (inline - separate from tenant middleware)
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Public: Admin Login
router.post('/auth/login', adminController.login.bind(adminController));

// Protected: Admin routes
router.get('/stats', adminAuth, adminController.getStats.bind(adminController));

// System health: Redis, databases and background queues (is the worker running? are jobs piling up?)
router.get('/system/health', adminAuth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await require('./system.health').getHealth() });
  } catch (error) {
    next(error);
  }
});
router.post('/system/queues/:name/clean-failed', adminAuth, async (req, res, next) => {
  try {
    res.json({ success: true, data: { removed: await require('./system.health').cleanFailed(req.params.name) } });
  } catch (error) {
    next(error);
  }
});
// AI usage per account for a month (?month=2026-11): tokens on the shared GEMINI_API_KEY vs their own keys
router.get('/ai-usage', adminAuth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await require('../ai/ai.usage').platformUsage(req.query.month) });
  } catch (error) {
    next(error);
  }
});
// "Log in as customer": a 30-minute owner session in the customer's dashboard (the customer is not notified)
router.post('/tenants/:id/impersonate', adminAuth, async (req, res, next) => {
  try {
    const data = await require('./impersonation.service').start(req.admin.email, req.params.id, { ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});
router.get('/tenants/:id/impersonations', adminAuth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await require('./impersonation.service').list(req.params.id) });
  } catch (error) {
    next(error);
  }
});
// Coupons for subscription invoices, and referrals
const sendErr = (res, next) => (err) => (err.status ? res.status(err.status).json({ success: false, message: err.message }) : next(err));
router.get('/coupons', adminAuth, (req, res, next) => require('../billing/coupon.service').listCoupons().then(data => res.json({ success: true, data })).catch(sendErr(res, next)));
router.post('/coupons', adminAuth, (req, res, next) => require('../billing/coupon.service').createCoupon(req.body || {}).then(data => res.json({ success: true, data })).catch(sendErr(res, next)));
router.patch('/coupons/:id', adminAuth, (req, res, next) => require('../billing/coupon.service').setActive(req.params.id, req.body?.isActive).then(data => res.json({ success: true, data })).catch(sendErr(res, next)));
router.get('/referrals', adminAuth, (req, res, next) => require('../billing/referral.service').listAll().then(data => res.json({ success: true, data })).catch(sendErr(res, next)));
router.put('/referral-settings', adminAuth, async (req, res, next) => {
  try {
    const raw = req.body?.rewardAmount;
    const amount = raw === '' || raw === null || raw === undefined ? null : Number(raw);
    if (amount !== null && !(amount >= 0)) return res.status(400).json({ success: false, message: 'The reward must be 0 or more' });
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
    const data = { ...(settings?.data || {}), referralRewardAmount: amount };
    await prisma.systemSetting.upsert({ where: { id: 'GLOBAL' }, update: { data }, create: { id: 'GLOBAL', data } });
    res.json({ success: true, data: { rewardAmount: amount } });
  } catch (error) { next(error); }
});

// Add-ons of one account (extra team members / numbers) and cancelling one
router.get('/tenants/:id/addons', adminAuth, (req, res, next) => Promise.all([require('../billing/addon.service').limits(req.params.id), require('../billing/addon.service').list(req.params.id)])
  .then(([limits, purchases]) => res.json({ success: true, data: { limits, purchases } })).catch(sendErr(res, next)));
router.post('/addons/:id/cancel', adminAuth, (req, res, next) => require('../billing/addon.service').cancel(req.params.id).then(data => res.json({ success: true, data })).catch(sendErr(res, next)));

// Monthly AI quota per plan on the shared key, in tokens ({ FREE: 50000, PRO: null = no limit, … })
router.put('/ai-quotas', adminAuth, async (req, res, next) => {
  try {
    res.json({ success: true, data: await require('../ai/ai.quota').savePlanQuotas(req.body || {}) });
  } catch (error) {
    next(error);
  }
});
router.get('/tenants', adminAuth, adminController.getTenants.bind(adminController));
router.get('/tenants/:id', adminAuth, adminController.getTenantById.bind(adminController));
router.put('/tenants/:id/plan', adminAuth, adminController.updatePlan.bind(adminController));
router.put('/tenants/:id/toggle', adminAuth, adminController.toggleTenant.bind(adminController));
router.put('/tenants/:id/settings', adminAuth, adminController.updateSettings.bind(adminController));
router.post('/tenants/:id/meta-channel', adminAuth, adminController.addMetaChannel.bind(adminController));
router.post('/tenants/:id/meta-channels/:channelId/test', adminAuth, adminController.testMetaConnection.bind(adminController));
router.put('/tenants/:id/password', adminAuth, adminController.resetTenantPassword.bind(adminController));
router.put('/tenants/:id/wallet', adminAuth, adminController.updateWalletBalance.bind(adminController));
router.get('/tenants/:id/wallet/transactions', adminAuth, adminController.getWalletTransactions.bind(adminController));
router.post('/tenants/:id/invoices', adminAuth, adminController.createInvoice.bind(adminController));
router.get('/tenants/:id/unbilled-usage', adminAuth, adminController.getUnbilledUsage.bind(adminController));
router.get('/invoices', adminAuth, adminController.getAllInvoices.bind(adminController));
router.put('/invoices/:id/status', adminAuth, adminController.updateInvoiceStatus.bind(adminController));

// System Settings
router.get('/settings', adminAuth, adminController.getSystemSettings.bind(adminController));
router.put('/settings', adminAuth, adminController.updateSystemSettings.bind(adminController));

module.exports = router;
