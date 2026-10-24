const analyticsService = require('./analytics.service');

class AnalyticsController {
  async getMeta(req, res, next) {
    try {
      const data = await analyticsService.getMetaAnalytics(req.tenant.id, {
        days: req.query.days,
        channelId: req.query.channelId || null
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getQr(req, res, next) {
    try {
      const data = await analyticsService.getQrAnalytics(req.tenant.id, { days: req.query.days });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
