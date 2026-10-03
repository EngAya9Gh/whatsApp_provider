const fs = require('fs');
const path = 'dashboard/src/views/TicketCategories.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import AppLoader from '../components/AppLoader.vue'\n\n// Since vue imports are global in this setup usually or from vue\nimport { ref as vueRef, onMounted as vueOnMounted } from 'vue'",
  "import { ref as vueRef, onMounted as vueOnMounted } from 'vue'"
);

fs.writeFileSync(path, content, 'utf8');
