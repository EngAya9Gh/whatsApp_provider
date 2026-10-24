const teamService = require('./team.service');
const shiftService = require('./shift.service');
const hoursService = require('./hours.service');

const actorId = (req) => (req.subUser ? req.subUser.id : 'OWNER');

class WorkforceController {
  // ─── Teams ────────────────────────────────────────────────
  async listTeams(req, res, next) {
    try {
      res.json({ success: true, data: await teamService.listTeams(req.tenant.id) });
    } catch (error) {
      next(error);
    }
  }

  async createTeam(req, res, next) {
    try {
      res.status(201).json({ success: true, data: await teamService.createTeam(req.tenant.id, req.body) });
    } catch (error) {
      next(error);
    }
  }

  async updateTeam(req, res, next) {
    try {
      res.json({ success: true, data: await teamService.updateTeam(req.tenant.id, req.params.id, req.body) });
    } catch (error) {
      next(error);
    }
  }

  async deleteTeam(req, res, next) {
    try {
      await teamService.deleteTeam(req.tenant.id, req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // ─── Shifts ───────────────────────────────────────────────
  async getSchedule(req, res, next) {
    try {
      res.json({ success: true, data: await shiftService.getSchedule(req.tenant.id) });
    } catch (error) {
      next(error);
    }
  }

  async getOnShift(req, res, next) {
    try {
      res.json({ success: true, data: { userIds: await shiftService.getOnShiftUserIds(req.tenant.id) } });
    } catch (error) {
      next(error);
    }
  }

  async createShift(req, res, next) {
    try {
      res.status(201).json({ success: true, data: await shiftService.createShift(req.tenant.id, req.body) });
    } catch (error) {
      next(error);
    }
  }

  async updateShift(req, res, next) {
    try {
      res.json({ success: true, data: await shiftService.updateShift(req.tenant.id, req.params.id, req.body) });
    } catch (error) {
      next(error);
    }
  }

  async deleteShift(req, res, next) {
    try {
      await shiftService.deleteShift(req.tenant.id, req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async setTimezone(req, res, next) {
    try {
      res.json({ success: true, data: { timezone: await shiftService.setTimezone(req.tenant.id, req.body.timezone) } });
    } catch (error) {
      next(error);
    }
  }

  async assignShift(req, res, next) {
    try {
      res.json({ success: true, data: await shiftService.assignShift(req.tenant.id, req.body, actorId(req)) });
    } catch (error) {
      next(error);
    }
  }

  async deleteAssignment(req, res, next) {
    try {
      await shiftService.deleteAssignment(req.tenant.id, req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // ─── Working hours ────────────────────────────────────────
  async listHours(req, res, next) {
    try {
      res.json({ success: true, data: await hoursService.listHours(req.tenant.id) });
    } catch (error) {
      next(error);
    }
  }

  async saveHours(req, res, next) {
    try {
      res.json({ success: true, data: await hoursService.saveHours(req.tenant.id, req.params.channelId, req.body) });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WorkforceController();
