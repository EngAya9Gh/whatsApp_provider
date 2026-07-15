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

  async getStatus(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const result = await whatsappService.getStatus(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WhatsAppController();
