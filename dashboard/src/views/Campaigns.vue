<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Bulk Campaigns</h1>
        <p class="page-subtitle">Send messages to thousands of contacts via Excel/CSV safely.</p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary">+ New Campaign</button>
    </div>

    <!-- Error/Success Alerts -->
    <div v-if="error" class="error-msg">{{ error }}</div>
    <div v-if="success" class="success-msg">{{ success }}</div>

    <!-- Campaigns List -->
    <div v-if="loading && campaigns.length === 0" class="loading-state">Loading campaigns...</div>
    
    <div v-else-if="campaigns.length === 0" class="empty-state">
      No campaigns found. Start your first bulk campaign!
    </div>

    <div v-else class="campaigns-grid">
      <div v-for="campaign in campaigns" :key="campaign.id" class="campaign-card">
        <div class="card-header">
          <h3 class="campaign-name">{{ campaign.name }}</h3>
          <span :class="['status-badge', campaign.status.toLowerCase()]">{{ campaign.status }}</span>
        </div>
        
        <div class="campaign-content">
          <p class="truncate">{{ campaign.message || 'Template Message' }}</p>
        </div>
        
        <div class="campaign-stats" v-if="activeStats[campaign.id] && campaign.status !== 'PENDING'">
          <div class="stat-row">
            <span>Progress:</span>
            <strong>{{ activeStats[campaign.id].sent }} / {{ activeStats[campaign.id].total }}</strong>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (activeStats[campaign.id].sent / activeStats[campaign.id].total * 100) + '%' }"></div>
          </div>
          <div class="stat-row" style="margin-top: 0.5rem; font-size: 0.8rem; color: #64748B;">
            <span>Pending: {{ activeStats[campaign.id].pending }}</span>
            <span style="color: #DC2626;">Failed: {{ activeStats[campaign.id].failed }}</span>
          </div>
        </div>
        <div v-else-if="campaign.status === 'PENDING'" class="campaign-pending-state">
          Campaign is ready. Click start to begin sending.
        </div>

        <div class="card-footer">
          <small>Created: {{ new Date(campaign.createdAt).toLocaleDateString() }}</small>
          <div style="display: flex; gap: 0.5rem;">
            <button v-if="campaign.status === 'PENDING'" @click="startCampaign(campaign.id)" class="btn-start" :disabled="startingId === campaign.id">
              {{ startingId === campaign.id ? 'Starting...' : '▶ Start' }}
            </button>
            <button v-else @click="loadStats(campaign.id)" class="btn-text">Refresh Stats</button>
            <button v-if="campaign.status !== 'PENDING'" @click="openTargetsModal(campaign.id)" class="btn-text" style="color: #3B82F6;">Details</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Campaign Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h2>Create New Campaign</h2>
        
        <form @submit.prevent="submitCampaign">
          <div class="form-group">
            <label>Campaign Name</label>
            <input type="text" v-model="formData.name" placeholder="e.g. Summer Sale Offer" required class="form-input" />
          </div>

          <div class="form-group">
            <label>Upload Contacts (Excel / CSV)</label>
            <input type="file" @change="handleFileChange" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" required class="form-input" />
            <small class="hint">The system will automatically find the column containing phone numbers.</small>
          </div>

          <div class="form-group">
            <label>Message Type</label>
            <div class="radio-group" style="display:flex; gap:1rem; margin-bottom: 0.5rem;">
              <label><input type="radio" v-model="formData.type" value="text" /> Text Message</label>
              <label><input type="radio" v-model="formData.type" value="template" /> Template</label>
            </div>
          </div>

          <div class="form-group" v-if="formData.type === 'text'">
            <label>Message Content</label>
            <textarea v-model="formData.message" rows="5" placeholder="Write your marketing message here..." required class="form-input"></textarea>
          </div>

          <div class="form-group" v-if="formData.type === 'template'">
            <label>Select Template</label>
            <select v-model="formData.templateId" required class="form-input">
              <option value="" disabled>Choose a template...</option>
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label>Attach Image (Optional)</label>
            <input type="file" @change="handleImageChange" accept="image/*" class="form-input" />
            <small class="hint">This image will be sent along with your message.</small>
          </div>

          <div class="warning-box">
            <h4>⚠️ Anti-Ban Notice</h4>
            <p>Messages will be sent gradually (1 message every 5 seconds). The campaign will be saved as PENDING, and you can start it manually.</p>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showCreateModal = false" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Create Campaign' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Targets Modal -->
    <div v-if="showTargetsModal" class="modal-overlay" @click.self="showTargetsModal = false">
      <div class="modal targets-modal">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="margin: 0;">Campaign Details: {{ selectedCampaign?.name }}</h2>
          <button v-if="hasFailedTargets" @click="retryFailed" class="btn-primary" style="padding: 0.5rem 1rem;">
            Retry Failed Numbers
          </button>
        </div>
        
        <!-- Campaign Info Section -->
        <div class="campaign-info-card" v-if="selectedCampaign">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Campaign Title:</span>
              <span style="font-weight: 700; color: #1E293B;">{{ selectedCampaign.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">Status:</span>
              <span :class="['status-badge', selectedCampaign.status.toLowerCase()]">{{ selectedCampaign.status }}</span>
            </div>
            <div class="info-item">
              <span class="label">Created:</span>
              <span>{{ new Date(selectedCampaign.createdAt).toLocaleString() }}</span>
            </div>
            <div class="info-item" v-if="selectedCampaign.mediaPath">
              <span class="label">Media Attachment:</span>
              <img v-if="selectedCampaign.mediaMime?.startsWith('image/')" :src="'/' + selectedCampaign.mediaPath" class="media-preview-img" />
              <a v-else :href="'/' + selectedCampaign.mediaPath" target="_blank" style="color: #3B82F6;">View Attached Document</a>
            </div>
            <div class="info-item full-width">
              <span class="label">Message Content:</span>
              <div class="message-preview">{{ getMessageContent(selectedCampaign) }}</div>
            </div>
          </div>
        </div>

        <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Target Numbers</h3>
        <div v-if="targetsLoading" class="loading-state">Loading numbers...</div>
        
        <div v-else class="targets-container">
          <table class="targets-table">
            <thead>
              <tr>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Error Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="target in targets" :key="target.id">
                <td>{{ target.phone }}</td>
                <td>
                  <span :class="['status-badge', target.status.toLowerCase()]">{{ target.status }}</span>
                </td>
                <td style="color: #DC2626; font-size: 0.85rem;">{{ target.error || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-actions">
          <button type="button" @click="showTargetsModal = false" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'

const campaigns = ref([])
const templates = ref([])
const loading = ref(true)
const error = ref('')
const success = ref('')
const activeStats = ref({})
let pollInterval = null

const showCreateModal = ref(false)
const saving = ref(false)
const selectedFile = ref(null)
const selectedImage = ref(null)
const startingId = ref(null)

const showTargetsModal = ref(false)
const targets = ref([])
const targetsLoading = ref(false)
const selectedCampaignId = ref(null)
const selectedCampaign = computed(() => campaigns.value.find(c => c.id === selectedCampaignId.value))

const formData = ref({
  name: '',
  type: 'text',
  message: '',
  templateId: ''
})

const hasFailedTargets = computed(() => targets.value.some(t => t.status === 'FAILED'))

const getMessageContent = (campaign) => {
  if (campaign.message) return campaign.message;
  if (campaign.templateId) {
    const tpl = templates.value.find(t => t.id === campaign.templateId);
    return tpl ? `[Template: ${tpl.name}]\n\n${tpl.content}` : 'Template Message';
  }
  return 'No message content';
}

const fetchTemplates = async () => {
  try {
    const res = await axios.get('/api/v1/templates', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    templates.value = res.data.data
  } catch (err) {}
}

const fetchCampaigns = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/campaigns', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    campaigns.value = res.data.data
    campaigns.value.forEach(c => {
      if (c.status !== 'PENDING') loadStats(c.id)
    })
  } catch (err) {
    error.value = 'Failed to load campaigns.'
  } finally {
    loading.value = false
  }
}

const loadStats = async (id) => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${id}/stats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    activeStats.value[id] = res.data.data.stats
    const campaign = campaigns.value.find(c => c.id === id)
    if (campaign && res.data.data.status) {
      campaign.status = res.data.data.status
    }
  } catch (err) {
    console.error('Failed to load stats for', id)
  }
}

const handleFileChange = (e) => {
  if (e.target.files && e.target.files[0]) selectedFile.value = e.target.files[0]
}
const handleImageChange = (e) => {
  if (e.target.files && e.target.files[0]) selectedImage.value = e.target.files[0]
}

const submitCampaign = async () => {
  if (!selectedFile.value) return alert('Please upload an Excel/CSV file')
  
  saving.value = true
  error.value = ''
  success.value = ''
  
  try {
    const form = new FormData()
    form.append('name', formData.value.name)
    if (formData.value.type === 'text') form.append('message', formData.value.message)
    else form.append('templateId', formData.value.templateId)
    
    form.append('file', selectedFile.value)
    if (selectedImage.value) form.append('image', selectedImage.value)

    const res = await axios.post('/api/v1/campaigns', form, {
      headers: { 
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    
    success.value = res.data.message || 'Campaign Created!'
    showCreateModal.value = false
    selectedFile.value = null
    selectedImage.value = null
    formData.value = { name: '', type: 'text', message: '', templateId: '' }
    
    fetchCampaigns()
    setTimeout(() => { success.value = '' }, 5000)
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to create campaign.'
  } finally {
    saving.value = false
  }
}

const startCampaign = async (id) => {
  startingId.value = id
  error.value = ''
  success.value = ''
  try {
    const res = await axios.post(`/api/v1/campaigns/${id}/start`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    success.value = res.data.message || 'Campaign started!'
    fetchCampaigns()
    setTimeout(() => { success.value = '' }, 5000)
  } catch (err) {
    error.value = err.response?.data?.error || err.response?.data?.message || 'Failed to start campaign.'
  } finally {
    startingId.value = null
  }
}

const openTargetsModal = async (id) => {
  selectedCampaignId.value = id
  showTargetsModal.value = true
  targetsLoading.value = true
  targets.value = []
  
  try {
    const res = await axios.get(`/api/v1/campaigns/${id}/targets`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    targets.value = res.data.data
  } catch (err) {
    error.value = 'Failed to load campaign targets.'
  } finally {
    targetsLoading.value = false
  }
}

const retryFailed = async () => {
  if (!selectedCampaignId.value) return
  error.value = ''
  success.value = ''
  try {
    const res = await axios.post(`/api/v1/campaigns/${selectedCampaignId.value}/retry`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    success.value = res.data.message || 'Retrying failed numbers...'
    showTargetsModal.value = false
    fetchCampaigns()
    setTimeout(() => { success.value = '' }, 5000)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to retry campaign.'
  }
}

onMounted(() => {
  fetchCampaigns()
  fetchTemplates()
  pollInterval = setInterval(() => {
    campaigns.value.filter(c => c.status === 'RUNNING').forEach(c => {
      loadStats(c.id)
    })
  }, 10000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.page-container { max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.page-title { font-size: 1.875rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem; }
.page-subtitle { color: #64748B; font-size: 1rem; }

.btn-primary { background: #FF6600; color: white; padding: 0.75rem 1.25rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary:hover { background: #cc5200; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-secondary { background: #E2E8F0; color: #475569; padding: 0.75rem 1.25rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary:hover { background: #CBD5E1; }
.btn-text { background: none; border: none; font-weight: 600; cursor: pointer; padding: 0; }
.btn-text:hover { text-decoration: underline; }
.btn-start { background: #10B981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-start:hover { background: #059669; }
.btn-start:disabled { opacity: 0.7; cursor: not-allowed; }

.campaigns-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }

.campaign-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.campaign-name { font-size: 1.1rem; font-weight: 700; color: #1E293B; margin: 0; }

.status-badge { padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
.status-badge.running { background: #DBEAFE; color: #1D4ED8; }
.status-badge.completed { background: #DCFCE7; color: #15803D; }
.status-badge.pending { background: #F1F5F9; color: #475569; }
.status-badge.failed { background: #FEE2E2; color: #DC2626; }
.status-badge.sent { background: #DCFCE7; color: #166534; }

.campaign-content { flex: 1; background: #F8FAFC; padding: 1rem; border-radius: 8px; font-size: 0.9rem; color: #475569; margin-bottom: 1rem; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }

.campaign-stats { background: #FFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
.campaign-pending-state { text-align: center; background: #FFFBEB; padding: 1rem; border-radius: 8px; border: 1px dashed #FDE68A; color: #B45309; font-size: 0.9rem; margin-bottom: 1rem; }
.stat-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; margin-bottom: 0.5rem; }
.progress-bar { width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: #FF6600; transition: width 0.5s ease; }

.card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 1rem; color: #94A3B8; }

.empty-state { text-align: center; padding: 4rem; background: white; border-radius: 12px; color: #64748B; border: 1px dashed #CBD5E1; }
.loading-state { text-align: center; padding: 2rem; color: #64748B; }

.error-msg { background: #FEF2F2; color: #DC2626; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #FECACA; }
.success-msg { background: #F0FDF4; color: #166534; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #BBF7D0; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 50; padding: 1rem; }
.modal { background: white; padding: 2rem; border-radius: 12px; width: 100%; max-width: 550px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); max-height: 90vh; overflow-y: auto; }
.targets-modal { max-width: 800px; }
.modal h2 { margin-top: 0; margin-bottom: 1.5rem; color: #0F172A; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #334155; font-size: 0.9rem; }
.form-input { width: 100%; padding: 0.75rem; border: 1px solid #CBD5E1; border-radius: 6px; font-family: inherit; }
.form-input:focus { outline: none; border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.hint { font-size: 0.8rem; color: #64748B; margin-top: 0.5rem; display: block; }
.warning-box { background: #FEF3C7; border: 1px solid #FDE68A; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
.warning-box h4 { color: #B45309; margin-top: 0; margin-bottom: 0.5rem; }
.warning-box p { color: #92400E; font-size: 0.85rem; margin: 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }

.campaign-info-card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.info-item { display: flex; flex-direction: column; }
.info-item.full-width { grid-column: 1 / -1; }
.info-item .label { font-size: 0.8rem; color: #64748B; font-weight: 600; text-transform: uppercase; margin-bottom: 0.25rem; }
.message-preview { background: white; border: 1px solid #E2E8F0; padding: 1rem; border-radius: 6px; font-size: 0.95rem; color: #334155; white-space: pre-wrap; }
.media-preview-img { max-width: 100%; max-height: 150px; border-radius: 8px; border: 1px solid #E2E8F0; margin-top: 0.5rem; object-fit: contain; }

.targets-container { overflow-x: auto; max-height: 400px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 8px; }
.targets-table { width: 100%; border-collapse: collapse; text-align: left; }
.targets-table th, .targets-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #E2E8F0; }
.targets-table th { background: #F8FAFC; position: sticky; top: 0; font-size: 0.85rem; color: #64748B; text-transform: uppercase; }
.targets-table td { font-size: 0.95rem; color: #334155; }
</style>
