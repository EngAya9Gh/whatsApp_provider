const apiKeyService = require('./apiKey.service');
const logger = require('../../utils/logger');

class ApiKeyController {
  async generateKey(req, res, next) {
    try {
      const { label } = req.body;
      const tenantId = req.tenant.id; // From authMiddleware

      const result = await apiKeyService.generateKey(tenantId, label);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      logger.error('Generate API Key error:', error);
      next(error);
    }
  }

  async listKeys(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const result = await apiKeyService.listKeys(tenantId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('List API Keys error:', error);
      next(error);
    }
  }

  async deleteKey(req, res, next) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant.id;
      
      await apiKeyService.deleteKey(tenantId, id);
      res.status(200).json({ success: true, message: 'API Key deleted successfully' });
    } catch (error) {
      logger.error('Delete API Key error:', error);
      next(error);
    }
  }
}

module.exports = new ApiKeyController();
