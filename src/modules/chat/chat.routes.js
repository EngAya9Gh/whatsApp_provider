const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const requireLiveChat = (req, res, next) => {
  const allowed = req.tenant && req.tenant.customFeatures && req.tenant.customFeatures.LIVE_CHAT === true;
  if (allowed) return next();
  res.status(403).json({ error: 'Live Chat feature is not enabled for this tenant.' });
};

router.use(authMiddleware);
router.use(requireLiveChat);

router.get('/threads', chatController.getThreads.bind(chatController));
router.get('/threads/:threadId/messages', chatController.getMessages.bind(chatController));
router.post('/threads/:threadId/messages', chatController.sendMessage.bind(chatController));

module.exports = router;
