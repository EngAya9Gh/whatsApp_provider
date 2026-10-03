const fs = require('fs');
const path = 'dashboard/src/router/index.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "{ path: '/tickets', component: Tickets, meta: { requiresAuth: true } },",
  "{ path: '/tickets', component: Tickets, meta: { requiresAuth: true } },\n  { path: '/ticket-categories', component: () => import('../views/TicketCategories.vue'), meta: { requiresAuth: true } },"
);

fs.writeFileSync(path, content, 'utf8');
