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

  async getRecentClosedUnratedTicket(tenantId, threadId) {
    // A ticket closed within the last 24 hours that doesn't have a rating
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return prisma.ticket.findFirst({
      where: {
        tenantId,
        threadId,
        status: 'CLOSED',
        rating: null,
        resolvedAt: { gte: oneDayAgo }
      },
      orderBy: { resolvedAt: 'desc' }
    });
  }

  async saveTicketRating(tenantId, ticketId, ratingValue) {
    // Save to DB
    const updated = await prisma.ticket.update({
      where: { id: ticketId, tenantId },
      data: { rating: ratingValue }
    });

    // Notify CRM
    try {
      const webhookService = require('../webhook/webhook.service');
      // If we have a generic webhook for rating or update CRM ticket
      if (updated.crmTicketId) {
        // Send a custom payload or use a new method in webhookService
        logger.info(`[TicketsService] Sending rating ${ratingValue} to CRM for ticket ${updated.crmTicketId}`);
      }
    } catch (err) {
      logger.error(`[TicketsService] Failed to sync rating to CRM: ${err.message}`);
    }
    return updated;
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

      // Check if there is a recently closed ticket (less than 24h)
      const lastClosedTicket = await prisma.ticket.findFirst({
        where: { tenantId, threadId, status: 'CLOSED' },
        orderBy: { resolvedAt: 'desc' }
      });

      if (lastClosedTicket && lastClosedTicket.resolvedAt) {
        const diffHours = (new Date() - new Date(lastClosedTicket.resolvedAt)) / (1000 * 60 * 60);
        if (diffHours < 24) {
          logger.info(`[TicketsService] Auto-reopening ticket ${lastClosedTicket.id} for thread ${threadId}`);
          return this.reopenTicket(tenantId, lastClosedTicket.id);
        }
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
  async createTicket(tenantId, channelId, threadId, crmClientId, subject = 'محادثة واتساب', categoryId = null) {
    try {
      // 1. Generate local ticket number
      const count = await prisma.ticket.count({ where: { tenantId } });
      const ticketNumber = `#TK-${String(count + 1).padStart(4, '0')}`;

      // 2. Sync ticket to CRM
      let crmTicketId = null;
      const ChatThread = require('../../models/mongo/ChatThread');
      const thread = await ChatThread.findById(threadId);
      
      let categoryName = "عام";
      if (categoryId) {
        const cat = await prisma.ticketCategory.findUnique({ where: { id: categoryId } });
        if (cat) categoryName = cat.name;
      }
      
      const crmResponse = await webhookService.syncCrmTicket(tenantId, {
        phone: thread ? thread.contactPhone : '',
        name: thread ? thread.contactName : '',
        thread_id: threadId,
        category_name: categoryName,
        status: 'open'
      });

      if (crmResponse && crmResponse.ticket_id) {
        crmTicketId = String(crmResponse.ticket_id);
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
   * Reopen a ticket
   */
  async reopenTicket(tenantId, ticketId) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId, tenantId },
        include: { channel: true }
      });

      if (!ticket) throw new Error('Ticket not found');
      if (ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
        throw new Error('Only closed tickets can be reopened');
      }

      // Update in local DB
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'OPEN',
          resolvedAt: null
        }
      });

      // Sync to CRM
      const ChatThread = require('../../models/mongo/ChatThread');
      const thread = await ChatThread.findById(ticket.threadId);
      
      let categoryName = "عام";
      if (ticket.categoryId) {
        const cat = await prisma.ticketCategory.findUnique({ where: { id: ticket.categoryId } });
        if (cat) categoryName = cat.name;
      }
      
      await webhookService.syncCrmTicket(tenantId, {
        phone: thread ? thread.contactPhone : '',
        name: thread ? thread.contactName : '',
        thread_id: ticket.threadId,
        category_name: categoryName,
        status: 'open'
      });

      return updated;
    } catch (error) {
      logger.error('Error in reopenTicket service:', error);
      throw error;
    }
  }

  /**
   * Close a ticket
   */
  async closeTicket(tenantId, ticketId, description = 'تم حل المشكلة', categoryId = null) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId, tenantId },
        include: { channel: true }
      });

      if (!ticket) throw new Error('Ticket not found');

      // Update in local DB
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'CLOSED',
          resolvedAt: new Date(),
          ...(categoryId ? { categoryId } : {})
        }
      });

      // Generate AI Summary
      const aiService = require('../ai/ai.service');
      const summaryText = await aiService.summarizeTicket(tenantId, ticket.threadId);
      if (summaryText) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { summary: summaryText }
        });
      }

      // Close in CRM
      const ChatThread = require('../../models/mongo/ChatThread');
      const thread = await ChatThread.findById(ticket.threadId);
      
      await webhookService.syncCrmTicket(tenantId, {
        phone: thread ? thread.contactPhone : '',
        name: thread ? thread.contactName : '',
        thread_id: ticket.threadId,
        category_name: categoryId ? (await prisma.ticketCategory.findUnique({ where: { id: categoryId } }))?.name || "عام" : "عام",
        status: 'closed',
        subject: ticket.subject || 'بدون عنوان',
        description: description,
        summary: summaryText || ticket.summary || ''
      });

      // Send Rating Message
      try {
        const ChatThread = require('../../models/mongo/ChatThread');
        const chatService = require('../chat/chat.service');
        const thread = await ChatThread.findById(ticket.threadId);
        
        if (thread && ticket.channel) {
          const tenantData = await prisma.tenant.findUnique({ where: { id: tenantId } });
          const customFeatures = typeof tenantData.customFeatures === 'object' ? tenantData.customFeatures : {};
          const ratingText = customFeatures?.ticketSettings?.ratingMessageText || "تم إغلاق التذكرة الخاصة بك. نأمل أن نكون قد وفقنا في خدمتك! يرجى تقييم الخدمة من 1 إلى 5 (حيث 5 هو الأفضل).";
          
          if (ticket.channel.providerType === 'META_CLOUD') {
            // Interactive message for Meta
            const metaService = require('../meta/meta.service');
            await metaService.sendButtons(
              ticket.channel,
              thread.contactPhone,
              ratingText,
              [
                { id: `RATE_${ticket.id}_1`, text: "1 ⭐" },
                { id: `RATE_${ticket.id}_3`, text: "3 ⭐" },
                { id: `RATE_${ticket.id}_5`, text: "5 ⭐" }
              ]
            );
          } else {
            // Text message for Baileys
            await chatService.sendMessage(tenantId, ticket.threadId, {
              content: ratingText + "\nللتقييم، أرسل رقم التقييم كرسالة (مثال: 5).",
              type: 'text'
            });
          }
        }
      } catch (err) {
        logger.error(`[TicketsService] Error sending rating message: ${err.message}`);
      }

      return updated;
    } catch (error) {
      logger.error(`[TicketsService] Error closing ticket: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new TicketsService();
