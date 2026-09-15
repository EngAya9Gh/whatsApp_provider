const whatsappService = require('./whatsapp.service');
const logger = require('../../utils/logger');

class WhatsAppController {
  async connect(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const result = await whatsappService.connect(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('WhatsApp Connect error:', error);
      next(error);
    }
  }

  async disconnect(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const result = await whatsappService.disconnect(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('WhatsApp Disconnect error:', error);
      next(error);
    }
  }

  async getQr(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const qr = await whatsappService.getQr(tenantId);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.json({ data: qr });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const result = await whatsappService.getStatus(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getGroups(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const result = await whatsappService.getGroups(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WhatsAppController();
