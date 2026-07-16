const billingService = require('./billing.service');
const logger = require('../../utils/logger');

class BillingController {
  async getUsage(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const result = await billingService.getUsage(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Get Usage error:', error);
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const result = await billingService.getHistory(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Get Usage History error:', error);
      next(error);
    }
  }

  async getInvoices(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const result = await billingService.getInvoices(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Get Invoices error:', error);
      next(error);
    }
  }
}

module.exports = new BillingController();
