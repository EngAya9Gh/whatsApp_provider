const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');
const accessService = require('../workforce/access.service');

router.use(authMiddleware);

const bind = (method) => aiController[method].bind(aiController);

router.get('/status', bind('getStatus'));

// Chat helpers (same access rules as the conversation itself)
router.param('threadId', accessService.threadParamGuard());
const liveChat = [requireFeature('LIVE_CHAT'), requirePermission('can_view_live_chat')];
router.post('/threads/:threadId/summary', liveChat, bind('summarize'));
router.post('/threads/:threadId/stage-suggestion', liveChat, bind('suggestStage'));
router.post('/threads/:threadId/stage-suggestion/accept', liveChat, bind('acceptSuggestion'));
router.post('/threads/:threadId/stage-suggestion/reject', liveChat, bind('rejectSuggestion'));

// AI agent (used by the "AI agent" step of WhatsApp flows)
const agentFeature = requireFeature('META_AUTORESPONDER');
router.get('/agent', agentFeature, requirePermission('can_view_chatbot'), bind('getAgent'));
router.put('/agent', agentFeature, requirePermission('can_manage_chatbot'), bind('saveAgent'));
router.post('/agent/test', agentFeature, requirePermission('can_view_chatbot'), bind('testAgent'));

module.exports = router;
