const fs = require('fs');
let path = 'src/modules/chat/chat.controller.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '        req.params.threadId,\n        req.body',
  '        req.params.threadId,\n        { ...req.body, senderId: req.subUser ? req.subUser.id : null }'
);
fs.writeFileSync(path, content, 'utf8');

path = 'src/modules/chat/chat.service.js';
content = fs.readFileSync(path, 'utf8');

// Inside sendMessage
const assignLogic = `
    const ticketsService = require('../tickets/tickets.service');
    
    // Auto-assign ticket if unassigned and sender is a sub-user
    if (payload.senderId) {
      try {
        const activeTicket = await ticketsService.getActiveTicket(tenantId, threadId);
        if (activeTicket && !activeTicket.assignedToId) {
          const prisma = require('../../config/prisma');
          await prisma.ticket.update({
            where: { id: activeTicket.id },
            data: { assignedToId: payload.senderId }
          });
          logger.info(\`[ChatService] Auto-assigned ticket \${activeTicket.id} to user \${payload.senderId}\`);
        }
      } catch(err) {
        logger.error('[ChatService] Error auto-assigning ticket: ' + err.message);
      }
    }
`;

content = content.replace(
  "    const ticketsService = require('../tickets/tickets.service');",
  assignLogic
);
fs.writeFileSync(path, content, 'utf8');
