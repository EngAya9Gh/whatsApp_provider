<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">{{ $t('send_message.title') || 'Send Message' }}</h1>
      <p class="page-subtitle">{{ $t('send_message.subtitle') || 'Test sending messages directly from your dashboard.' }}</p>
    </div>

    <div class="grid-layout">
      <!-- Sender Form -->
      <div class="card form-card">
        <form @submit.prevent="handleSend">
          <div class="form-group">
            <label>{{ $t('send_message.type') || 'Message Type' }}</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="messageType" value="text" /> {{ $t('send_message.type_text') || 'Text' }}
              </label>
              <label class="radio-label">
                <input type="radio" v-model="messageType" value="image" /> {{ $t('send_message.type_image') || 'Image' }}
              </label>
              <label class="radio-label">
                <input type="radio" v-model="messageType" value="pdf" /> {{ $t('send_message.type_pdf') || 'PDF' }}
              </label>
              <label class="radio-label">
                <input type="radio" v-model="messageType" value="template" /> {{ $t('send_message.type_template') || 'Template' }}
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>{{ $t('send_message.phone') || 'Recipient Phone Number' }}</label>
            <input type="text" v-model="phone" :placeholder="$t('send_message.phone_placeholder') || '966500000000'" required class="form-input" />
            <small class="hint">{{ $t('send_message.phone_hint') || 'Include country code without + or 00.' }}</small>
          </div>

          <!-- Text Input -->
          <div v-if="messageType === 'text'" class="form-group">
            <label>{{ $t('send_message.message') || 'Message Content' }}</label>
            <textarea v-model="textContent" rows="4" :placeholder="$t('send_message.message_placeholder') || 'Hello, this is a custom message...'" required class="form-input"></textarea>
          </div>

          <!-- Media Inputs (File Upload) -->
          <div v-if="messageType === 'image' || messageType === 'pdf'" class="form-group">
            <label>{{ $t('send_message.media') || 'Upload File' }}</label>
            <input type="file" @change="handleFileChange" :accept="messageType === 'image' ? 'image/*' : 'application/pdf'" required class="form-input" />
            <small class="hint">{{ $t('send_message.media_hint') || 'Max file size: 10MB.' }}</small>
          </div>

          <div v-if="messageType === 'image' || messageType === 'pdf'" class="form-group">
            <label>{{ $t('send_message.caption') || 'Caption (Optional)' }}</label>
            <input type="text" v-model="caption" placeholder="..." class="form-input" />
          </div>

          <!-- Template Inputs -->
          <div v-if="messageType === 'template'" class="form-group">
            <label>{{ $t('send_message.select_template') || 'Select Template' }}</label>
            <select v-model="selectedTemplateId" @change="extractVariables" required class="form-input">
              <option value="" disabled>{{ $t('send_message.select_template') || 'Choose a template...' }}</option>
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
            </select>
          </div>

          <!-- Dynamic Template Variables -->
          <div v-if="messageType === 'template' && templateVariables.length > 0" class="variables-box">
            <h4>{{ $t('send_message.fill_variables') || 'Fill in Variables:' }}</h4>
            <div v-for="variable in templateVariables" :key="variable" class="form-group" style="margin-bottom: 0.5rem;">
              <label>{{ variable }}</label>
              <input type="text" v-model="variableValues[variable]" :placeholder="`Value for ${variable}`" required class="form-input" />
            </div>
          </div>

          <div v-if="error" class="error-msg">{{ error }}</div>
          <div v-if="success" class="success-msg">{{ success }}</div>

          <div class="form-group">
            <label>{{ $t('send_message.api_key') || 'Your API Key' }}</label>
            <input type="password" v-model="apiKey" placeholder="sk_..." required class="form-input api-key-input" />
            <small class="hint">{{ $t('send_message.api_hint') || 'Paste an active API key to authorize the request.' }}</small>
          </div>

          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? ($t('send_message.sending') || 'Sending...') : ($t('send_message.send') || 'Send Message') }}
          </button>
        </form>
      </div>

      <!-- Preview or Info -->
      <div class="card info-card">
        <h2 class="card-title">{{ $t('send_message.how_it_works') || 'How it works' }}</h2>
        <p class="info-text">
          {{ $t('send_message.info_text') || 'This tool uses your own API to send messages. When you click send, the dashboard makes a request to:' }}
        </p>
        <code class="endpoint-code">POST /api/v1/{{ messageType === 'template' ? 'templates/send' : (messageType === 'text' ? 'message/send' : 'message/upload-media') }}</code>
        
        <div class="tips-box">
          <h4>{{ $t('send_message.pro_tips') || '💡 Pro Tips' }}</h4>
          <ul>
            <li>{{ $t('send_message.tip_1') || 'Ensure your WhatsApp is connected (Check the WhatsApp tab).' }}</li>
            <li>{{ $t('send_message.tip_2') || 'Text and Template messages are delivered instantly.' }}</li>
            <li>{{ $t('send_message.tip_3') || 'Media messages (images and PDFs) are securely uploaded and sent.' }}</li>
            <li>{{ $t('send_message.tip_4') || 'All messages count towards your monthly limit.' }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const messageType = ref('text')
const phone = ref('')
const textContent = ref('')
const selectedFile = ref(null)
const caption = ref('')
const apiKey = ref('')

// Template specific refs
const templates = ref([])
const selectedTemplateId = ref('')
const templateVariables = ref([])
const variableValues = ref({})

const loading = ref(false)
const error = ref('')
const success = ref('')

const handleFileChange = (e) => {
  if (e.target.files && e.target.files[0]) {
    selectedFile.value = e.target.files[0]
  }
}

// Fetch templates when component mounts
onMounted(async () => {
  try {
    const res = await axios.get('/api/v1/templates', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    templates.value = res.data.data
  } catch (err) {
    console.error('Failed to load templates', err)
  }
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
  if (!apiKey.value.startsWith('sk_')) {
    error.value = 'Please enter a valid API Key starting with sk_'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    let res;
    if (messageType.value === 'text') {
      res = await axios.post('/api/v1/message/send', {
        phone: phone.value,
        message: textContent.value
      }, {
        headers: { Authorization: `Bearer ${apiKey.value}` }
      })
    } else if (messageType.value === 'template') {
      if (!selectedTemplateId.value) throw new Error('Please select a template');
      res = await axios.post('/api/v1/templates/send', {
        phone: phone.value,
        templateId: selectedTemplateId.value,
        variables: variableValues.value
      }, {
        headers: { Authorization: `Bearer ${apiKey.value}` }
      })
    } else {
      if (!selectedFile.value) {
        throw new Error('Please select a file to upload')
      }
      
      const formData = new FormData()
      formData.append('phone', phone.value)
      formData.append('type', messageType.value)
      formData.append('caption', caption.value)
      formData.append('file', selectedFile.value)

      res = await axios.post('/api/v1/message/upload-media', formData, {
        headers: { 
          Authorization: `Bearer ${apiKey.value}`,
          'Content-Type': 'multipart/form-data'
        }
      })
    }

    success.value = res.data.message || 'Message sent successfully!'
    
    // Clear form on success
    if (messageType.value === 'text') textContent.value = ''
    selectedFile.value = null
    caption.value = ''
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
</style>
