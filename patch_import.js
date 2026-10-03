const fs = require('fs');
const path = 'dashboard/src/views/TicketCategories.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { ref, onMounted } from 'import-meta-env'",
  ""
);

fs.writeFileSync(path, content, 'utf8');
