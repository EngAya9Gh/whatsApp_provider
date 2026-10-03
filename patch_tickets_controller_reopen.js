const fs = require('fs');
const path = 'src/modules/tickets/tickets.controller.js';
let content = fs.readFileSync(path, 'utf8');

const reopenMethod = `
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
`;

content = content.replace(
  '  async closeTicket(req, res, next) {',
  reopenMethod + '\n  async closeTicket(req, res, next) {'
);

fs.writeFileSync(path, content, 'utf8');
