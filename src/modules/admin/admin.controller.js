const adminService = require('./admin.service');
const logger = require('../../utils/logger');

class AdminController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await adminService.login(email, password);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await adminService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getTenants(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const result = await adminService.getTenants({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        search: search || ''
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTenantById(req, res, next) {
    try {
      const tenant = await adminService.getTenantById(req.params.id);
      res.json({ success: true, data: tenant });
    } catch (error) {
      if (error.message === 'Tenant not found') {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      next(error);
    }
  }

  async updatePlan(req, res, next) {
    try {
      const { plan } = req.body;
      const tenant = await adminService.updateTenantPlan(req.params.id, plan);
      res.json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async toggleTenant(req, res, next) {
    try {
      const tenant = await adminService.toggleTenant(req.params.id);
      res.json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
