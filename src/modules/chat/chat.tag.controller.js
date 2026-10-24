const chatTagService = require('./chat.tag.service');

class ChatTagController {
  async getTags(req, res, next) {
    try {
      const tags = await chatTagService.getTags(req.tenant.id);
      res.json({ success: true, data: tags });
    } catch (error) {
      next(error);
    }
  }

  async createTag(req, res, next) {
    try {
      const tag = await chatTagService.createTag(req.tenant.id, req.body);
      res.status(201).json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }

  async updateTag(req, res, next) {
    try {
      const tag = await chatTagService.updateTag(req.tenant.id, req.params.id, req.body);
      res.json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }

  async deleteTag(req, res, next) {
    try {
      await chatTagService.deleteTag(req.tenant.id, req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async setThreadTags(req, res, next) {
    try {
      const tagIds = await chatTagService.setThreadTags(req.tenant.id, req.params.threadId, req.body.tagIds);
      res.json({ success: true, data: { tagIds } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatTagController();
