const fs = require('fs');
const path = 'src/modules/tickets/tickets.service.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "      // Close in CRM\n      const { ChatThread } = require('../../models/mongo/ChatThread');\n      const thread = await ChatThread.findById(ticket.threadId);",
  `      // Generate AI Summary
      const aiService = require('../ai/ai.service');
      const summaryText = await aiService.summarizeTicket(tenantId, ticket.threadId);
      if (summaryText) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { summary: summaryText }
        });
      }

      // Close in CRM
      const { ChatThread } = require('../../models/mongo/ChatThread');
      const thread = await ChatThread.findById(ticket.threadId);`
);

content = content.replace(
  "summary: ticket.summary || ''",
  "summary: summaryText || ticket.summary || ''"
);

fs.writeFileSync(path, content, 'utf8');
