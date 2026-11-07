const billingService = require('./billing.service');
const walletService = require('../wallet/wallet.service');
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

  /** Balance, charges on/off, and what was spent this month */
  async getWallet(req, res, next) {
    try {
      res.status(200).json({ success: true, data: await walletService.getSummary(req.tenant.id) });
    } catch (error) {
      logger.error('Get Wallet error:', error);
      next(error);
    }
  }

  /** Every wallet movement of the account, newest first */
  async getWalletTransactions(req, res, next) {
    try {
      const { page, limit, type } = req.query;
      res.status(200).json({ success: true, data: await walletService.list(req.tenant.id, { page, limit, type }) });
    } catch (error) {
      logger.error('Get Wallet Transactions error:', error);
      next(error);
    }
  }
}

module.exports = new BillingController();
