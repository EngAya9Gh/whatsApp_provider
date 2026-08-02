<template>
  <FeatureLock feature="TEMPLATES" requiredPlan="STARTER">
  <div class="tpl-root">

    <!-- ══ Hero Header ══ -->
    <div class="hero-header">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <h1 class="hero-title">Message Templates</h1>
            <p class="hero-sub">Create reusable message templates for quick and automated sending</p>
          </div>
        </div>
        <button @click="showCreateModal = true" class="btn-create">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Template
        </button>
      </div>

      <!-- Stats Strip -->
      <div class="hero-stats" v-if="templates.length > 0">
        <div class="hstat">
          <span class="hstat-val">{{ templates.length }}</span>
          <span class="hstat-lbl">Total</span>
        </div>
        <div class="hstat-sep"></div>
        <div class="hstat">
          <span class="hstat-val img">{{ templates.filter(t => t.mediaPath).length }}</span>
          <span class="hstat-lbl">With Image</span>
        </div>
        <div class="hstat-sep"></div>
        <div class="hstat">
          <span class="hstat-val vars">{{ templates.filter(t => (t.content||'').includes('{')).length }}</span>
          <span class="hstat-lbl">With Variables</span>
        </div>
      </div>
    </div>

    <!-- ══ Alerts ══ -->
    <transition name="slide-fade">
      <div v-if="alertMsg" :class="['tpl-alert', alertType]">
        <svg v-if="alertType==='error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        {{ alertMsg }}
      </div>
    </transition>

    <!-- ══ Filter/Search Toolbar ══ -->
    <div class="filter-toolbar">
      <div class="search-wrap">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" class="search-input" placeholder="Search templates by name or content..." />
      </div>
      <div class="view-pills">
        <button @click="viewMode = 'cards'" :class="['view-pill', viewMode === 'cards' ? 'active' : '']" title="Card view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </button>
        <button @click="viewMode = 'list'" :class="['view-pill', viewMode === 'list' ? 'active' : '']" title="List view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- ══ Loading ══ -->
    <div v-if="loading && templates.length === 0" class="state-center">
      <div class="spin-ring"></div>
      <span>Loading templates...</span>
    </div>

    <!-- ══ Empty State ══ -->
    <div v-else-if="filteredTemplates.length === 0" class="state-empty">
      <div class="empty-art">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <h3>{{ searchQuery ? 'No templates found' : 'No Templates Yet' }}</h3>
      <p>{{ searchQuery ? `No results for "${searchQuery}"` : 'Create your first reusable message template to get started.' }}</p>
      <button v-if="!searchQuery" @click="showCreateModal = true" class="btn-create" style="margin-top:1.5rem">
        Create First Template
      </button>
    </div>

    <!-- ══ Cards Grid View ══ -->
    <div v-else-if="viewMode === 'cards'" class="cards-grid">
      <div v-for="tpl in filteredTemplates" :key="tpl.id" class="tpl-card">

        <!-- Color accent bar (based on content type) -->
        <div :class="['card-accent', tpl.mediaPath ? 'accent-media' : hasVariables(tpl) ? 'accent-vars' : 'accent-plain']"></div>

        <!-- Card Header -->
        <div class="card-head">
          <div class="tpl-type-icon" :class="tpl.mediaPath ? 'icon-media' : hasVariables(tpl) ? 'icon-vars' : 'icon-plain'">
            <svg v-if="tpl.mediaPath" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <svg v-else-if="hasVariables(tpl)" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="tpl-title-block">
            <h3 class="tpl-name">{{ tpl.name }}</h3>
            <div class="tpl-badges">
              <span v-if="tpl.mediaPath" class="badge badge-media">📷 Image</span>
              <span v-if="hasVariables(tpl)" class="badge badge-vars">{{ varCount(tpl) }} variable{{ varCount(tpl) > 1 ? 's' : '' }}</span>
              <span v-else class="badge badge-plain">Plain text</span>
            </div>
          </div>
          <div class="card-actions-top">
            <button @click="editTemplate(tpl)" class="act-btn edit" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button @click="deleteTemplate(tpl.id)" class="act-btn del" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>

        <!-- WhatsApp-style Message Preview -->
        <div class="wa-preview-wrap">
          <div class="wa-phone-bar">
            <span class="wa-dot"></span><span class="wa-dot"></span><span class="wa-dot"></span>
            <span class="wa-bar-label">Preview</span>
          </div>
          <div class="wa-preview-body">
            <div class="wa-bubble">
              <!-- Image preview -->
              <div v-if="tpl.mediaPath" class="wa-img-wrap">
                <img :src="'/api/' + tpl.mediaPath" alt="Template image" class="wa-img" />
              </div>
              <!-- Message text with highlighted variables -->
              <p class="wa-text" v-html="highlightVars(tpl.content)"></p>
              <div class="wa-time">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Now
              </div>
            </div>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="card-footer">
          <div class="footer-left">
            <button @click="copyId(tpl.id)" class="copy-id-btn" title="Copy template ID">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy ID
            </button>
          </div>
          <span class="footer-date">{{ formatDate(tpl.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- ══ List View ══ -->
    <div v-else class="list-view">
      <div class="list-header">
        <span>Template Name</span>
        <span>Type</span>
        <span>Created</span>
        <span>Actions</span>
      </div>
      <div v-for="tpl in filteredTemplates" :key="tpl.id" class="list-row">
        <div class="list-name-col">
          <div class="list-icon" :class="tpl.mediaPath ? 'icon-media' : hasVariables(tpl) ? 'icon-vars' : 'icon-plain'">
            <svg v-if="tpl.mediaPath" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <span class="list-tpl-name">{{ tpl.name }}</span>
            <span class="list-tpl-preview">{{ tpl.content?.slice(0, 60) }}{{ tpl.content?.length > 60 ? '...' : '' }}</span>
          </div>
        </div>
        <div>
          <span v-if="tpl.mediaPath" class="badge badge-media">Image</span>
          <span v-else-if="hasVariables(tpl)" class="badge badge-vars">Dynamic</span>
          <span v-else class="badge badge-plain">Plain</span>
        </div>
        <span class="list-date">{{ formatDate(tpl.createdAt) }}</span>
        <div class="list-actions">
          <button @click="copyId(tpl.id)" class="act-btn copy" title="Copy ID">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button @click="editTemplate(tpl)" class="act-btn edit" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button @click="deleteTemplate(tpl.id)" class="act-btn del" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Pagination ══ -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page === 1" @click="page--; fetchTemplates()" class="page-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="page-nums">
        <span class="page-cur">{{ page }}</span>
        <span class="page-sep">/</span>
        <span class="page-tot">{{ totalPages }}</span>
      </div>
      <button :disabled="page === totalPages" @click="page++; fetchTemplates()" class="page-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>

    <!-- ══ Create / Edit Modal ══ -->
    <transition name="modal-fade">
      <div v-if="showCreateModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-box">

          <!-- Left: Live WA Preview -->
          <div class="modal-preview-pane">
            <div class="preview-pane-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.907-1.425A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
              </svg>
              Live Preview
            </div>
            <!-- Phone mockup -->
            <div class="phone-mockup">
              <div class="phone-notch"></div>
              <div class="phone-screen">
                <div class="phone-chat-header">
                  <div class="pch-avatar"></div>
                  <div>
                    <span class="pch-name">Customer</span>
                    <span class="pch-status">online</span>
                  </div>
                </div>
                <div class="phone-chat-body">
                  <div class="phone-bubble">
                    <div v-if="previewImageUrl" class="phone-img-wrap">
                      <img :src="previewImageUrl" alt="Preview" class="phone-img" />
                    </div>
                    <p class="phone-text" v-if="formData.content" v-html="highlightVars(formData.content)"></p>
                    <p class="phone-text placeholder-text" v-else>Your message will appear here...</p>
                    <div class="phone-tick">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#53BDEB" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#53BDEB" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>12:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Variable hints -->
            <div v-if="detectedVars.length > 0" class="vars-hint">
              <div class="vh-title">Detected Variables:</div>
              <div class="vh-list">
                <span v-for="v in detectedVars" :key="v" class="vh-chip">{{ v }}</span>
              </div>
            </div>
          </div>

          <!-- Right: Form -->
          <div class="modal-form-pane">
            <div class="modal-form-header">
              <div>
                <h2>{{ editingTemplate ? 'Edit Template' : 'New Template' }}</h2>
                <p>{{ editingTemplate ? 'Update this reusable message template' : 'Build a reusable message with optional image & variables' }}</p>
              </div>
              <button @click="closeModal" class="close-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="modal-form-body">
              <div class="form-group">
                <label class="form-label">Template Name</label>
                <input type="text" v-model="formData.name" class="form-input" placeholder="e.g. Welcome Message" />
              </div>

              <div class="form-group">
                <label class="form-label">
                  Message Content
                  <span class="char-count">{{ formData.content.length }} chars</span>
                </label>
                <textarea v-model="formData.content" rows="6" class="form-input" placeholder="Hello {{name}}, your order {{order_id}} is ready! 🎉"></textarea>
                <div class="vars-tip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  Use <code>{{variable_name}}</code> for personalized variables
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Optional Image</label>
                <div class="file-drop" @click="$refs.fileInput.click()">
                  <div v-if="previewImageUrl" class="file-preview-wrap">
                    <img :src="previewImageUrl" alt="Preview" class="file-preview-img" />
                    <button @click.stop="clearImage" class="file-clear-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div v-else class="file-drop-inner">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>Click to upload image</span>
                    <small>PNG, JPG, WebP (Max 5MB)</small>
                  </div>
                </div>
                <div v-if="editingTemplate?.mediaPath && !formData.file" class="keep-image-note">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Current image will be kept
                </div>
                <input ref="fileInput" type="file" @change="handleFileUpload" accept="image/*" style="display:none" />
              </div>
            </div>

            <div class="modal-form-footer">
              <button @click="closeModal" class="btn-cancel">Cancel</button>
              <button @click="saveTemplate" :disabled="saving" class="btn-save">
                <svg v-if="saving" class="spin-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                {{ saving ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template' }}
              </button>
            </div>

          </div>
        </div>
      </div>
    </transition>

  </div>
  </FeatureLock>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import FeatureLock from '../components/FeatureLock.vue'

const templates = ref([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const alertMsg = ref('')
const alertType = ref('success')
const searchQuery = ref('')
const viewMode = ref('cards')

const showCreateModal = ref(false)
const saving = ref(false)
const editingTemplate = ref(null)
const previewImageUrl = ref('')

const formData = ref({ name: '', content: '', file: null })

// ── Alert helper ──
const showAlert = (msg, type = 'success') => {
  alertMsg.value = msg
  alertType.value = type
  setTimeout(() => { alertMsg.value = '' }, 5000)
}

// ── Computed ──
const filteredTemplates = computed(() => {
  if (!searchQuery.value.trim()) return templates.value
  const q = searchQuery.value.toLowerCase()
  return templates.value.filter(t =>
    t.name.toLowerCase().includes(q) || (t.content || '').toLowerCase().includes(q)
  )
})

const hasVariables = (tpl) => /\{\{.+?\}\}/.test(tpl.content || '')

const varCount = (tpl) => {
  const matches = (tpl.content || '').match(/\{\{.+?\}\}/g)
  return matches ? new Set(matches).size : 0
}

const detectedVars = computed(() => {
  const matches = (formData.value.content || '').match(/\{\{.+?\}\}/g)
  return matches ? [...new Set(matches)] : []
})

const highlightVars = (text) => {
  if (!text) return ''
  return text.replace(/\{\{(.+?)\}\}/g,
    '<span class="var-chip">{{$1}}</span>'
  )
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── File handling ──
const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  formData.value.file = file
  previewImageUrl.value = URL.createObjectURL(file)
}

const clearImage = () => {
  formData.value.file = null
  previewImageUrl.value = ''
  if (editingTemplate.value) editingTemplate.value.mediaPath = null
}

// ── Watch to load existing image on edit ──
watch(editingTemplate, (tpl) => {
  if (tpl?.mediaPath) {
    previewImageUrl.value = '/api/' + tpl.mediaPath
  } else {
    previewImageUrl.value = ''
  }
})

// ── API ──
const fetchTemplates = async () => {
  loading.value = true
  try {
    const res = await axios.get(`/api/v1/templates?page=${page.value}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    templates.value = res.data.data
    if (res.data.meta) totalPages.value = res.data.meta.totalPages || 1
  } catch (err) {
    showAlert('Failed to load templates.', 'error')
  } finally { loading.value = false }
}

const saveTemplate = async () => {
  if (!formData.value.name || !formData.value.content) {
    showAlert('Please fill in name and content.', 'error')
    return
  }
  saving.value = true
  const token = localStorage.getItem('token')
  const payload = new FormData()
  payload.append('name', formData.value.name)
  payload.append('content', formData.value.content)
  if (formData.value.file) payload.append('media', formData.value.file)
  try {
    if (editingTemplate.value) {
      await axios.put(`/api/v1/templates/${editingTemplate.value.id}`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      showAlert('Template updated successfully! ✨')
    } else {
      await axios.post('/api/v1/templates', payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      showAlert('Template created successfully! 🎉')
    }
    closeModal()
    fetchTemplates()
  } catch (err) {
    showAlert(err.response?.data?.error || 'Failed to save template.', 'error')
  } finally { saving.value = false }
}

const editTemplate = (tpl) => {
  editingTemplate.value = tpl
  formData.value = { name: tpl.name, content: tpl.content, file: null }
  showCreateModal.value = true
}

const deleteTemplate = async (id) => {
  if (!confirm('Delete this template? This action cannot be undone.')) return
  try {
    await axios.delete(`/api/v1/templates/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    showAlert('Template deleted.')
    fetchTemplates()
  } catch (err) {
    showAlert('Failed to delete template.', 'error')
  }
}

const closeModal = () => {
  showCreateModal.value = false
  editingTemplate.value = null
  formData.value = { name: '', content: '', file: null }
  previewImageUrl.value = ''
}

const copyId = (id) => {
  navigator.clipboard.writeText(id)
  showAlert('Template ID copied to clipboard!')
}

onMounted(() => { fetchTemplates() })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.tpl-root {
  padding: 0 0 4rem;
  min-height: 100vh;
  background: #F0F2F7;
  font-family: 'Inter', sans-serif;
}

/* ═══ HERO ═══ */
.hero-header {
  background: linear-gradient(135deg, #0F172A 0%, #1a1f2e 50%, #0F172A 100%);
  padding: 2.5rem 2.5rem 0;
  position: relative; overflow: hidden;
}
.hero-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 50% 80% at 90% 50%, rgba(255,102,0,0.12) 0%, transparent 60%);
  pointer-events: none;
}
.hero-content {
  display: flex; align-items: center;
  justify-content: space-between; gap: 1.5rem;
  position: relative; z-index: 1; flex-wrap: wrap;
}
.hero-left { display: flex; align-items: center; gap: 1.25rem; }
.hero-icon-wrap {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #FF6600, #E55A00);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(255,102,0,0.3);
}
.hero-title { font-size: 2rem; font-weight: 900; color: #fff; margin: 0 0 0.3rem; letter-spacing: -0.03em; }
.hero-sub { font-size: 0.9rem; color: #94A3B8; margin: 0; font-weight: 500; }

.hero-stats {
  display: flex; align-items: center;
  margin-top: 2rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-bottom: none; border-radius: 16px 16px 0 0;
  padding: 1.25rem 2rem;
  position: relative; z-index: 1;
}
.hstat { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0 2rem; flex: 1; }
.hstat-val { font-size: 1.75rem; font-weight: 900; color: #fff; line-height: 1; }
.hstat-val.img { color: #60A5FA; }
.hstat-val.vars { color: #A78BFA; }
.hstat-lbl { font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; }
.hstat-sep { width: 1px; height: 40px; background: rgba(255,255,255,0.08); flex-shrink: 0; }

.btn-create {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #FF6600, #E55A00);
  color: white; padding: 0.85rem 1.5rem;
  border: none; border-radius: 14px;
  font-weight: 800; font-size: 0.9rem;
  cursor: pointer; transition: all 0.25s;
  box-shadow: 0 6px 20px rgba(255,102,0,0.3);
  font-family: inherit; white-space: nowrap;
}
.btn-create:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(255,102,0,0.4); }

/* ═══ ALERTS ═══ */
.tpl-alert {
  display: flex; align-items: center; gap: 10px;
  padding: 1rem 1.5rem; border-radius: 14px;
  font-weight: 600; font-size: 0.9rem;
  margin: 1.5rem 2.5rem 0;
}
.tpl-alert.error { background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; }
.tpl-alert.success { background: #F0FDF4; color: #16A34A; border: 1px solid #DCFCE7; }
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(-10px); }

/* ═══ TOOLBAR ═══ */
.filter-toolbar {
  display: flex; align-items: center;
  gap: 1rem; padding: 1.5rem 2.5rem;
  flex-wrap: wrap;
}
.search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 400px; }
.search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
.search-input {
  width: 100%; padding: 0.7rem 1rem 0.7rem 2.6rem;
  border: 1.5px solid #E2E8F0; border-radius: 12px;
  font-family: inherit; font-size: 0.875rem; color: #334155;
  background: white; outline: none; transition: all 0.2s;
  box-sizing: border-box; box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.search-input:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.view-pills { display: flex; background: white; border: 1.5px solid #E2E8F0; border-radius: 10px; overflow: hidden; }
.view-pill {
  padding: 0.55rem 0.85rem; border: none; background: transparent;
  cursor: pointer; color: #94A3B8; transition: all 0.2s;
}
.view-pill.active { background: #FF6600; color: white; }
.view-pill:hover:not(.active) { background: #F8FAFC; color: #334155; }

/* ═══ STATES ═══ */
.state-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 6rem; color: #64748B; font-weight: 600; }
.spin-ring { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #FF6600; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.state-empty { display: flex; flex-direction: column; align-items: center; padding: 5rem 2rem; text-align: center; }
.empty-art { margin-bottom: 1.5rem; }
.state-empty h3 { font-size: 1.4rem; font-weight: 800; color: #1E293B; margin: 0 0 0.5rem; }
.state-empty p { font-size: 0.95rem; color: #94A3B8; margin: 0; }

/* ═══ CARDS GRID ═══ */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem; padding: 0 2.5rem 2rem;
}
@media(max-width: 640px) { .cards-grid { grid-template-columns: 1fr; padding: 0 1rem 2rem; } }

.tpl-card {
  background: white; border-radius: 20px;
  border: 1px solid #E8EDF5;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03);
  display: flex; flex-direction: column; overflow: hidden;
  transition: all 0.28s cubic-bezier(0.4,0,0.2,1);
}
.tpl-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: #D1D9E8; }

/* Accent bar */
.card-accent { height: 4px; }
.accent-media { background: linear-gradient(90deg, #60A5FA, #818CF8); }
.accent-vars  { background: linear-gradient(90deg, #A78BFA, #C084FC); }
.accent-plain { background: linear-gradient(90deg, #FF6600, #FF8C42); }

/* Card head */
.card-head { display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem 1.5rem 1rem; }
.tpl-type-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-media { background: #EFF6FF; color: #2563EB; }
.icon-vars  { background: #F5F3FF; color: #7C3AED; }
.icon-plain { background: #FFF7ED; color: #F97316; }
.tpl-title-block { flex: 1; min-width: 0; }
.tpl-name { font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0 0 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tpl-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.badge { font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
.badge-media { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
.badge-vars  { background: #F5F3FF; color: #6D28D9; border: 1px solid #DDD6FE; }
.badge-plain { background: #FFF7ED; color: #C2410C; border: 1px solid #FED7AA; }
.card-actions-top { display: flex; gap: 4px; flex-shrink: 0; }

/* Act buttons */
.act-btn { width: 34px; height: 34px; border-radius: 9px; border: 1.5px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; }
.act-btn.edit:hover { background: #FFF7ED; border-color: #FED7AA; color: #C2410C; }
.act-btn.del:hover { background: #FEF2F2; border-color: #FEE2E2; color: #DC2626; }
.act-btn.copy:hover { background: #F0FDF4; border-color: #DCFCE7; color: #15803D; }

/* WhatsApp preview */
.wa-preview-wrap { margin: 0 1.5rem 1rem; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; }
.wa-phone-bar { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #128C7E; }
.wa-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.4); }
.wa-bar-label { font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.7); margin-left: auto; text-transform: uppercase; letter-spacing: 0.04em; }
.wa-preview-body { background: #ECE5DD; padding: 12px; min-height: 80px; }
.wa-bubble { background: white; border-radius: 0 12px 12px 12px; padding: 10px 12px 6px; max-width: 85%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.wa-img-wrap { margin-bottom: 8px; border-radius: 8px; overflow: hidden; }
.wa-img { width: 100%; max-height: 120px; object-fit: cover; display: block; }
.wa-text { font-size: 0.82rem; color: #1a1a1a; margin: 0 0 4px; line-height: 1.5; word-break: break-word; }
.wa-time { display: flex; align-items: center; gap: 2px; justify-content: flex-end; font-size: 0.65rem; color: #94A3B8; }

/* Card footer */
.card-footer { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.5rem; border-top: 1px dashed #F1F5F9; margin-top: auto; }
.copy-id-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 700; color: #64748B; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.copy-id-btn:hover { background: #F0FDF4; color: #16A34A; border-color: #DCFCE7; }
.footer-date { font-size: 0.75rem; color: #94A3B8; font-weight: 600; }

/* ═══ LIST VIEW ═══ */
.list-view { margin: 0 2.5rem 2rem; background: white; border-radius: 18px; border: 1px solid #E8EDF5; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
.list-header { display: grid; grid-template-columns: 2fr 1fr 1fr 120px; padding: 1rem 1.5rem; background: #F8FAFC; border-bottom: 1px solid #F1F5F9; font-size: 0.75rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; }
.list-row { display: grid; grid-template-columns: 2fr 1fr 1fr 120px; padding: 1.1rem 1.5rem; align-items: center; border-bottom: 1px solid #F8FAFC; transition: background 0.15s; }
.list-row:last-child { border-bottom: none; }
.list-row:hover { background: #FAFBFD; }
.list-name-col { display: flex; align-items: center; gap: 12px; }
.list-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.list-tpl-name { display: block; font-weight: 800; color: #0F172A; font-size: 0.9rem; }
.list-tpl-preview { display: block; font-size: 0.78rem; color: #94A3B8; margin-top: 2px; }
.list-date { font-size: 0.82rem; color: #94A3B8; font-weight: 600; }
.list-actions { display: flex; gap: 6px; }

/* Variable highlights */
:deep(.var-chip) {
  background: rgba(139,92,246,0.12);
  color: #6D28D9;
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 0.9em;
  font-weight: 700;
  font-family: monospace;
}

/* ═══ PAGINATION ═══ */
.pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 2rem; }
.page-btn { width: 40px; height: 40px; border-radius: 12px; border: 1.5px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; }
.page-btn:hover:not(:disabled) { border-color: #FF6600; color: #FF6600; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-nums { display: flex; align-items: center; gap: 6px; }
.page-cur { font-size: 1rem; font-weight: 900; color: #0F172A; }
.page-sep { color: #CBD5E1; }
.page-tot { font-size: 0.9rem; font-weight: 700; color: #94A3B8; }

/* ═══ MODAL ═══ */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.65); backdrop-filter: blur(6px); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 1rem; }
.modal-box { background: white; border-radius: 24px; width: 100%; max-width: 820px; max-height: 94vh; overflow: hidden; box-shadow: 0 32px 64px rgba(0,0,0,0.2); display: grid; grid-template-columns: 280px 1fr; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: scale(0.96); }

/* Preview pane */
.modal-preview-pane {
  background: linear-gradient(160deg, #0F172A, #1E293B);
  padding: 1.75rem 1.5rem;
  display: flex; flex-direction: column; gap: 1.25rem;
  border-radius: 24px 0 0 24px;
  overflow-y: auto;
}
.preview-pane-header { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 800; color: #94A3B8; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
.preview-pane-header svg { color: #25D366; }

/* Phone mockup */
.phone-mockup { background: #1C1C1C; border-radius: 28px; padding: 10px; border: 3px solid #2D2D2D; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
.phone-notch { width: 50px; height: 6px; background: #2D2D2D; border-radius: 4px; margin: 0 auto 8px; }
.phone-screen { background: #E5DDD5; border-radius: 18px; overflow: hidden; }
.phone-chat-header { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #128C7E; }
.pch-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.3); flex-shrink: 0; }
.pch-name { display: block; font-size: 0.8rem; font-weight: 800; color: white; }
.pch-status { display: block; font-size: 0.65rem; color: rgba(255,255,255,0.7); }
.phone-chat-body { padding: 12px; background: #ECE5DD url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-opacity='0.02'%3E%3Ccircle cx='40' cy='40' r='30' stroke='%23000'/%3E%3C/g%3E%3C/svg%3E"); min-height: 120px; }
.phone-bubble { background: white; border-radius: 0 12px 12px 12px; padding: 8px 10px 4px; max-width: 90%; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
.phone-img-wrap { margin-bottom: 6px; border-radius: 6px; overflow: hidden; }
.phone-img { width: 100%; max-height: 100px; object-fit: cover; display: block; }
.phone-text { font-size: 0.78rem; color: #111; margin: 0 0 4px; line-height: 1.5; word-break: break-word; }
.placeholder-text { color: #94A3B8 !important; font-style: italic; }
.phone-tick { display: flex; align-items: center; gap: 1px; justify-content: flex-end; font-size: 0.6rem; color: #94A3B8; }

/* Variables hint */
.vars-hint { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 0.875rem; }
.vh-title { font-size: 0.7rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
.vh-list { display: flex; flex-wrap: wrap; gap: 5px; }
.vh-chip { background: rgba(139,92,246,0.2); color: #A78BFA; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-family: monospace; }

/* Form pane */
.modal-form-pane { display: flex; flex-direction: column; max-height: 94vh; overflow-y: auto; }
.modal-form-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1.75rem 1.75rem 1.25rem; border-bottom: 1px solid #F1F5F9; position: sticky; top: 0; background: white; z-index: 1; }
.modal-form-header h2 { margin: 0 0 0.2rem; font-size: 1.15rem; font-weight: 800; color: #0F172A; }
.modal-form-header p { margin: 0; font-size: 0.85rem; color: #64748B; }
.close-btn { width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; flex-shrink: 0; }
.close-btn:hover { background: #FEE2E2; border-color: #FCA5A5; color: #DC2626; }

.modal-form-body { padding: 1.5rem 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; flex: 1; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-label { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; font-weight: 700; color: #334155; }
.char-count { font-size: 0.75rem; font-weight: 600; color: #94A3B8; }
.form-input { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #E2E8F0; border-radius: 12px; font-family: inherit; font-size: 0.875rem; color: #334155; outline: none; transition: all 0.2s; box-sizing: border-box; background: white; resize: vertical; }
.form-input:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.08); }
.vars-tip { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #64748B; margin-top: 4px; }
.vars-tip code { background: #F1F5F9; padding: 1px 5px; border-radius: 5px; color: #7C3AED; font-size: 0.85em; }

/* File drop */
.file-drop { border: 2px dashed #E2E8F0; border-radius: 14px; cursor: pointer; transition: all 0.2s; overflow: hidden; }
.file-drop:hover { border-color: #FF6600; background: #FFF7ED; }
.file-drop-inner { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 1.5rem; color: #64748B; font-size: 0.875rem; font-weight: 600; text-align: center; }
.file-drop-inner svg { color: #94A3B8; }
.file-drop-inner small { color: #94A3B8; font-weight: 400; }
.file-preview-wrap { position: relative; }
.file-preview-img { width: 100%; max-height: 160px; object-fit: cover; display: block; }
.file-clear-btn { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.keep-image-note { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #16A34A; margin-top: 4px; }

/* Modal footer */
.modal-form-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem 1.75rem; border-top: 1px solid #F1F5F9; background: #FAFBFD; position: sticky; bottom: 0; }
.btn-cancel { padding: 0.75rem 1.5rem; background: white; color: #64748B; border: 1.5px solid #E2E8F0; border-radius: 12px; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.btn-cancel:hover { background: #F8FAFC; border-color: #CBD5E1; }
.btn-save {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0.75rem 1.75rem;
  background: linear-gradient(135deg, #FF6600, #E55A00);
  color: white; border: none; border-radius: 12px;
  font-weight: 800; font-size: 0.875rem;
  cursor: pointer; transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(255,102,0,0.3);
  font-family: inherit;
}
.btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(255,102,0,0.4); }
.btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
.spin-icon { animation: spin 1s linear infinite; }

@media(max-width: 680px) {
  .modal-box { grid-template-columns: 1fr; max-width: 100%; max-height: 100vh; border-radius: 20px 20px 0 0; align-self: flex-end; }
  .modal-preview-pane { display: none; }
  .hero-header { padding: 2rem 1.5rem 0; }
  .cards-grid { padding: 0 1rem 2rem; }
  .list-view { margin: 0 1rem 2rem; }
  .filter-toolbar { padding: 1rem; }
}
</style>
