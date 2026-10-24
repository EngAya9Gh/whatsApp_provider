const chatStageService = require('./chat.stage.service');

class ChatStageController {
  async getConfig(req, res, next) {
    try {
      const config = await chatStageService.getConfig(req.tenant.id);
      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }

  async saveConfig(req, res, next) {
    try {
      const config = await chatStageService.saveConfig(req.tenant.id, req.body);
      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }

  async setThreadStage(req, res, next) {
    try {
      const changedBy = req.subUser ? req.subUser.id : 'OWNER';
      const stageId = await chatStageService.setThreadStage(req.tenant.id, req.params.threadId, req.body.stageId, changedBy);
      res.json({ success: true, data: { stageId } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatStageController();
