const authService = require('./auth.service');
const logger = require('../../utils/logger');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      // req.tenant is injected by auth middleware
      res.status(200).json({ success: true, data: req.tenant });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
