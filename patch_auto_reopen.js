const fs = require('fs');
const path = 'src/modules/tickets/tickets.service.js';
let content = fs.readFileSync(path, 'utf8');

const reopenLogic = `
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
          logger.info(\`[TicketsService] Auto-reopening ticket \${lastClosedTicket.id} for thread \${threadId}\`);
          return this.reopenTicket(tenantId, lastClosedTicket.id);
        }
      }

      logger.info(\`[TicketsService] Auto-creating ticket for thread \${threadId} on channel \${channelId}\`);
`;

content = content.replace(
  /      \/\/ Check if there is already an active ticket[\s\S]*?logger\.info\(\`\[TicketsService\] Auto-creating ticket for thread \${threadId} on channel \${channelId}\`\);/,
  reopenLogic
);

fs.writeFileSync(path, content, 'utf8');
