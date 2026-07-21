<template>
  <FeatureLock feature="TEMPLATES" requiredPlan="STARTER">
    <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ $t('templates.title') || 'Message Templates' }}</h1>
        <p class="page-subtitle">{{ $t('templates.subtitle') || 'Create reusable message templates for quick and automated sending.' }}</p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary">+ {{ $t('templates.new_template') || 'Create Template' }}</button>
    </div>

    <!-- Error/Success Alerts -->
    <div v-if="error" class="error-msg">{{ error }}</div>
    <div v-if="success" class="success-msg">{{ success }}</div>

    <!-- Templates Grid -->
    <div v-if="loading && templates.length === 0" class="loading-state">Loading templates...</div>
    
    <div v-else-if="templates.length === 0" class="empty-state">
      {{ $t('templates.no_templates') || 'No templates found. Create your first template to get started!' }}
    </div>

    <div v-else class="templates-grid">
      <div v-for="template in templates" :key="template.id" class="template-card">
        <div class="card-header">
          <h3 class="template-name">{{ template.name }}</h3>
          <div class="actions">
            <button @click="editTemplate(template)" class="icon-btn edit-btn" title="Edit">✏️</button>
            <button @click="deleteTemplate(template.id)" class="icon-btn delete-btn" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="template-id">
          <small>ID:</small> <code>{{ template.id }}</code>
          <button @click="copyId(template.id)" class="copy-btn" :title="$t('templates.id_copy') || 'Copy ID'">📋</button>
        </div>
        <div class="template-content">
          <div v-if="template.mediaPath" class="template-media">
            <img :src="'/api/' + template.mediaPath" alt="Template Media" style="max-width: 100%; max-height: 150px; border-radius: 8px; margin-bottom: 0.5rem;" />
          </div>
          <p>{{ template.content }}</p>
        </div>
        <div class="card-footer">
          <small>{{ $t('templates.created') || 'Created' }}: {{ new Date(template.createdAt).toLocaleDateString() }}</small>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2>{{ editingTemplate ? ($t('templates.edit_title') || 'Edit Template') : ($t('templates.create_title') || 'Create Template') }}</h2>
        
        <form @submit.prevent="saveTemplate">
          <!-- Error/Success inside modal -->
          <div v-if="error" class="error-msg" style="margin-bottom: 1rem;">{{ error }}</div>
          <div v-if="success" class="success-msg" style="margin-bottom: 1rem;">{{ success }}</div>

          <div class="form-group">
            <label>{{ $t('templates.name') || 'Template Name' }}</label>
            <input type="text" v-model="formData.name" placeholder="e.g. Welcome Message" required class="form-input" />
          </div>

          <div class="form-group">
            <label>{{ $t('templates.content') || 'Message Content' }}</label>
            <textarea v-model="formData.content" rows="6" :placeholder="$t('templates.placeholder') || 'Hello {{name}}, your order {{order_id}} is ready!'" required class="form-input"></textarea>
            <small class="hint" v-html="$t('templates.hint') || 'Use double curly braces for variables, e.g., <code>{{variable_name}}</code>.'"></small>
          </div>

          <div class="form-group">
            <label>{{ $t('templates.image') || 'Optional Image' }}</label>
            <input type="file" @change="handleFileUpload" accept="image/*" class="form-input" />
            <small v-if="editingTemplate?.mediaPath" style="display:block; margin-top:5px; color:#64748B;">Current image will be kept if no new image is selected.</small>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn-secondary">{{ $t('templates.cancel') || 'Cancel' }}</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner"></span>
              {{ saving ? '...' : (editingTemplate ? ($t('templates.save') || 'Save Changes') : ($t('templates.create') || 'Create Template')) }}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  </FeatureLock>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import FeatureLock from '../components/FeatureLock.vue'

const templates = ref([])
const loading = ref(true)
const error = ref('')
const success = ref('')

const showCreateModal = ref(false)
const saving = ref(false)
const editingTemplate = ref(null)

const formData = ref({
  name: '',
  content: '',
  file: null
})

const handleFileUpload = (e) => {
  formData.value.file = e.target.files[0]
}

const fetchTemplates = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/templates', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    templates.value = res.data.data
  } catch (err) {
    error.value = 'Failed to load templates.'
  } finally {
    loading.value = false
  }
}

const saveTemplate = async () => {
  saving.value = true
  error.value = ''
  success.value = ''
  
  try {
    const token = localStorage.getItem('token')
    
    const payload = new FormData()
    payload.append('name', formData.value.name)
    payload.append('content', formData.value.content)
    if (formData.value.file) {
      payload.append('media', formData.value.file)
    }

    if (editingTemplate.value) {
      await axios.put(`/api/v1/templates/${editingTemplate.value.id}`, payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      success.value = 'Template updated successfully!'
    } else {
      await axios.post('/api/v1/templates', payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      success.value = 'Template created successfully!'
    }
    
    closeModal()
    fetchTemplates()
    
    setTimeout(() => { success.value = '' }, 3000)
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to save template.'
  } finally {
    saving.value = false
  }
}

const editTemplate = (template) => {
  editingTemplate.value = template
  formData.value = { name: template.name, content: template.content, file: null }
  showCreateModal.value = true
}

const deleteTemplate = async (id) => {
  if (!confirm('Are you sure you want to delete this template?')) return
  try {
    await axios.delete(`/api/v1/templates/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    success.value = 'Template deleted.'
    fetchTemplates()
    setTimeout(() => { success.value = '' }, 3000)
  } catch (err) {
    error.value = 'Failed to delete template.'
  }
}

const closeModal = () => {
  showCreateModal.value = false
  editingTemplate.value = null
  formData.value = { name: '', content: '', file: null }
}

const copyId = (id) => {
  navigator.clipboard.writeText(id)
  alert('Template ID copied to clipboard!')
}

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.page-container { max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.page-title { font-size: 1.875rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem; }
.page-subtitle { color: #64748B; font-size: 1rem; }

.btn-primary { background: #FF6600; color: white; padding: 0.75rem 1.25rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary:hover { background: #cc5200; transform: translateY(-1px); }
.btn-secondary { background: #E2E8F0; color: #475569; padding: 0.75rem 1.25rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary:hover { background: #CBD5E1; }

.templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }

.template-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #E2E8F0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.template-name { font-size: 1.1rem; font-weight: 700; color: #1E293B; margin: 0; }
.actions { display: flex; gap: 0.5rem; }
.icon-btn { background: none; border: none; font-size: 1rem; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
.icon-btn:hover { opacity: 1; }

.template-id { margin-bottom: 1rem; font-size: 0.85rem; color: #64748B; display: flex; align-items: center; gap: 0.5rem; }
.template-id code { background: #F1F5F9; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; color: #0F172A; }
.copy-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; }

.template-content { flex: 1; background: #F8FAFC; padding: 1rem; border-radius: 8px; font-size: 0.95rem; color: #334155; line-height: 1.5; white-space: pre-wrap; margin-bottom: 1rem; }
.card-footer { border-top: 1px solid #F1F5F9; padding-top: 1rem; color: #94A3B8; }

.empty-state { text-align: center; padding: 4rem; background: white; border-radius: 12px; color: #64748B; border: 1px dashed #CBD5E1; }
.loading-state { text-align: center; padding: 2rem; color: #64748B; }

.error-msg { background: #FEF2F2; color: #DC2626; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #FECACA; }
.success-msg { background: #F0FDF4; color: #166534; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #BBF7D0; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 50; }
.modal { background: white; padding: 2rem; border-radius: 12px; width: 100%; max-width: 500px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal h2 { margin-top: 0; margin-bottom: 1.5rem; color: #0F172A; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #334155; font-size: 0.9rem; }
.form-input { width: 100%; padding: 0.75rem; border: 1px solid #CBD5E1; border-radius: 6px; font-family: inherit; }
.form-input:focus { outline: none; border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.hint { font-size: 0.8rem; color: #64748B; margin-top: 0.5rem; display: block; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
</style>
