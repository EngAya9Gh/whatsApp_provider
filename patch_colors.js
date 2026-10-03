const fs = require('fs');
let path = 'dashboard/src/views/TicketCategories.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/indigo/g, 'brand-primary');
content = content.replace(/shadow-brand-primary-500\/30/g, 'shadow-brand-primary/30');

fs.writeFileSync(path, content, 'utf8');

// Also fix sweetalert button color in LiveChat.vue to use brand primary
path = 'dashboard/src/views/LiveChat.vue';
content = fs.readFileSync(path, 'utf8');
content = content.replace("confirmButtonColor: '#e3342f'", "confirmButtonColor: '#FF6600'");
fs.writeFileSync(path, content, 'utf8');
