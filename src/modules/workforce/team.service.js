const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Team = require('../../models/mongo/Team');

const MODES = ['ROUND_ROBIN', 'LEAST_BUSY', 'MANUAL'];

const formatTeam = (team) => ({
  id: team._id.toString(),
  name: team.name,
  color: team.color,
  memberIds: team.memberIds,
  channelIds: team.channelIds,
  routing: {
    mode: team.routing?.mode || 'ROUND_ROBIN',
    onlyOnShift: team.routing?.onlyOnShift !== false,
    stickyOwner: team.routing?.stickyOwner !== false
  }
});

class TeamService {
  async listTeams(tenantId) {
    const teams = await Team.find({ tenantId }).sort({ createdAt: 1 }).lean();
    return teams.map(formatTeam);
  }

  async getUserTeams(tenantId, subUserId) {
    const teams = await Team.find({ tenantId, memberIds: subUserId }).lean();
    return teams.map(formatTeam);
  }

  async _cleanPayload(tenantId, data, teamId = null) {
    const name = String(data.name || '').trim();
    if (!name) throw { status: 400, message: 'Team name is required' };

    const requestedMembers = Array.isArray(data.memberIds) ? [...new Set(data.memberIds.map(String))] : [];
    const validMembers = await prisma.subUser.findMany({
      where: { tenantId, id: { in: requestedMembers } },
      select: { id: true }
    });
    const validMemberIds = new Set(validMembers.map(m => m.id));

    const requestedChannels = Array.isArray(data.channelIds) ? [...new Set(data.channelIds.map(String))] : [];
    const validChannels = await prisma.whatsAppChannel.findMany({
      where: { tenantId, id: { in: requestedChannels } },
      select: { id: true }
    });
    const channelIds = validChannels.map(c => c.id);

    // Each channel is handled by one team, so routing is never ambiguous
    if (channelIds.length > 0) {
      const conflict = await Team.findOne({
        tenantId,
        channelIds: { $in: channelIds },
        ...(teamId ? { _id: { $ne: teamId } } : {})
      }).lean();
      if (conflict) throw { status: 409, message: `A selected number already belongs to team "${conflict.name}"` };
    }

    const routing = data.routing || {};
    return {
      name,
      color: data.color || '#8b5cf6',
      memberIds: requestedMembers.filter(id => validMemberIds.has(id)), // keeps the chosen order
      channelIds,
      routing: {
        mode: MODES.includes(routing.mode) ? routing.mode : 'ROUND_ROBIN',
        onlyOnShift: routing.onlyOnShift !== false,
        stickyOwner: routing.stickyOwner !== false
      }
    };
  }

  async createTeam(tenantId, data) {
    const payload = await this._cleanPayload(tenantId, data);
    const team = await Team.create({ tenantId, ...payload });
    return formatTeam(team);
  }

  async updateTeam(tenantId, id, data) {
    if (!mongoose.isValidObjectId(id)) throw { status: 404, message: 'Team not found' };
    const payload = await this._cleanPayload(tenantId, data, id);
    const team = await Team.findOneAndUpdate({ _id: id, tenantId }, { $set: payload }, { returnDocument: 'after' });
    if (!team) throw { status: 404, message: 'Team not found' };
    return formatTeam(team);
  }

  async deleteTeam(tenantId, id) {
    if (!mongoose.isValidObjectId(id)) throw { status: 404, message: 'Team not found' };
    const team = await Team.findOneAndDelete({ _id: id, tenantId });
    if (!team) throw { status: 404, message: 'Team not found' };
  }
}

module.exports = new TeamService();
