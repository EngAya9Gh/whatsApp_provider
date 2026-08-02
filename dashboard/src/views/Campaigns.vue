<template>
  <FeatureLock feature="BAILEYS_CAMPAIGN" requiredPlan="PRO">
    <div class="camp-root">

      <!-- ── Hero Header ── -->
      <div class="hero-header">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <div class="hero-left">
            <div class="hero-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 11l19-9-9 19-2-8-8-2z"/>
              </svg>
            </div>
            <div>
              <h1 class="hero-title">Bulk Campaigns</h1>
              <p class="hero-sub">Send personalized messages to thousands of contacts</p>
            </div>
          </div>
          <button @click="showCreateModal = true" class="btn-create">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Campaign
          </button>
        </div>

        <!-- Quick Stats Strip -->
        <div class="hero-stats" v-if="campaigns.length > 0">
          <div class="hstat">
            <span class="hstat-val">{{ campaigns.length }}</span>
            <span class="hstat-lbl">Total</span>
          </div>
          <div class="hstat-sep"></div>
          <div class="hstat">
            <span class="hstat-val running">{{ statusCount('RUNNING') }}</span>
            <span class="hstat-lbl">Running</span>
          </div>
          <div class="hstat-sep"></div>
          <div class="hstat">
            <span class="hstat-val done">{{ statusCount('COMPLETED') }}</span>
            <span class="hstat-lbl">Completed</span>
          </div>
          <div class="hstat-sep"></div>
          <div class="hstat">
            <span class="hstat-val pending">{{ statusCount('PENDING') }}</span>
            <span class="hstat-lbl">Pending</span>
          </div>
        </div>
      </div>

      <!-- ── Alerts ── -->
      <transition name="slide-fade">
        <div v-if="error" class="alert alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>
      </transition>
      <transition name="slide-fade">
        <div v-if="success" class="alert alert-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          {{ success }}
        </div>
      </transition>

      <!-- ── Filter Toolbar ── -->
      <div class="filter-toolbar">
        <div class="search-wrap">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" class="search-input" placeholder="Search campaigns..." />
        </div>
        <div class="status-pills">
          <button v-for="s in statusFilters" :key="s.value"
            @click="statusFilter = s.value"
            :class="['status-pill', s.value.toLowerCase(), statusFilter === s.value ? 'active' : '']">
            <span class="pill-dot"></span>
            {{ s.label }}
            <span class="pill-badge">{{ statusCount(s.value) }}</span>
          </button>
        </div>
      </div>

      <!-- ── Loading ── -->
      <div v-if="loading && campaigns.length === 0" class="state-center">
        <div class="spin-ring"></div>
        <span>Loading your campaigns...</span>
      </div>

      <!-- ── Empty ── -->
      <div v-else-if="filteredCampaigns.length === 0" class="state-empty">
        <div class="empty-art">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.25"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
        </div>
        <h3>No campaigns yet</h3>
        <p>Create your first bulk campaign and start engaging your audience</p>
        <button @click="showCreateModal = true" class="btn-create" style="margin-top:1.25rem">Launch First Campaign</button>
      </div>

      <!-- ── Campaign Cards Grid ── -->
      <div v-else class="cards-grid">
        <div v-for="campaign in filteredCampaigns" :key="campaign.id" class="camp-card">

          <!-- Accent line (colored by status) -->
          <div :class="['card-accent', `accent-${campaign.status.toLowerCase()}`]"></div>

          <!-- Card Header -->
          <div class="card-head">
            <div class="card-icon-wrap" :class="`icon-${campaign.status.toLowerCase()}`">
              <svg v-if="campaign.status === 'RUNNING'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg v-else-if="campaign.status === 'COMPLETED'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <svg v-else-if="campaign.status === 'FAILED'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="card-title-block">
              <h3 class="card-name">{{ campaign.name }}</h3>
              <div class="card-meta">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ new Date(campaign.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </div>
            </div>
            <span :class="['status-badge', `badge-${campaign.status.toLowerCase()}`]">
              <span class="badge-pulse" v-if="campaign.status === 'RUNNING'"></span>
              {{ campaign.status }}
            </span>
          </div>

          <!-- Message Preview -->
          <div class="card-msg">
            <div class="msg-bubble">
              <p>{{ campaign.message || 'Template / Meta Campaign' }}</p>
            </div>
          </div>

          <!-- Stats Section -->
          <div v-if="activeStats[campaign.id] && campaign.status !== 'PENDING'" class="card-stats">
            <!-- Big Numbers Row -->
            <div class="stats-row">
              <div class="stat-box total">
                <span class="stat-n">{{ activeStats[campaign.id].total }}</span>
                <span class="stat-l">Total</span>
              </div>
              <div class="stat-box sent">
                <span class="stat-n">{{ activeStats[campaign.id].sent }}</span>
                <span class="stat-l">Sent</span>
              </div>
              <div class="stat-box failed">
                <span class="stat-n">{{ activeStats[campaign.id].failed }}</span>
                <span class="stat-l">Failed</span>
              </div>
              <div class="stat-box pending">
                <span class="stat-n">{{ activeStats[campaign.id].pending }}</span>
                <span class="stat-l">Pending</span>
              </div>
            </div>
            <!-- Progress Bar -->
            <div class="prog-wrap">
              <div class="prog-labels">
                <span class="prog-title">Delivery Progress</span>
                <span class="prog-pct">{{ Math.round((activeStats[campaign.id].sent / (activeStats[campaign.id].total || 1)) * 100) }}%</span>
              </div>
              <div class="prog-track">
                <div class="prog-bar" :style="`width: ${(activeStats[campaign.id].sent / (activeStats[campaign.id].total || 1) * 100)}%`"></div>
              </div>
            </div>
          </div>

          <!-- Pending Placeholder -->
          <div v-else-if="campaign.status === 'PENDING'" class="card-pending-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Ready to launch — press <strong>Start Now</strong></span>
          </div>

          <!-- Card Actions -->
          <div class="card-actions">
            <div class="actions-left">
              <button @click="editCampaign(campaign)" class="act-btn edit" title="Edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button v-if="campaign.status !== 'PENDING'" @click="loadStats(campaign.id)" class="act-btn refresh" title="Refresh stats">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
            <div class="actions-right">
              <button v-if="activeStats[campaign.id] && activeStats[campaign.id].failed > 0" @click="retryFailed(campaign.id)" class="btn-retry" :disabled="retryingId === campaign.id">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/></svg>
                {{ retryingId === campaign.id ? 'Retrying...' : 'Retry Failed' }}
              </button>
              <button v-if="campaign.status === 'PENDING'" @click="startCampaign(campaign.id)" class="btn-launch" :disabled="startingId === campaign.id">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                {{ startingId === campaign.id ? 'Launching...' : 'Start Now' }}
              </button>
              <router-link :to="`/campaigns/${campaign.id}`" class="btn-view">
                View Details
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </router-link>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Pagination ── -->
      <div v-if="totalPages > 1" class="pagination">
        <button :disabled="page === 1" @click="page--; fetchCampaigns()" class="page-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="page-numbers">
          <span class="page-num active">{{ page }}</span>
          <span class="page-sep">/</span>
          <span class="page-num">{{ totalPages }}</span>
        </div>
        <button :disabled="page === totalPages" @click="page++; fetchCampaigns()" class="page-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <!-- ══ Create / Edit Modal ══ -->
      <transition name="modal-fade">
        <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
          <div class="modal-box">
            <!-- Modal Header -->
            <div class="modal-hdr">
              <div class="modal-hdr-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
              </div>
              <div>
                <h2>{{ editingCampaign ? 'Edit Campaign' : 'New Campaign' }}</h2>
                <p>{{ editingCampaign ? 'Update campaign details below' : 'Fill in the details to create a new bulk campaign' }}</p>
              </div>
              <button @click="closeCreateModal" class="modal-close-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form @submit.prevent="submitCampaign" class="modal-form">
              <div class="form-group">
                <label class="form-label">Campaign Name</label>
                <input type="text" v-model="formData.name" placeholder="e.g. Summer Sale 2025" required class="form-input" />
              </div>

              <div class="form-group">
                <label class="form-label">Sending Channel</label>
                <select v-model="formData.channelId" class="form-input">
                  <option value="">Default Web QR Connection</option>
                  <option v-for="ch in channels" :key="ch.id" :value="ch.id">
                    +{{ ch.phoneNumber }} (Meta Cloud API)
                  </option>
                </select>
              </div>

              <div class="form-group" v-if="!editingCampaign">
                <label class="form-label">Upload Contacts</label>
                <div class="file-drop-zone" @click="$refs.fileInput.click()">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span v-if="selectedFile">{{ selectedFile.name }}</span>
                  <span v-else>Click to upload Excel or CSV</span>
                  <small>System auto-detects phone number column</small>
                </div>
                <input ref="fileInput" type="file" @change="handleFileChange" accept=".csv,.xlsx,.xls" required style="display:none" />
              </div>

              <div class="form-group">
                <label class="form-label">Message Type</label>
                <div class="type-selector">
                  <label class="type-opt" :class="formData.type === 'text' ? 'active' : ''">
                    <input type="radio" v-model="formData.type" value="text" />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Text
                  </label>
                  <label v-if="!isMetaChannel" class="type-opt" :class="formData.type === 'template' ? 'active' : ''">
                    <input type="radio" v-model="formData.type" value="template" />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Template
                  </label>
                  <label v-if="isMetaChannel" class="type-opt" :class="formData.type === 'meta_template' ? 'active' : ''">
                    <input type="radio" v-model="formData.type" value="meta_template" />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    Meta Template
                  </label>
                  <label v-if="isMetaChannel" class="type-opt" :class="formData.type === 'buttons' ? 'active' : ''">
                    <input type="radio" v-model="formData.type" value="buttons" />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 2l-4 5-4-5"/></svg>
                    Buttons
                  </label>
                </div>
              </div>

              <div class="form-group" v-if="formData.type === 'template'">
                <label class="form-label">Select Local Template</label>
                <select v-model="formData.templateId" required class="form-input">
                  <option value="" disabled>Choose a template...</option>
                  <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
                </select>
              </div>

              <div class="form-group" v-if="formData.type === 'meta_template'">
                <label class="form-label">Select Meta Template</label>
                <div v-if="metaTemplates.length === 0" class="loading-hint">Loading Meta templates...</div>
                <select v-model="formData.templateId" required class="form-input">
                  <option value="" disabled>Choose an approved Meta template...</option>
                  <option v-for="tpl in metaTemplates" :key="tpl.name + tpl.language" :value="tpl.name + '||' + tpl.language">
                    {{ tpl.name }} ({{ tpl.language }}) — {{ tpl.status }}
                  </option>
                </select>
                <small class="form-hint">Only APPROVED templates will be delivered.</small>
              </div>

              <div class="form-group" v-if="formData.type === 'text' || formData.type === 'buttons'">
                <label class="form-label">Message Content</label>
                <textarea v-model="formData.message" rows="4" placeholder="Write your message here..." required class="form-input"></textarea>
              </div>

              <div v-if="formData.type === 'buttons'" class="buttons-builder">
                <div class="builder-hdr">
                  <span>Quick Reply Buttons</span>
                  <button type="button" @click="addButton" class="btn-add-btn" :disabled="formData.buttons.length >= 3">+ Add Button</button>
                </div>
                <div v-for="(btn, i) in formData.buttons" :key="i" class="btn-row">
                  <input v-model="btn.text" placeholder="Button text" class="form-input" style="flex:1" maxlength="20" required />
                  <select v-model="btn.type" class="form-input" style="width:130px">
                    <option value="reply">Quick Reply</option>
                    <option value="url">URL Link</option>
                  </select>
                  <input v-if="btn.type === 'url'" v-model="btn.url" placeholder="https://..." class="form-input" style="flex:1" />
                  <button type="button" @click="removeButton(i)" class="btn-rm">✕</button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Attach Image (Optional)</label>
                <input type="file" @change="handleImageChange" accept="image/*" class="form-input" />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Start Date (Optional)</label>
                  <input type="datetime-local" v-model="formData.startDate" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">End Date (Optional)</label>
                  <input type="datetime-local" v-model="formData.endDate" class="form-input" />
                </div>
              </div>

              <div class="warning-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div>
                  <strong>Anti-Ban Safety</strong>
                  <p>Messages are sent gradually (1 per 5 seconds). Campaign is saved as PENDING — start it when ready.</p>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" @click="closeCreateModal" class="btn-cancel">Cancel</button>
                <button type="submit" class="btn-submit" :disabled="saving">
                  <svg v-if="saving" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                  {{ saving ? 'Saving...' : (editingCampaign ? 'Save Changes' : 'Create Campaign') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </transition>

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

const searchQuery = ref('')
const statusFilter = ref('ALL')

const statusFilters = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Running', value: 'RUNNING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Failed', value: 'FAILED' },
]

const statusCount = (val) => {
  if (val === 'ALL') return campaigns.value.length
  return campaigns.value.filter(c => c.status === val).length
}

const filteredCampaigns = computed(() => {
  let list = campaigns.value
  if (statusFilter.value !== 'ALL') list = list.filter(c => c.status === statusFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => c.name.toLowerCase().includes(q) || (c.message || '').toLowerCase().includes(q))
  }
  return list
})

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
const removeButton = (index) => formData.value.buttons.splice(index, 1)

const fetchTemplates = async () => {
  try {
    const res = await axios.get('/api/v1/templates', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    templates.value = res.data.data
  } catch (err) {}
}

const fetchChannels = async () => {
  const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
  if (!tenant.allowedFeatures || !tenant.allowedFeatures.includes('META_API')) { channels.value = []; return }
  try {
    const res = await axios.get('/api/v1/meta/channels', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
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
      const res = await axios.get(`/api/v1/meta/channel/${newId}/templates`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      if (res.data?.data?.data) metaTemplates.value = res.data.data.data
    } catch(e) {}
  } else {
    formData.value.type = 'text'
  }
})

const fetchCampaigns = async () => {
  loading.value = true
  try {
    const res = await axios.get(`/api/v1/campaigns?page=${page.value}&campaignType=BAILEYS`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    campaigns.value = res.data.data
    if (res.data.meta) totalPages.value = res.data.meta.totalPages || 1
    campaigns.value.forEach(c => { if (c.status !== 'PENDING') loadStats(c.id) })
  } catch (err) {
    error.value = 'Failed to load campaigns.'
  } finally {
    loading.value = false
  }
}

const loadStats = async (id) => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${id}/stats`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    activeStats.value[id] = res.data.data.stats
    const campaign = campaigns.value.find(c => c.id === id)
    if (campaign && res.data.data.status) campaign.status = res.data.data.status
  } catch (err) {}
}

const handleFileChange = (e) => { if (e.target.files?.[0]) selectedFile.value = e.target.files[0] }
const handleImageChange = (e) => { if (e.target.files?.[0]) selectedImage.value = e.target.files[0] }

const submitCampaign = async () => {
  if (!editingCampaign.value && !selectedFile.value) return alert('Please upload an Excel/CSV file')
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const form = new FormData()
    form.append('name', formData.value.name)
    if (formData.value.channelId) form.append('channelId', formData.value.channelId)
    if (formData.value.type === 'text') {
      form.append('message', formData.value.message)
      form.append('interactiveType', 'TEXT')
    } else if (formData.value.type === 'template') {
      form.append('templateId', formData.value.templateId)
      form.append('interactiveType', 'TEXT')
    } else if (formData.value.type === 'meta_template') {
      const parts = formData.value.templateId.split('||')
      form.append('message', parts[0])
      form.append('templateId', parts[1])
      form.append('interactiveType', 'META_TEMPLATE')
    } else if (formData.value.type === 'buttons') {
      form.append('message', formData.value.message)
      form.append('interactiveType', 'BUTTONS')
      const validButtons = formData.value.buttons.filter(b => b.text.trim())
      if (validButtons.length === 0) { saving.value = false; return alert('Please add at least one button') }
      form.append('buttons', JSON.stringify(validButtons))
    }
    if (!editingCampaign.value) form.append('file', selectedFile.value)
    if (selectedImage.value) form.append('image', selectedImage.value)
    if (formData.value.startDate) form.append('startDate', new Date(formData.value.startDate).toISOString())
    if (formData.value.endDate) form.append('endDate', new Date(formData.value.endDate).toISOString())
    let res
    if (editingCampaign.value) {
      res = await axios.put(`/api/v1/campaigns/${editingCampaign.value.id}`, form, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' } })
    } else {
      res = await axios.post('/api/v1/campaigns', form, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' } })
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
  return date.toISOString().slice(0, 16)
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
    try { formData.value.buttons = JSON.parse(campaign.buttons) } catch(e) {}
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
    const res = await axios.post(`/api/v1/campaigns/${id}/start`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
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
    const res = await axios.post(`/api/v1/campaigns/${id}/retry`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
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
    campaigns.value.filter(c => c.status === 'RUNNING').forEach(c => loadStats(c.id))
  }, 10000)
})

onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.camp-root {
  padding: 0 0 4rem;
  min-height: 100vh;
  background: #F0F2F7;
  font-family: 'Inter', sans-serif;
  max-width: 1440px;
}

/* ═══ HERO HEADER ═══ */
.hero-header {
  background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%);
  padding: 2.5rem 2.5rem 0;
  margin-bottom: 0;
  position: relative;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,102,0,0.15) 0%, transparent 70%);
  pointer-events: none;
}
.hero-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
}
.hero-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.hero-icon-wrap {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #FF6600, #FF9933);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(255,102,0,0.35);
}
.hero-title {
  font-size: 2rem;
  font-weight: 900;
  color: #ffffff;
  margin: 0 0 0.3rem;
  letter-spacing: -0.03em;
}
.hero-sub {
  font-size: 0.95rem;
  color: #94A3B8;
  margin: 0;
  font-weight: 500;
}

/* Hero quick stats */
.hero-stats {
  display: flex;
  align-items: center;
  gap: 0;
  margin-top: 2rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  padding: 1.25rem 2rem;
  position: relative;
  z-index: 1;
}
.hstat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0 2rem;
  flex: 1;
}
.hstat-val {
  font-size: 1.8rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
}
.hstat-val.running { color: #60A5FA; }
.hstat-val.done { color: #34D399; }
.hstat-val.pending { color: #FBBF24; }
.hstat-lbl {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.hstat-sep { width: 1px; height: 40px; background: rgba(255,255,255,0.08); flex-shrink: 0; }

/* Create button */
.btn-create {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #FF6600, #FF8C00);
  color: white;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 6px 20px rgba(255,102,0,0.4);
  white-space: nowrap;
}
.btn-create:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(255,102,0,0.5);
}

/* ═══ ALERTS ═══ */
.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 1rem 1.5rem;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.9rem;
  margin: 1.5rem 2.5rem 0;
}
.alert-error { background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; }
.alert-success { background: #F0FDF4; color: #16A34A; border: 1px solid #DCFCE7; }
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s; }
.slide-fade-enter-from { opacity: 0; transform: translateY(-10px); }
.slide-fade-leave-to { opacity: 0; transform: translateY(-10px); }

/* ═══ FILTER TOOLBAR ═══ */
.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2.5rem;
  flex-wrap: wrap;
}
.search-wrap {
  position: relative;
  flex: 1;
  min-width: 220px;
  max-width: 340px;
}
.search-icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: #94A3B8;
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 0.7rem 1rem 0.7rem 2.5rem;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  font-size: 0.875rem;
  color: #334155;
  background: white;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  font-family: inherit;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.search-input:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.status-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: 1.5px solid #E2E8F0;
  background: white;
  color: #64748B;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.status-pill:hover { border-color: #CBD5E1; color: #334155; }
.status-pill.active { background: #0F172A; color: white; border-color: #0F172A; }
.status-pill.running.active { background: #1D4ED8; border-color: #1D4ED8; }
.status-pill.completed.active { background: #059669; border-color: #059669; }
.status-pill.failed.active { background: #DC2626; border-color: #DC2626; }
.status-pill.pending.active { background: #D97706; border-color: #D97706; }
.pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #CBD5E1; }
.status-pill.active .pill-dot { background: rgba(255,255,255,0.6); }
.pill-badge { background: #F1F5F9; color: #64748B; padding: 1px 7px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; }
.status-pill.active .pill-badge { background: rgba(255,255,255,0.2); color: white; }

/* ═══ STATES ═══ */
.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 6rem 2rem;
  color: #64748B;
  font-weight: 600;
}
.spin-ring {
  width: 40px; height: 40px;
  border: 3px solid #E2E8F0;
  border-top-color: #FF6600;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5rem 2rem;
  text-align: center;
  color: #64748B;
}
.empty-art { margin-bottom: 1.5rem; }
.state-empty h3 { font-size: 1.4rem; font-weight: 800; color: #1E293B; margin: 0 0 0.5rem; }
.state-empty p { font-size: 0.95rem; margin: 0; color: #94A3B8; }

/* ═══ CARDS GRID ═══ */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
  padding: 0 2.5rem 2rem;
}
@media(max-width: 640px) { .cards-grid { grid-template-columns: 1fr; padding: 0 1rem 2rem; } }

.camp-card {
  background: #FFFFFF;
  border-radius: 20px;
  border: 1px solid #E8EDF5;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
.camp-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.08), 0 6px 16px rgba(0,0,0,0.04);
  border-color: #D1D9E8;
}

/* Accent top bar */
.card-accent {
  height: 4px;
  width: 100%;
}
.accent-pending { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.accent-running { background: linear-gradient(90deg, #3B82F6, #60A5FA); }
.accent-completed { background: linear-gradient(90deg, #10B981, #34D399); }
.accent-failed { background: linear-gradient(90deg, #EF4444, #F87171); }
.accent-sent { background: linear-gradient(90deg, #10B981, #34D399); }

/* Card Head */
.card-head {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem 1.5rem 0;
}
.card-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-pending { background: #FEF3C7; color: #D97706; }
.icon-running { background: #DBEAFE; color: #2563EB; }
.icon-completed { background: #DCFCE7; color: #16A34A; }
.icon-failed { background: #FEE2E2; color: #DC2626; }
.icon-sent { background: #DCFCE7; color: #16A34A; }
.card-title-block { flex: 1; min-width: 0; }
.card-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: #0F172A;
  margin: 0 0 0.35rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: #94A3B8;
  font-weight: 600;
}

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.35rem 0.9rem;
  border-radius: 30px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  flex-shrink: 0;
}
.badge-pending { background: #FEF3C7; color: #B45309; }
.badge-running { background: #DBEAFE; color: #1D4ED8; }
.badge-completed { background: #DCFCE7; color: #15803D; }
.badge-failed { background: #FEE2E2; color: #B91C1C; }
.badge-sent { background: #DCFCE7; color: #15803D; }
.badge-pulse {
  width: 7px; height: 7px; border-radius: 50%;
  background: #3B82F6;
  animation: badge-pulse 1.4s ease infinite;
}
@keyframes badge-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.6); opacity: 0.4; } }

/* Message bubble */
.card-msg {
  padding: 1rem 1.5rem;
}
.msg-bubble {
  background: #F8FAFC;
  border: 1px solid #EEF2FF;
  border-radius: 12px;
  padding: 0.875rem 1rem;
}
.msg-bubble p {
  margin: 0;
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-style: italic;
}

/* Stats Section */
.card-stats {
  padding: 0 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.875rem 0.5rem;
  border-radius: 14px;
  gap: 4px;
  transition: transform 0.2s;
}
.stat-box:hover { transform: translateY(-2px); }
.stat-n {
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1;
}
.stat-l {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.stat-box.total { background: #F8FAFC; border: 1px solid #E2E8F0; }
.stat-box.total .stat-n { color: #0F172A; }
.stat-box.total .stat-l { color: #94A3B8; }
.stat-box.sent { background: #ECFDF5; border: 1px solid #D1FAE5; }
.stat-box.sent .stat-n { color: #059669; }
.stat-box.sent .stat-l { color: #6EE7B7; }
.stat-box.failed { background: #FEF2F2; border: 1px solid #FEE2E2; }
.stat-box.failed .stat-n { color: #DC2626; }
.stat-box.failed .stat-l { color: #FCA5A5; }
.stat-box.pending { background: #FFFBEB; border: 1px solid #FEF3C7; }
.stat-box.pending .stat-n { color: #D97706; }
.stat-box.pending .stat-l { color: #FDE68A; }

/* Progress */
.prog-wrap {}
.prog-labels {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 7px;
}
.prog-title { font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
.prog-pct { font-size: 1.1rem; font-weight: 900; color: #FF6600; }
.prog-track { height: 8px; background: #F1F5F9; border-radius: 99px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.06); }
.prog-bar {
  height: 100%;
  background: linear-gradient(90deg, #FF6600, #FF9933);
  border-radius: 99px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.prog-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  transform: translateX(-100%);
  animation: shimmer 2.5s infinite;
}
@keyframes shimmer { 100% { transform: translateX(200%); } }

/* Pending banner */
.card-pending-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 1.5rem;
  background: linear-gradient(to right, #FFFBEB, #FEF9C3);
  border: 1px dashed #FCD34D;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  color: #92400E;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Card Actions */
.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px dashed #F1F5F9;
  margin-top: 0.75rem;
}
.actions-left, .actions-right { display: flex; align-items: center; gap: 8px; }
.act-btn {
  width: 38px; height: 38px;
  border-radius: 10px;
  border: 1.5px solid #E2E8F0;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748B;
  transition: all 0.2s;
}
.act-btn:hover { transform: translateY(-1px); }
.act-btn.edit:hover { background: #FEF3C7; border-color: #FCD34D; color: #D97706; }
.act-btn.refresh:hover { background: #EFF6FF; border-color: #BFDBFE; color: #2563EB; }

.btn-retry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.55rem 1rem;
  background: #FEF2F2;
  color: #DC2626;
  border: 1.5px solid #FEE2E2;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-retry:hover:not(:disabled) { background: #FEE2E2; transform: translateY(-1px); }
.btn-retry:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-launch {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0.6rem 1.1rem;
  background: linear-gradient(135deg, #10B981, #059669);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(16,185,129,0.3);
  font-family: inherit;
}
.btn-launch:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(16,185,129,0.4); }
.btn-launch:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-view {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0.6rem 1.1rem;
  background: white;
  color: #0F172A;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.btn-view:hover { background: #F8FAFC; border-color: #CBD5E1; transform: translateY(-1px); }

/* ═══ PAGINATION ═══ */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
}
.page-btn {
  width: 40px; height: 40px;
  border-radius: 12px;
  border: 1.5px solid #E2E8F0;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748B;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.page-btn:hover:not(:disabled) { border-color: #FF6600; color: #FF6600; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-numbers { display: flex; align-items: center; gap: 6px; }
.page-num { font-size: 0.95rem; font-weight: 800; color: #0F172A; }
.page-sep { color: #CBD5E1; font-weight: 400; }

/* ═══ MODAL ═══ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 1rem;
}
.modal-box {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 560px;
  max-height: 92vh;
  overflow-y: auto;
  box-shadow: 0 32px 64px rgba(0,0,0,0.2);
}
.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: scale(0.95); }

.modal-hdr {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.75rem 1.75rem 1.25rem;
  border-bottom: 1px solid #F1F5F9;
  position: sticky;
  top: 0;
  background: white;
  border-radius: 24px 24px 0 0;
  z-index: 1;
}
.modal-hdr-icon {
  width: 46px; height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, #FF6600, #FF9933);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}
.modal-hdr h2 { margin: 0 0 0.2rem; font-size: 1.15rem; font-weight: 800; color: #0F172A; }
.modal-hdr p { margin: 0; font-size: 0.85rem; color: #64748B; }
.modal-close-btn {
  width: 34px; height: 34px;
  border-radius: 10px;
  border: 1.5px solid #E2E8F0;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748B;
  transition: all 0.2s;
  margin-left: auto;
  flex-shrink: 0;
}
.modal-close-btn:hover { background: #FEE2E2; border-color: #FCA5A5; color: #DC2626; }

.modal-form { padding: 1.5rem 1.75rem 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-label { font-size: 0.85rem; font-weight: 700; color: #334155; }
.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.875rem;
  color: #334155;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
  background: white;
}
.form-input:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.08); }
textarea.form-input { resize: vertical; min-height: 100px; }

.file-drop-zone {
  border: 2px dashed #E2E8F0;
  border-radius: 14px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #64748B;
  font-size: 0.875rem;
  font-weight: 600;
}
.file-drop-zone:hover { border-color: #FF6600; background: #FFF7F3; color: #FF6600; }
.file-drop-zone small { font-size: 0.75rem; color: #94A3B8; font-weight: 400; }
.file-drop-zone svg { color: #94A3B8; }

.type-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.type-opt {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0.5rem 1rem;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748B;
  transition: all 0.2s;
}
.type-opt.active { border-color: #FF6600; background: #FFF7F3; color: #FF6600; }
.type-opt input { display: none; }

.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media(max-width: 480px) { .form-row-2 { grid-template-columns: 1fr; } }

.form-hint { font-size: 0.78rem; color: #94A3B8; }
.loading-hint { font-size: 0.85rem; color: #94A3B8; font-style: italic; }

.buttons-builder {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.builder-hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: #334155;
}
.btn-add-btn {
  background: #ECFDF5;
  color: #059669;
  border: 1px solid #D1FAE5;
  border-radius: 8px;
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.btn-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-row { display: flex; gap: 8px; align-items: center; }
.btn-rm {
  width: 34px; height: 34px;
  border-radius: 8px;
  border: 1px solid #FEE2E2;
  background: #FEF2F2;
  color: #DC2626;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.warning-banner {
  display: flex;
  gap: 0.875rem;
  background: #FFFBEB;
  border: 1px solid #FEF3C7;
  border-radius: 14px;
  padding: 1rem 1.25rem;
  color: #92400E;
  font-size: 0.875rem;
}
.warning-banner svg { flex-shrink: 0; margin-top: 1px; }
.warning-banner strong { display: block; font-weight: 800; margin-bottom: 4px; }
.warning-banner p { margin: 0; font-size: 0.82rem; opacity: 0.85; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
}
.btn-cancel {
  padding: 0.75rem 1.5rem;
  background: white;
  color: #64748B;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-cancel:hover { background: #F8FAFC; border-color: #CBD5E1; }
.btn-submit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.75rem;
  background: linear-gradient(135deg, #FF6600, #FF8C00);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(255,102,0,0.35);
  font-family: inherit;
}
.btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(255,102,0,0.45); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.spin-icon { animation: spin 1s linear infinite; }
</style>
