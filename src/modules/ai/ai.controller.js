const aiService = require('./ai.service');
const aiAgentService = require('./ai.agent.service');
const aiClient = require('./ai.client');

const actor = (req) => (req.subUser ? req.subUser.id : 'OWNER');

class AIController {
  async getStatus(req, res, next) {
    try {
      res.json({ success: true, data: { configured: await aiClient.isConfigured(req.tenant.id), model: aiClient.model() } });
    } catch (error) {
      next(error);
    }
  }

  async summarize(req, res, next) {
    try {
      const summary = await aiService.summarizeConversation(req.tenant.id, req.params.threadId, { refresh: !!req.body?.refresh });
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async suggestStage(req, res, next) {
    try {
      const suggestion = await aiService.suggestStage(req.tenant.id, req.params.threadId);
      res.json({ success: true, data: suggestion });
    } catch (error) {
      next(error);
    }
  }

  async acceptSuggestion(req, res, next) {
    try {
      res.json({ success: true, data: await aiService.decideSuggestion(req.tenant.id, req.params.threadId, true, actor(req)) });
    } catch (error) {
      next(error);
    }
  }

  async rejectSuggestion(req, res, next) {
    try {
      res.json({ success: true, data: await aiService.decideSuggestion(req.tenant.id, req.params.threadId, false, actor(req)) });
    } catch (error) {
      next(error);
    }
  }

  async getAgent(req, res, next) {
    try {
      res.json({ success: true, data: await aiAgentService.getAgent(req.tenant.id) });
    } catch (error) {
      next(error);
    }
  }

  async saveAgent(req, res, next) {
    try {
      res.json({ success: true, data: await aiAgentService.saveAgent(req.tenant.id, req.body, actor(req)) });
    } catch (error) {
      next(error);
    }
  }

  /** Playground: replies to a test conversation using the saved agent settings */
  async testAgent(req, res, next) {
    try {
      const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-20) : [];
      const history = messages.map(m => ({
        direction: m.role === 'customer' ? 'INBOUND' : 'OUTBOUND',
        content: String(m.text || '').slice(0, 2000)
      }));
      res.json({ success: true, data: await aiAgentService.reply(req.tenant.id, history) });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();
