const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

// Add subUsers ref and fetch
content = content.replace(
  'const ticketCategories = ref([])',
  'const ticketCategories = ref([])\nconst teamMembers = ref([])'
);

content = content.replace(
  "const res = await axios.get('/api/v1/tickets/categories');\n    ticketCategories.value = res.data.data;\n  } catch(e) {}",
  `const res = await axios.get('/api/v1/tickets/categories');
    ticketCategories.value = res.data.data;
    const teamRes = await axios.get('/api/auth/sub-users');
    teamMembers.value = teamRes.data.data || [];
  } catch(e) {}`
);

// Add assign method
const assignMethod = `
const assignTicket = async (userId) => {
  if (!activeTicket.value) return;
  try {
    await axios.post('/api/v1/tickets/' + activeTicket.value.id + '/assign', { assignedToId: userId });
    activeTicket.value.assignedToId = userId;
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم إسناد التذكرة' : 'Ticket Assigned', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
  } catch(e) {
    console.error(e);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
  }
}
`;

content = content.replace(
  'const reopenActiveTicket = async () => {',
  assignMethod + '\nconst reopenActiveTicket = async () => {'
);

// Add dropdown to Header UI
content = content.replace(
  '<div class="chat-header-actions flex gap-2">',
  `<div class="chat-header-actions flex gap-2 items-center">
            <select v-if="activeTicket && activeTicket.status === 'OPEN'" v-model="activeTicket.assignedToId" @change="assignTicket(activeTicket.assignedToId)" class="form-control form-control-sm text-sm py-1 px-2 h-8 w-32 border-slate-300 rounded-lg">
              <option :value="null">{{ isAr ? 'غير مسندة' : 'Unassigned' }}</option>
              <option v-for="user in teamMembers" :key="user.id" :value="user.id">{{ user.name }}</option>
            </select>`
);

fs.writeFileSync(path, content, 'utf8');
