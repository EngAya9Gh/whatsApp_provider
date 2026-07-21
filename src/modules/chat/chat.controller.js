const chatService = require('./chat.service');
const logger = require('../../utils/logger');

class ChatController {
  async getThreads(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const result = await chatService.getThreads(
        req.tenant.id,
        parseInt(page) || 1,
        parseInt(limit) || 50,
        search
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await chatService.getMessages(
        req.tenant.id,
        req.params.threadId,
        parseInt(page) || 1,
        parseInt(limit) || 50
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const message = await chatService.sendMessage(
        req.tenant.id,
        req.params.threadId,
        req.body
      );
      res.json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
