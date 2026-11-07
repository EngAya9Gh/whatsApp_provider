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
      const { monthlyLimit, metaEnabled, customFeatures, currency, deductBalance } = req.body;
      const tenant = await adminService.updateSettings(req.params.id, {
        monthlyLimit: parseInt(monthlyLimit),
        metaEnabled: metaEnabled === true || metaEnabled === 'true',
        deductBalance: deductBalance !== undefined ? (deductBalance === true || deductBalance === 'true') : undefined,
        customFeatures,
        currency
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

  async testMetaConnection(req, res, next) {
    try {
      const result = await adminService.testMetaConnection(req.params.id, req.params.channelId);
      res.json(result);
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

  async updateWalletBalance(req, res, next) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const walletService = require('../wallet/wallet.service');

      const { amount, action, note } = req.body; // action: 'ADD', 'SET', 'DEDUCT'
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const tenantId = req.params.id;
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const meta = {
        createdBy: req.admin?.id || req.admin?.email || 'ADMIN',
        description: typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null
      };
      if (action === 'ADD') {
        if (numAmount > 0) await walletService.credit(tenantId, { amount: numAmount, ...meta });
      } else if (action === 'DEDUCT') {
        if (numAmount > 0) await walletService.deductUpTo(tenantId, numAmount, meta);
      } else if (action === 'SET') {
        await walletService.setBalance(tenantId, numAmount, meta);
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const updated = await prisma.tenant.findUnique({ where: { id: tenantId } });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  /** The wallet ledger of one account, newest first */
  async getWalletTransactions(req, res, next) {
    try {
      const walletService = require('../wallet/wallet.service');
      const { page, limit, type } = req.query;
      const [summary, list] = await Promise.all([
        walletService.getSummary(req.params.id),
        walletService.list(req.params.id, { page, limit, type })
      ]);
      res.json({ success: true, data: { summary, ...list } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
