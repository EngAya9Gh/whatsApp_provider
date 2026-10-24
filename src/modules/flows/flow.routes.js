const express = require('express');
const router = express.Router();
const flowController = require('./flow.controller');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');

router.use(authMiddleware);
router.use(requireFeature('META_AUTORESPONDER'));

const canView = requirePermission('can_view_chatbot');
const canManage = requirePermission('can_manage_chatbot');
const bind = (method) => flowController[method].bind(flowController);

router.get('/', canView, bind('list'));
router.get('/:channelId', canView, bind('get'));
router.put('/:channelId/draft', canManage, bind('saveDraft'));
router.post('/:channelId/publish', canManage, bind('publish'));
router.post('/:channelId/discard', canManage, bind('discard'));
router.put('/:channelId/active', canManage, bind('setActive'));

module.exports = router;
