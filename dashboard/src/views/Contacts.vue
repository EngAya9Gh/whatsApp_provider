<template>
  <div class="contacts-page">
    <div class="page-header">
      <div class="title-section">
        <h1>{{ isAr ? 'جهات الاتصال' : 'Contacts' }}</h1>
        <p class="muted">{{ isAr ? 'إدارة المجموعات وجهات الاتصال' : 'Manage your contact groups and contacts' }}</p>
      </div>
    </div>

    <div class="layout-grid">
      <!-- Sidebar / Groups -->
      <div class="groups-panel card">
        <div class="panel-header">
          <h3>{{ isAr ? 'المجموعات' : 'Groups' }}</h3>
          <button @click="openGroupModal()" class="btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        
        <ul class="groups-list">
          <li :class="['group-item', { active: selectedGroupId === null }]" @click="selectGroup(null)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>{{ isAr ? 'كل جهات الاتصال' : 'All Contacts' }}</span>
          </li>
          <li 
            v-for="group in groups" :key="group.id" 
            :class="['group-item', { active: selectedGroupId === group.id }]" 
            @click="selectGroup(group.id)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <span>{{ group.name }}</span>
            <span class="badge">{{ group._count?.contacts || 0 }}</span>
            <div class="group-actions" v-if="selectedGroupId === group.id">
              <button @click.stop="openGroupModal(group)" class="btn-icon small"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              <button @click.stop="deleteGroup(group.id)" class="btn-icon small red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
            </div>
          </li>
          <li :class="['group-item', { active: selectedGroupId === 'unassigned' }]" @click="selectGroup('unassigned')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>{{ isAr ? 'غير مصنفة' : 'Unassigned' }}</span>
          </li>
        </ul>
      </div>

      <!-- Contacts List -->
      <div class="contacts-panel card">
        <div class="panel-header with-actions">
          <h3>{{ currentGroupName }}</h3>
          <div class="actions-row">
            <input type="text" class="input-std search-input" v-model="searchQuery" @input="debounceSearch" :placeholder="isAr ? 'بحث بالاسم أو الرقم...' : 'Search name or phone...'" />
            <button @click="openContactModal()" class="btn-primary">
              {{ isAr ? 'إضافة' : 'Add Contact' }}
            </button>
            <button @click="showImportModal = true" class="btn-ghost">
              {{ isAr ? 'استيراد CSV' : 'Import CSV' }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <div v-if="loadingContacts" class="loading-state">
            <div class="spinner"></div>
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>{{ isAr ? 'الاسم' : 'Name' }}</th>
                <th>{{ isAr ? 'رقم الهاتف' : 'Phone' }}</th>
                <th>{{ isAr ? 'الإيميل' : 'Email' }}</th>
                <th>{{ isAr ? 'المجموعة' : 'Group' }}</th>
                <th>{{ isAr ? 'إجراءات' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="contact in contacts" :key="contact.id">
                <td>{{ contact.name }}</td>
                <td dir="ltr" style="text-align: left;">{{ contact.phone }}</td>
                <td>{{ contact.email || '-' }}</td>
                <td>{{ getGroupName(contact.groupId) }}</td>
                <td>
                  <button @click="openContactModal(contact)" class="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                  <button @click="deleteContact(contact.id)" class="btn-icon red"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                </td>
              </tr>
              <tr v-if="contacts.length === 0">
                <td colspan="5" class="empty-state">{{ isAr ? 'لا توجد جهات اتصال.' : 'No contacts found.' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Group Modal -->
    <div v-if="showGroupModal" class="modal-overlay" @click.self="showGroupModal = false">
      <div class="modal-box small">
        <div class="modal-header">
          <h2>{{ editingGroup ? (isAr ? 'تعديل مجموعة' : 'Edit Group') : (isAr ? 'إضافة مجموعة' : 'Add Group') }}</h2>
          <button @click="showGroupModal = false" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ isAr ? 'اسم المجموعة' : 'Group Name' }} *</label>
            <input v-model="groupForm.name" type="text" class="input-std" />
          </div>
          <div class="form-group">
            <label>{{ isAr ? 'الوصف' : 'Description' }}</label>
            <textarea v-model="groupForm.description" class="input-std" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showGroupModal = false" class="btn-ghost">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button @click="saveGroup" class="btn-primary" :disabled="savingGroup">
            {{ savingGroup ? '...' : (isAr ? 'حفظ' : 'Save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Contact Modal -->
    <div v-if="showContactModal" class="modal-overlay" @click.self="showContactModal = false">
      <div class="modal-box">
        <div class="modal-header">
          <h2>{{ editingContact ? (isAr ? 'تعديل جهة اتصال' : 'Edit Contact') : (isAr ? 'إضافة جهة اتصال' : 'Add Contact') }}</h2>
          <button @click="showContactModal = false" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>{{ isAr ? 'الاسم' : 'Name' }} *</label>
              <input v-model="contactForm.name" type="text" class="input-std" />
            </div>
            <div class="form-group">
              <label>{{ isAr ? 'رقم الهاتف' : 'Phone' }} *</label>
              <input v-model="contactForm.phone" type="text" class="input-std" :placeholder="isAr ? 'متضمناً رمز الدولة (مثال: 2010...)' : 'With country code (e.g. 2010...)'" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ isAr ? 'الإيميل' : 'Email' }}</label>
              <input v-model="contactForm.email" type="email" class="input-std" />
            </div>
            <div class="form-group">
              <label>{{ isAr ? 'المجموعة' : 'Group' }}</label>
              <select v-model="contactForm.groupId" class="input-std">
                <option :value="null">{{ isAr ? 'بدون مجموعة' : 'No Group' }}</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
            </div>
          </div>
          
          <div class="form-group mt-3">
            <label>{{ isAr ? 'متغيرات إضافية (JSON)' : 'Custom Variables (JSON)' }} <small class="muted">{{ isAr ? 'اختياري، مثلاً var1, var2' : 'Optional, e.g. var1, var2' }}</small></label>
            <textarea v-model="contactForm.metadata" class="input-std code-input" rows="4" placeholder='{"var1": "value"}'></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showContactModal = false" class="btn-ghost">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button @click="saveContact" class="btn-primary" :disabled="savingContact">
            {{ savingContact ? '...' : (isAr ? 'حفظ' : 'Save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Import CSV Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-box small">
        <div class="modal-header">
          <h2>{{ isAr ? 'استيراد جهات اتصال' : 'Import Contacts' }}</h2>
          <button @click="showImportModal = false" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p class="muted mb">{{ isAr ? 'ارفع ملف CSV يحتوي على الأعمدة: Phone, Name, Email وأي متغيرات أخرى مثل var1, var2' : 'Upload a CSV file containing columns: Phone, Name, Email, and any other variables like var1, var2' }}</p>
          <div class="form-group">
            <label>{{ isAr ? 'إضافة إلى مجموعة' : 'Add to Group' }}</label>
            <select v-model="importGroupId" class="input-std">
              <option :value="null">{{ isAr ? 'بدون مجموعة' : 'No Group' }}</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ isAr ? 'ملف CSV' : 'CSV File' }} *</label>
            <input type="file" ref="fileInput" accept=".csv" class="input-std" />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showImportModal = false" class="btn-ghost">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button @click="importCsv" class="btn-primary" :disabled="importing">
            {{ importing ? '...' : (isAr ? 'استيراد' : 'Import') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const isAr = ref(localStorage.getItem('lang') === 'ar')

// State
const groups = ref([])
const contacts = ref([])
const selectedGroupId = ref(null)
const searchQuery = ref('')
let searchTimeout = null

const loadingGroups = ref(true)
const loadingContacts = ref(true)

// Modals State
const showGroupModal = ref(false)
const showContactModal = ref(false)
const showImportModal = ref(false)

const savingGroup = ref(false)
const savingContact = ref(false)
const importing = ref(false)

const editingGroup = ref(null)
const editingContact = ref(null)

const groupForm = reactive({ name: '', description: '' })
const contactForm = reactive({ name: '', phone: '', email: '', groupId: null, metadata: '' })
const importGroupId = ref(null)
const fileInput = ref(null)

const toast = reactive({ show: false, message: '', type: 'success' })

const currentGroupName = computed(() => {
  if (selectedGroupId.value === null) return isAr.value ? 'كل جهات الاتصال' : 'All Contacts'
  if (selectedGroupId.value === 'unassigned') return isAr.value ? 'غير مصنفة' : 'Unassigned'
  const g = groups.value.find(g => g.id === selectedGroupId.value)
  return g ? g.name : ''
})

const getGroupName = (id) => {
  if (!id) return '-'
  const g = groups.value.find(g => g.id === id)
  return g ? g.name : '-'
}

function showToast(msg, type = 'success') {
  toast.message = msg
  toast.type = type
  toast.show = true
  setTimeout(() => toast.show = false, 3000)
}

function authHeader() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

onMounted(() => {
  fetchGroups()
  fetchContacts()
})

// --- API Calls ---

async function fetchGroups() {
  try {
    const res = await axios.get('/api/contacts/groups', { headers: authHeader() })
    groups.value = res.data.data
  } catch (err) {
    showToast(isAr.value ? 'فشل تحميل المجموعات' : 'Failed to load groups', 'error')
  } finally {
    loadingGroups.value = false
  }
}

async function fetchContacts() {
  loadingContacts.value = true
  try {
    let url = `/api/contacts?t=${Date.now()}`
    if (selectedGroupId.value) url += `&groupId=${selectedGroupId.value}`
    if (searchQuery.value) url += `&search=${searchQuery.value}`
    
    const res = await axios.get(url, { headers: authHeader() })
    contacts.value = res.data.data
  } catch (err) {
    showToast(isAr.value ? 'فشل تحميل جهات الاتصال' : 'Failed to load contacts', 'error')
  } finally {
    loadingContacts.value = false
  }
}

function selectGroup(id) {
  selectedGroupId.value = id
  fetchContacts()
}

function debounceSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchContacts()
  }, 500)
}

// --- Groups Management ---

function openGroupModal(group = null) {
  editingGroup.value = group
  if (group) {
    groupForm.name = group.name
    groupForm.description = group.description || ''
  } else {
    groupForm.name = ''
    groupForm.description = ''
  }
  showGroupModal.value = true
}

async function saveGroup() {
  if (!groupForm.name) return showToast(isAr.value ? 'اسم المجموعة مطلوب' : 'Group name is required', 'error')
  savingGroup.value = true
  try {
    if (editingGroup.value) {
      await axios.put(`/api/contacts/groups/${editingGroup.value.id}`, groupForm, { headers: authHeader() })
      showToast(isAr.value ? 'تم التعديل بنجاح' : 'Group updated successfully')
    } else {
      await axios.post('/api/contacts/groups', groupForm, { headers: authHeader() })
      showToast(isAr.value ? 'تمت الإضافة بنجاح' : 'Group added successfully')
    }
    showGroupModal.value = false
    fetchGroups()
  } catch (err) {
    showToast(isAr.value ? 'حدث خطأ' : 'An error occurred', 'error')
  } finally {
    savingGroup.value = false
  }
}

async function deleteGroup(id) {
  if (!confirm(isAr.value ? 'هل أنت متأكد من حذف هذه المجموعة؟ سيتم فك ارتباط جهات الاتصال بها (لن يتم حذفهم).' : 'Are you sure? Contacts inside will be unassigned (not deleted).')) return
  try {
    await axios.delete(`/api/contacts/groups/${id}`, { headers: authHeader() })
    showToast(isAr.value ? 'تم الحذف' : 'Deleted successfully')
    if (selectedGroupId.value === id) selectedGroupId.value = null
    fetchGroups()
    fetchContacts()
  } catch (err) {
    showToast(isAr.value ? 'حدث خطأ' : 'Error deleting', 'error')
  }
}

// --- Contacts Management ---

function openContactModal(contact = null) {
  editingContact.value = contact
  if (contact) {
    contactForm.name = contact.name
    contactForm.phone = contact.phone
    contactForm.email = contact.email || ''
    contactForm.groupId = contact.groupId || null
    contactForm.metadata = contact.metadata ? JSON.stringify(contact.metadata, null, 2) : ''
  } else {
    contactForm.name = ''
    contactForm.phone = ''
    contactForm.email = ''
    contactForm.groupId = selectedGroupId.value === 'unassigned' ? null : selectedGroupId.value
    contactForm.metadata = ''
  }
  showContactModal.value = true
}

async function saveContact() {
  if (!contactForm.name || !contactForm.phone) return showToast(isAr.value ? 'الاسم والرقم مطلوبان' : 'Name and phone required', 'error')
  
  let metadataObj = null
  if (contactForm.metadata) {
    try {
      metadataObj = JSON.parse(contactForm.metadata)
    } catch (e) {
      return showToast(isAr.value ? 'صيغة JSON غير صحيحة للمتغيرات' : 'Invalid JSON format for metadata', 'error')
    }
  }

  savingContact.value = true
  const payload = {
    name: contactForm.name,
    phone: contactForm.phone,
    email: contactForm.email || null,
    groupId: contactForm.groupId,
    metadata: metadataObj
  }

  try {
    if (editingContact.value) {
      await axios.put(`/api/contacts/${editingContact.value.id}`, payload, { headers: authHeader() })
      showToast(isAr.value ? 'تم التعديل' : 'Updated successfully')
    } else {
      await axios.post('/api/contacts', payload, { headers: authHeader() })
      showToast(isAr.value ? 'تمت الإضافة' : 'Added successfully')
    }
    showContactModal.value = false
    fetchContacts()
    fetchGroups() // to update count
  } catch (err) {
    showToast(err.response?.data?.error || (isAr.value ? 'حدث خطأ' : 'Error'), 'error')
  } finally {
    savingContact.value = false
  }
}

async function deleteContact(id) {
  if (!confirm(isAr.value ? 'تأكيد الحذف؟' : 'Confirm delete?')) return
  try {
    await axios.delete(`/api/contacts/${id}`, { headers: authHeader() })
    showToast(isAr.value ? 'تم الحذف' : 'Deleted')
    fetchContacts()
    fetchGroups()
  } catch (err) {
    showToast(isAr.value ? 'خطأ' : 'Error', 'error')
  }
}

// --- Import CSV ---

async function importCsv() {
  const file = fileInput.value?.files[0]
  if (!file) return showToast(isAr.value ? 'الرجاء اختيار ملف' : 'Please select a file', 'error')

  const formData = new FormData()
  formData.append('file', file)
  if (importGroupId.value) {
    formData.append('groupId', importGroupId.value)
  }

  importing.value = true
  try {
    const res = await axios.post('/api/contacts/import', formData, { 
      headers: { 
        ...authHeader(),
        'Content-Type': 'multipart/form-data'
      } 
    })
    showToast(`${res.data.message}`)
    showImportModal.value = false
    fileInput.value.value = ''
    fetchContacts()
    fetchGroups()
  } catch (err) {
    showToast(err.response?.data?.error || (isAr.value ? 'خطأ في الاستيراد' : 'Import failed'), 'error')
  } finally {
    importing.value = false
  }
}

</script>

<style scoped>
.contacts-page {
  padding: 24px;
}
.page-header {
  margin-bottom: 24px;
}
.title-section h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}
.layout-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
}

/* Sidebar / Groups */
.groups-panel {
  padding: 16px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.panel-header h3 {
  font-size: 16px;
  font-weight: 600;
}
.groups-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.group-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.group-item.active {
  background: var(--primary-light);
  color: var(--primary-color);
  font-weight: 500;
}
.group-item span:first-of-type {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.badge {
  background: var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
}
.group-item.active .badge {
  background: white;
  color: var(--primary-color);
}
.group-actions {
  display: flex;
  gap: 4px;
}

/* Contacts List */
.contacts-panel {
  padding: 0;
  overflow: hidden;
}
.panel-header.with-actions {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
}
.actions-row {
  display: flex;
  gap: 12px;
}
.search-input {
  width: 250px;
}
.table-container {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th, .data-table td {
  padding: 16px 24px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}
.data-table th {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--text-secondary);
  font-weight: 600;
  background: var(--bg-secondary);
}
html[dir="rtl"] .data-table th, 
html[dir="rtl"] .data-table td {
  text-align: right;
}
.data-table tr:last-child td {
  border-bottom: none;
}
.empty-state {
  text-align: center !important;
  color: var(--text-secondary);
  padding: 48px !important;
}
.code-input {
  font-family: monospace;
  font-size: 13px;
  direction: ltr;
}

/* Responsive */
@media (max-width: 900px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
  .actions-row {
    flex-wrap: wrap;
  }
  .search-input {
    width: 100%;
  }
}

/* ═══ UI UTILITIES ═══ */
.card {
  background: white;
  border: 1px solid var(--border-color, #E2E8F0);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.btn-icon {
  display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border: 1px solid #E2E8F0; border-radius: 10px; background: white; cursor: pointer; color: #64748B; transition: all 0.2s;
}
.btn-icon:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }
.btn-icon.small { width: 28px; height: 28px; border-radius: 8px; }
.btn-icon.red:hover { background: rgba(239,68,68,0.08); color: #EF4444; border-color: rgba(239,68,68,0.2); }

.btn-primary {
  display: inline-flex; align-items: center; gap: 0.5rem; background: linear-gradient(135deg, #FF6600, #E55A00); color: white; padding: 0.8rem 1.5rem; border: none; border-radius: 12px; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.25s; box-shadow: 0 4px 12px rgba(255,102,0,0.25); font-family: inherit; white-space: nowrap;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,102,0,0.3); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 0.5rem; background: transparent; color: #64748B; border: 1.5px solid #CBD5E1; padding: 0.8rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.btn-ghost:hover { background: #F8FAFC; color: #0F172A; border-color: #94A3B8; }

.input-std {
  width: 100%; padding: 0.8rem 1rem; border: 1.5px solid #CBD5E1; border-radius: 12px; font-size: 0.9rem; font-family: inherit; color: #0F172A; background: white; outline: none; transition: all 0.2s; box-sizing: border-box;
}
.input-std:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
select.input-std { cursor: pointer; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
@media (max-width: 540px) { .form-row { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.form-group label { font-size: 0.83rem; font-weight: 700; color: #334155; }

/* ═══ MODAL ═══ */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-box { background: white; border-radius: 24px; width: 100%; max-width: 680px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
.modal-box.small { max-width: 440px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.75rem 2rem 1.25rem; border-bottom: 1px solid #F1F5F9; }
.modal-header h2 { font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 0; }
.modal-close { background: none; border: none; color: #94A3B8; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 6px; transition: all 0.2s; }
.modal-close:hover { background: #F1F5F9; color: #0F172A; }
.modal-body { flex: 1; overflow-y: auto; padding: 1.75rem 2rem; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem 2rem 1.75rem; border-top: 1px solid #F1F5F9; }

/* ═══ TOAST ═══ */
.toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); padding: 0.875rem 1.5rem; border-radius: 14px; font-weight: 700; font-size: 0.9rem; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.15); white-space: nowrap;
}
.toast.success { background: #0F172A; color: white; }
.toast.error   { background: #EF4444; color: white; }

</style>
