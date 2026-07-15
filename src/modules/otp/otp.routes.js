const express = require('express');
const otpController = require('./otp.controller');
const { validate, sendOtpSchema, verifyOtpSchema } = require('./otp.validation');
const { apiKeyMiddleware } = require('../../middleware/apiKey.middleware');
const { otpRateLimiter } = require('../../middleware/rateLimiter.middleware');

const router = express.Router();

// All OTP routes require a valid API Key
router.use(apiKeyMiddleware);

router.post('/send', validate(sendOtpSchema), otpRateLimiter, otpController.sendOTP);
router.post('/verify', validate(verifyOtpSchema), otpController.verifyOTP);

module.exports = router;
