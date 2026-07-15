const otpService = require('./otp.service');
const logger = require('../../utils/logger');

class OTPController {
  async sendOTP(req, res, next) {
    try {
      const { phone } = req.body;
      const tenantId = req.tenantId; // From API Key Middleware

      const result = await otpService.sendOTP(tenantId, phone);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Send OTP error:', error);
      next(error);
    }
  }

  async verifyOTP(req, res, next) {
    try {
      const { phone, code } = req.body;
      const tenantId = req.tenantId;

      const result = await otpService.verifyOTP(tenantId, phone, code);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Verify OTP error:', error);
      next(error);
    }
  }
}

module.exports = new OTPController();
