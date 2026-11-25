// Dashboard API: connect / list / disconnect Instagram and Messenger channels
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');
const socialService = require('./social.service');

router.use(authMiddleware);
router.use(requireFeature('LIVE_CHAT'));

const handle = (fn) => async (req, res, next) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: { message: error.message, code: error.code } });
    next(error);
  }
};
const settings = requirePermission('can_manage_settings');

router.get('/config', settings, handle(() => socialService.config()));
router.get('/channels', requireAnyPermission('can_manage_settings', 'can_view_live_chat'), handle(req => socialService.listChannels(req.tenant.id)));
router.post('/connect/start', settings, handle(req => socialService.startConnect(req.tenant.id, { code: req.body?.code, accessToken: req.body?.accessToken })));
router.post('/connect/finish', settings, handle(req => socialService.finishConnect(req.tenant.id, req.body || {})));
router.delete('/channels/:id', settings, handle(req => socialService.disconnect(req.tenant.id, req.params.id)));

module.exports = router;
