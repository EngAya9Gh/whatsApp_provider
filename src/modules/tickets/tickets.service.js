const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');
const webhookService = require('../webhook/webhook.service');

class TicketsService {
  /**
   * Find an active ticket for a thread
   */
  async getActiveTicket(tenantId, threadId) {
    return prisma.ticket.findFirst({
      where: {
        tenantId,
        threadId,
        status: { in: ['OPEN', 'PENDING'] }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Auto-create a ticket if channel settings allow it and no active ticket exists
   */
  async autoCreateTicketIfNeeded(tenantId, channelId, threadId, crmClientId, firstMessageText = '') {
    try {
      const channel = await prisma.whatsAppChannel.findUnique({
        where: { id: channelId },
        select: { autoCreateTickets: true }
      });

      if (!channel || !channel.autoCreateTickets) {
        return null; // Not enabled for this channel
      }

      // Check if there is already an active ticket
      const activeTicket = await this.getActiveTicket(tenantId, threadId);
      if (activeTicket) {
        return activeTicket;
      }

      logger.info(`[TicketsService] Auto-creating ticket for thread ${threadId} on channel ${channelId}`);
      
      const subject = firstMessageText ? firstMessageText.substring(0, 100) : 'محادثة دعم فني';
      return this.createTicket(tenantId, channelId, threadId, crmClientId, subject);

    } catch (error) {
      logger.error(`[TicketsService] Error auto-creating ticket: ${error.message}`);
      return null;
    }
  }

  /**
   * Create a new ticket (manually or automatically)
   */
  async createTicket(tenantId, channelId, threadId, crmClientId, subject = 'محادثة واتساب') {
    try {
      // 1. Generate local ticket number
      const count = await prisma.ticket.count({ where: { tenantId } });
      const ticketNumber = `#TK-${String(count + 1).padStart(4, '0')}`;

      // 2. Open ticket in CRM (if crmClientId exists)
      let crmTicketId = null;
      if (crmClientId) {
        const crmResponse = await webhookService.openCrmTicket(tenantId, crmClientId, 1, 'whatsapp', subject);
        if (crmResponse && crmResponse.ticket_id) {
          crmTicketId = String(crmResponse.ticket_id);
        }
      }

      // 3. Create ticket in Provider DB
      const ticket = await prisma.ticket.create({
        data: {
          tenantId,
          channelId,
          threadId,
          ticketNumber,
          status: 'OPEN',
          subject,
          crmClientId,
          crmTicketId
        }
      });

      return ticket;
    } catch (error) {
      logger.error(`[TicketsService] Error creating ticket: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close a ticket
   */
  async closeTicket(tenantId, ticketId, description = 'تم حل المشكلة') {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId, tenantId }
      });

      if (!ticket) throw new Error('Ticket not found');

      // Update in local DB
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'CLOSED',
          resolvedAt: new Date()
        }
      });

      // Close in CRM
      if (ticket.crmTicketId) {
        await webhookService.closeCrmTicket(tenantId, ticket.crmTicketId, description);
      }

      return updated;
    } catch (error) {
      logger.error(`[TicketsService] Error closing ticket: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new TicketsService();
