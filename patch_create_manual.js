const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

const createManualTicketMethod = `
const createManualTicket = async () => {
  if (!selectedThread.value) return;
  
  try {
    creatingTicket.value = true;
    await axios.post('/api/v1/tickets', {
      channelId: selectedThread.value.channelId,
      threadId: selectedThread.value.id,
      crmClientId: selectedThread.value.crmClientId,
      subject: 'محادثة واتساب'
    });
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم فتح التذكرة بنجاح!' : 'Ticket Opened!', timer: 1500, showConfirmButton: false });
    await fetchActiveTicket(selectedThread.value.id);
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: err.response?.data?.error || err.message });
  } finally {
    creatingTicket.value = false;
  }
}
`;

content = content.replace(/const createManualTicket = async \(\) => \{[\s\S]*?\}\n\}/, createManualTicketMethod);

fs.writeFileSync(path, content, 'utf8');
