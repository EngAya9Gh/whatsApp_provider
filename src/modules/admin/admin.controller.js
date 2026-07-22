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

  async updateSettings(req, res, next) {
    try {
      const { monthlyLimit, metaEnabled, customFeatures } = req.body;
      const tenant = await adminService.updateSettings(req.params.id, {
        monthlyLimit: parseInt(monthlyLimit),
        metaEnabled: metaEnabled === true || metaEnabled === 'true',
        customFeatures
      });
      res.json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async addMetaChannel(req, res, next) {
    try {
      const { phoneNumber, metaPhoneNumberId, metaWabaId, metaAccessToken, metaAppSecret, displayPhoneNumber, name } = req.body;
      const channel = await adminService.addMetaChannel(req.params.id, {
        phoneNumber, metaPhoneNumberId, metaWabaId, metaAccessToken, metaAppSecret, displayPhoneNumber, name
      });
      res.json({ success: true, data: channel });
    } catch (error) {
      next(error);
    }
  }

  async createInvoice(req, res, next) {
    try {
      const { amount, description, billingCycle, status, items, taxRate, taxAmount, buyerDetails, sellerDetails } = req.body;
      const invoice = await adminService.createInvoice(
        req.params.id, amount, description, billingCycle, status, items, taxRate, taxAmount, buyerDetails, sellerDetails
      );
      res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  async updateInvoiceStatus(req, res, next) {
    try {
      const { status } = req.body;
      const invoice = await adminService.updateInvoiceStatus(req.params.id, status);
      res.json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  async getAllInvoices(req, res, next) {
    try {
      const invoices = await adminService.getAllInvoices();
      res.json({ success: true, data: invoices });
    } catch (error) {
      next(error);
    }
  }

  async resetTenantPassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      const result = await adminService.resetTenantPassword(req.params.id, newPassword);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error.message.includes('at least 6 characters') || error.message.includes('Tenant not found')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  async getSystemSettings(req, res, next) {
    try {
      const settings = await adminService.getSystemSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateSystemSettings(req, res, next) {
    try {
      const settings = await adminService.updateSystemSettings(req.body);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async getUnbilledUsage(req, res, next) {
    try {
      const items = await adminService.calculateUnbilledUsage(req.params.id);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
