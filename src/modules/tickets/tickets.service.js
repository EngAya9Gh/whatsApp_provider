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

      // 1. Send dedicated ticket.rated event
      await webhookService.sendTicketRated(tenantId, {
        ticket_id: updated.id,
        thread_id: updated.threadId,
        rating: ratingValue
      });

      // 2. Also sync ticket.sync for backward compatibility
      const ChatThread = require('../../models/mongo/ChatThread');
      const thread = await ChatThread.findById(updated.threadId);
      await webhookService.syncCrmTicket(tenantId, {
        ticket_id: updated.id,
        ticket_number: updated.ticketNumber,
        thread_id: updated.threadId,
        phone: thread ? thread.contactPhone : '',
        name: thread ? thread.contactName : '',
        status: 'closed',
        rating: ratingValue
      });
      logger.info(`[TicketsService] Sent rating ${ratingValue} to CRM for ticket ${updated.id}`);
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

      const tenantData = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } });
      const customFeatures = typeof tenantData?.customFeatures === 'object' ? tenantData.customFeatures : {};
      const tenantAutoCreate = customFeatures?.ticketSettings?.autoCreateTickets !== false;

      const isEnabled = channel?.autoCreateTickets || tenantAutoCreate;
      if (!isEnabled) {
        return null; // Not enabled
      }


      // Check if there is already an active ticket
      const activeTicket = await this.getActiveTicket(tenantId, threadId);
      if (activeTicket) {
        return activeTicket;
      }

      // Check if there is a recently closed ticket (less than 24h)
      // Note: If the closed ticket is already rated, do NOT reopen it! It was completed and rated.
      const lastClosedTicket = await prisma.ticket.findFirst({
        where: { tenantId, threadId, status: 'CLOSED' },
        orderBy: { resolvedAt: 'desc' }
      });

      if (lastClosedTicket && lastClosedTicket.resolvedAt && !lastClosedTicket.rating) {
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

      // 2. Fetch thread and category
      const ChatThread = require('../../models/mongo/ChatThread');
      const thread = await ChatThread.findById(threadId);
      
      let categoryName = "عام";
      if (categoryId) {
        const cat = await prisma.ticketCategory.findUnique({ where: { id: categoryId } });
        if (cat) categoryName = cat.name;
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
          categoryId: categoryId || undefined
        }
      });

      // 3.0 Route to an agent of the team that owns this channel (on shift, by the team's rule)
      const routingService = require('../workforce/routing.service');
      const assignedToId = await routingService.autoAssignTicket(tenantId, ticket);
      if (assignedToId) ticket.assignedToId = assignedToId;

      // 3.1 Backfill ticketId on messages that belong to this new ticket
      if (thread) {
        const ChatMessage = require('../../models/mongo/ChatMessage');
        
        // Find previous closed ticket for this thread
        const lastClosedTicket = await prisma.ticket.findFirst({
          where: { tenantId, threadId, status: 'CLOSED' },
          orderBy: { resolvedAt: 'desc' }
        });

        const query = {
          threadId: thread._id,
          content: { $not: /تقييم|شكراً لتقييمك/ }
        };

        if (lastClosedTicket && lastClosedTicket.resolvedAt) {
          // Assign all messages sent after the previous ticket resolved
          query.createdAt = { $gt: lastClosedTicket.resolvedAt };
        } else {
          query.$or = [{ ticketId: null }, { ticketId: { $exists: false } }];
        }

        await ChatMessage.updateMany(query, { $set: { ticketId: ticket.id } });
      }

      // 4. Sync ticket to CRM
      const crmResponse = await webhookService.syncCrmTicket(tenantId, {
        ticket_id: ticket.id,
        ticket_number: ticketNumber,
        phone: thread ? thread.contactPhone : '',
        name: thread ? thread.contactName : '',
        thread_id: threadId,
        category_name: categoryName,
        status: 'open',
        subject: subject || 'محادثة واتساب',
        description: subject || 'محادثة دعم فني جديدة'
      });

      if (crmResponse && crmResponse.ticket_id) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { crmTicketId: String(crmResponse.ticket_id) }
        });
        ticket.crmTicketId = String(crmResponse.ticket_id);
      }

      // Real-time broadcast
      try {
        const socketService = require('../../services/socket.service');
        socketService.emitToTenant(tenantId, 'ticket_updated', {
          ticketId: ticket.id,
          threadId: threadId,
          status: 'OPEN'
        });
      } catch (sockErr) {}

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

      const previousResolvedAt = ticket.resolvedAt;

      // Update in local DB
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'OPEN',
          resolvedAt: null
        }
      });

      // Fetch thread
      const ChatThread = require('../../models/mongo/ChatThread');
      const ChatMessage = require('../../models/mongo/ChatMessage');
      const mongoose = require('mongoose');
      const thread = await ChatThread.findById(ticket.threadId);
      const threadObjId = thread ? thread._id : (mongoose.Types.ObjectId.isValid(ticket.threadId) ? new mongoose.Types.ObjectId(ticket.threadId) : ticket.threadId);

      // Backfill any unassigned or follow-up messages in this thread on ticket reopen
      const updateQuery = {
        threadId: threadObjId,
        content: { $not: /تقييم|شكراً لتقييمك/ }
      };

      if (previousResolvedAt) {
        updateQuery.$or = [
          { createdAt: { $gte: previousResolvedAt } },
          { ticketId: null },
          { ticketId: { $exists: false } },
          { ticketId: "" }
        ];
      } else {
        updateQuery.$or = [
          { ticketId: null },
          { ticketId: { $exists: false } },
          { ticketId: "" }
        ];
      }

      await ChatMessage.updateMany(updateQuery, { $set: { ticketId: ticket.id } });

      // Sync to CRM
      let categoryName = "عام";
      if (ticket.categoryId) {
        const cat = await prisma.ticketCategory.findUnique({ where: { id: ticket.categoryId } });
        if (cat) categoryName = cat.name;
      }
      
      await webhookService.syncCrmTicket(tenantId, {
        ticket_id: ticket.id,
        ticket_number: ticket.ticketNumber,
        phone: thread ? thread.contactPhone : '',
        name: thread ? thread.contactName : '',
        thread_id: ticket.threadId,
        category_name: categoryName,
        status: 'open',
        subject: ticket.subject || 'إعادة فتح تذكرة',
        description: 'تمت إعادة فتح التذكرة'
      });

      // Real-time broadcast
      try {
        const socketService = require('../../services/socket.service');
        socketService.emitToTenant(tenantId, 'ticket_updated', {
          ticketId: ticket.id,
          threadId: ticket.threadId,
          status: 'OPEN'
        });
      } catch (sockErr) {}

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
        ticket_id: ticket.id,
        ticket_number: ticket.ticketNumber,
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
          const ratingType = customFeatures?.ticketSettings?.ratingType || 'LIST_5_STARS';
          
          if (ticket.channel.providerType === 'META_CLOUD') {
            const metaService = require('../meta/meta.service');
            let metaRes;

            if (ratingType === 'BUTTONS_3') {
              // 3 Quick-Reply Buttons (WhatsApp Meta limit: max 3 buttons)
              metaRes = await metaService.sendButtons(
                ticket.channel,
                thread.contactPhone,
                ratingText,
                [
                  { id: `RATE_${ticket.id}_1`, text: "1 ⭐" },
                  { id: `RATE_${ticket.id}_3`, text: "3 ⭐" },
                  { id: `RATE_${ticket.id}_5`, text: "5 ⭐" }
                ]
              );
            } else if (ratingType === 'TEXT') {
              // Text message
              metaRes = await metaService.sendText(
                ticket.channel,
                thread.contactPhone,
                ratingText + "\n\nللتقييم، يرجى الرد برقم من 1 إلى 5 (مثال: 5)."
              );
            } else {
              // Default: Interactive 5-Star List (allows all 5 stars 1 to 5!)
              metaRes = await metaService.sendList(
                ticket.channel,
                thread.contactPhone,
                "تقييم الخدمة",
                ratingText,
                "تقييم الخدمة ⭐",
                [
                  {
                    title: "اختر مستوى رضاك",
                    rows: [
                      { id: `RATE_${ticket.id}_5`, title: "⭐⭐⭐⭐⭐ ممتاز", description: "خدمة ممتازة وسريعة" },
                      { id: `RATE_${ticket.id}_4`, title: "⭐⭐⭐⭐ جيد جداً", description: "خدمة جيدة جداً" },
                      { id: `RATE_${ticket.id}_3`, title: "⭐⭐⭐ جيد", description: "خدمة مقبولة" },
                      { id: `RATE_${ticket.id}_2`, title: "⭐⭐ غير راضٍ", description: "بحاجة لتحسين" },
                      { id: `RATE_${ticket.id}_1`, title: "⭐ سيء جداً", description: "تجربة غير مرضية" }
                    ]
                  }
                ]
              );
            }
            // Save to DB so it shows in Dashboard
            const ChatMessage = require('../../models/mongo/ChatMessage');
            await ChatMessage.create({
              threadId: ticket.threadId,
              tenantId: tenantId,
              direction: 'OUTBOUND',
              type: 'text',
              content: '[تم إرسال رسالة التقييم للعميل]\n' + ratingText,
              messageId: metaRes?.messages?.[0]?.id || 'local_' + Date.now(),
              status: 'sent',
              createdAt: new Date()
            });
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

      // Real-time broadcast
      try {
        const socketService = require('../../services/socket.service');
        socketService.emitToTenant(tenantId, 'ticket_updated', {
          ticketId: ticket.id,
          threadId: ticket.threadId,
          status: 'CLOSED'
        });
      } catch (sockErr) {}

      return updated;
    } catch (error) {
      logger.error(`[TicketsService] Error closing ticket: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process and auto-close inactive tickets across all tenants
   */
  async autoCloseInactiveTickets() {
    try {
      const openTickets = await prisma.ticket.findMany({
        where: {
          status: { in: ['OPEN', 'PENDING'] }
        },
        include: {
          channel: true,
          tenant: {
            select: { id: true, customFeatures: true }
          }
        }
      });

      if (!openTickets.length) return { processed: 0, closed: 0 };

      logger.info(`[AutoClose] Checking ${openTickets.length} active tickets for inactivity...`);

      const ChatMessage = require('../../models/mongo/ChatMessage');
      const ChatThread = require('../../models/mongo/ChatThread');
      const mongoose = require('mongoose');

      let closedCount = 0;

      for (const ticket of openTickets) {
        try {
          const customFeatures = typeof ticket.tenant?.customFeatures === 'object' ? ticket.tenant.customFeatures : {};
          const ticketSettings = customFeatures?.ticketSettings || {};

          // Default: auto-close is enabled unless explicitly false
          const isEnabled = ticketSettings.autoCloseEnabled !== false;
          if (!isEnabled) continue;

          // Inactivity timeout in hours (default 24h)
          const timeoutHours = Number(ticketSettings.autoCloseHours) || 24;

          const thread = await ChatThread.findById(ticket.threadId).catch(() => null);
          const threadObjId = thread ? thread._id : (mongoose.Types.ObjectId.isValid(ticket.threadId) ? new mongoose.Types.ObjectId(ticket.threadId) : ticket.threadId);

          // Find the last non-evaluation message in this thread
          const lastMsg = await ChatMessage.findOne({
            threadId: threadObjId,
            content: { $not: /تقييم|شكراً لتقييمك/ }
          }).sort({ createdAt: -1 });

          let shouldClose = false;
          let reason = '';

          if (lastMsg) {
            // ONLY auto-close if the last message was OUTBOUND (sent by agent or system to client).
            // If the client spoke last (INBOUND), the client is waiting for support - DO NOT close!
            if (lastMsg.direction === 'OUTBOUND') {
              const diffHours = (Date.now() - new Date(lastMsg.createdAt).getTime()) / (1000 * 60 * 60);
              if (diffHours >= timeoutHours) {
                shouldClose = true;
                reason = `تم الإغلاق تلقائياً لعدم استجابة العميل بعد ${diffHours.toFixed(0)} ساعة`;
              }
            }
          } else {
            // If ticket has no messages at all, check ticket creation time
            const diffHours = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
            if (diffHours >= timeoutHours) {
              shouldClose = true;
              reason = `تم الإغلاق تلقائياً لعدم وجود نشاط بعد ${diffHours.toFixed(0)} ساعة`;
            }
          }

          if (shouldClose) {
            logger.info(`[AutoClose] Auto-closing ticket ${ticket.ticketNumber} (${ticket.id}) for tenant ${ticket.tenantId}. Reason: ${reason}`);
            await this.closeTicket(ticket.tenantId, ticket.id, reason);
            closedCount++;
          }
        } catch (ticketErr) {
          logger.error(`[AutoClose] Error evaluating ticket ${ticket.id}: ${ticketErr.message}`);
        }
      }

      logger.info(`[AutoClose] Check completed. Evaluated: ${openTickets.length}, Closed: ${closedCount}`);
      return { processed: openTickets.length, closed: closedCount };
    } catch (err) {
      logger.error(`[AutoClose] Error in autoCloseInactiveTickets: ${err.message}`);
      return { error: err.message };
    }
  }
}

module.exports = new TicketsService();
