const fs = require('fs');
let path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

// 1. Add fetchCategories
const fetchLogic = `
const fetchTicketCategories = async () => {
  try {
    const res = await axios.get('/api/v1/tickets/categories');
    ticketCategories.value = res.data.data || [];
  } catch(e) {
    console.error('Error fetching categories:', e);
  }
}
`;

content = content.replace(
  'const fetchTeamMembers = async () => {',
  fetchLogic + '\nconst fetchTeamMembers = async () => {'
);

// 2. Call fetchCategories on mounted
content = content.replace(
  '  fetchTeamMembers()',
  '  fetchTeamMembers()\n  fetchTicketCategories()'
);

// 3. Remove Categories from chat-header-actions
content = content.replace(
  /<select v-model="activeTicket.categoryId"[^>]*>[\s\S]*?<\/select>/,
  ''
); // just in case it's still somewhere in the header

// 4. Add the assignment icon to the sidebar thread item
// Let's find <span class="thread-phone">{{ thread.contactPhone }}</span>
// and replace it to include the assign button
const sidebarAssign = `
                <span class="thread-phone">{{ thread.contactPhone }}</span>
                <button v-if="teamMembers.length > 0" @click.stop="quickAssign(thread)" class="btn-icon small text-slate-400 hover:text-[#FF6600]" title="إسناد المحادثة" style="background:transparent; border:none; padding:2px;">
                  <i class="fas fa-user-plus"></i>
                </button>
`;
content = content.replace(
  /<span class="thread-phone">{{ thread\.contactPhone }}<\/span>/g,
  sidebarAssign.trim()
);

// 5. Add quickAssign method
const quickAssignMethod = `
const quickAssign = async (thread) => {
  try {
    // 1. Check if thread has an active ticket
    const res = await axios.get('/api/v1/tickets?threadId=' + thread.id + '&limit=1');
    const ticket = (res.data.data.tickets && res.data.data.tickets.length > 0) ? res.data.data.tickets[0] : null;
    
    if (!ticket || ticket.status !== 'OPEN') {
      const confirm = await Swal.fire({
        title: isAr.value ? 'فتح تذكرة؟' : 'Open Ticket?',
        text: isAr.value ? 'هذه المحادثة ليس لها تذكرة نشطة حالياً. هل تريد فتح تذكرة جديدة لإسنادها؟' : 'This thread has no active ticket. Do you want to open one to assign it?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#FF6600',
        confirmButtonText: isAr.value ? 'نعم، افتح تذكرة' : 'Yes, Open Ticket'
      });
      if (confirm.isConfirmed) {
        // Since we are not in the chat view necessarily, we call the API
        const createRes = await axios.post('/api/v1/tickets', {
          channelId: thread.channelId,
          threadId: thread.id,
          subject: 'تذكرة جديدة'
        });
        const newTicket = createRes.data.data;
        promptAssign(newTicket);
      }
      return;
    }
    
    promptAssign(ticket);
  } catch (err) {
    console.error(err);
  }
}

const promptAssign = async (ticket) => {
  const { value: selectedUserId } = await Swal.fire({
    title: isAr.value ? 'إسناد التذكرة' : 'Assign Ticket',
    html: '<select id="swal-assign" class="swal2-select" style="display:flex; width:100%;">' +
          '<option value="">' + (isAr.value ? 'غير مسندة' : 'Unassigned') + '</option>' +
          teamMembers.value.map(u => '<option value="' + u.id + '" ' + (ticket.assignedToId === u.id ? 'selected' : '') + '>' + u.name + '</option>').join('') +
          '</select>',
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonColor: '#FF6600',
    confirmButtonText: isAr.value ? 'إسناد' : 'Assign',
    preConfirm: () => document.getElementById('swal-assign').value
  });
  
  if (selectedUserId !== undefined) {
    try {
      await axios.put('/api/v1/tickets/' + ticket.id + '/assign', { assignedToId: selectedUserId || null });
      Swal.fire({ icon: 'success', title: isAr.value ? 'تم الإسناد!' : 'Assigned!', timer: 1500, showConfirmButton: false });
      if (activeTicket.value && activeTicket.value.id === ticket.id) {
        activeTicket.value.assignedToId = selectedUserId || null;
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    }
  }
}
`;

content = content.replace(
  'const closeActiveTicket = async () => {',
  quickAssignMethod + '\nconst closeActiveTicket = async () => {'
);

fs.writeFileSync(path, content, 'utf8');
