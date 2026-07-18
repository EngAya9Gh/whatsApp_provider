<template>
  <div class="page-container chatbot-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Auto Responder (Chatbot)</h1>
        <p class="page-subtitle">Set up automated replies for incoming messages or button clicks.</p>
      </div>
      <button @click="showModal = true" class="btn-primary">
        + Create Rule
      </button>
    </div>

    <!-- Error/Success Alerts -->
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <!-- Rules Table -->
    <div class="card table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Keyword</th>
            <th>Match Type</th>
            <th>Response Type</th>
            <th>Status</th>
            <th>Validity Period</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="text-center py-4">Loading rules...</td>
          </tr>
          <tr v-else-if="rules.length === 0">
            <td colspan="6" class="text-center py-4 text-gray">No rules created yet.</td>
          </tr>
          <tr v-for="rule in rules" :key="rule.id">
            <td class="font-bold">{{ rule.keyword }}</td>
            <td><span class="badge badge-outline">{{ rule.matchType }}</span></td>
            <td><span class="badge badge-info">{{ rule.responseType }}</span></td>
            <td>
              <button 
                @click="toggleStatus(rule)" 
                :class="['badge', rule.isActive ? 'badge-success' : 'badge-danger']"
                style="cursor:pointer; border:none;">
                {{ rule.isActive ? 'Active' : 'Inactive' }}
              </button>
            </td>
            <td>
              <div v-if="rule.startDate || rule.endDate" style="font-size: 0.85rem; color: #64748B;">
                <div v-if="rule.startDate">From: {{ new Date(rule.startDate).toLocaleString() }}</div>
                <div v-if="rule.endDate">To: {{ new Date(rule.endDate).toLocaleString() }}</div>
              </div>
              <span v-else class="text-gray" style="font-size: 0.85rem;">Always Active</span>
            </td>
            <td>{{ new Date(rule.createdAt).toLocaleDateString() }}</td>
            <td>
              <div style="display: flex; gap: 0.5rem;">
                <button @click="editRule(rule)" class="btn-secondary btn-small">Edit</button>
                <button @click="deleteRule(rule.id)" class="btn-danger btn-small">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Rule Modal -->
    <div v-if="showModal" class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingRule ? 'Edit' : 'Create' }} Auto Responder Rule</h2>
          <button @click="closeModal" class="btn-close">✕</button>
        </div>
        <form @submit.prevent="submitRule" class="modal-body">
          
          <div class="form-group">
            <label>Keyword / Button Text</label>
            <input v-model="form.keyword" required placeholder="e.g. Yes, Confirm, 1" class="form-input" />
            <small class="hint">The exact word or phrase to look for.</small>
          </div>

          <div class="form-group">
            <label>Match Type</label>
            <select v-model="form.matchType" class="form-input">
              <option value="EXACT">Exact Match (الكلمة بالضبط)</option>
              <option value="CONTAINS">Contains (تحتوي على الكلمة)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Response Type</label>
            <select v-model="form.responseType" class="form-input">
              <option value="TEXT">Text Message</option>
              <option value="IMAGE">Image / QR Code</option>
              <option value="PDF">PDF Document</option>
              <option value="LOCATION">Location (Map Pin)</option>
            </select>
          </div>

          <div v-if="form.responseType !== 'LOCATION'" class="form-group">
            <label>Response Message (Optional for Media)</label>
            <textarea v-model="form.message" rows="3" placeholder="Thank you for confirming!" class="form-input"></textarea>
            <small class="hint">This will be the caption if you select Image/PDF.</small>
          </div>

          <div v-if="form.responseType === 'IMAGE' || form.responseType === 'PDF'" class="form-group">
            <label>Upload Media File</label>
            <input type="file" @change="handleFileUpload" :accept="form.responseType === 'IMAGE' ? 'image/*' : 'application/pdf'" required class="form-input" />
          </div>

          <div v-if="form.responseType === 'LOCATION'" class="location-fields">
            <div class="form-group">
              <label>Latitude (خط العرض)</label>
              <input v-model="form.lat" type="number" step="any" placeholder="24.7136" required class="form-input" />
            </div>
            <div class="form-group">
              <label>Longitude (خط الطول)</label>
              <input v-model="form.lng" type="number" step="any" placeholder="46.6753" required class="form-input" />
            </div>
            <div class="form-group">
              <label>Location Name (اسم المكان)</label>
              <input v-model="form.locationName" placeholder="My Store" class="form-input" />
            </div>
            <div class="form-group">
              <label>Address (العنوان التفصيلي)</label>
              <input v-model="form.locationAddress" placeholder="Riyadh, Street 1" class="form-input" />
            </div>
          </div>

          <div class="form-group" style="display:flex; gap: 1rem;">
            <div style="flex:1;">
              <label>Start Date (تاريخ التفعيل) - Optional</label>
              <input type="datetime-local" v-model="form.startDate" class="form-input" />
            </div>
            <div style="flex:1;">
              <label>End Date (تاريخ الانتهاء) - Optional</label>
              <input type="datetime-local" v-model="form.endDate" class="form-input" />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? 'Saving...' : 'Save Rule' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const rules = ref([])
const loading = ref(true)
const submitting = ref(false)
const showModal = ref(false)
const editingRule = ref(null)
const error = ref('')
const success = ref('')

const form = ref({
  keyword: '',
  matchType: 'EXACT',
  responseType: 'TEXT',
  message: '',
  lat: '',
  lng: '',
  locationName: '',
  locationAddress: '',
  startDate: '',
  endDate: ''
})
const selectedFile = ref(null)

const fetchRules = async () => {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` }
    })
    rules.value = res.data.data
  } catch (err) {
    error.value = 'Failed to load rules'
  } finally {
    loading.value = false
  }
}

const handleFileUpload = (e) => {
  selectedFile.value = e.target.files[0]
}

const closeModal = () => {
  showModal.value = false
  editingRule.value = null
  form.value = { keyword: '', matchType: 'EXACT', responseType: 'TEXT', message: '', lat: '', lng: '', locationName: '', locationAddress: '', startDate: '', endDate: '' }
  selectedFile.value = null
  error.value = ''
}

const editRule = (rule) => {
  editingRule.value = rule
  
  const toLocalString = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0,16)
  }

  form.value = {
    keyword: rule.keyword,
    matchType: rule.matchType,
    responseType: rule.responseType,
    message: rule.message || '',
    lat: rule.lat || '',
    lng: rule.lng || '',
    locationName: rule.locationName || '',
    locationAddress: rule.locationAddress || '',
    startDate: toLocalString(rule.startDate),
    endDate: toLocalString(rule.endDate)
  }
  selectedFile.value = null
  showModal.value = true
}

const submitRule = async () => {
  submitting.value = true
  error.value = ''
  success.value = ''

  try {
    const formData = new FormData()
    formData.append('keyword', form.value.keyword)
    formData.append('matchType', form.value.matchType)
    formData.append('responseType', form.value.responseType)
    
    if (form.value.responseType !== 'LOCATION') {
      formData.append('message', form.value.message)
    } else {
      formData.append('lat', form.value.lat)
      formData.append('lng', form.value.lng)
      formData.append('locationName', form.value.locationName)
      formData.append('locationAddress', form.value.locationAddress)
    }
    
    if (form.value.startDate) formData.append('startDate', form.value.startDate)
    if (form.value.endDate) formData.append('endDate', form.value.endDate)
    
    if (selectedFile.value) {
      formData.append('media', selectedFile.value)
    }

    const token = localStorage.getItem('token')
    
    if (editingRule.value) {
      await axios.put(`/api/v1/chatbot/${editingRule.value.id}`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        }
      })
      success.value = 'Rule updated successfully!'
    } else {
      await axios.post('/api/v1/chatbot', formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        }
      })
      success.value = 'Rule created successfully!'
    }
    
    closeModal()
    fetchRules()
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Failed to create rule'
  } finally {
    submitting.value = false
  }
}

const deleteRule = async (id) => {
  if (!confirm('Are you sure you want to delete this rule?')) return
  const token = localStorage.getItem('token')
  try {
    await axios.delete(`/api/v1/chatbot/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    success.value = 'Rule deleted'
    fetchRules()
  } catch (err) {
    error.value = 'Failed to delete rule'
  }
}

const toggleStatus = async (rule) => {
  const token = localStorage.getItem('token')
  try {
    await axios.patch(`/api/v1/chatbot/${rule.id}/active`, { isActive: !rule.isActive }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchRules()
  } catch (err) {
    error.value = 'Failed to update status'
  }
}

onMounted(() => {
  fetchRules()
})
</script>

<style scoped>
.chatbot-page { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.page-title { font-size: 1.8rem; color: #1f2937; margin: 0; }
.page-subtitle { color: #6b7280; margin: 0.5rem 0 0; }
.card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td { padding: 1rem; border-bottom: 1px solid #f3f4f6; }
.data-table th { background-color: #f9fafb; font-weight: 600; color: #374151; }
.btn-primary { background: #10B981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-danger { background: #ef4444; color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 6px; cursor: pointer; }
.modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-content { background: white; width: 100%; max-width: 500px; border-radius: 12px; overflow: hidden; }
.modal-header { padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { margin: 0; font-size: 1.25rem; color: #111827; }
.btn-close { background: none; border: none; font-size: 1.25rem; color: #6b7280; cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
.form-input { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; }
.hint { display: block; font-size: 0.8rem; color: #6b7280; margin-top: 0.25rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
.badge { padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500; }
.badge-outline { border: 1px solid #d1d5db; color: #374151; }
.badge-info { background: #dbeafe; color: #1e40af; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-danger { background: #fee2e2; color: #991b1b; }
.alert { padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; }
.alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.alert-success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
</style>
