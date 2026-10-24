const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const chatTagController = require('./chat.tag.controller');
const chatStageController = require('./chat.stage.controller');
const accessService = require('../workforce/access.service');
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');

router.use(authMiddleware);
router.use(requireFeature('LIVE_CHAT'));

// Tag & stage definitions are also read by the settings page and the flow builder
router.get('/tags', requireAnyPermission('can_view_live_chat', 'can_manage_settings', 'can_view_chatbot', 'can_view_analytics'), chatTagController.getTags.bind(chatTagController));
router.post('/tags', requirePermission('can_manage_settings'), chatTagController.createTag.bind(chatTagController));
router.put('/tags/:id', requirePermission('can_manage_settings'), chatTagController.updateTag.bind(chatTagController));
router.delete('/tags/:id', requirePermission('can_manage_settings'), chatTagController.deleteTag.bind(chatTagController));
router.get('/stages', requireAnyPermission('can_view_live_chat', 'can_manage_settings', 'can_view_chatbot', 'can_view_analytics'), chatStageController.getConfig.bind(chatStageController));
router.put('/stages', requirePermission('can_manage_settings'), chatStageController.saveConfig.bind(chatStageController));

// Everything below is the live chat itself
router.use(requirePermission('can_view_live_chat'));

// Sub-users only reach conversations inside their visibility scope (chat_scope)
router.param('threadId', accessService.threadParamGuard());

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../../uploads/chat');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `chat-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.get('/threads', chatController.getThreads.bind(chatController));
router.get('/threads/:threadId', chatController.getThread.bind(chatController));
router.get('/threads/:threadId/messages', chatController.getMessages.bind(chatController));
router.put('/threads/:threadId/name', chatController.renameThread.bind(chatController));
router.post('/threads/:threadId/messages', chatController.sendMessage.bind(chatController));
router.post('/threads/:threadId/template', chatController.sendTemplate.bind(chatController));
router.post('/upload', upload.single('file'), chatController.uploadMedia.bind(chatController));
router.get('/media/:mediaId', chatController.getMediaProxy.bind(chatController));

// Quick Replies
router.get('/quick-replies', chatController.getQuickReplies.bind(chatController));
router.post('/quick-replies', chatController.createQuickReply.bind(chatController));
router.delete('/quick-replies/:id', chatController.deleteQuickReply.bind(chatController));

// Conversation tags & stage
router.put('/threads/:threadId/tags', chatTagController.setThreadTags.bind(chatTagController));

router.put('/threads/:threadId/stage', chatStageController.setThreadStage.bind(chatStageController));

module.exports = router;
