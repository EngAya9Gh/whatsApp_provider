<template>
  <FeatureLock feature="BAILEYS_CAMPAIGN" requiredPlan="PRO">
    <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('campaigns.title') || 'Bulk Campaigns' }}</h1>
        <p class="page-subtitle">{{ $t('campaigns.subtitle') || 'Send messages to thousands of contacts via Excel/CSV safely.' }}</p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary">+ {{ $t('campaigns.new_campaign') || 'New Campaign' }}</button>
    </div>

    <!-- Error/Success Alerts -->
    <div v-if="error" class="error-msg">{{ error }}</div>
    <div v-if="success" class="success-msg">{{ success }}</div>

    <!-- Campaigns List -->
    <div v-if="loading && campaigns.length === 0" class="loading-state">Loading campaigns...</div>
    
    <div v-else-if="campaigns.length === 0" class="empty-state">
      No campaigns found. Start your first bulk campaign!
    </div>

    <div v-else class="table-container" style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden;">
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
          <tr>
            <th style="padding: 1rem; text-align: left; font-size: 0.85rem; font-weight: 600; color: #64748B; text-transform: uppercase;">Campaign</th>
            <th style="padding: 1rem; text-align: left; font-size: 0.85rem; font-weight: 600; color: #64748B; text-transform: uppercase;">Date</th>
            <th style="padding: 1rem; text-align: left; font-size: 0.85rem; font-weight: 600; color: #64748B; text-transform: uppercase;">Status</th>
            <th style="padding: 1rem; text-align: left; font-size: 0.85rem; font-weight: 600; color: #64748B; text-transform: uppercase;">Progress</th>
            <th style="padding: 1rem; text-align: left; font-size: 0.85rem; font-weight: 600; color: #64748B; text-transform: uppercase;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="campaign in campaigns" :key="campaign.id" style="border-bottom: 1px solid #F1F5F9; transition: background 0.2s;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='white'">
            <td style="padding: 1rem;">
              <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;">{{ campaign.name }}</div>
              <div class="truncate" style="max-width: 200px; font-size: 0.85rem; color: #64748B;">{{ campaign.message || 'Template Message' }}</div>
            </td>
            <td style="padding: 1rem; color: #475569; font-size: 0.9rem;">
              {{ new Date(campaign.createdAt).toLocaleDateString() }}
            </td>
            <td style="padding: 1rem;">
              <span :class="['status-badge', campaign.status.toLowerCase()]" style="display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
                <span class="status-dot" style="width:6px; height:6px; border-radius:50%; margin-right:6px;" :style="{background: campaign.status==='COMPLETED'?'#10b981':campaign.status==='RUNNING'?'#3b82f6':'#f59e0b'}"></span>
                {{ campaign.status }}
              </span>
            </td>
            <td style="padding: 1rem; min-width: 200px;">
              <div v-if="activeStats[campaign.id] && campaign.status !== 'PENDING'">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px; font-weight: 600; color: #334155;">
                  <span>{{ activeStats[campaign.id].sent }} / {{ activeStats[campaign.id].total }}</span>
                  <span style="color: #FF6600;">{{ Math.round((activeStats[campaign.id].sent / (activeStats[campaign.id].total || 1)) * 100) }}%</span>
                </div>
                <div style="height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; background: #FF6600; transition: width 0.3s ease;" :style="{ width: (activeStats[campaign.id].sent / (activeStats[campaign.id].total || 1) * 100) + '%' }"></div>
                </div>
                <div style="display: flex; gap: 12px; font-size: 0.75rem; margin-top: 6px; font-weight: 600;">
                  <span style="color: #10B981;">Sent: {{ activeStats[campaign.id].sent }}</span>
                  <span style="color: #EF4444;">Fail: {{ activeStats[campaign.id].failed }}</span>
                  <span style="color: #F59E0B;">Pend: {{ activeStats[campaign.id].pending }}</span>
                </div>
              </div>
              <div v-else-if="campaign.status === 'PENDING'" style="font-size: 0.85rem; color: #94A3B8; font-weight: 500;">
                Ready to start
              </div>
            </td>
            <td style="padding: 1rem;">
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button v-if="campaign.status === 'PENDING'" @click="startCampaign(campaign.id)" class="btn-start-modern" :disabled="startingId === campaign.id" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-radius: 6px; border: none; background: #FF6600; color: white; cursor: pointer; font-weight: 600;">
                  {{ startingId === campaign.id ? 'Starting...' : 'Start Now' }}
                </button>
                <button v-if="activeStats[campaign.id] && activeStats[campaign.id].failed > 0" @click="retryFailed(campaign.id)" class="btn-retry-modern" :disabled="retryingId === campaign.id" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-radius: 6px; border: 1px solid #EF4444; background: #FEF2F2; color: #EF4444; cursor: pointer; font-weight: 600;">
                  Retry
                </button>
                <button v-if="campaign.status !== 'PENDING'" @click="loadStats(campaign.id)" style="padding: 0.4rem; border: none; background: #F1F5F9; color: #64748B; border-radius: 6px; cursor: pointer;" title="Refresh Stats">
                  🔄
                </button>
                <router-link :to="`/campaigns/${campaign.id}`" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-radius: 6px; border: 1px solid #E2E8F0; background: white; color: #334155; text-decoration: none; font-weight: 600;">
                  Details
                </router-link>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Pagination -->
    <div v-if="totalPages >= 1" class="pagination" style="margin-top:2rem; display:flex; justify-content:center; align-items:center; gap:1rem;">
      <button :disabled="page === 1" @click="page--; fetchCampaigns()" class="btn-icon-soft">← Prev</button>
      <span>Page <strong>{{ page }}</strong> of <strong>{{ totalPages }}</strong></span>
      <button :disabled="page === totalPages || totalPages === 0" @click="page++; fetchCampaigns()" class="btn-icon-soft">Next →</button>
    </div>

    <!-- Create Campaign Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h2>{{ editingCampaign ? 'Edit Campaign' : ($t('campaigns.create_title') || 'Create New Campaign') }}</h2>
        
        <form @submit.prevent="submitCampaign">
          <div class="form-group">
            <label>Campaign Name</label>
            <input type="text" v-model="formData.name" placeholder="e.g. Summer Sale Offer" required class="form-input" />
          </div>

          <div class="form-group">
            <label>Sending Channel (WhatsApp Number)</label>
            <select v-model="formData.channelId" class="form-input">
              <option value="">Default Web QR Connection</option>
              <option v-for="ch in channels" :key="ch.id" :value="ch.id">
                +{{ ch.phoneNumber }} (Meta Cloud API)
              </option>
            </select>
            <small class="hint">Select the number to send from. Meta Channels are recommended for interactive buttons.</small>
          </div>

          <div class="form-group" v-if="!editingCampaign">
            <label>{{ $t('campaigns.upload_csv') || 'Upload Contacts (Excel / CSV)' }}</label>
            <input type="file" @change="handleFileChange" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" required class="form-input" />
            <small class="hint">{{ $t('campaigns.csv_help') || 'The system will automatically find the column containing phone numbers.' }}</small>
          </div>

          <div class="form-group">
            <label>Message Type</label>
            <div class="radio-group" style="display:flex; gap:1rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
              <label><input type="radio" v-model="formData.type" value="text" /> Text Message</label>
              <label v-if="!isMetaChannel"><input type="radio" v-model="formData.type" value="template" /> Local Template</label>
              <label v-if="isMetaChannel"><input type="radio" v-model="formData.type" value="meta_template" /> Meta Template (Official)</label>
              <label v-if="isMetaChannel"><input type="radio" v-model="formData.type" value="buttons" /> Buttons (Interactive)</label>
            </div>
          </div>

          <div class="form-group" v-if="formData.type === 'template'">
            <label>Select Local Template</label>
            <select v-model="formData.templateId" required class="form-input">
              <option value="" disabled>Choose a template...</option>
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
            </select>
          </div>

          <div class="form-group" v-if="formData.type === 'meta_template'">
            <label>Select Meta Template</label>
            <div v-if="metaTemplates.length === 0" style="color: #64748B; font-size: 0.85rem; margin-bottom: 0.5rem;">
              Fetching Meta templates... (Please wait)
            </div>
            <select v-model="formData.templateId" required class="form-input">
              <option value="" disabled>Choose an approved Meta template...</option>
              <option v-for="tpl in metaTemplates" :key="tpl.name + tpl.language" :value="tpl.name + '||' + tpl.language">
                {{ tpl.name }} ({{ tpl.language }}) - {{ tpl.category }} - {{ tpl.status }}
              </option>
            </select>
            <small class="hint">Only APPROVED templates will be delivered by Meta. Variables in Meta templates currently cannot be dynamic from CSV in this version.</small>
          </div>

          <div class="form-group" v-if="formData.type === 'text'">
            <label>Message Content</label>
            <textarea v-model="formData.message" rows="5" placeholder="Write your marketing message here..." required class="form-input"></textarea>
          </div>

          <!-- Buttons section -->
          <div class="form-group" v-if="formData.type === 'buttons'">
            <label>Message Content</label>
            <textarea v-model="formData.message" rows="4" placeholder="Write your message here..." required class="form-input"></textarea>
          </div>

          <div v-if="formData.type === 'buttons'" class="buttons-builder">
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <label style="font-weight:600;">🔘 Buttons (Max 3)</label>
              <button type="button" @click="addButton" class="btn-text" style="color: #10B981;" :disabled="formData.buttons.length >= 3">+ Add Button</button>
            </div>
            <div v-for="(btn, i) in formData.buttons" :key="i" class="button-row">
              <input v-model="btn.text" placeholder="Button text" class="form-input" style="flex:1;" maxlength="20" required />
              <select v-model="btn.type" class="form-input" style="width:120px;">
                <option value="reply">Quick Reply</option>
                <option value="url">URL Link</option>
              </select>
              <input v-if="btn.type === 'url'" v-model="btn.url" placeholder="https://..." class="form-input" style="flex:1;" />
              <button type="button" @click="removeButton(i)" class="btn-danger-text">✕</button>
            </div>
            <small class="hint">When a user taps a button, their response will be tracked in the Interactions tab.</small>
          </div>

          <div class="form-group">
            <label>{{ $t('campaigns.upload_media') || 'Attach Image (Optional)' }}</label>
            <input type="file" @change="handleImageChange" accept="image/*" class="form-input" />
          </div>

          <div class="form-group" style="display:flex; gap: 1rem;">
            <div style="flex:1;">
              <label>Start Date (تاريخ تفعيل التتبع) - Optional</label>
              <input type="datetime-local" v-model="formData.startDate" class="form-input" />
            </div>
            <div style="flex:1;">
              <label>End Date (تاريخ انتهاء التتبع) - Optional</label>
              <input type="datetime-local" v-model="formData.endDate" class="form-input" />
            </div>
          </div>
          <small class="hint" style="display:block; margin-bottom:1rem;">If you set these dates, any text replies received from users during this period will be recorded in the Campaign Interactions.</small>

          <div class="warning-box">
            <h4>⚠️ Anti-Ban Notice</h4>
            <p>Messages will be sent gradually (1 message every 5 seconds). The campaign will be saved as PENDING, and you can start it manually.</p>
          </div>


          <div class="modal-actions">
            <button type="button" @click="closeCreateModal" class="btn-secondary">{{ $t('campaigns.cancel') || 'Cancel' }}</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? '...' : (editingCampaign ? 'Save Changes' : ($t('campaigns.create') || 'Create Campaign')) }}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  </FeatureLock>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import axios from 'axios'
import FeatureLock from '../components/FeatureLock.vue'

const campaigns = ref([])
const templates = ref([])
const metaTemplates = ref([])
const channels = ref([])
const loading = ref(true)
const error = ref('')
const success = ref('')
const activeStats = ref({})
const page = ref(1)
const totalPages = ref(1)
let pollInterval = null

const showCreateModal = ref(false)
const saving = ref(false)
const selectedFile = ref(null)
const selectedImage = ref(null)
const startingId = ref(null)
const retryingId = ref(null)

const editingCampaign = ref(null)

const formData = ref({
  name: '',
  channelId: '',
  type: 'text',
  message: '',
  templateId: '',
  buttons: [{ text: '', type: 'reply', url: '' }],
  startDate: '',
  endDate: ''
})

const addButton = () => {
  if (formData.value.buttons.length < 3) {
    formData.value.buttons.push({ text: '', type: 'reply', url: '' })
  }
}

const removeButton = (index) => {
  formData.value.buttons.splice(index, 1)
}

const fetchTemplates = async () => {
  try {
    const res = await axios.get('/api/v1/templates', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    templates.value = res.data.data
  } catch (err) {}
}

const fetchChannels = async () => {
  const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
  if (!tenant.allowedFeatures || !tenant.allowedFeatures.includes('META_API')) {
    channels.value = []
    return
  }
  try {
    const res = await axios.get('/api/v1/meta/channels', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    channels.value = res.data.data
  } catch (err) {}
}

const isMetaChannel = computed(() => {
  const ch = channels.value.find(c => c.id === formData.value.channelId)
  return ch && ch.providerType === 'META_CLOUD'
})

watch(() => formData.value.channelId, async (newId) => {
  if (isMetaChannel.value) {
    formData.value.type = 'meta_template'
    try {
      metaTemplates.value = []
      const res = await axios.get(`/api/v1/meta/channel/${newId}/templates`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (res.data && res.data.data && res.data.data.data) {
        metaTemplates.value = res.data.data.data // Meta Graph API structure
      }
    } catch(e) {
      console.error('Failed to load meta templates', e)
    }
  } else {
    formData.value.type = 'text'
  }
})

const fetchCampaigns = async () => {
  loading.value = true
  try {
    const res = await axios.get(`/api/v1/campaigns?page=${page.value}&campaignType=BAILEYS`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    campaigns.value = res.data.data
    if (res.data.meta) {
      totalPages.value = res.data.meta.totalPages || 1
    }
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
  if (!editingCampaign.value && !selectedFile.value) return alert('Please upload an Excel/CSV file')
  
  saving.value = true
  error.value = ''
  success.value = ''
  
  try {
    const form = new FormData()
    form.append('name', formData.value.name)
    if (formData.value.channelId) {
      form.append('channelId', formData.value.channelId)
    }
    
    if (formData.value.type === 'text') {
      form.append('message', formData.value.message)
      form.append('interactiveType', 'TEXT')
    } else if (formData.value.type === 'template') {
      form.append('templateId', formData.value.templateId)
      form.append('interactiveType', 'TEXT')
    } else if (formData.value.type === 'meta_template') {
      const parts = formData.value.templateId.split('||') // name||language
      form.append('message', parts[0]) // use message field for templateName
      form.append('templateId', parts[1]) // use templateId field for languageCode
      form.append('interactiveType', 'META_TEMPLATE')
    } else if (formData.value.type === 'buttons') {
      form.append('message', formData.value.message)
      form.append('interactiveType', 'BUTTONS')
      // Filter out empty buttons
      const validButtons = formData.value.buttons.filter(b => b.text.trim())
      if (validButtons.length === 0) {
        saving.value = false
        return alert('Please add at least one button')
      }
      form.append('buttons', JSON.stringify(validButtons))
    }
    
    if (!editingCampaign.value) {
      form.append('file', selectedFile.value)
    }
    if (selectedImage.value) form.append('image', selectedImage.value)
    if (formData.value.startDate) {
      form.append('startDate', new Date(formData.value.startDate).toISOString())
    }
    if (formData.value.endDate) {
      form.append('endDate', new Date(formData.value.endDate).toISOString())
    }

    let res;
    if (editingCampaign.value) {
      res = await axios.put(`/api/v1/campaigns/${editingCampaign.value.id}`, form, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      })
    } else {
      res = await axios.post('/api/v1/campaigns', form, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      })
    }
    
    success.value = res.data.message || (editingCampaign.value ? 'Campaign Updated!' : 'Campaign Created!')
    closeCreateModal()
    
    fetchCampaigns()
    setTimeout(() => { success.value = '' }, 5000)
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to create campaign.'
  } finally {
    saving.value = false
  }
}

const closeCreateModal = () => {
  showCreateModal.value = false
  editingCampaign.value = null
  selectedFile.value = null
  selectedImage.value = null
  formData.value = { name: '', channelId: '', type: 'text', message: '', templateId: '', buttons: [{ text: '', type: 'reply', url: '' }], startDate: '', endDate: '' }
}

const toLocalString = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0,16)
}

const editCampaign = (campaign) => {
  editingCampaign.value = campaign
  formData.value.name = campaign.name
  
  if (campaign.interactiveType === 'TEXT' && campaign.templateId) {
    formData.value.type = 'template'
    formData.value.templateId = campaign.templateId
  } else if (campaign.interactiveType === 'BUTTONS') {
    formData.value.type = 'buttons'
    formData.value.message = campaign.message
    try {
      formData.value.buttons = JSON.parse(campaign.buttons)
    } catch(e) {}
  } else {
    formData.value.type = 'text'
    formData.value.message = campaign.message
  }
  
  formData.value.startDate = toLocalString(campaign.startDate)
  formData.value.endDate = toLocalString(campaign.endDate)
  formData.value.channelId = campaign.channelId || ''
  
  showCreateModal.value = true
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

const retryFailed = async (id) => {
  retryingId.value = id
  error.value = ''
  success.value = ''
  try {
    const res = await axios.post(`/api/v1/campaigns/${id}/retry`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    success.value = res.data.message || 'Retrying failed numbers...'
    loadStats(id)
    setTimeout(() => { success.value = '' }, 5000)
  } catch (err) {
    error.value = err.response?.data?.error || err.response?.data?.message || 'Failed to retry campaign.'
  } finally {
    retryingId.value = null
  }
}


onMounted(() => {
  fetchCampaigns()
  fetchTemplates()
  fetchChannels()
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

.campaigns-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem; }

.campaign-card { background: white; border-radius: 16px; padding: 1.5rem; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.campaign-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); }

.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
.campaign-name { font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.2; }
.campaign-date { font-size: 0.75rem; color: #94A3B8; margin-top: 0.25rem; font-weight: 500; }

.status-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.status-badge.running { background: #EFF6FF; color: #1D4ED8; }
.status-badge.running .status-dot { background: #3B82F6; }
.status-badge.completed { background: #F0FDF4; color: #15803D; }
.status-badge.completed .status-dot { background: #10B981; }
.status-badge.pending { background: #F8FAFC; color: #475569; }
.status-badge.pending .status-dot { background: #94A3B8; }
.status-badge.failed { background: #FEF2F2; color: #DC2626; }
.status-badge.failed .status-dot { background: #EF4444; }
.status-badge.sent { background: #ECFDF5; color: #047857; }
.status-badge.sent .status-dot { background: #10B981; }

.campaign-content { flex: 1; display: flex; gap: 0.75rem; background: #F8FAFC; padding: 1rem; border-radius: 10px; font-size: 0.9rem; color: #475569; margin-bottom: 1.5rem; border: 1px solid #F1F5F9; }
.quote-icon { color: #CBD5E1; flex-shrink: 0; margin-top: 2px; }
.truncate { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0; line-height: 1.5; font-style: italic; }

.campaign-stats-modern { background: white; margin-bottom: 1.5rem; }
.progress-container { margin-bottom: 1rem; }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.progress-title { font-size: 0.8rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
.progress-percentage { font-size: 0.85rem; font-weight: 700; color: #0F172A; }
.progress-bar-modern { width: 100%; height: 8px; background: #F1F5F9; border-radius: 999px; overflow: hidden; }
.progress-fill-modern { height: 100%; background: linear-gradient(90deg, #FF6600 0%, #F97316 100%); transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 999px; }

.stats-mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
.stat-pill { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 0.6rem 0.4rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
.stat-pill.success { background: #F0FDF4; border-color: #DCFCE7; }
.stat-pill.warning { background: #FFFBEB; border-color: #FEF3C7; }
.stat-pill.danger { background: #FEF2F2; border-color: #FEE2E2; }
.stat-pill-label { font-size: 0.65rem; font-weight: 700; color: #64748B; text-transform: uppercase; }
.stat-pill.success .stat-pill-label { color: #166534; }
.stat-pill.warning .stat-pill-label { color: #B45309; }
.stat-pill.danger .stat-pill-label { color: #991B1B; }
.stat-pill-value { font-size: 0.9rem; font-weight: 800; color: #0F172A; }
.font-mono { font-family: 'JetBrains Mono', monospace; }

.campaign-pending-state { display: flex; align-items: center; gap: 1rem; background: #FFFBEB; padding: 1.25rem; border-radius: 12px; border: 1px dashed #FCD34D; color: #B45309; margin-bottom: 1.5rem; }
.campaign-pending-state svg { color: #F59E0B; flex-shrink: 0; }
.campaign-pending-state strong { display: block; font-size: 0.95rem; margin-bottom: 0.25rem; }
.campaign-pending-state p { margin: 0; font-size: 0.85rem; color: #92400E; }

.card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 1.25rem; }
.footer-actions-left { display: flex; gap: 0.5rem; }
.footer-actions-right { display: flex; gap: 0.75rem; align-items: center; }

.btn-icon-soft { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; }
.btn-icon-soft.amber { background: #FEF3C7; color: #D97706; }
.btn-icon-soft.amber:hover { background: #FDE68A; color: #B45309; }
.btn-icon-soft.blue { background: #F1F5F9; color: #64748B; }
.btn-icon-soft.blue:hover { background: #E2E8F0; color: #334155; }
.refresh-btn:active svg { transform: rotate(180deg); transition: transform 0.3s; }

.btn-start-modern { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.9rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(16,185,129,0.2); }
.btn-start-modern:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16,185,129,0.3); }
.btn-start-modern:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-retry-modern { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.9rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(245,158,11,0.2); }
.btn-retry-modern:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(245,158,11,0.3); }
.btn-retry-modern:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-details-modern { background: linear-gradient(135deg, #FF6600 0%, #E65C00 100%); color: white; text-decoration: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; box-shadow: 0 4px 10px rgba(255,102,0,0.2); }
.btn-details-modern:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(255,102,0,0.3); }

@keyframes spin { 100% { transform: rotate(360deg); } }
.spin-icon { animation: spin 1s linear infinite; }

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

/* Tabs */
.tab-btn { background: none; border: none; padding: 0.6rem 1rem; font-weight: 600; cursor: pointer; font-size: 0.9rem; color: #64748B; border-bottom: 3px solid transparent; transition: all 0.2s; }
.tab-btn.active { color: #FF6600; border-bottom-color: #FF6600; }
.tab-btn:hover { color: #FF6600; }

/* Buttons builder */
.buttons-builder { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; }
.button-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
.btn-danger-text { background: none; border: none; color: #DC2626; font-size: 1.2rem; cursor: pointer; padding: 0 0.25rem; font-weight: bold; }
.btn-preview-badge { background: #E0F2FE; color: #0369A1; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; border: 1px solid #BAE6FD; }

/* Interaction stats */
.interactions-stats-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.istat-card { flex: 1; min-width: 100px; padding: 1rem; border-radius: 10px; text-align: center; }
.istat-card.green { background: #F0FDF4; border: 1px solid #BBF7D0; }
.istat-card.red { background: #FEF2F2; border: 1px solid #FECACA; }
.istat-card.blue { background: #EFF6FF; border: 1px solid #BFDBFE; }
.istat-num { font-size: 2rem; font-weight: 800; }
.istat-card.green .istat-num { color: #15803D; }
.istat-card.red .istat-num { color: #DC2626; }
.istat-card.blue .istat-num { color: #1D4ED8; }
.istat-label { font-size: 0.8rem; font-weight: 600; color: #64748B; margin-top: 0.25rem; }

/* Phone tags */
.phone-tag { background: #F1F5F9; color: #334155; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.8rem; font-family: monospace; }

/* Campaign info grid */
.campaign-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 1.25rem; border-radius: 8px; margin-bottom: 1rem; }
.info-item { display: flex; flex-direction: column; gap: 0.25rem; }
.info-item.full-width { grid-column: 1 / -1; }
.info-item .label { font-size: 0.78rem; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.message-box { background: white; border: 1px solid #E2E8F0; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; white-space: pre-wrap; max-height: 120px; overflow-y: auto; }

</style>
