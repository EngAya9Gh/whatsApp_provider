const subUserService = require('./subuser.service');
const logger = require('../../utils/logger');

class SubUserController {
  /**
   * GET /api/sub-users
   * قائمة المستخدمين الفرعيين (للأوونر فقط)
   */
  async list(req, res, next) {
    try {
      const data = await subUserService.list(req.tenant.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/sub-users/:id
   */
  async getById(req, res, next) {
    try {
      const data = await subUserService.getById(req.tenant.id, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/sub-users
   * إنشاء مستخدم فرعي جديد
   */
  async create(req, res, next) {
    try {
      const { name, email, password, role, channelId, permissions } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email and password are required' });
      }

      const data = await subUserService.create(req.tenant.id, {
        name, email, password, role, channelId, permissions
      });
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/sub-users/:id
   * تحديث بيانات / صلاحيات مستخدم
   */
  async update(req, res, next) {
    try {
      const data = await subUserService.update(req.tenant.id, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/sub-users/:id/reset-password
   * إعادة تعيين كلمة المرور
   */
  async resetPassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
      }
      await subUserService.resetPassword(req.tenant.id, req.params.id, newPassword);
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/sub-users/:id
   */
  async delete(req, res, next) {
    try {
      await subUserService.delete(req.tenant.id, req.params.id);
      res.json({ success: true, message: 'Sub-user deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/sub-users/defaults
   * الصلاحيات الافتراضية لكل دور (لعرضها في الـ UI)
   */
  async getDefaults(req, res, next) {
    try {
      res.json({ success: true, data: subUserService.DEFAULT_PERMISSIONS });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SubUserController();
