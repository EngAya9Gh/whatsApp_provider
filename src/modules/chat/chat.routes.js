const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middlewares/requireFeature');

router.use(authMiddleware);
router.use(requireFeature('LIVE_CHAT'));

router.get('/threads', chatController.getThreads.bind(chatController));
router.get('/threads/:threadId/messages', chatController.getMessages.bind(chatController));
router.post('/threads/:threadId/messages', chatController.sendMessage.bind(chatController));

module.exports = router;
