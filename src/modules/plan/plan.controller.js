const planService = require('./plan.service');
const logger = require('../../utils/logger');

class PlanController {
  async getAllPlans(req, res, next) {
    try {
      const plans = await planService.getAllPlans();
      res.status(200).json({ success: true, data: plans });
    } catch (error) {
      logger.error('Error fetching plans:', error);
      next(error);
    }
  }

  async updatePlan(req, res, next) {
    try {
      const { id } = req.params;
      const updatedPlan = await planService.updatePlan(id, req.body);
      res.status(200).json({ success: true, data: updatedPlan });
    } catch (error) {
      logger.error('Error updating plan:', error);
      next(error);
    }
  }
}

module.exports = new PlanController();
