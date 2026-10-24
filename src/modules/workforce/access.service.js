const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Team = require('../../models/mongo/Team');
const ChatThread = require('../../models/mongo/ChatThread');

/**
 * Conversation visibility for sub-users (permission `chat_scope`):
 *  ALL      → every conversation (default, and always for the owner / API keys)
 *  TEAM     → conversations on their teams' numbers (+ their own assigned number) and anything assigned to them
 *  ASSIGNED → only conversations with a ticket assigned to them
 */
class AccessService {
  /** null = unrestricted, otherwise { scope, userId, channelIds } */
  async getRestriction(req) {
    if (!req.isSubUser || !req.subUser) return null;
    const scope = req.userPerms?.chat_scope || 'ALL';
    if (scope !== 'TEAM' && scope !== 'ASSIGNED') return null;

    const userId = req.subUser.id;
    let channelIds = [];
    if (scope === 'TEAM') {
      const teams = await Team.find({ tenantId: req.tenant.id, memberIds: userId }).select('channelIds').lean();
      channelIds = [...new Set([...teams.flatMap(t => t.channelIds), ...(req.subUser.channelId ? [req.subUser.channelId] : [])])];
    }
    return { scope, userId, channelIds };
  }

  async _assignedThreadIds(tenantId, userId) {
    const tickets = await prisma.ticket.findMany({
      where: { tenantId, assignedToId: userId },
      select: { threadId: true },
      distinct: ['threadId']
    });
    return tickets.map(t => t.threadId).filter(id => mongoose.isValidObjectId(id));
  }

  /** Mongo filter to AND into thread queries, or null when unrestricted */
  async getThreadFilter(req) {
    const restriction = await this.getRestriction(req);
    if (!restriction) return null;

    const assigned = await this._assignedThreadIds(req.tenant.id, restriction.userId);
    if (restriction.scope === 'ASSIGNED') return { _id: { $in: assigned } };
    return { $or: [{ channelId: { $in: restriction.channelIds } }, { _id: { $in: assigned } }] };
  }

  async canAccessThread(req, threadId) {
    const restriction = await this.getRestriction(req);
    if (!restriction) return true;
    if (!mongoose.isValidObjectId(threadId)) return false;

    if (restriction.scope === 'TEAM') {
      const thread = await ChatThread.findOne({ _id: threadId, tenantId: req.tenant.id }).select('channelId').lean();
      if (thread && restriction.channelIds.includes(thread.channelId)) return true;
    }
    const assigned = await prisma.ticket.findFirst({
      where: { tenantId: req.tenant.id, threadId: String(threadId), assignedToId: restriction.userId },
      select: { id: true }
    });
    return !!assigned;
  }

  /** Prisma where-fragment for ticket lists, or null when unrestricted */
  async getTicketWhere(req) {
    const restriction = await this.getRestriction(req);
    if (!restriction) return null;
    if (restriction.scope === 'ASSIGNED') return { assignedToId: restriction.userId };
    return { OR: [{ channelId: { in: restriction.channelIds } }, { assignedToId: restriction.userId }] };
  }

  /** Express router.param handler: 403 when the conversation is outside the user's scope */
  threadParamGuard() {
    return async (req, res, next, threadId) => {
      try {
        if (await this.canAccessThread(req, threadId)) return next();
        return res.status(403).json({ error: { message: 'You do not have access to this conversation' } });
      } catch (err) {
        next(err);
      }
    };
  }
}

module.exports = new AccessService();
