const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.get('/stats', authMiddleware, dashboardController.getStats);

// "Set up your account" checklist (account owner only; team members never see it)
const ownerOnly = (req, res, next) => (req.subUser ? res.status(403).json({ success: false, message: 'Only the account owner sees the setup checklist' }) : next());
const onboarding = require('./onboarding.service');
router.get('/onboarding', authMiddleware, ownerOnly, async (req, res, next) => {
  try { res.json({ success: true, data: await onboarding.getChecklist(req.tenant.id) }); } catch (err) { next(err); }
});
router.post('/onboarding/dismiss', authMiddleware, ownerOnly, async (req, res, next) => {
  try { res.json({ success: true, data: await onboarding.dismiss(req.tenant.id) }); } catch (err) { next(err); }
});

module.exports = router;
