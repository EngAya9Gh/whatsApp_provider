<template>
  <div class="page-container p-6 w-full max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Meta Send Message</h1>
        <p class="text-slate-500 mt-1">Send a message or a Meta Template instantly</p>
      </div>
    </div>

    <div class="grid-layout">
      <!-- Sender Form -->
      <div class="card form-card">
        <form @submit.prevent="handleSend">
          <div class="form-group">
            <label>{{ $t('send_message.type') || 'Message Type' }}</label>
            <div class="radio-group" style="display:flex; flex-wrap:wrap; gap:1rem;">
              <label class="radio-label">
                <input type="radio" v-model="messageType" value="meta_template" /> Meta Template
              </label>
              <label class="radio-label">
                <input type="radio" v-model="messageType" value="text" /> Free-form Text (24h Window)
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>{{ $t('send_message.phone') || 'Recipient Phone Number' }}</label>
            <input type="text" v-model="phone" :placeholder="$t('send_message.phone_placeholder') || '966500000000'" required class="form-input" />
            <small class="hint">{{ $t('send_message.phone_hint') || 'Include country code without + or 00.' }}</small>
          </div>

          <div class="form-group">
            <label>Sending Channel</label>
            <select v-model="channelId" class="form-input" required>
              <option value="" disabled>Select Meta Channel</option>
              <option v-for="ch in channels" :key="ch.id" :value="ch.id">
                +{{ ch.phoneNumber }} (Meta Cloud)
              </option>
            </select>
          </div>

          <!-- Text Input -->
          <div v-if="messageType === 'text'" class="form-group">
            <label>{{ $t('send_message.message') || 'Message Content' }}</label>
            <textarea v-model="textContent" rows="4" placeholder="Hello, this is a custom message..." required class="form-input"></textarea>
            <small class="hint">Note: You can only send free-form text if the user has messaged you within the last 24 hours.</small>
          </div>

          <div v-if="messageType === 'meta_template'" class="form-group">
            <label>Select Meta Template</label>
            <div v-if="metaTemplates.length === 0" style="color: #64748B; font-size: 0.85rem; margin-bottom: 0.5rem;">
              Fetching Meta templates...
            </div>
            <select v-model="selectedTemplateId" required class="form-input">
              <option value="" disabled>Choose an approved Meta template...</option>
              <option v-for="tpl in metaTemplates" :key="tpl.name + tpl.language" :value="tpl.name + '||' + tpl.language">
                {{ tpl.name }} ({{ tpl.language }})
              </option>
            </select>
          </div>

          <div v-if="error" class="error-msg">{{ error }}</div>
          <div v-if="success" class="success-msg">{{ success }}</div>

          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? 'Sending...' : 'Send Meta Message' }}
          </button>
        </form>
      </div>

      <!-- Preview or Info -->
      <div class="card info-card">
        <h2 class="card-title">How Meta API works</h2>
        <p class="info-text">
          Sending messages through Meta Cloud API uses your official WABA channel.
        </p>
        <code class="endpoint-code">POST /api/v1/{{ 
          messageType === 'meta_template' ? 'message/send-meta-template' : 'message/send'
        }}</code>
        
        <div class="tips-box">
          <h4>💡 Meta Pro Tips</h4>
          <ul>
            <li>To initiate a new conversation, you MUST use a pre-approved Meta Template.</li>
            <li>Free-form text messages can only be sent if the user has messaged you within the last 24 hours.</li>
            <li>Templates require Meta approval before they can be sent.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'

const phone = ref('')
const channelId = ref('')
const messageType = ref('text')
const textContent = ref('')
const selectedFile = ref(null)
const caption = ref('')

// Interactive message refs
const buttonsList = ref([{ text: '', type: 'reply', url: '' }])
const listTitle = ref('')
const listBody = ref('')
const listButtonText = ref('')
const listSections = ref([{
  title: 'Section 1',
  rows: [{ rowId: 'row_1', title: 'Option 1', description: '' }]
}])
const locationLat = ref('')
const locationLng = ref('')
const locationName = ref('')
const locationAddress = ref('')

// Methods for buttons
const addSendButton = () => { if (buttonsList.value.length < 3) buttonsList.value.push({ text: '', type: 'reply', url: '' }) }
const removeSendButton = (idx) => { buttonsList.value.splice(idx, 1) }

// Methods for list
const addSection = () => { listSections.value.push({ title: `Section ${listSections.value.length + 1}`, rows: [{ rowId: `row_${Date.now()}`, title: 'New Option', description: '' }] }) }
const removeSection = (idx) => { listSections.value.splice(idx, 1) }
const addRow = (sIdx) => { listSections.value[sIdx].rows.push({ rowId: `row_${Date.now()}`, title: 'New Option', description: '' }) }
const removeRow = (sIdx, rIdx) => { listSections.value[sIdx].rows.splice(rIdx, 1) }

// Template specific refs
const templates = ref([])
const metaTemplates = ref([])
const selectedTemplateId = ref('')
const templateVariables = ref([])
const variableValues = ref({})

const loading = ref(false)
const error = ref('')
const success = ref('')
const channels = ref([])

const isMetaChannel = computed(() => {
  const ch = channels.value.find(c => c.id === channelId.value)
  return ch && ch.providerType === 'META_CLOUD'
})

watch(channelId, async (newId) => {
  if (isMetaChannel.value) {
    messageType.value = 'meta_template'
    try {
      metaTemplates.value = []
      const res = await axios.get(`/api/v1/meta/channel/${newId}/templates`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (res.data && res.data.data && res.data.data.data) {
        metaTemplates.value = res.data.data.data
      }
    } catch(e) {}
  } else {
    if (messageType.value === 'meta_template') messageType.value = 'text'
  }
})

const handleFileChange = (e) => {
  if (e.target.files && e.target.files[0]) {
    selectedFile.value = e.target.files[0]
  }
}

const fetchTemplates = async () => {
  try {
    const res = await axios.get('/api/v1/templates', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    templates.value = res.data.data
  } catch (err) {
    console.error('Failed to load templates', err)
  }
}

const fetchChannels = async () => {
  const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
  if (!tenant.allowedFeatures || !tenant.allowedFeatures.includes('META_API')) {
    channels.value = []
    return
  }
  try {
    const res = await axios.get('/api/v1/channels', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    channels.value = res.data.data.filter(c => c.providerType === 'META_CLOUD')
    if (channels.value.length > 0) { channelId.value = channels.value[0].id }
  } catch (err) {
    console.error('Failed to load channels', err)
  }
}

onMounted(() => {
  fetchTemplates()
  fetchChannels()
})

// Extract variables like {{name}} from selected template
const extractVariables = () => {
  const selectedTpl = templates.value.find(t => t.id === selectedTemplateId.value)
  templateVariables.value = []
  variableValues.value = {}
  
  if (selectedTpl && selectedTpl.content) {
    const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
    let match;
    const foundVars = new Set();
    while ((match = regex.exec(selectedTpl.content)) !== null) {
      foundVars.add(match[1]);
    }
    templateVariables.value = Array.from(foundVars);
    
    // Initialize empty values
    templateVariables.value.forEach(v => {
      variableValues.value[v] = '';
    });
  }
}

const handleSend = async () => {
  const tokenToUse = localStorage.getItem('token')
  if (!tokenToUse) {
    error.value = 'No authentication token found. Please login again.'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  const config = { headers: { Authorization: `Bearer ${tokenToUse}` } }

  try {
    let res;
    if (messageType.value === 'text') {
      res = await axios.post('/api/v1/message/send', {
        phone: phone.value,
        message: textContent.value,
        channel_id: channelId.value
      }, config)
    } else if (messageType.value === 'buttons') {
      const validButtons = buttonsList.value.filter(b => b.text.trim())
      if (validButtons.length === 0) throw new Error('Add at least one button')
      
      let formData = new FormData()
      formData.append('phone', phone.value)
      formData.append('text', textContent.value)
      formData.append('buttons', JSON.stringify(validButtons))
      if (channelId.value) formData.append('channel_id', channelId.value)
      if (selectedFile.value) {
        formData.append('image', selectedFile.value)
      }
      
      res = await axios.post('/api/v1/message/send-buttons', formData, {
        headers: { Authorization: `Bearer ${tokenToUse}`, 'Content-Type': 'multipart/form-data' }
      })
    } else if (messageType.value === 'list') {
      res = await axios.post('/api/v1/message/send-list', {
        phone: phone.value,
        title: listTitle.value,
        body: listBody.value,
        buttonText: listButtonText.value,
        sections: listSections.value,
        channel_id: channelId.value
      }, config)
    } else if (messageType.value === 'location') {
      res = await axios.post('/api/v1/message/send-location', {
        phone: phone.value,
        latitude: parseFloat(locationLat.value),
        longitude: parseFloat(locationLng.value),
        name: locationName.value,
        address: locationAddress.value,
        channel_id: channelId.value
      }, config)
    } else if (messageType.value === 'template') {
      if (!selectedTemplateId.value) throw new Error('Please select a template');
      res = await axios.post('/api/v1/templates/send', {
        phone: phone.value,
        templateId: selectedTemplateId.value,
        variables: variableValues.value,
        channel_id: channelId.value
      }, config)
    } else if (messageType.value === 'meta_template') {
      if (!selectedTemplateId.value) throw new Error('Please select a Meta template');
      const parts = selectedTemplateId.value.split('||'); // name||language
      res = await axios.post('/api/v1/message/send-meta-template', {
        phone: phone.value,
        templateName: parts[0],
        languageCode: parts[1],
        components: [],
        channelId: channelId.value
      }, config)
    } else {
      if (!selectedFile.value) {
        throw new Error('Please select a file to upload')
      }
      
      const formData = new FormData()
      formData.append('phone', phone.value)
      formData.append('type', messageType.value)
      formData.append('caption', caption.value)
      formData.append('file', selectedFile.value)
      if (channelId.value) formData.append('channel_id', channelId.value)

      res = await axios.post('/api/v1/message/upload-media', formData, {
        headers: { 
          Authorization: `Bearer ${tokenToUse}`,
          'Content-Type': 'multipart/form-data'
        }
      })
    }

    success.value = res.data.message || 'Message sent successfully!'
    
    // Clear form on success
    if (messageType.value === 'text' || messageType.value === 'buttons') textContent.value = ''
    selectedFile.value = null
    caption.value = ''
    buttonsList.value = [{ text: '', type: 'reply', url: '' }]
    if (messageType.value === 'template') {
      extractVariables(); // Reset variable values
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to send message.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-container { max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 2rem; }
.page-title { font-size: 1.875rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem; }
.page-subtitle { color: #64748B; font-size: 1rem; }

@media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }

.card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05); }
.card-title { font-size: 1.25rem; font-weight: 700; color: #1E293B; margin-bottom: 1.5rem; border-bottom: 1px solid #E2E8F0; padding-bottom: 1rem; }

.form-group { margin-bottom: 1.5rem; }
label { display: block; font-size: 0.875rem; font-weight: 600; color: #334155; margin-bottom: 0.5rem; }
.form-input { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 0.95rem; transition: border-color 0.2s; font-family: inherit; }
.form-input:focus { outline: none; border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.hint { display: block; color: #94A3B8; font-size: 0.8rem; margin-top: 0.25rem; }

.type-selector { display: flex; gap: 1.5rem; }
.radio-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; color: #475569; cursor: pointer; }
.radio-label input { accent-color: #FF6600; width: 1.1rem; height: 1.1rem; cursor: pointer; }

.api-key-input { border-color: #cbd5e1; background: #f8fafc; }

.btn-submit { width: 100%; padding: 0.875rem; background: #FF6600; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1rem; }
.btn-submit:hover:not(:disabled) { background: #cc5200; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,102,0,0.2); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

.error-msg { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 1rem; border-radius: 8px; font-size: 0.9rem; margin-bottom: 1.5rem; font-weight: 500; }
.success-msg { background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; padding: 1rem; border-radius: 8px; font-size: 0.9rem; margin-bottom: 1.5rem; font-weight: 500; }

.info-card { background: #F8FAFC; border: 1px solid #E2E8F0; box-shadow: none; }
.info-text { color: #475569; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1rem; }
.endpoint-code { display: block; background: #1E293B; color: #38BDF8; padding: 1rem; border-radius: 8px; font-family: monospace; font-size: 0.85rem; word-break: break-all; margin-bottom: 2rem; font-weight: 600; }

.tips-box h4 { color: #0F172A; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
.tips-box ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.tips-box li { color: #64748B; font-size: 0.9rem; line-height: 1.4; padding-left: 1.25rem; position: relative; }
.tips-box li::before { content: "•"; color: #FF6600; position: absolute; left: 0; font-weight: bold; }

.spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.interactive-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; }
.section-box { background: white; border: 1px solid #E2E8F0; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.rows-box { margin-left: 1rem; padding-left: 1rem; border-left: 2px solid #CBD5E1; margin-top: 0.5rem; }
</style>
