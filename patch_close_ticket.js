const fs = require('fs');
const path = 'src/modules/tickets/tickets.service.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'async closeTicket(tenantId, ticketId, description = \'تم حل المشكلة\') {',
  'async closeTicket(tenantId, ticketId, description = \'تم حل المشكلة\', categoryId = null) {'
);

content = content.replace(
  '        data: {\n          status: \'CLOSED\',\n          resolvedAt: new Date()\n        }',
  `        data: {
          status: 'CLOSED',
          resolvedAt: new Date(),
          ...(categoryId ? { categoryId } : {})
        }`
);

content = content.replace(
  'category_name: "عام", // Need to get category dynamically later',
  `category_name: categoryId ? (await prisma.ticketCategory.findUnique({ where: { id: categoryId } }))?.name || "عام" : "عام",`
);

fs.writeFileSync(path, content, 'utf8');
