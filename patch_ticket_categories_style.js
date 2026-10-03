const fs = require('fs');
const path = 'dashboard/src/views/TicketCategories.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<style scoped>\n.rtl-mode {\n  direction: rtl;\n}\n.rtl-mode th {\n  text-align: right;\n}\n.rtl-mode .text-right {\n  text-align: left;\n}\n.btn {\n  @apply inline-flex items-center justify-center font-medium transition-all focus:outline-none;\n}\n.btn-primary {\n  @apply bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800;\n}\n</style>',
  '<style scoped>\n.rtl-mode {\n  direction: rtl;\n}\n.rtl-mode th {\n  text-align: right;\n}\n.rtl-mode .text-right {\n  text-align: left;\n}\n</style>'
);

fs.writeFileSync(path, content, 'utf8');
