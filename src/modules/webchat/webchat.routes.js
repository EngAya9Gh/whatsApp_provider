// Dashboard API of the website chat widgets (create, change, switch off, delete)
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');
const webchatService = require('./webchat.service');

router.use(authMiddleware);
router.use(requireFeature('LIVE_CHAT'));

const handle = (fn, status = 200) => async (req, res, next) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: { message: error.message, code: error.code } });
    next(error);
  }
};

router.get('/widgets', requireAnyPermission('can_manage_settings', 'can_view_live_chat'), handle(req => webchatService.listWidgets(req.tenant.id)));
router.post('/widgets', requirePermission('can_manage_settings'), handle(req => webchatService.createWidget(req.tenant.id, req.body || {}), 201));
router.put('/widgets/:id', requirePermission('can_manage_settings'), handle(req => webchatService.updateWidget(req.tenant.id, req.params.id, req.body || {})));
router.delete('/widgets/:id', requirePermission('can_manage_settings'), handle(req => webchatService.deleteWidget(req.tenant.id, req.params.id)));

module.exports = router;
