const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

// 1. Update fetchActiveTicket
content = content.replace(
  "const res = await axios.get('/api/v1/tickets?status=OPEN');\n    activeTicket.value = res.data.data.find(t => t.threadId === threadId) || null;",
  `const res = await axios.get('/api/v1/tickets?threadId=' + threadId + '&limit=1');
    activeTicket.value = res.data.data[0] || null;`
);

// 2. Update UI for Reopen
content = content.replace(
  `<button v-if="activeTicket" @click="closeActiveTicket" class="btn btn-outline-danger btn-sm" :disabled="creatingTicket">
              <i class="fas fa-times-circle mr-2"></i> إغلاق التذكرة
            </button>
            <button v-else @click="createManualTicket" class="btn btn-outline-primary btn-sm" :disabled="creatingTicket">
              <i class="fas fa-ticket-alt mr-2"></i> {{ creatingTicket ? 'جاري الفتح...' : 'فتح تذكرة' }}
            </button>`,
  `<button v-if="activeTicket && activeTicket.status === 'OPEN'" @click="closeActiveTicket" class="btn btn-outline-danger btn-sm" :disabled="creatingTicket">
              <i class="fas fa-times-circle mr-2"></i> إغلاق التذكرة
            </button>
            <button v-else-if="activeTicket && activeTicket.status === 'CLOSED'" @click="reopenActiveTicket" class="btn btn-outline-success btn-sm" :disabled="creatingTicket">
              <i class="fas fa-redo mr-2"></i> إعادة الفتح
            </button>
            <button v-else @click="createManualTicket" class="btn btn-outline-primary btn-sm" :disabled="creatingTicket">
              <i class="fas fa-ticket-alt mr-2"></i> {{ creatingTicket ? 'جاري الفتح...' : 'فتح تذكرة' }}
            </button>`
);

// 3. Add reopenActiveTicket method
const reopenMethod = `
const reopenActiveTicket = async () => {
  if (!activeTicket.value) return;
  try {
    creatingTicket.value = true;
    await axios.post('/api/v1/tickets/' + activeTicket.value.id + '/reopen');
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم إعادة فتح التذكرة!' : 'Ticket Reopened!', timer: 1500, showConfirmButton: false });
    await fetchActiveTicket(selectedThread.value.id);
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: err.response?.data?.error || err.message });
  } finally {
    creatingTicket.value = false;
  }
}
`;

content = content.replace(
  'const createManualTicket = async () => {',
  reopenMethod + '\nconst createManualTicket = async () => {'
);

fs.writeFileSync(path, content, 'utf8');
