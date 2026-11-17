const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');
const webhookService = require('../webhook/webhook.service');
const { withLock } = require('../../utils/keyLock');

const ACTIVE_STATUSES = ['OPEN', 'PENDING'];
const CLOSED_STATUSES = ['CLOSED', 'RESOLVED'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const HOUR_MS = 60 * 60 * 1000;
// Meta only lets a business send free-form messages within 24h of the customer's last message
const CUSTOMER_WINDOW_MS = 24 * HOUR_MS;
// Rating request and thanks: not part of the conversation a ticket is about
const RATING_TEXT = /تقييم|شكراً لتقييمك/;

const RATING_TYPES = ['LIST_5_STARS', 'BUTTONS_3', 'TEXT'];
const CLAIM_MODES = ['OPEN', 'REPLY'];
// How a ticket was first taken (tickets.assigned_via)
const VIA = ['OPEN', 'REPLY', 'ROUTING', 'MANUAL', 'SELF', 'FLOW'];
const DEFAULT_RATING_TEXT = 'تم إغلاق التذكرة الخاصة بك. نأمل أن نكون قد وفقنا في خدمتك! يرجى تقييم الخدمة من 1 إلى 5 (حيث 5 هو الأفضل).';

/**
 * Ticket settings of a tenant (customFeatures.ticketSettings), with defaults:
 *  autoCreateTickets  open a ticket when a customer writes (master switch)
 *  ticketlessChannelIds  numbers that never open tickets automatically (e.g. a marketing number).
 *                     Kept here, not in whatsapp_channels.auto_create_tickets: that old column was false
 *                     for every number connected through Embedded Signup and had no effect, so it cannot
 *                     tell a real "off" apart.
 *  reopenHours        a customer who writes again within this many hours of a close, without having
 *                     rated, reopens the same ticket (0 = always a new ticket)
 *  autoCloseEnabled / autoCloseHours   close when the customer stays silent after our answer
 *  ratingEnabled / ratingType / ratingMessageText   the rating request sent on close
 *  claimOn            when a team member takes an unassigned ticket by themselves: 'OPEN' (as soon as they
 *                     open the conversation) or 'REPLY' (with their first reply). Routing and assigning by
 *                     hand work either way.
 */
function ticketSettingsOf(customFeatures) {
  const features = customFeatures && typeof customFeatures === 'object' ? customFeatures : {};
  const s = features.ticketSettings || {};
  const reopen = Number(s.reopenHours);
  return {
    autoCreateTickets: s.autoCreateTickets !== false,
    ticketlessChannelIds: Array.isArray(s.ticketlessChannelIds) ? s.ticketlessChannelIds.map(String) : [],
    reopenHours: Number.isFinite(reopen) && reopen >= 0 ? reopen : 24,
    autoCloseEnabled: s.autoCloseEnabled !== false,
    autoCloseHours: Number(s.autoCloseHours) || 24,
    ratingEnabled: s.ratingEnabled !== false,
    ratingType: RATING_TYPES.includes(s.ratingType) ? s.ratingType : 'LIST_5_STARS',
    ratingMessageText: String(s.ratingMessageText || '').trim() || DEFAULT_RATING_TEXT,
    claimOn: CLAIM_MODES.includes(s.claimOn) ? s.claimOn : 'OPEN'
  };
}

const formatNumber = (n) => `#TK-${String(n).padStart(4, '0')}`;
const fail = (status, message) => ({ status, message });
const actorName = (actor) => actor?.name || 'النظام';
const threadLock = (threadId) => `ticket-thread:${threadId}`;

const models = () => ({
  ChatThread: require('../../models/mongo/ChatThread'),
  ChatMessage: require('../../models/mongo/ChatMessage')
});

function emit(tenantId, event, data) {
  try {
    require('../../services/socket.service').emitToTenant(tenantId, event, data);
  } catch (e) { /* the socket is optional */ }
}

const ticketEvent = (ticket) => ({
  ticketId: ticket.id,
  threadId: ticket.threadId,
  status: ticket.status,
  assignedToId: ticket.assignedToId || null,
  categoryId: ticket.categoryId || null
});

class TicketsService {
  async getActiveTicket(tenantId, threadId) {
    return prisma.ticket.findFirst({
      where: { tenantId, threadId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getRecentClosedUnratedTicket(tenantId, threadId) {
    return prisma.ticket.findFirst({
      where: { tenantId, threadId, status: 'CLOSED', rating: null, resolvedAt: { gte: new Date(Date.now() - 24 * HOUR_MS) } },
      orderBy: { resolvedAt: 'desc' }
    });
  }

  async saveTicketRating(tenantId, ticketId, ratingValue) {
    const updated = await prisma.ticket.update({
      where: { id: ticketId, tenantId },
      data: { rating: ratingValue }
    });

    try {
      await webhookService.sendTicketRated(tenantId, { ticket_id: updated.id, thread_id: updated.threadId, rating: ratingValue });
      await this._crmSync(tenantId, updated, { status: 'closed', rating: ratingValue });
      logger.info(`[TicketsService] Sent rating ${ratingValue} to CRM for ticket ${updated.id}`);
    } catch (err) {
      logger.error(`[TicketsService] Failed to sync rating to CRM: ${err.message}`);
    }
    emit(tenantId, 'ticket_updated', ticketEvent(updated));
    return updated;
  }

  // ─── Creating & reopening ───────────────────────────────────────────

  /**
   * Customer message: returns the conversation's active ticket, reopens one closed less than 24h ago
   * (and not rated yet), or opens a new one. Off when the tenant turned automatic tickets off.
   */
  async autoCreateTicketIfNeeded(tenantId, channelId, threadId, crmClientId, firstMessageText = '', options = {}) {
    try {
      const [channel, tenant] = await Promise.all([
        prisma.whatsAppChannel.findUnique({ where: { id: channelId }, select: { id: true } }),
        prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } })
      ]);
      if (!channel) return null;
      const settings = ticketSettingsOf(tenant?.customFeatures);
      // Ticket settings: the main switch, then each number can opt out (e.g. a marketing number)
      if (!settings.autoCreateTickets || settings.ticketlessChannelIds.includes(channelId)) return null;

      return await withLock(threadLock(threadId), async () => {
        const active = await this.getActiveTicket(tenantId, threadId);
        if (active) return active;

        const lastClosed = await prisma.ticket.findFirst({
          where: { tenantId, threadId, status: 'CLOSED' },
          orderBy: { resolvedAt: 'desc' }
        });
        // The customer writes again soon after a close and has not rated: the problem is probably not
        // solved, so the same ticket continues with the same agent
        const withinReopenWindow = lastClosed?.resolvedAt && settings.reopenHours > 0 &&
          Date.now() - new Date(lastClosed.resolvedAt).getTime() < settings.reopenHours * HOUR_MS;
        if (withinReopenWindow && !lastClosed.rating) {
          logger.info(`[TicketsService] Customer wrote again: reopening ticket ${lastClosed.id}`);
          return this._reopen(tenantId, lastClosed, { byCustomer: true, skipRouting: options.skipRouting });
        }

        logger.info(`[TicketsService] Auto-creating ticket for thread ${threadId} on channel ${channelId}`);
        return this._create(tenantId, {
          channelId,
          threadId,
          crmClientId,
          subject: firstMessageText ? firstMessageText.substring(0, 100) : 'محادثة دعم فني',
          skipRouting: options.skipRouting
        });
      });
    } catch (error) {
      logger.error(`[TicketsService] Error auto-creating ticket: ${error.message}`);
      return null;
    }
  }

  /**
   * Opens a ticket (by hand or from a flow). When the conversation already has an active ticket,
   * returns it with `alreadyOpen: true` instead of opening a second one.
   * options: { assignedToId (a person; null = nobody), skipRouting, actor, manual }
   */
  async createTicket(tenantId, channelId, threadId, crmClientId, subject = 'محادثة واتساب', categoryId = null, options = {}) {
    return withLock(threadLock(threadId), async () => {
      const active = await this.getActiveTicket(tenantId, threadId);
      if (active) return { ...active, alreadyOpen: true };
      return this._create(tenantId, { channelId, threadId, crmClientId, subject, categoryId, ...options });
    });
  }

  async _nextNumber(tenantId) {
    // Highest number in use (numbers are text, so "#TK-10000" must be compared as a number)
    if (typeof prisma.$queryRaw === 'function') {
      try {
        const rows = await prisma.$queryRaw`SELECT MAX(CAST(SUBSTRING(ticket_number, 5) AS UNSIGNED)) AS maxNo FROM tickets WHERE tenant_id = ${tenantId} AND ticket_number REGEXP '^#TK-[0-9]{1,9}$'`;
        return Number(rows?.[0]?.maxNo || 0) + 1;
      } catch (err) {
        logger.warn(`[TicketsService] Could not read the highest ticket number: ${err.message}`);
      }
    }
    const [count, latest] = await Promise.all([
      prisma.ticket.count({ where: { tenantId } }),
      prisma.ticket.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { ticketNumber: true } })
    ]);
    const last = parseInt(String(latest?.ticketNumber || '').replace(/\D/g, ''), 10) || 0;
    return Math.max(count, last) + 1;
  }

  /** Caller holds the conversation's lock */
  async _create(tenantId, { channelId, threadId, crmClientId = null, subject, categoryId = null, skipRouting = false, assignedToId, actor = null, manual = false }) {
    const { ChatThread, ChatMessage } = models();
    const thread = await ChatThread.findById(threadId).catch(() => null);

    // Number and insert under one tenant-wide lock, so two tickets never share a number. The database
    // also refuses a repeated number (unique tenant + number): then the next free one is taken.
    const ticket = await withLock(`ticket-number:${tenantId}`, async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await prisma.ticket.create({
            data: {
              tenantId,
              channelId,
              threadId,
              ticketNumber: formatNumber(await this._nextNumber(tenantId) + attempt),
              status: 'OPEN',
              subject: subject || 'محادثة واتساب',
              crmClientId: crmClientId || null,
              ...(categoryId && { categoryId }),
              ...(assignedToId && { assignedToId }),
              // While a flow talks the ticket is not the team's yet: readyAt is set at the hand-off
              ...(!skipRouting && { readyAt: new Date() }),
              ...(assignedToId && { firstAssignedAt: new Date(), assignedVia: manual ? 'MANUAL' : 'FLOW' })
            }
          });
        } catch (err) {
          if (err?.code === 'P2002' && attempt < 5) continue;
          throw err;
        }
      }
    }, { ttlMs: 10000 });

    // Nobody chosen → the team that owns the number (skipped while a flow is talking; null = leave unassigned)
    if (!ticket.assignedToId && !skipRouting && assignedToId !== null) {
      const routingService = require('../workforce/routing.service');
      const routed = await routingService.autoAssignTicket(tenantId, ticket);
      if (routed) ticket.assignedToId = routed;
    }

    // Messages since the previous ticket closed belong to this one
    if (thread) {
      const previous = await prisma.ticket.findFirst({
        where: { tenantId, threadId, status: 'CLOSED', id: { not: ticket.id } },
        orderBy: { resolvedAt: 'desc' }
      });
      const query = { threadId: thread._id, content: { $not: RATING_TEXT } };
      if (previous?.resolvedAt) query.createdAt = { $gt: previous.resolvedAt };
      else query.$or = [{ ticketId: null }, { ticketId: { $exists: false } }];
      await ChatMessage.updateMany(query, { $set: { ticketId: ticket.id } });
    }

    if (manual) {
      const assignee = await this._memberName(tenantId, ticket.assignedToId);
      await this._note(tenantId, ticket, `🎫 فتح ${actorName(actor)} التذكرة ${ticket.ticketNumber}` +
        (assignee ? `، وأُسندت إلى ${assignee}` : '، وهي غير مسندة لأحد بعد'));
    }

    const crm = await this._crmSync(tenantId, ticket, {
      status: 'open',
      categoryId,
      description: subject || 'محادثة دعم فني جديدة',
      thread
    });
    if (crm?.ticket_id) {
      ticket.crmTicketId = String(crm.ticket_id);
      await prisma.ticket.update({ where: { id: ticket.id }, data: { crmTicketId: ticket.crmTicketId } }).catch(() => {});
    }

    emit(tenantId, 'ticket_updated', ticketEvent(ticket));
    return ticket;
  }

  async reopenTicket(tenantId, ticketId, { actor = null } = {}) {
    const found = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId }, select: { threadId: true } });
    if (!found) throw fail(404, 'Ticket not found');

    return withLock(threadLock(found.threadId), async () => {
      const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId } });
      if (!CLOSED_STATUSES.includes(ticket.status)) throw fail(409, 'Only closed tickets can be reopened');
      const other = await this.getActiveTicket(tenantId, ticket.threadId);
      if (other) throw fail(409, `Ticket ${other.ticketNumber} is already open for this conversation`);
      return this._reopen(tenantId, ticket, { actor });
    });
  }

  /** Caller holds the conversation's lock */
  async _reopen(tenantId, ticket, { actor = null, byCustomer = false, skipRouting = false } = {}) {
    // Keep the agent who handled it, unless they were deactivated meanwhile
    let assignedToId = ticket.assignedToId;
    if (assignedToId) {
      const agent = await prisma.subUser.findFirst({ where: { id: assignedToId, tenantId }, select: { isActive: true } });
      if (!agent?.isActive) assignedToId = null;
    }
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'OPEN', resolvedAt: null, assignedToId, ...(!skipRouting && !ticket.readyAt && { readyAt: new Date() }) }
    });
    if (!updated.assignedToId && !skipRouting) {
      const routingService = require('../workforce/routing.service');
      const routed = await routingService.autoAssignTicket(tenantId, updated);
      if (routed) updated.assignedToId = routed;
    }

    // Follow-up messages since the close belong to this ticket again
    const { ChatMessage } = models();
    const mongoose = require('mongoose');
    const threadObjId = mongoose.Types.ObjectId.isValid(ticket.threadId) ? new mongoose.Types.ObjectId(ticket.threadId) : ticket.threadId;
    const unlinked = [{ ticketId: null }, { ticketId: { $exists: false } }, { ticketId: '' }];
    await ChatMessage.updateMany(
      {
        threadId: threadObjId,
        content: { $not: RATING_TEXT },
        $or: ticket.resolvedAt ? [{ createdAt: { $gte: ticket.resolvedAt } }, ...unlinked] : unlinked
      },
      { $set: { ticketId: ticket.id } }
    );

    await this._note(tenantId, updated, byCustomer
      ? `↩️ أُعيد فتح التذكرة ${updated.ticketNumber} لأن العميل راسل من جديد`
      : `↩️ أعاد ${actorName(actor)} فتح التذكرة ${updated.ticketNumber}`);

    await this._crmSync(tenantId, updated, { status: 'open', description: 'تمت إعادة فتح التذكرة' });
    emit(tenantId, 'ticket_updated', ticketEvent(updated));
    return updated;
  }

  // ─── Assigning & editing ────────────────────────────────────────────

  /**
   * Assigns an active ticket to a team member of the tenant (null = nobody).
   * via: how it was taken, for the reports (default: SELF when they took it, MANUAL otherwise)
   */
  async assignTicket(tenantId, ticketId, assignedToId, { actor = null, via = null } = {}) {
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket) throw fail(404, 'Ticket not found');
    if (!ACTIVE_STATUSES.includes(ticket.status)) throw fail(409, 'Reopen the ticket before assigning it');

    const targetId = assignedToId || null;
    let assignee = null;
    if (targetId) {
      assignee = await prisma.subUser.findFirst({ where: { id: targetId, tenantId }, select: { id: true, name: true, isActive: true } });
      if (!assignee) throw fail(400, 'Team member not found');
      if (!assignee.isActive) throw fail(400, 'This team member is deactivated');
    }
    if ((ticket.assignedToId || null) === targetId) return ticket;

    const updated = await prisma.ticket.update({ where: { id: ticket.id }, data: { assignedToId: targetId } });
    if (assignee) await this.stampAssigned(ticket.id, via || (actor?.key === assignee.id ? 'SELF' : actor ? 'MANUAL' : 'FLOW'));
    await this._note(tenantId, updated, assignee
      ? (actor?.key === assignee.id ? `👤 استلم ${assignee.name} التذكرة ${updated.ticketNumber}` : `👤 أسند ${actorName(actor)} التذكرة ${updated.ticketNumber} إلى ${assignee.name}`)
      : `👤 أزال ${actorName(actor)} الإسناد عن التذكرة ${updated.ticketNumber}`);

    // The new owner hears about it in team chat (unless they took it themselves)
    if (assignee && actor?.key && actor.key !== assignee.id) {
      try {
        const teamChatService = require('../team-chat/team-chat.service');
        await teamChatService.notifyMentions(tenantId, actor.key, [assignee.id], {
          threadId: updated.threadId,
          text: `أسندتُ إليك التذكرة ${updated.ticketNumber}`
        });
      } catch (err) {
        logger.warn(`[TicketsService] Could not notify the assignee: ${err.message}`);
      }
    }

    emit(tenantId, 'ticket_updated', ticketEvent(updated));
    return updated;
  }

  /**
   * A team member takes an unassigned active ticket by themselves (opening the conversation or replying).
   * Atomic: when two people open the same conversation at the same moment, the database gives the ticket
   * to exactly one of them and the other is told who has it.
   * Returns { claimed, ticket, assignee: { id, name } | null }
   */
  async claimTicket(tenantId, ticketId, subUserId, via = 'OPEN') {
    const member = await prisma.subUser.findFirst({ where: { id: subUserId, tenantId }, select: { id: true, name: true, isActive: true } });
    if (!member || !member.isActive) throw fail(400, 'This team member cannot take tickets');

    const won = await prisma.ticket.updateMany({
      where: { id: ticketId, tenantId, assignedToId: null, status: { in: ACTIVE_STATUSES } },
      data: { assignedToId: member.id }
    });
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket) throw fail(404, 'Ticket not found');
    if (won.count === 0) {
      const name = ticket.assignedToId ? await this._memberName(tenantId, ticket.assignedToId) : null;
      return { claimed: false, ticket, assignee: ticket.assignedToId ? { id: ticket.assignedToId, name } : null };
    }

    await this.stampAssigned(ticket.id, via);
    await this._note(tenantId, ticket, via === 'REPLY'
      ? `👤 استلم ${member.name} التذكرة ${ticket.ticketNumber} بأول رد`
      : `👤 استلم ${member.name} التذكرة ${ticket.ticketNumber} عند فتح المحادثة`);
    emit(tenantId, 'ticket_updated', ticketEvent(ticket));
    return { claimed: true, ticket, assignee: { id: member.id, name: member.name } };
  }

  /** First assignment to a person (pick-up time and how); later reassignments keep the first one */
  async stampAssigned(ticketId, via) {
    try {
      await prisma.ticket.updateMany({ where: { id: ticketId, firstAssignedAt: null }, data: { firstAssignedAt: new Date(), assignedVia: VIA.includes(via) ? via : 'MANUAL' } });
    } catch (err) {
      logger.warn(`[TicketsService] Could not record the pick-up time: ${err.message}`);
    }
  }

  /** The ticket is the team's from now (no-op when it already was) */
  async markReady(ticketId, at = new Date()) {
    try {
      await prisma.ticket.updateMany({ where: { id: ticketId, readyAt: null }, data: { readyAt: at } });
    } catch (err) {
      logger.warn(`[TicketsService] Could not mark the ticket ready: ${err.message}`);
    }
  }

  /**
   * First time a team member looked at the ticket once it was the team's (opened the conversation, or
   * replied). Recorded whatever the take-on setting is, so the reports always have the opening time.
   */
  async markOpened(ticketId, subUserId) {
    try {
      await prisma.ticket.updateMany({
        where: { id: ticketId, firstOpenedAt: null, readyAt: { not: null } },
        data: { firstOpenedAt: new Date(), firstOpenedById: subUserId || null }
      });
    } catch (err) {
      logger.warn(`[TicketsService] Could not record the opening time: ${err.message}`);
    }
  }

  /** First reply a person wrote to the customer on this ticket */
  async markFirstResponse(ticketId) {
    try {
      await prisma.ticket.updateMany({ where: { id: ticketId, firstResponseAt: null }, data: { firstResponseAt: new Date() } });
    } catch (err) {
      logger.warn(`[TicketsService] Could not record the first response: ${err.message}`);
    }
  }

  /** Settings that decide what opening a conversation does */
  async claimMode(tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } });
    return ticketSettingsOf(tenant?.customFeatures).claimOn;
  }

  /** Category / priority / subject of a ticket */
  async updateTicket(tenantId, ticketId, { categoryId, priority, subject } = {}) {
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket) throw fail(404, 'Ticket not found');

    const data = {};
    if (categoryId !== undefined) {
      if (categoryId && !(await prisma.ticketCategory.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } }))) {
        throw fail(400, 'Category not found');
      }
      data.categoryId = categoryId || null;
    }
    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) throw fail(400, 'Unknown priority');
      data.priority = priority;
    }
    if (subject !== undefined) {
      const clean = String(subject || '').trim().slice(0, 200);
      if (!clean) throw fail(400, 'The subject cannot be empty');
      data.subject = clean;
    }
    if (Object.keys(data).length === 0) return ticket;

    const updated = await prisma.ticket.update({ where: { id: ticket.id }, data });
    emit(tenantId, 'ticket_updated', ticketEvent(updated));
    return updated;
  }

  // ─── Closing ────────────────────────────────────────────────────────

  /**
   * Closes an active ticket: optional category, a note with the resolution for the team, and the
   * rating request to the customer (only while Meta's 24h window is open). The AI summary and the
   * CRM update run afterwards, so closing stays instant.
   * options: { description, categoryId, sendRating (default true), actor, auto }
   */
  async closeTicket(tenantId, ticketId, { description = '', categoryId = null, sendRating = true, actor = null, auto = false } = {}) {
    const found = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId }, select: { threadId: true } });
    if (!found) throw fail(404, 'Ticket not found');

    return withLock(threadLock(found.threadId), async () => {
      const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId }, include: { channel: true } });
      if (CLOSED_STATUSES.includes(ticket.status)) throw fail(409, 'This ticket is already closed');
      if (categoryId && !(await prisma.ticketCategory.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } }))) {
        throw fail(400, 'Category not found');
      }

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'CLOSED', resolvedAt: new Date(), ...(categoryId && { categoryId }) }
      });

      const rating = sendRating ? await this._sendRatingRequest(tenantId, ticket) : 'OFF';
      const categoryName = await this._categoryName(tenantId, updated.categoryId);
      const resolution = String(description || '').trim();
      const ratingLine = {
        SENT: 'أُرسل للعميل طلب تقييم الخدمة.',
        WINDOW_CLOSED: 'لم يُرسل طلب التقييم: مرّ أكثر من 24 ساعة على آخر رسالة من العميل (سياسة Meta).',
        FAILED: 'تعذّر إرسال طلب التقييم للعميل.'
      }[rating];
      await this._note(tenantId, updated, [
        auto ? `✅ أُغلقت التذكرة ${updated.ticketNumber} تلقائياً` : `✅ أغلق ${actorName(actor)} التذكرة ${updated.ticketNumber}`,
        updated.categoryId && `التصنيف: ${categoryName}`,
        resolution && `${auto ? 'السبب' : 'الحل'}: ${resolution}`,
        ratingLine
      ].filter(Boolean).join('\n'));

      emit(tenantId, 'ticket_updated', ticketEvent(updated));
      this._afterClose(tenantId, updated, { description: resolution || 'تم حل المشكلة' });
      return { ...updated, ratingRequest: rating };
    });
  }

  /** AI summary, then the CRM update (which carries the summary) — in the background */
  _afterClose(tenantId, ticket, { description }) {
    setImmediate(async () => {
      try {
        const aiService = require('../ai/ai.service');
        const summary = await aiService.summarizeTicket(tenantId, ticket.threadId);
        if (summary) await prisma.ticket.update({ where: { id: ticket.id }, data: { summary } });
        await this._crmSync(tenantId, ticket, { status: 'closed', description, summary: summary || ticket.summary || '' });
      } catch (err) {
        logger.error(`[TicketsService] After-close work failed for ${ticket.id}: ${err.message}`);
      }
    });
  }

  /** Returns 'SENT', 'WINDOW_CLOSED', 'FAILED', 'OFF' (rating turned off in settings) or 'SKIPPED' */
  async _sendRatingRequest(tenantId, ticket) {
    try {
      const { ChatThread, ChatMessage } = models();
      const thread = await ChatThread.findById(ticket.threadId).catch(() => null);
      if (!thread || !ticket.channel) return 'SKIPPED';

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } });
      const settings = ticketSettingsOf(tenant?.customFeatures);
      if (!settings.ratingEnabled) return 'OFF';
      const ratingText = settings.ratingMessageText;
      const ratingType = settings.ratingType;

      if (ticket.channel.providerType !== 'META_CLOUD') {
        const chatService = require('../chat/chat.service');
        await chatService.sendMessage(tenantId, ticket.threadId, {
          content: `${ratingText}\nللتقييم، أرسل رقم التقييم كرسالة (مثال: 5).`,
          type: 'text',
          ticketId: ticket.id,
          isAutomated: true
        });
        return 'SENT';
      }

      // Meta refuses free-form messages more than 24h after the customer's last message
      const lastInboundAt = thread.lastInboundAt || (await ChatMessage.findOne({ threadId: thread._id, direction: 'INBOUND' })
        .sort({ createdAt: -1 }).select('createdAt').lean())?.createdAt;
      if (!lastInboundAt || Date.now() - new Date(lastInboundAt).getTime() > CUSTOMER_WINDOW_MS) return 'WINDOW_CLOSED';

      const metaService = require('../meta/meta.service');
      let metaRes;
      if (ratingType === 'BUTTONS_3') {
        metaRes = await metaService.sendButtons(ticket.channel, thread.contactPhone, ratingText, [
          { id: `RATE_${ticket.id}_1`, text: '1 ⭐' },
          { id: `RATE_${ticket.id}_3`, text: '3 ⭐' },
          { id: `RATE_${ticket.id}_5`, text: '5 ⭐' }
        ]);
      } else if (ratingType === 'TEXT') {
        metaRes = await metaService.sendText(ticket.channel, thread.contactPhone, `${ratingText}\n\nللتقييم، يرجى الرد برقم من 1 إلى 5 (مثال: 5).`);
      } else {
        metaRes = await metaService.sendList(ticket.channel, thread.contactPhone, 'تقييم الخدمة', ratingText, 'تقييم الخدمة ⭐', [{
          title: 'اختر مستوى رضاك',
          rows: [
            { id: `RATE_${ticket.id}_5`, title: '⭐⭐⭐⭐⭐ ممتاز', description: 'خدمة ممتازة وسريعة' },
            { id: `RATE_${ticket.id}_4`, title: '⭐⭐⭐⭐ جيد جداً', description: 'خدمة جيدة جداً' },
            { id: `RATE_${ticket.id}_3`, title: '⭐⭐⭐ جيد', description: 'خدمة مقبولة' },
            { id: `RATE_${ticket.id}_2`, title: '⭐⭐ غير راضٍ', description: 'بحاجة لتحسين' },
            { id: `RATE_${ticket.id}_1`, title: '⭐ سيء جداً', description: 'تجربة غير مرضية' }
          ]
        }]);
      }

      const message = await ChatMessage.create({
        threadId: thread._id,
        direction: 'OUTBOUND',
        type: 'TEXT',
        content: `[تم إرسال رسالة التقييم للعميل]\n${ratingText}`,
        metaMessageId: metaRes?.messages?.[0]?.id || null,
        status: 'SENT',
        ticketId: ticket.id,
        isAutomated: true
      });
      const data = message.toObject();
      data.id = data._id.toString();
      emit(tenantId, 'new_chat_message', data);
      return 'SENT';
    } catch (err) {
      logger.error(`[TicketsService] Error sending rating message: ${err.message}`);
      return 'FAILED';
    }
  }

  /**
   * Closes tickets where the team answered last and the customer stayed silent for the tenant's
   * auto-close period (default 24h). Team notes do not count as an answer.
   */
  async autoCloseInactiveTickets() {
    try {
      const openTickets = await prisma.ticket.findMany({
        where: { status: { in: ACTIVE_STATUSES } },
        include: { tenant: { select: { id: true, customFeatures: true } } }
      });
      if (!openTickets.length) return { processed: 0, closed: 0 };

      logger.info(`[AutoClose] Checking ${openTickets.length} active tickets for inactivity...`);
      const { ChatMessage } = models();
      const mongoose = require('mongoose');
      let closedCount = 0;

      for (const ticket of openTickets) {
        try {
          const settings = ticketSettingsOf(ticket.tenant?.customFeatures);
          if (!settings.autoCloseEnabled) continue;
          const timeoutHours = settings.autoCloseHours;

          if (!mongoose.Types.ObjectId.isValid(ticket.threadId)) continue;
          const lastMsg = await ChatMessage.findOne({
            threadId: new mongoose.Types.ObjectId(ticket.threadId),
            isInternal: { $ne: true },
            content: { $not: RATING_TEXT }
          }).sort({ createdAt: -1 }).select('direction createdAt').lean();

          let reason = null;
          if (lastMsg) {
            // The customer wrote last → they are waiting for us, never close
            const hours = (Date.now() - new Date(lastMsg.createdAt).getTime()) / HOUR_MS;
            if (lastMsg.direction === 'OUTBOUND' && hours >= timeoutHours) {
              reason = `لم يرد العميل منذ ${Math.floor(hours)} ساعة`;
            }
          } else {
            const hours = (Date.now() - new Date(ticket.createdAt).getTime()) / HOUR_MS;
            if (hours >= timeoutHours) reason = `لا يوجد نشاط منذ ${Math.floor(hours)} ساعة`;
          }

          if (reason) {
            logger.info(`[AutoClose] Closing ticket ${ticket.ticketNumber} (${ticket.id}) of tenant ${ticket.tenantId}: ${reason}`);
            await this.closeTicket(ticket.tenantId, ticket.id, { description: reason, auto: true });
            closedCount++;
          }
        } catch (ticketErr) {
          if (ticketErr?.status !== 409) logger.error(`[AutoClose] Error evaluating ticket ${ticket.id}: ${ticketErr.message}`);
        }
      }

      logger.info(`[AutoClose] Check completed. Evaluated: ${openTickets.length}, Closed: ${closedCount}`);
      return { processed: openTickets.length, closed: closedCount };
    } catch (err) {
      logger.error(`[AutoClose] Error in autoCloseInactiveTickets: ${err.message}`);
      return { error: err.message };
    }
  }

  // ─── Settings ───────────────────────────────────────────────────────

  /** Ticket settings + the Meta numbers with their own "open tickets" switch */
  async getSettings(tenantId) {
    const [tenant, channels] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } }),
      prisma.whatsAppChannel.findMany({
        where: { tenantId, providerType: 'META_CLOUD' },
        select: { id: true, name: true, phoneNumber: true, displayPhoneNumber: true },
        orderBy: { createdAt: 'asc' }
      })
    ]);
    const { ticketlessChannelIds, ...settings } = ticketSettingsOf(tenant?.customFeatures);
    return {
      ...settings,
      channels: channels.map(c => ({ ...c, autoCreateTickets: !ticketlessChannelIds.includes(c.id) }))
    };
  }

  /** Saves the given fields only (other ticket settings and other customFeatures stay as they are) */
  async saveSettings(tenantId, body = {}) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } });
    if (!tenant) throw fail(404, 'Account not found');
    const features = tenant.customFeatures && typeof tenant.customFeatures === 'object' ? tenant.customFeatures : {};
    const next = { ...(features.ticketSettings || {}) };

    for (const key of ['autoCreateTickets', 'autoCloseEnabled', 'ratingEnabled']) {
      if (body[key] !== undefined) next[key] = !!body[key];
    }
    if (body.reopenHours !== undefined) {
      const hours = Number(body.reopenHours);
      if (!Number.isInteger(hours) || hours < 0 || hours > 720) throw fail(400, 'Reopen period must be between 0 and 720 hours');
      next.reopenHours = hours;
    }
    if (body.autoCloseHours !== undefined) {
      const hours = Number(body.autoCloseHours);
      if (!Number.isInteger(hours) || hours < 1 || hours > 720) throw fail(400, 'Auto-close period must be between 1 and 720 hours');
      next.autoCloseHours = hours;
    }
    if (body.ratingType !== undefined) {
      if (!RATING_TYPES.includes(body.ratingType)) throw fail(400, 'Unknown rating type');
      next.ratingType = body.ratingType;
    }
    if (body.claimOn !== undefined) {
      if (!CLAIM_MODES.includes(body.claimOn)) throw fail(400, 'Unknown way of taking tickets');
      next.claimOn = body.claimOn;
    }
    if (body.ratingMessageText !== undefined) {
      const text = String(body.ratingMessageText || '').trim();
      // WhatsApp list and button messages accept at most 1024 characters of body text
      if (text.length > 1000) throw fail(400, 'The rating message is too long (max 1000 characters)');
      next.ratingMessageText = text;
    }

    if (Array.isArray(body.channels)) {
      const own = new Set((await prisma.whatsAppChannel.findMany({ where: { tenantId }, select: { id: true } })).map(c => c.id));
      const off = new Set(Array.isArray(next.ticketlessChannelIds) ? next.ticketlessChannelIds.filter(id => own.has(id)) : []);
      for (const ch of body.channels) {
        if (!ch?.id || ch.autoCreateTickets === undefined || !own.has(String(ch.id))) continue;
        if (ch.autoCreateTickets) off.delete(String(ch.id));
        else off.add(String(ch.id));
      }
      next.ticketlessChannelIds = [...off];
    }

    await prisma.tenant.update({ where: { id: tenantId }, data: { customFeatures: { ...features, ticketSettings: next } } });
    return this.getSettings(tenantId);
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  async _memberName(tenantId, subUserId) {
    if (!subUserId) return null;
    const member = await prisma.subUser.findFirst({ where: { id: subUserId, tenantId }, select: { name: true } });
    return member?.name || null;
  }

  async _categoryName(tenantId, categoryId) {
    if (!categoryId) return 'عام';
    const category = await prisma.ticketCategory.findFirst({ where: { id: categoryId, tenantId }, select: { name: true } });
    return category?.name || 'عام';
  }

  /** Activity line in the conversation, for the team only (who opened, assigned, closed…) */
  async _note(tenantId, ticket, text) {
    try {
      const { ChatMessage } = models();
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(ticket.threadId)) return;
      const message = await ChatMessage.create({
        threadId: ticket.threadId,
        direction: 'OUTBOUND',
        type: 'INTERNAL_NOTE',
        content: text,
        status: 'READ',
        isInternal: true,
        isAutomated: true,
        ticketId: ticket.id
      });
      const data = message.toObject();
      data.id = data._id.toString();
      emit(tenantId, 'new_chat_message', data);
    } catch (err) {
      logger.warn(`[TicketsService] Could not add the ticket note: ${err.message}`);
    }
  }

  /** ticket.sync to the tenant's CRM webhook; never throws */
  async _crmSync(tenantId, ticket, { status, description, summary, rating, categoryId, thread } = {}) {
    try {
      const { ChatThread } = models();
      const conversation = thread !== undefined ? thread : await ChatThread.findById(ticket.threadId).catch(() => null);
      return await webhookService.syncCrmTicket(tenantId, {
        ticket_id: ticket.id,
        ticket_number: ticket.ticketNumber,
        thread_id: ticket.threadId,
        phone: conversation ? conversation.contactPhone : '',
        name: conversation ? conversation.contactName : '',
        category_name: await this._categoryName(tenantId, categoryId || ticket.categoryId),
        status,
        subject: ticket.subject || 'محادثة واتساب',
        ...(description !== undefined && { description }),
        ...(summary !== undefined && { summary }),
        ...(rating !== undefined && { rating })
      });
    } catch (err) {
      logger.error(`[TicketsService] CRM sync failed for ticket ${ticket.id}: ${err.message}`);
      return null;
    }
  }
}

module.exports = new TicketsService();
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.ticketSettingsOf = ticketSettingsOf;
