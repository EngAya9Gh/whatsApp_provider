const ticketsService = require('./tickets.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');

class TicketsController {
  /**
   * Get all tickets for the tenant
   * Supports filtering by status, channelId, assignee, search, etc.
   */
  async getTickets(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      let { page = 1, limit = 50, status, channelId, assignedToId, search, threadId } = req.query;
      
      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;

      const where = { tenantId };

      if (status) where.status = status;
      if (channelId) where.channelId = channelId;
      if (assignedToId) where.assignedToId = assignedToId;
      if (threadId) where.threadId = threadId;
      
      if (search) {
        where.OR = [
          { ticketNumber: { contains: search } },
          { subject: { contains: search } }
        ];
      }

      // If user is a sub-user and not admin, we might want to restrict to their assigned tickets
      // But usually, agents can see all or just theirs depending on role.
      // For now, if role is Agent, maybe restrict to their channel or assignments.
      if (req.isSubUser && req.user && req.user.role === 'AGENT') {
        // Example: Only show tickets assigned to them or unassigned in their channel
        // where.assignedToId = req.subUserId; 
        // This is a business rule, we leave it open unless specified.
      }

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
          include: {
            channel: { select: { id: true, phoneNumber: true, name: true } },
            assignee: { select: { id: true, name: true, email: true } }
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.ticket.count({ where })
      ]);

      res.status(200).json({
        success: true,
        data: tickets,
        meta: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting tickets:', error);
      next(error);
    }
  }

  /**
   * Get a single ticket
   */
  async getTicket(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const ticketId = req.params.id;

      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, tenantId },
        include: {
          channel: { select: { id: true, phoneNumber: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close a ticket
   */

  async reopenTicket(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const ticketId = req.params.id;

      const updatedTicket = await ticketsService.reopenTicket(tenantId, ticketId);

      res.status(200).json({ success: true, data: updatedTicket });
    } catch (error) {
      logger.error('Error reopening ticket:', error);
      next(error);
    }
  }

  async closeTicket(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const ticketId = req.params.id;
      const description = req.body ? req.body.description : undefined;
      const categoryId = req.body ? req.body.categoryId : undefined;

      const updatedTicket = await ticketsService.closeTicket(tenantId, ticketId, description, categoryId);

      res.status(200).json({ success: true, data: updatedTicket });
    } catch (error) {
      logger.error('Error closing ticket:', error);
      next(error);
    }
  }

  /**
   * Manually open a ticket
   */
  async createTicket(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { channelId, threadId, crmClientId, subject, categoryId } = req.body;

      if (!channelId || !threadId) {
        return res.status(400).json({ error: 'channelId and threadId are required' });
      }

      const ticket = await ticketsService.createTicket(tenantId, channelId, threadId, crmClientId, subject, categoryId);

      res.status(201).json({ success: true, data: ticket });
    } catch (error) {
      logger.error('Error creating ticket:', error);
      next(error);
    }
  }

  /**
   * Assign ticket
   */
  async assignTicket(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const ticketId = req.params.id;
      const { assignedToId } = req.body;

      const ticket = await prisma.ticket.updateMany({
        where: { id: ticketId, tenantId },
        data: { assignedToId }
      });

      if (ticket.count === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.status(200).json({ success: true, message: 'Ticket assigned successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle autoCreateTickets for a channel
   */
  async toggleAutoCreate(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const channelId = req.params.channelId;
      const { autoCreateTickets } = req.body;

      const channel = await prisma.whatsAppChannel.updateMany({
        where: { id: channelId, tenantId },
        data: { autoCreateTickets }
      });

      if (channel.count === 0) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      res.status(200).json({ success: true, message: 'Channel updated successfully' });
    } catch (error) {
      logger.error('Error toggling autoCreateTickets:', error);
      next(error);
    }
  }

  // --- Categories ---

  async getCategories(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const categories = await prisma.ticketCategory.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const category = await prisma.ticketCategory.create({
        data: { tenantId, name, description }
      });
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const id = req.params.id;

      await prisma.ticketCategory.deleteMany({
        where: { id, tenantId }
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketsController();
