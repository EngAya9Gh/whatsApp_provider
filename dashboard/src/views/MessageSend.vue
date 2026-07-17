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
            <div class="radio-group" style="display:flex; flex-wrap:wrap; gap:1rem;">
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
              <label class="radio-label" style="color:#FF6600; font-weight:600;">
                <input type="radio" v-model="messageType" value="buttons" /> 🔘 Buttons
              </label>
              <label class="radio-label" style="color:#10B981; font-weight:600;">
                <input type="radio" v-model="messageType" value="list" /> 📋 List
              </label>
              <label class="radio-label" style="color:#3B82F6; font-weight:600;">
                <input type="radio" v-model="messageType" value="location" /> 📍 Location
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

          <!-- Buttons Inputs -->
          <div v-if="messageType === 'buttons'" class="form-group interactive-box">
            <label>Message Content</label>
            <textarea v-model="textContent" rows="3" placeholder="Message text..." required class="form-input"></textarea>
            
            <div style="margin-top: 1rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
              <label>Buttons (Max 3)</label>
              <button type="button" @click="addSendButton" class="btn-text" style="color:#10B981" :disabled="buttonsList.length >= 3">+ Add Button</button>
            </div>
            <div v-for="(btn, i) in buttonsList" :key="i" style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
              <input v-model="btn.text" placeholder="Button Text" class="form-input" style="flex:1" maxlength="20" required />
              <select v-model="btn.type" class="form-input" style="width:100px;">
                <option value="reply">Reply</option>
                <option value="url">URL</option>
              </select>
              <input v-if="btn.type === 'url'" v-model="btn.url" placeholder="https://" class="form-input" style="flex:1" required />
              <button type="button" @click="removeSendButton(i)" class="btn-text" style="color:#DC2626">✕</button>
            </div>
            
            <label style="margin-top:1rem;">Optional Image Attachment</label>
            <input type="file" @change="handleFileChange" accept="image/*" class="form-input" />
          </div>

          <!-- List Inputs -->
          <div v-if="messageType === 'list'" class="form-group interactive-box">
            <label>List Title</label>
            <input v-model="listTitle" placeholder="Awesome Options" required class="form-input" style="margin-bottom:0.2rem;" maxlength="60" />
            <small class="hint" style="margin-bottom:1rem;">العنوان العريض الذي يظهر أعلى الرسالة (مثال: "قائمة منتجاتنا")</small>

            <label>List Body (Message)</label>
            <textarea v-model="listBody" rows="2" placeholder="Please select an option" required class="form-input" style="margin-bottom:0.2rem;" maxlength="1024"></textarea>
            <small class="hint" style="margin-bottom:1rem;">النص الأساسي الذي يشرح للعميل ماذا يفعل (مثال: "يرجى اختيار المنتج")</small>

            <label>Main Button Text (To open list)</label>
            <input v-model="listButtonText" placeholder="View Options" required class="form-input" style="margin-bottom:0.2rem;" maxlength="20" />
            <small class="hint" style="margin-bottom:1.5rem;">الكلمة المكتوبة على الزر لكي تفتح القائمة المنبثقة (مثال: "عرض الخيارات")</small>

            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; align-items: center;">
              <div>
                <label style="margin: 0;">Sections (Min 1)</label>
                <small class="hint" style="margin-top:0;">تقسيم القائمة لعناوين رئيسية (مثال: قسم "العطور"، وقسم "المكياج")</small>
              </div>
              <button type="button" @click="addSection" class="btn-text" style="color:#10B981">+ Add Section</button>
            </div>
            <div v-for="(section, sIdx) in listSections" :key="sIdx" class="section-box">
              <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
                <input v-model="section.title" placeholder="Section Title" required class="form-input" maxlength="24" />
                <button type="button" @click="removeSection(sIdx)" class="btn-text" style="color:#DC2626" :disabled="listSections.length <= 1">✕</button>
              </div>
              <div class="rows-box">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items: center;">
                  <div>
                    <label style="font-size:0.8rem; margin:0;">Rows (Options)</label>
                    <small class="hint" style="font-size: 0.7rem; margin-top: 0;">الخيارات التي سيختار منها العميل (مثال: "عطر العود")</small>
                  </div>
                  <button type="button" @click="addRow(sIdx)" class="btn-text" style="font-size:0.8rem; color:#3B82F6">+ Add Row</button>
                </div>
                <div v-for="(row, rIdx) in section.rows" :key="rIdx" style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
                  <input v-model="row.title" placeholder="Row Title" required class="form-input" style="flex:1" maxlength="24" />
                  <input v-model="row.description" placeholder="Description (Optional)" class="form-input" style="flex:1.5" maxlength="72" />
                  <button type="button" @click="removeRow(sIdx, rIdx)" class="btn-text" style="color:#DC2626" :disabled="section.rows.length <= 1">✕</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Location Inputs -->
          <div v-if="messageType === 'location'" class="form-group interactive-box">
            <div style="display:flex; gap:1rem; margin-bottom:1rem;">
              <div style="flex:1;">
                <label>Latitude</label>
                <input type="number" step="any" v-model="locationLat" placeholder="24.7136" required class="form-input" />
              </div>
              <div style="flex:1;">
                <label>Longitude</label>
                <input type="number" step="any" v-model="locationLng" placeholder="46.6753" required class="form-input" />
              </div>
            </div>
            <label>Location Name (Optional)</label>
            <input v-model="locationName" placeholder="Kingdom Centre" class="form-input" style="margin-bottom:1rem;" maxlength="100" />
            <label>Address (Optional)</label>
            <input v-model="locationAddress" placeholder="Riyadh, Saudi Arabia" class="form-input" maxlength="200" />
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
        <code class="endpoint-code">POST /api/v1/{{ 
          messageType === 'template' ? 'templates/send' : 
          (messageType === 'buttons' ? 'message/send-buttons' :
          (messageType === 'list' ? 'message/send-list' :
          (messageType === 'location' ? 'message/send-location' :
          (messageType === 'text' ? 'message/send' : 'message/upload-media')))) 
        }}</code>
        
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
  const tokenToUse = localStorage.getItem('token')
  if (!tokenToUse) {
    error.value = 'No authentication token found. Please login again.'
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
        headers: { Authorization: `Bearer ${tokenToUse}` }
      })
    } else if (messageType.value === 'buttons') {
      const validButtons = buttonsList.value.filter(b => b.text.trim())
      if (validButtons.length === 0) throw new Error('Add at least one button')
      
      let formData = new FormData()
      formData.append('phone', phone.value)
      formData.append('text', textContent.value)
      formData.append('buttons', JSON.stringify(validButtons))
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
        sections: listSections.value
      }, {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      })
    } else if (messageType.value === 'location') {
      res = await axios.post('/api/v1/message/send-location', {
        phone: phone.value,
        latitude: parseFloat(locationLat.value),
        longitude: parseFloat(locationLng.value),
        name: locationName.value,
        address: locationAddress.value
      }, {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      })
    } else if (messageType.value === 'template') {
      if (!selectedTemplateId.value) throw new Error('Please select a template');
      res = await axios.post('/api/v1/templates/send', {
        phone: phone.value,
        templateId: selectedTemplateId.value,
        variables: variableValues.value
      }, {
        headers: { Authorization: `Bearer ${tokenToUse}` }
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
