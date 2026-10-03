const fs = require('fs');
const path = 'src/modules/tickets/tickets.service.js';
let content = fs.readFileSync(path, 'utf8');

const reopenMethod = `
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
      const { ChatThread } = require('../../models/mongo/ChatThread');
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
`;

content = content.replace(
  '  /**\n   * Close a ticket\n   */',
  reopenMethod + '\n  /**\n   * Close a ticket\n   */'
);

fs.writeFileSync(path, content, 'utf8');
