const flowService = require('./flow.service');

class FlowController {
  async list(req, res, next) {
    try {
      res.json({ success: true, data: await flowService.listFlows(req.tenant.id) });
    } catch (error) {
      next(error);
    }
  }

  async get(req, res, next) {
    try {
      res.json({ success: true, data: await flowService.getFlow(req.tenant.id, req.params.channelId) });
    } catch (error) {
      next(error);
    }
  }

  async saveDraft(req, res, next) {
    try {
      res.json({ success: true, data: await flowService.saveDraft(req.tenant.id, req.params.channelId, req.body) });
    } catch (error) {
      next(error);
    }
  }

  async publish(req, res, next) {
    try {
      res.json({ success: true, data: await flowService.publish(req.tenant.id, req.params.channelId) });
    } catch (error) {
      // Validation problems are returned per step so the editor can highlight them
      if (error && error.errors) {
        return res.status(error.status || 422).json({ error: { message: error.message, errors: error.errors } });
      }
      next(error);
    }
  }

  async discard(req, res, next) {
    try {
      res.json({ success: true, data: await flowService.discardDraft(req.tenant.id, req.params.channelId) });
    } catch (error) {
      next(error);
    }
  }

  async setActive(req, res, next) {
    try {
      res.json({ success: true, data: await flowService.setActive(req.tenant.id, req.params.channelId, req.body.isActive) });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FlowController();
