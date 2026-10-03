const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

// Add imports
content = content.replace(
  "import axios from 'axios'",
  "import axios from 'axios'\nimport Swal from 'sweetalert2'"
);

content = content.replace(
  'const isInternal = ref(false)',
  'const isInternal = ref(false)\nconst ticketCategories = ref([])'
);

// Fetch categories on mount
content = content.replace(
  'onMounted(async () => {\n  setupSocket()\n  await fetchThreads()',
  `onMounted(async () => {
  setupSocket()
  await fetchThreads()
  try {
    const res = await axios.get('/api/v1/tickets/categories');
    ticketCategories.value = res.data.data;
  } catch(e) {}`
);

// Fix createManualTicket
content = content.replace(
  `const createManualTicket = async () => {
  if (!selectedThread.value) return;
  try {
    creatingTicket.value = true;
    await axios.post('/api/v1/tickets', {
      channelId: selectedThread.value.channelId,
      threadId: selectedThread.value.id,
      crmClientId: selectedThread.value.crmClientId,
      subject: 'محادثة واتساب'
    });
    alert('تم فتح التذكرة بنجاح!');
    await fetchActiveTicket(selectedThread.value.id);
  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء فتح التذكرة');
  } finally {
    creatingTicket.value = false;
  }
}`,
  `const createManualTicket = async () => {
  if (!selectedThread.value) return;
  
  const options = {};
  ticketCategories.value.forEach(c => { options[c.id] = c.name; });
  
  const { value: formValues } = await Swal.fire({
    title: isAr.value ? 'فتح تذكرة جديدة' : 'Open New Ticket',
    html:
      '<select id="swal-input1" class="swal2-select" style="display: flex; width: 100%; margin-bottom: 10px;">' +
      '<option value="" disabled selected>' + (isAr.value ? 'اختر التصنيف (اختياري)' : 'Select Category (Optional)') + '</option>' +
      ticketCategories.value.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('') +
      '</select>',
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: isAr.value ? 'فتح' : 'Open',
    cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel',
    preConfirm: () => {
      return { categoryId: document.getElementById('swal-input1').value }
    }
  });
  
  if (!formValues) return;
  
  try {
    creatingTicket.value = true;
    await axios.post('/api/v1/tickets', {
      channelId: selectedThread.value.channelId,
      threadId: selectedThread.value.id,
      crmClientId: selectedThread.value.crmClientId,
      subject: 'محادثة واتساب',
      categoryId: formValues.categoryId || undefined
    });
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم فتح التذكرة بنجاح!' : 'Ticket Opened!', timer: 1500, showConfirmButton: false });
    await fetchActiveTicket(selectedThread.value.id);
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: err.response?.data?.error || err.message });
  } finally {
    creatingTicket.value = false;
  }
}`
);

// Fix closeActiveTicket
content = content.replace(
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
}`,
  `const closeActiveTicket = async () => {
  if (!activeTicket.value) return;
  
  const { value: formValues } = await Swal.fire({
    title: isAr.value ? 'إغلاق التذكرة' : 'Close Ticket',
    html:
      '<textarea id="swal-desc" class="swal2-textarea" placeholder="' + (isAr.value ? 'وصف أو سبب الإغلاق' : 'Resolution description') + '" style="margin-bottom: 10px;"></textarea>' +
      '<select id="swal-cat" class="swal2-select" style="display: flex; width: 100%;">' +
      '<option value="" disabled selected>' + (isAr.value ? 'تحديث التصنيف (اختياري)' : 'Update Category (Optional)') + '</option>' +
      ticketCategories.value.map(c => '<option value="' + c.id + '" ' + (activeTicket.value.categoryId === c.id ? 'selected' : '') + '>' + c.name + '</option>').join('') +
      '</select>',
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: isAr.value ? 'إغلاق التذكرة' : 'Close Ticket',
    confirmButtonColor: '#e3342f',
    cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel',
    preConfirm: () => {
      return { 
        description: document.getElementById('swal-desc').value,
        categoryId: document.getElementById('swal-cat').value
      }
    }
  });

  if (!formValues) return;
  
  try {
    creatingTicket.value = true;
    await axios.post('/api/v1/tickets/' + activeTicket.value.id + '/close', {
      description: formValues.description || 'تم حل المشكلة',
      categoryId: formValues.categoryId || undefined
    });
    activeTicket.value = null;
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم إغلاق التذكرة بنجاح!' : 'Ticket Closed!', timer: 1500, showConfirmButton: false });
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: err.response?.data?.error || err.message });
  } finally {
    creatingTicket.value = false;
  }
}`
);

fs.writeFileSync(path, content, 'utf8');
