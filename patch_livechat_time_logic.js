const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

const isRecentClosedMethod = `
const isTicketRecentlyClosed = computed(() => {
  if (!activeTicket.value || activeTicket.value.status !== 'CLOSED') return false;
  if (!activeTicket.value.resolvedAt) return true; // Fallback
  const resolvedTime = new Date(activeTicket.value.resolvedAt).getTime();
  const now = new Date().getTime();
  const diffHours = (now - resolvedTime) / (1000 * 60 * 60);
  return diffHours < 24; // Less than 24 hours
});
`;

content = content.replace(
  'const ticketCategories = ref([])',
  isRecentClosedMethod + '\nconst ticketCategories = ref([])'
);

content = content.replace(
  '<button v-else-if="activeTicket && activeTicket.status === \'CLOSED\'" @click="reopenActiveTicket"',
  '<button v-else-if="isTicketRecentlyClosed" @click="reopenActiveTicket"'
);

fs.writeFileSync(path, content, 'utf8');
