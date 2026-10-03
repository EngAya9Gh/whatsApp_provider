const fs = require('fs');
let path = 'src/modules/subuser/subuser.controller.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "// Add owner as a team member option too\n      team.push({ id: req.tenant.id, name: 'Owner (' + req.tenant.name + ')' });",
  "// Add owner as a team member option too\n      // REMOVED: Cannot assign to owner because assignedToId is a foreign key to SubUser."
);
fs.writeFileSync(path, content, 'utf8');
