const ticketsService = require('./tickets.service');
const accessService = require('../workforce/access.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');

const STATUSES = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];

/** Who is acting: a team member, or the account owner */
const actorOf = (req) => (req.isSubUser
  ? { key: req.subUser.id, name: req.subUser.name || 'موظف' }
  : { key: 'owner', name: 'مدير الحساب' });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class TicketsController {
  /**
   * Tickets of the tenant, newest activity first.
   * Filters: status (one, a comma list, or ACTIVE = open + pending), channelId, assignedToId
   * (or "none"), categoryId, threadId, search (ticket number, subject, customer name or phone).
   */
  async getTickets(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { status, channelId, assignedToId, categoryId, search, threadId } = req.query;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

      const where = { tenantId };
      if (status) {
        const list = status === 'ACTIVE' ? ['OPEN', 'PENDING'] : String(status).split(',').filter(s => STATUSES.includes(s));
        if (list.length) where.status = { in: list };
      }
      if (channelId) where.channelId = channelId;
      if (assignedToId) where.assignedToId = assignedToId === 'none' ? null : assignedToId;
      if (categoryId) where.categoryId = categoryId === 'none' ? null : categoryId;
      if (threadId) where.threadId = threadId;

      const ChatThread = require('../../models/mongo/ChatThread');
      if (search && String(search).trim()) {
        const term = String(search).trim().slice(0, 60);
        const pattern = new RegExp(escapeRegex(term), 'i');
        const threads = await ChatThread.find({ tenantId, $or: [{ contactPhone: pattern }, { contactName: pattern }] })
          .select('_id').limit(200).lean();
        where.OR = [
          { ticketNumber: { contains: term } },
          { subject: { contains: term } },
          ...(threads.length ? [{ threadId: { in: threads.map(t => t._id.toString()) } }] : [])
        ];
      }

      // Team members only see tickets inside their visibility scope (chat_scope)
      const scopeWhere = await accessService.getTicketWhere(req);
      if (scopeWhere) where.AND = [scopeWhere];

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
          include: {
            channel: { select: { id: true, phoneNumber: true, displayPhoneNumber: true, name: true } },
            assignee: { select: { id: true, name: true, email: true } },
            category: { select: { id: true, name: true } }
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.ticket.count({ where })
      ]);

      // Customer name and phone live with the conversation (MongoDB)
      const mongoose = require('mongoose');
      const threadIds = [...new Set(tickets.map(t => t.threadId).filter(id => mongoose.Types.ObjectId.isValid(id)))];
      const threads = threadIds.length
        ? await ChatThread.find({ _id: { $in: threadIds } }).select('contactName contactPhone').lean()
        : [];
      const contactOf = Object.fromEntries(threads.map(t => [t._id.toString(), { name: t.contactName || null, phone: t.contactPhone }]));

      res.status(200).json({
        success: true,
        data: tickets.map(t => ({ ...t, contact: contactOf[t.threadId] || null })),
        meta: { total, page, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      logger.error('Error getting tickets:', error);
      next(error);
    }
  }

  async getTicket(req, res, next) {
    try {
      const ticket = await prisma.ticket.findFirst({
        where: { id: req.params.id, tenantId: req.tenant.id },
        include: {
          channel: { select: { id: true, phoneNumber: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } }
        }
      });
      if (!ticket) return res.status(404).json({ error: { message: 'Ticket not found' } });
      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Opens a ticket by hand. It goes to the person who opened it, unless the body names someone else
   * (assignedToId) or nobody (null). The account owner is not a team member, so their tickets follow
   * the team's routing. 409 when the conversation already has an active ticket.
   */
  async createTicket(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { channelId, threadId, crmClientId, subject, categoryId } = req.body;
      if (!channelId || !threadId) return res.status(400).json({ error: { message: 'channelId and threadId are required' } });

      const channel = await prisma.whatsAppChannel.findFirst({ where: { id: channelId, tenantId }, select: { id: true } });
      if (!channel) return res.status(404).json({ error: { message: 'Channel not found' } });

      let assignedToId = req.body.assignedToId;
      if (assignedToId === undefined && req.isSubUser) assignedToId = req.subUser.id;
      if (assignedToId) {
        const member = await prisma.subUser.findFirst({ where: { id: assignedToId, tenantId }, select: { isActive: true } });
        if (!member) return res.status(400).json({ error: { message: 'Team member not found' } });
        if (!member.isActive) return res.status(400).json({ error: { message: 'This team member is deactivated' } });
      }
      if (categoryId && !(await prisma.ticketCategory.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } }))) {
        return res.status(400).json({ error: { message: 'Category not found' } });
      }

      const ticket = await ticketsService.createTicket(
        tenantId, channelId, threadId, crmClientId || null,
        String(subject || '').trim().slice(0, 200) || 'محادثة واتساب',
        categoryId || null,
        { assignedToId, actor: actorOf(req), manual: true }
      );
      if (ticket.alreadyOpen) {
        const { alreadyOpen, ...existing } = ticket;
        return res.status(409).json({ error: { message: `Ticket ${existing.ticketNumber} is already open for this conversation` }, data: existing });
      }
      res.status(201).json({ success: true, data: ticket });
    } catch (error) {
      logger.error('Error creating ticket:', error);
      next(error);
    }
  }

  async assignTicket(req, res, next) {
    try {
      const ticket = await ticketsService.assignTicket(req.tenant.id, req.params.id, req.body?.assignedToId || null, { actor: actorOf(req) });
      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  /** Category, priority or subject */
  async updateTicket(req, res, next) {
    try {
      const { categoryId, priority, subject } = req.body || {};
      const ticket = await ticketsService.updateTicket(req.tenant.id, req.params.id, { categoryId, priority, subject });
      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async closeTicket(req, res, next) {
    try {
      const body = req.body || {};
      const ticket = await ticketsService.closeTicket(req.tenant.id, req.params.id, {
        description: String(body.description || '').slice(0, 2000),
        categoryId: body.categoryId || null,
        sendRating: body.sendRating !== false,
        actor: actorOf(req)
      });
      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  async reopenTicket(req, res, next) {
    try {
      const ticket = await ticketsService.reopenTicket(req.tenant.id, req.params.id, { actor: actorOf(req) });
      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Team members who can take tickets, for the assign picker: on shift or not, and how many
   * active tickets each one has right now.
   */
  async getAssignees(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const shiftService = require('../workforce/shift.service');
      const [members, load, onShift] = await Promise.all([
        prisma.subUser.findMany({ where: { tenantId }, select: { id: true, name: true, email: true, role: true, isActive: true }, orderBy: { name: 'asc' } }),
        prisma.ticket.groupBy({ by: ['assignedToId'], where: { tenantId, status: { in: ['OPEN', 'PENDING'] }, assignedToId: { not: null } }, _count: { _all: true } }),
        shiftService.getOnShiftUserIds(tenantId).catch(() => [])
      ]);
      const loadOf = Object.fromEntries(load.map(l => [l.assignedToId, l._count._all]));
      const onShiftSet = new Set(onShift);
      res.json({
        success: true,
        data: {
          me: req.isSubUser ? req.subUser.id : null,
          members: members.map(m => ({ ...m, onShift: onShiftSet.has(m.id), activeTickets: loadOf[m.id] || 0 }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleAutoCreate(req, res, next) {
    try {
      const channel = await prisma.whatsAppChannel.updateMany({
        where: { id: req.params.channelId, tenantId: req.tenant.id },
        data: { autoCreateTickets: !!req.body.autoCreateTickets }
      });
      if (channel.count === 0) return res.status(404).json({ error: { message: 'Channel not found' } });
      res.status(200).json({ success: true, message: 'Channel updated successfully' });
    } catch (error) {
      logger.error('Error toggling autoCreateTickets:', error);
      next(error);
    }
  }

  // --- Categories ---

  async getCategories(req, res, next) {
    try {
      const categories = await prisma.ticketCategory.findMany({ where: { tenantId: req.tenant.id }, orderBy: { name: 'asc' } });
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const name = String(req.body?.name || '').trim().slice(0, 100);
      if (!name) return res.status(400).json({ error: { message: 'Name is required' } });
      const exists = await prisma.ticketCategory.findFirst({ where: { tenantId, name }, select: { id: true } });
      if (exists) return res.status(409).json({ error: { message: 'A category with this name already exists' } });

      const category = await prisma.ticketCategory.create({
        data: { tenantId, name, description: req.body?.description ? String(req.body.description).slice(0, 1000) : null }
      });
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      await prisma.ticketCategory.deleteMany({ where: { id: req.params.id, tenantId: req.tenant.id } });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async triggerAutoClose(req, res, next) {
    try {
      res.json({ success: true, data: await ticketsService.autoCloseInactiveTickets() });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketsController();
