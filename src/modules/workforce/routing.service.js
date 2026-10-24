const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Team = require('../../models/mongo/Team');
const shiftService = require('./shift.service');
const logger = require('../../utils/logger');

/** Next candidate after `lastId`, following the team's member order */
function nextInTurn(memberIds, candidates, lastId) {
  const start = memberIds.indexOf(lastId);
  for (let i = 1; i <= memberIds.length; i++) {
    const id = memberIds[(start + i) % memberIds.length];
    if (candidates.includes(id)) return id;
  }
  return null;
}

class RoutingService {
  /**
   * Picks an agent for a new, unassigned ticket from the team that owns its channel.
   * Returns the chosen sub-user id, or null when nothing was assigned. Never throws.
   */
  async autoAssignTicket(tenantId, ticket) {
    try {
      if (ticket.assignedToId) return null;

      const team = await Team.findOne({ tenantId, channelIds: ticket.channelId }).lean();
      if (!team || team.routing?.mode === 'MANUAL' || team.memberIds.length === 0) return null;

      const activeMembers = await prisma.subUser.findMany({
        where: { tenantId, id: { in: team.memberIds }, isActive: true },
        select: { id: true }
      });
      const activeIds = new Set(activeMembers.map(m => m.id));
      let candidates = team.memberIds.filter(id => activeIds.has(id));

      if (team.routing?.onlyOnShift !== false) {
        const onShift = new Set(await shiftService.getOnShiftUserIds(tenantId));
        candidates = candidates.filter(id => onShift.has(id));
      }
      if (candidates.length === 0) return null;

      let chosen = null;

      // Returning customer → back to the agent who handled them last time
      if (team.routing?.stickyOwner !== false) {
        const previous = await prisma.ticket.findFirst({
          where: { tenantId, threadId: ticket.threadId, id: { not: ticket.id }, assignedToId: { not: null } },
          orderBy: { createdAt: 'desc' },
          select: { assignedToId: true }
        });
        if (previous && candidates.includes(previous.assignedToId)) chosen = previous.assignedToId;
      }

      if (!chosen && team.routing?.mode === 'LEAST_BUSY') {
        const counts = await prisma.ticket.groupBy({
          by: ['assignedToId'],
          where: { tenantId, status: 'OPEN', assignedToId: { in: candidates } },
          _count: { _all: true }
        });
        const load = Object.fromEntries(counts.map(c => [c.assignedToId, c._count._all]));
        // Walk in turn order so ties are shared fairly
        let best = null;
        let id = team.lastAssignedUserId;
        for (let i = 0; i < candidates.length; i++) {
          id = nextInTurn(team.memberIds, candidates, id);
          if (best === null || (load[id] || 0) < (load[best] || 0)) best = id;
        }
        chosen = best;
      }

      if (!chosen) chosen = nextInTurn(team.memberIds, candidates, team.lastAssignedUserId);
      if (!chosen) return null;

      await prisma.ticket.update({ where: { id: ticket.id }, data: { assignedToId: chosen } });
      await Team.updateOne({ _id: team._id }, { $set: { lastAssignedUserId: chosen } });
      logger.info(`[Routing] Ticket ${ticket.id} → ${chosen} (team ${team.name})`);
      return chosen;
    } catch (err) {
      logger.error('[Routing] Auto-assign failed: ' + err.message);
      return null;
    }
  }
}

module.exports = new RoutingService();
module.exports.nextInTurn = nextInTurn;
