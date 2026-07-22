<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Meta Campaigns</h2>
        <p class="text-slate-500 font-medium text-lg">Send bulk messages using official Meta templates with 100% delivery reliability.</p>
      </div>
      <button @click="openModal" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5 border-none cursor-pointer">
        + New Meta Campaign
      </button>
    </div>

    <!-- Campaigns List -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
    </div>
    
    <div v-else-if="campaigns.length === 0" class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
      <div class="text-4xl mb-4">📢</div>
      <h3 class="text-xl font-bold text-slate-700">No Meta Campaigns Found</h3>
      <p class="text-slate-500 mt-2">Start your first official Meta campaign.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="campaign in campaigns" :key="campaign.id" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div class="flex justify-between items-start mb-4">
          <h3 class="font-bold text-slate-900 text-lg m-0">{{ campaign.name }}</h3>
          <span :class="getStatusClass(campaign.status)" class="px-2.5 py-1 rounded-full text-xs font-bold border">{{ campaign.status }}</span>
        </div>
        <div class="text-sm text-slate-600 mb-2">
          <strong>Category:</strong> {{ campaign.metaCategory || 'Unknown' }}
        </div>
        <div class="text-sm text-slate-600 mb-4">
          <strong>Date:</strong> {{ new Date(campaign.createdAt).toLocaleDateString() }}
        </div>
        <router-link :to="`/campaigns/${campaign.id}`" class="block text-center w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-bold text-sm transition-colors no-underline">
          View Details
        </router-link>
      </div>
    </div>

    <!-- Create Modal Stub -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h3 class="text-xl font-bold text-slate-900 mb-4">New Meta Campaign</h3>
        <p class="text-slate-600 mb-6 text-sm">Meta campaigns require an approved template. First, make sure you have approved templates in the Meta Templates page.</p>
        
        <div class="mb-4">
          <label class="block text-sm font-semibold text-slate-700 mb-2">Campaign Name</label>
          <input type="text" v-model="form.name" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="e.g. Summer Promo 2024" />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-slate-700 mb-2">Select Approved Template</label>
          <select v-model="form.templateName" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
            <option value="" disabled>Select a template...</option>
            <option v-for="tpl in metaTemplates" :key="tpl.id" :value="tpl.name">{{ tpl.name }} ({{ tpl.category }})</option>
          </select>
          <div v-if="metaTemplates.length === 0" class="text-xs text-orange-500 mt-1">No templates found. Go to Meta Templates to sync them.</div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-slate-700 mb-2">Upload Excel/CSV File</label>
          <p class="text-xs text-slate-500 mb-2">Column 1: Phone number. Column 2+: Variables (e.g. {{1}}, {{2}} in order).</p>
          <input type="file" @change="handleFileUpload" accept=".csv, .xlsx, .xls" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="closeModal" class="px-4 py-2 font-bold text-slate-600 bg-transparent border-none cursor-pointer">Cancel</button>
          <button @click="createCampaign" :disabled="isSubmitting" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold border-none cursor-pointer disabled:opacity-50 transition-colors">
            {{ isSubmitting ? 'Creating...' : 'Create & Start' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const campaigns = ref([])
const metaTemplates = ref([])
const loading = ref(false)
const showCreateModal = ref(false)
const isSubmitting = ref(false)

const form = ref({
  name: '',
  templateName: '',
  file: null
})

const fetchCampaigns = async () => {
  loading.value = true;
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/campaigns', {
      headers: { Authorization: `Bearer ${token}` }
    })
    campaigns.value = res.data.data.filter(c => c.campaignType === 'META')
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false;
  }
}

const fetchTemplates = async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/meta/templates', {
      headers: { Authorization: `Bearer ${token}` }
    })
    metaTemplates.value = res.data.data.filter(t => t.status === 'APPROVED')
  } catch (err) {
    console.error('Failed to fetch meta templates', err)
  }
}

const handleFileUpload = (event) => {
  form.value.file = event.target.files[0]
}

const getStatusClass = (status) => {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'RUNNING') return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

const openModal = () => {
  showCreateModal.value = true
  if (metaTemplates.value.length === 0) {
    fetchTemplates()
  }
}

const closeModal = () => {
  showCreateModal.value = false
  form.value = { name: '', templateName: '', file: null }
}

const createCampaign = async () => {
  if (!form.value.name || !form.value.templateName || !form.value.file) {
    alert('Please fill all fields and upload an Excel/CSV file.')
    return
  }
  
  isSubmitting.value = true
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('name', form.value.name)
  formData.append('campaignType', 'META')
  formData.append('templateName', form.value.templateName)
  
  // We need the Meta Category. We can find it from the selected template.
  const tpl = metaTemplates.value.find(t => t.name === form.value.templateName)
  if (tpl) {
    formData.append('metaCategory', tpl.category)
  }
  
  formData.append('file', form.value.file)

  try {
    const res = await axios.post('/api/v1/campaigns', formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    
    // Automatically start it
    await axios.post(`/api/v1/campaigns/${res.data.campaignId}/start`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    alert('Meta Campaign created and started successfully!')
    closeModal()
    fetchCampaigns()
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to create campaign')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchCampaigns()
})
</script>
