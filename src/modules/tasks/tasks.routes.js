const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');
const tasks = require('./tasks.service');

// Team tasks (follow-ups). Members need Live Chat access; the owner always has it.
router.use(authMiddleware, requirePermission('can_view_live_chat'));

const handle = (fn) => async (req, res, next) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

router.get('/', handle(req => tasks.list(req.tenant.id, tasks.viewerOf(req), { view: req.query.view, threadId: req.query.threadId })));
router.get('/summary', handle(req => tasks.summary(req.tenant.id, tasks.viewerOf(req))));
router.post('/', handle(req => tasks.create(req.tenant.id, tasks.viewerOf(req), req.body)));
router.patch('/:id', handle(req => tasks.update(req.tenant.id, tasks.viewerOf(req), req.params.id, req.body)));
router.delete('/:id', handle(req => tasks.remove(req.tenant.id, tasks.viewerOf(req), req.params.id)));

module.exports = router;
