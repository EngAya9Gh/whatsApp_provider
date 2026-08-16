const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middlewares/requireFeature');

router.use(authMiddleware);
router.use(requireFeature('LIVE_CHAT'));

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
router.get('/threads/:threadId/messages', chatController.getMessages.bind(chatController));
router.post('/threads/:threadId/messages', chatController.sendMessage.bind(chatController));
router.post('/upload', upload.single('file'), chatController.uploadMedia.bind(chatController));
router.get('/media/:mediaId', chatController.getMediaProxy.bind(chatController));

module.exports = router;
