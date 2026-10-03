const fs = require('fs');
let path = 'src/modules/webhook/webhook.service.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'status: data.status // \'open\', \'resolved\', \'closed\'',
  'status: data.status, // \'open\', \'resolved\', \'closed\'\n          subject: data.subject,\n          description: data.description,\n          summary: data.summary'
);

fs.writeFileSync(path, content, 'utf8');
