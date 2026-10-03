const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

const newButtons = `
            <button v-if="activeTicket && activeTicket.status === 'OPEN'" @click="closeActiveTicket" class="btn btn-outline-danger btn-sm" :disabled="creatingTicket">
              <i class="fas fa-times-circle mr-2"></i> إغلاق التذكرة
            </button>
            <template v-else>
              <button v-if="isTicketRecentlyClosed" @click="reopenActiveTicket" class="btn btn-outline-success btn-sm me-2" :disabled="creatingTicket">
                <i class="fas fa-redo mr-2"></i> إعادة الفتح
              </button>
              <button @click="createManualTicket" class="btn btn-outline-primary btn-sm" :disabled="creatingTicket">
                <i class="fas fa-ticket-alt mr-2"></i> {{ creatingTicket ? 'جاري الفتح...' : 'فتح تذكرة' + (isTicketRecentlyClosed ? ' جديدة' : '') }}
              </button>
            </template>
`;

content = content.replace(
  /<button v-if="activeTicket && activeTicket\.status === 'OPEN'"[\s\S]*?<\/button>/,
  newButtons.trim()
);

fs.writeFileSync(path, content, 'utf8');
