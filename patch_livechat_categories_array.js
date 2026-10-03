const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'ticketCategories.value.map',
  '(ticketCategories.value || []).map'
);

fs.writeFileSync(path, content, 'utf8');
