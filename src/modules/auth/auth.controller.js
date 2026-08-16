const authService = require('./auth.service');
const logger = require('../../utils/logger');
const entitlementService = require('../../services/entitlement.service');

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
      if (req.isSubUser && req.subUser) {
        // Sub-user: إعادة بياناته الخاصة مع بيانات الـ tenant
        return res.status(200).json({
          success: true,
          data: {
            ...req.tenant,
            isSubUser: true,
            subUser: {
              id: req.subUser.id,
              name: req.subUser.name,
              email: req.subUser.email,
              role: req.subUser.role,
              channelId: req.subUser.channelId,
              permissions: req.userPerms,
            }
          }
        });
      }

      // Owner: البيانات الكاملة
      const allowedFeatures = await entitlementService.getTenantFeatures(req.tenant.id);
      res.status(200).json({
        success: true,
        data: {
          ...req.tenant,
          isSubUser: false,
          allowedFeatures
        }
      });
    } catch (error) {
      logger.error('Get me error:', error);
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      // Sub-users cannot change company profile settings
      if (req.isSubUser) {
        return res.status(403).json({ error: 'Forbidden: Sub-users cannot update company profile' });
      }
      const result = await authService.updateProfile(req.tenant.id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  }

  async subLogin(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
      }
      const result = await authService.subLogin(email, password);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Sub-user login error:', error);
      next(error);
    }
  }
}

module.exports = new AuthController();
