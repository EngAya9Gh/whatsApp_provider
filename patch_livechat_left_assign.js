const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

const buttonHtml = `
              <div class="text-xs text-slate-500 mt-1 d-flex justify-content-between align-items-center">
                <span>{{ thread.contactPhone }}</span>
                <button @click.stop="assignThreadTicket(thread)" class="btn btn-sm btn-light p-0 ms-2" title="إسناد التذكرة" style="width: 24px; height: 24px; border-radius: 50%;">
                  <i class="fas fa-user-plus text-muted" style="font-size: 10px;"></i>
                </button>
              </div>`;

content = content.replace(
  '<div class="text-xs text-slate-500 mt-1">{{ thread.contactPhone }}</div>',
  buttonHtml
);

const assignThreadMethod = `
const assignThreadTicket = async (thread) => {
  try {
    // Check if open ticket exists
    const res = await axios.get('/api/v1/tickets?threadId=' + thread.id + '&limit=1');
    let ticket = res.data.data[0];
    
    if (!ticket || ticket.status !== 'OPEN') {
      const confirm = await Swal.fire({
        title: isAr.value ? 'فتح تذكرة؟' : 'Open Ticket?',
        text: isAr.value ? 'لا توجد تذكرة مفتوحة لهذه المحادثة. هل تريد فتح تذكرة جديدة لإسنادها؟' : 'No open ticket for this chat. Create one to assign?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: isAr.value ? 'نعم، افتح تذكرة' : 'Yes, open ticket',
        cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
      });
      if (!confirm.isConfirmed) return;
      
      const createRes = await axios.post('/api/v1/tickets', {
        channelId: thread.channelId,
        threadId: thread.id,
        crmClientId: thread.crmClientId,
        subject: 'محادثة واتساب'
      });
      ticket = createRes.data.data;
      if (selectedThread.value && selectedThread.value.id === thread.id) {
        await fetchActiveTicket(thread.id);
      }
    }

    const { value: assignedToId } = await Swal.fire({
      title: isAr.value ? 'إسناد التذكرة' : 'Assign Ticket',
      html:
        '<select id="swal-assign" class="swal2-select" style="display: flex; width: 100%;">' +
        '<option value="">' + (isAr.value ? 'غير مسندة' : 'Unassigned') + '</option>' +
        teamMembers.value.map(u => '<option value="' + u.id + '" ' + (ticket.assignedToId === u.id ? 'selected' : '') + '>' + u.name + '</option>').join('') +
        '</select>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: isAr.value ? 'حفظ' : 'Save',
      cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel',
      preConfirm: () => document.getElementById('swal-assign').value
    });

    if (assignedToId === undefined) return; // cancelled
    
    const finalAssignId = assignedToId === '' ? null : assignedToId;
    await axios.post('/api/v1/tickets/' + ticket.id + '/assign', { assignedToId: finalAssignId });
    
    if (selectedThread.value && selectedThread.value.id === thread.id && activeTicket.value) {
      activeTicket.value.assignedToId = finalAssignId;
    }
    
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم إسناد التذكرة' : 'Assigned', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
  } catch(e) {
    console.error(e);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: e.message });
  }
}
`;

content = content.replace(
  'const assignTicket = async (userId) => {',
  assignThreadMethod + '\nconst assignTicket = async (userId) => {'
);

fs.writeFileSync(path, content, 'utf8');
