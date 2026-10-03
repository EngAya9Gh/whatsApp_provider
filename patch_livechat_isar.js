const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { io } from 'socket.io-client'",
  "import { io } from 'socket.io-client'\nimport { useI18n } from 'vue-i18n'"
);

content = content.replace(
  'const isInternal = ref(false)',
  `const isInternal = ref(false)
const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')`
);

fs.writeFileSync(path, content, 'utf8');
