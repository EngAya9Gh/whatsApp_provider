const fs = require('fs');
let path = 'src/modules/chat/chat.controller.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'senderId: req.subUser ? req.subUser.id : null',
  'senderId: req.subUser ? req.subUser.id : req.tenant.id'
);
fs.writeFileSync(path, content, 'utf8');
