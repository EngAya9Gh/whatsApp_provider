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

  async copyFrom(req, res, next) {
    try {
      res.json({ success: true, data: await flowService.copyFrom(req.tenant.id, req.params.channelId, req.params.sourceChannelId) });
    } catch (error) {
      if (error && error.status) return res.status(error.status).json({ error: { message: error.message } });
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

  /** Test chat of the editor: runs the draft without sending anything */
  async test(req, res, next) {
    try {
      await flowService._channel(req.tenant.id, req.params.channelId);
      const simulator = require('./flow.simulator');
      res.json({ success: true, data: await simulator.run(req.tenant.id, req.params.channelId, req.body) });
    } catch (error) {
      if (error && error.errors) {
        return res.status(error.status || 422).json({ error: { message: error.message, errors: error.errors } });
      }
      next(error);
    }
  }

  async restart(req, res, next) {
    try {
      res.json({ success: true, data: await flowService.restartForNumber(req.tenant.id, req.params.channelId, req.body.phone) });
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
