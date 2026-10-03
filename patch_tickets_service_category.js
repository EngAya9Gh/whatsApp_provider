const fs = require('fs');
const path = 'src/modules/tickets/tickets.service.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'async createTicket(tenantId, channelId, threadId, crmClientId, subject = \'محادثة واتساب\') {',
  'async createTicket(tenantId, channelId, threadId, crmClientId, subject = \'محادثة واتساب\', categoryId = null) {'
);

content = content.replace(
  'const crmResponse = await webhookService.syncCrmTicket(tenantId, {\n        phone: thread ? thread.contactPhone : \'\',\n        name: thread ? thread.contactName : \'\',\n        thread_id: threadId,\n        category_name: "عام",\n        status: \'open\'\n      });',
  `let categoryName = "عام";
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
      });`
);

content = content.replace(
  '        crmContactId: null\n      }',
  '        crmContactId: null,\n        categoryId: categoryId\n      }'
);

fs.writeFileSync(path, content, 'utf8');
