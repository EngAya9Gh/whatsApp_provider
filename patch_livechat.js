const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

// 1. Add activeTicket state
content = content.replace(
  'const showEmojiPicker = ref(false)',
  'const showEmojiPicker = ref(false)\nconst activeTicket = ref(null)'
);

// 2. Add fetchActiveTicket function and call it in selectThread
content = content.replace(
  'const selectThread = async (thread) => {\n  selectedThread.value = thread\n  thread.unreadCount = 0 // Optimistic update\n  await fetchMessages(thread.id)\n}',
  `const fetchActiveTicket = async (threadId) => {
  try {
    // Search tickets by threadId string (using our existing getTickets endpoint with search or fetch by ID if we had an endpoint)
    // Actually we can just do a GET /api/v1/tickets and search in the UI, or we need a new endpoint.
    // Wait, let's just make a new endpoint to get active ticket by threadId
    const res = await axios.get('/api/v1/tickets?status=OPEN');
    activeTicket.value = res.data.data.find(t => t.threadId === threadId) || null;
  } catch(e) {
    console.error(e);
  }
}

const selectThread = async (thread) => {
  selectedThread.value = thread
  thread.unreadCount = 0 // Optimistic update
  await fetchMessages(thread.id)
  await fetchActiveTicket(thread.id)
}`
);

// 3. Add Close Ticket button and logic
content = content.replace(
  '<div class="chat-header-actions">\n            <button @click="createManualTicket" class="btn btn-outline-primary btn-sm" :disabled="creatingTicket">\n              <i class="fas fa-ticket-alt mr-2"></i> {{ creatingTicket ? \'جاري الفتح...\' : \'فتح تذكرة\' }}\n            </button>\n          </div>',
  `<div class="chat-header-actions flex gap-2">
            <button v-if="activeTicket" @click="closeActiveTicket" class="btn btn-outline-danger btn-sm" :disabled="creatingTicket">
              <i class="fas fa-times-circle mr-2"></i> إغلاق التذكرة
            </button>
            <button v-else @click="createManualTicket" class="btn btn-outline-primary btn-sm" :disabled="creatingTicket">
              <i class="fas fa-ticket-alt mr-2"></i> {{ creatingTicket ? 'جاري الفتح...' : 'فتح تذكرة' }}
            </button>
          </div>`
);

content = content.replace(
  'const createManualTicket = async () => {',
  `const closeActiveTicket = async () => {
  if (!activeTicket.value) return;
  if (!confirm('هل أنت متأكد من إغلاق التذكرة؟')) return;
  try {
    creatingTicket.value = true;
    await axios.post('/api/v1/tickets/' + activeTicket.value.id + '/close');
    activeTicket.value = null;
    alert('تم إغلاق التذكرة بنجاح!');
  } catch (err) {
    alert('حدث خطأ أثناء إغلاق التذكرة');
  } finally {
    creatingTicket.value = false;
  }
}

const createManualTicket = async () => {`
);

// 4. Update createManualTicket to refresh activeTicket
content = content.replace(
  "alert('تم فتح التذكرة بنجاح!');",
  "alert('تم فتح التذكرة بنجاح!');\n    await fetchActiveTicket(selectedThread.value.id);"
);

fs.writeFileSync(path, content, 'utf8');
