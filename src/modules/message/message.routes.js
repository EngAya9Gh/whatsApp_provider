const express = require('express');
const multer = require('multer');
const messageController = require('./message.controller');
const { validate, sendMessageSchema, sendMediaSchema, uploadMediaSchema } = require('./message.validation');
const { apiKeyMiddleware } = require('../../middleware/apiKey.middleware');
const { otpRateLimiter } = require('../../middleware/rateLimiter.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// All message routes require a valid API Key
router.use(apiKeyMiddleware);

router.post('/send', validate(sendMessageSchema), otpRateLimiter, messageController.sendMessage);
router.post('/send-media', validate(sendMediaSchema), otpRateLimiter, messageController.sendMedia);
router.post('/upload-media', upload.single('file'), validate(uploadMediaSchema), otpRateLimiter, messageController.uploadMedia);

module.exports = router;
