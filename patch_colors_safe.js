const fs = require('fs');
let path = 'dashboard/src/views/TicketCategories.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/bg-brand-primary-600/g, 'bg-[#FF6600]');
content = content.replace(/hover:bg-brand-primary-700/g, 'hover:bg-[#E65C00]');
content = content.replace(/active:bg-brand-primary-800/g, 'active:bg-[#CC5200]');
content = content.replace(/focus:ring-brand-primary-500\/20/g, 'focus:ring-[#FF6600]/20');
content = content.replace(/focus:border-brand-primary-500/g, 'focus:border-[#FF6600]');
content = content.replace(/shadow-brand-primary-500\/30/g, 'shadow-[#FF6600]/30');

fs.writeFileSync(path, content, 'utf8');
