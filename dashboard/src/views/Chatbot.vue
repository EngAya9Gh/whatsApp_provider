<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Auto Responder (Chatbot)</h1>
        <p class="text-slate-500 font-medium text-lg m-0">Set up automated replies for incoming messages or button clicks.</p>
      </div>
      <button @click="showModal = true" class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition-colors cursor-pointer border-none flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Create Rule
      </button>
    </div>

    <!-- Error/Success Alerts -->
    <div v-if="error" class="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl font-bold mb-6 flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      {{ error }}
    </div>
    <div v-if="success" class="bg-green-50 text-green-700 border border-green-200 p-4 rounded-xl font-bold mb-6 flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      {{ success }}
    </div>

    <!-- Rules Table -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-600 border-collapse">
          <thead class="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              <th scope="col" class="px-6 py-4 font-bold">Keyword</th>
              <th scope="col" class="px-6 py-4 font-bold">Match Type</th>
              <th scope="col" class="px-6 py-4 font-bold">Response Type</th>
              <th scope="col" class="px-6 py-4 font-bold">Status</th>
              <th scope="col" class="px-6 py-4 font-bold">Validity Period</th>
              <th scope="col" class="px-6 py-4 font-bold">Created At</th>
              <th scope="col" class="px-6 py-4 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center py-12 text-slate-400 font-medium">Loading rules...</td>
            </tr>
            <tr v-else-if="rules.length === 0">
              <td colspan="7" class="text-center py-16">
                <div class="text-5xl mb-4">🤖</div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">No rules created yet</h3>
                <p class="text-slate-500 font-medium m-0">Click "Create Rule" to add your first auto-response.</p>
              </td>
            </tr>
            <tr v-for="rule in rules" :key="rule.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-extrabold text-slate-800 text-base">{{ rule.keyword }}</td>
              <td class="px-6 py-4">
                <span class="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold">{{ rule.matchType }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold">{{ rule.responseType }}</span>
              </td>
              <td class="px-6 py-4">
                <button 
                  @click="toggleStatus(rule)" 
                  :class="rule.isActive ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'"
                  class="px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors shadow-sm">
                  {{ rule.isActive ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="px-6 py-4">
                <div v-if="rule.startDate || rule.endDate" class="text-xs text-slate-500 font-medium">
                  <div v-if="rule.startDate" class="mb-1">From: <span class="font-bold text-slate-700">{{ new Date(rule.startDate).toLocaleString() }}</span></div>
                  <div v-if="rule.endDate">To: <span class="font-bold text-slate-700">{{ new Date(rule.endDate).toLocaleString() }}</span></div>
                </div>
                <span v-else class="text-xs text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100">Always Active</span>
              </td>
              <td class="px-6 py-4 font-medium">{{ new Date(rule.createdAt).toLocaleDateString() }}</td>
              <td class="px-6 py-4">
                <div class="flex gap-2">
                  <button @click="editRule(rule)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md font-bold text-xs transition-colors border border-slate-200 cursor-pointer">Edit</button>
                  <button @click="deleteRule(rule.id)" class="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-3 py-1.5 rounded-md font-bold text-xs transition-colors border border-red-100 cursor-pointer">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Rule Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
        <div class="sticky top-0 bg-white/95 backdrop-blur z-10 px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h2 class="text-xl font-extrabold text-slate-900 m-0">{{ editingRule ? 'Edit' : 'Create' }} Auto Responder Rule</h2>
          <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors border-none cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form @submit.prevent="submitRule" class="p-6 flex flex-col gap-5">
          <div class="grid gap-2">
            <label class="font-bold text-slate-700 text-sm">Keyword / Button Text</label>
            <input v-model="form.keyword" required placeholder="e.g. Yes, Confirm, 1" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
            <small class="text-slate-500 font-medium">The exact word or phrase to look for.</small>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="grid gap-2">
              <label class="font-bold text-slate-700 text-sm">Match Type</label>
              <select v-model="form.matchType" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                <option value="EXACT">Exact Match (الكلمة بالضبط)</option>
                <option value="CONTAINS">Contains (تحتوي على الكلمة)</option>
              </select>
            </div>

            <div class="grid gap-2">
              <label class="font-bold text-slate-700 text-sm">Response Type</label>
              <select v-model="form.responseType" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                <option value="TEXT">Text Message</option>
                <option value="IMAGE">Image / QR Code</option>
                <option value="PDF">PDF Document</option>
                <option value="LOCATION">Location (Map Pin)</option>
              </select>
            </div>
          </div>

          <div v-if="form.responseType !== 'LOCATION'" class="grid gap-2">
            <label class="font-bold text-slate-700 text-sm">Response Message (Optional for Media)</label>
            <textarea v-model="form.message" rows="3" placeholder="Thank you for confirming!" class="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-y"></textarea>
            <small class="text-slate-500 font-medium">This will be the caption if you select Image/PDF.</small>
          </div>

          <div v-if="form.responseType === 'IMAGE' || form.responseType === 'PDF'" class="grid gap-2">
            <label class="font-bold text-slate-700 text-sm">Upload Media File</label>
            <div class="flex items-center justify-center w-full">
              <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <p class="mb-1 text-sm text-slate-500 font-bold"><span class="text-slate-700">Click to upload</span> or drag and drop</p>
                  <p class="text-xs text-slate-400 font-medium">{{ form.responseType === 'IMAGE' ? 'PNG, JPG, GIF up to 5MB' : 'PDF up to 10MB' }}</p>
                </div>
                <input type="file" @change="handleFileUpload" :accept="form.responseType === 'IMAGE' ? 'image/*' : 'application/pdf'" required class="hidden" />
              </label>
            </div>
            <div v-if="selectedFile" class="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 flex items-center justify-between">
              <span>{{ selectedFile.name }}</span>
              <button type="button" @click="selectedFile = null" class="text-emerald-800 hover:text-emerald-900 border-none bg-transparent cursor-pointer font-bold">✕</button>
            </div>
          </div>

          <div v-if="form.responseType === 'LOCATION'" class="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 class="md:col-span-2 text-sm font-bold text-slate-800 m-0 pb-2 border-b border-slate-200">Location Details</h3>
            <div class="grid gap-2">
              <label class="font-bold text-slate-700 text-xs uppercase tracking-wider">Latitude (خط العرض)</label>
              <input v-model="form.lat" type="number" step="any" placeholder="24.7136" required class="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
            </div>
            <div class="grid gap-2">
              <label class="font-bold text-slate-700 text-xs uppercase tracking-wider">Longitude (خط الطول)</label>
              <input v-model="form.lng" type="number" step="any" placeholder="46.6753" required class="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
            </div>
            <div class="grid gap-2">
              <label class="font-bold text-slate-700 text-xs uppercase tracking-wider">Location Name (اسم المكان)</label>
              <input v-model="form.locationName" placeholder="My Store" class="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
            </div>
            <div class="grid gap-2">
              <label class="font-bold text-slate-700 text-xs uppercase tracking-wider">Address (العنوان التفصيلي)</label>
              <input v-model="form.locationAddress" placeholder="Riyadh, Street 1" class="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
            <div class="grid gap-2">
              <label class="font-bold text-slate-700 text-sm">Start Date (تاريخ التفعيل) - <span class="text-slate-400 font-medium">Optional</span></label>
              <input type="datetime-local" v-model="form.startDate" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer" />
            </div>
            <div class="grid gap-2">
              <label class="font-bold text-slate-700 text-sm">End Date (تاريخ الانتهاء) - <span class="text-slate-400 font-medium">Optional</span></label>
              <input type="datetime-local" v-model="form.endDate" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer" />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-6 mt-2 border-t border-slate-100">
            <button type="button" @click="closeModal" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-bold transition-colors border-none cursor-pointer">Cancel</button>
            <button type="submit" :disabled="submitting" class="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-bold shadow-sm transition-colors border-none cursor-pointer disabled:opacity-50">
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
    
    if (form.value.startDate) {
      formData.append('startDate', new Date(form.value.startDate).toISOString())
    }
    if (form.value.endDate) {
      formData.append('endDate', new Date(form.value.endDate).toISOString())
    }
    
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


