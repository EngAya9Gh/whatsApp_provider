const fs = require('fs');
const path = 'dashboard/src/views/Settings.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '    ticketSettings: { ratingMessageText: \'\' }',
  '    ticketSettings: { ratingMessageText: \'\' },\n    aiSettings: { geminiKey: \'\' }'
);

fs.writeFileSync(path, content, 'utf8');
