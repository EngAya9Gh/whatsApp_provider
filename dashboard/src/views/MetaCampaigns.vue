<template>
  <div class="mc-root">

    <!-- ── Hero Header ── -->
    <div class="hero-header">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <!-- Meta/WhatsApp icon -->
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.907-1.425A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
          </div>
          <div>
            <h1 class="hero-title">{{ isAr ? 'حملات ميتا' : 'Meta Campaigns' }}</h1>
            <p class="hero-sub">Send via official Meta/WhatsApp API with 100% delivery reliability</p>
          </div>
        </div>
        <button @click="openModal" class="btn-create">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Meta Campaign
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
          <span class="hstat-val cost">${{ totalCostAll }}</span>
          <span class="hstat-lbl">Total Cost</span>
        </div>
      </div>
    </div>

    <!-- ── Alerts ── -->
    <transition name="slide-fade">
      <div v-if="alertMsg" :class="['mc-alert', alertType]">
        <svg v-if="alertType === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        {{ alertMsg }}
      </div>
    </transition>

    <!-- ── Filter Toolbar ── -->
    <div class="filter-toolbar">
      <div class="search-wrap">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" class="search-input" placeholder="Search Meta campaigns..." />
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
      <span>Loading Meta campaigns...</span>
    </div>

    <!-- ── Empty ── -->
    <div v-else-if="filteredCampaigns.length === 0" class="state-empty">
      <div class="empty-art">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.907-1.425A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
        </svg>
      </div>
      <h3>No Meta Campaigns Yet</h3>
      <p>Start your first official WhatsApp Business campaign</p>
      <button @click="openModal" class="btn-create" style="margin-top:1.25rem">Launch First Campaign</button>
    </div>

    <!-- ── Cards Grid ── -->
    <div v-else class="cards-grid">
      <div v-for="campaign in filteredCampaigns" :key="campaign.id" class="camp-card">

        <!-- Accent stripe -->
        <div :class="['card-accent', `accent-${(campaign.status||'pending').toLowerCase()}`]"></div>

        <!-- Card Header -->
        <div class="card-head">
          <!-- Meta WA icon -->
          <div :class="['card-icon-wrap', `icon-${(campaign.status||'pending').toLowerCase()}`]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.907-1.425A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
          </div>
          <div class="card-title-block">
            <h3 class="card-name">{{ campaign.name }}</h3>
            <div class="card-meta-row">
              <div class="card-date">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ new Date(campaign.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </div>
              <span class="cat-badge" v-if="campaign.metaCategory">{{ campaign.metaCategory }}</span>
            </div>
          </div>
          <span :class="['status-badge', `badge-${(campaign.status||'pending').toLowerCase()}`]">
            <span class="badge-pulse" v-if="campaign.status === 'RUNNING'"></span>
            {{ campaign.status || 'PENDING' }}
          </span>
        </div>

        <!-- Cost chip -->
        <div class="cost-row">
          <div class="cost-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Total Cost: <strong>${{ (campaign.totalCost || 0).toFixed(4) }}</strong>
          </div>
        </div>

        <!-- Stats (Meta has read count too!) -->
        <div v-if="activeStats[campaign.id]" class="card-stats">
          <div class="stats-row">
            <div class="stat-box total">
              <span class="stat-n">{{ activeStats[campaign.id].total }}</span>
              <span class="stat-l">Total</span>
            </div>
            <div class="stat-box sent">
              <span class="stat-n">{{ activeStats[campaign.id].sent }}</span>
              <span class="stat-l">Sent</span>
            </div>
            <div class="stat-box read">
              <span class="stat-n">{{ activeStats[campaign.id].read || 0 }}</span>
              <span class="stat-l">Read</span>
            </div>
            <div class="stat-box failed">
              <span class="stat-n">{{ activeStats[campaign.id].failed }}</span>
              <span class="stat-l">Failed</span>
            </div>
          </div>

          <!-- Read rate progress bar (Meta exclusive) -->
          <div class="prog-wrap">
            <div class="prog-labels">
              <span class="prog-title">Read Rate</span>
              <span class="prog-pct read">{{ Math.round(((activeStats[campaign.id].read || 0) / (activeStats[campaign.id].sent || 1)) * 100) }}%</span>
            </div>
            <div class="prog-track">
              <div class="prog-bar-sent" :style="`width: ${(activeStats[campaign.id].sent / (activeStats[campaign.id].total || 1) * 100)}%`"></div>
              <div class="prog-bar-read" :style="`width: ${((activeStats[campaign.id].read||0) / (activeStats[campaign.id].total || 1) * 100)}%`"></div>
            </div>
            <div class="prog-legend">
              <span class="legend-sent">Sent</span>
              <span class="legend-read">Read</span>
            </div>
          </div>
        </div>

        <!-- Pending placeholder -->
        <div v-else class="card-pending-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Awaiting launch</span>
        </div>

        <!-- Card Actions -->
        <div class="card-actions">
          <div class="actions-left">
            <button v-if="campaign.status !== 'PENDING'" @click="loadStats(campaign.id)" class="act-btn refresh" title="Refresh stats">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
          </div>
          <div class="actions-right">
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

    <!-- ══ Create Modal ══ -->
    <transition name="modal-fade">
      <div v-if="showCreateModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-box">
          <div class="modal-layout">

            <!-- Left: Guide panel -->
            <div class="modal-guide">
              <div class="guide-header">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.907-1.425A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                </svg>
                Meta Campaign Guide
              </div>
              <div class="guide-items">
                <div class="guide-item">
                  <div class="guide-num">1</div>
                  <div>
                    <strong>Phone Numbers File</strong>
                    <p>Column A: International format (no + or 00)</p>
                  </div>
                </div>
                <div class="guide-item">
                  <div class="guide-num">2</div>
                  <div>
                    <strong>Dynamic Variables</strong>
                    <p>Variable &#123;&#123;1&#125;&#125; → Column B, &#123;&#123;2&#125;&#125; → Column C...</p>
                  </div>
                </div>
                <div class="guide-item">
                  <div class="guide-num">3</div>
                  <div>
                    <strong>Approved Templates Only</strong>
                    <p>Only APPROVED templates will be delivered by Meta</p>
                  </div>
                </div>
                <div class="guide-item warn">
                  <div class="guide-num warn">!</div>
                  <div>
                    <strong>Daily Limits</strong>
                    <p>Respect Meta's daily sending limits to avoid restrictions</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Form -->
            <div class="modal-form-panel">
              <div class="modal-form-header">
                <div>
                  <h2>New Meta Campaign</h2>
                  <p>Fill in the details to launch a WhatsApp Business campaign</p>
                </div>
                <button @click="closeModal" class="modal-close-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div class="modal-form-body">
                <div v-if="!activeMetaChannelId" class="channel-warning">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <div>
                    <strong>No Meta Channel Selected</strong>
                    <p>Please select an active Meta channel from the sidebar before creating a campaign.</p>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Campaign Name</label>
                  <input type="text" v-model="form.name" class="form-input" placeholder="e.g. Summer Promo 2025" />
                </div>

                <div class="form-group">
                  <label class="form-label">Approved Meta Template</label>
                  <select v-model="form.templateName" class="form-input">
                    <option value="" disabled>— Select a template —</option>
                    <option v-for="tpl in metaTemplates" :key="tpl.id" :value="tpl.name">{{ tpl.name }} ({{ tpl.category }})</option>
                  </select>
                  <div v-if="metaTemplates.length === 0" class="form-hint warn">No approved templates found for this channel.</div>
                </div>

                <div class="form-group">
                  <label class="form-label">Phone Numbers File (Excel / CSV)</label>
                  <div class="file-drop" @click="$refs.fileInput.click()">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span v-if="form.file">{{ form.file.name }}</span>
                    <span v-else>Click to upload Excel or CSV file</span>
                    <small>Column A = Phone, B/C/D... = Variables {{1}}/{{2}}...</small>
                  </div>
                  <input ref="fileInput" type="file" @change="handleFileUpload" accept=".csv,.xlsx,.xls" style="display:none" />
                </div>
              </div>

              <div class="modal-form-actions">
                <button @click="closeModal" class="btn-cancel">Cancel</button>
                <button @click="createCampaign" :disabled="isSubmitting" class="btn-submit">
                  <svg v-if="isSubmitting" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                  {{ isSubmitting ? 'Launching...' : 'Launch Campaign' }}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useMetaChannel } from '../composables/useMetaChannel'

const { activeMetaChannelId } = useMetaChannel()
const campaigns = ref([])
const metaTemplates = ref([])
const loading = ref(false)
const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const showCreateModal = ref(false)
const isSubmitting = ref(false)
const page = ref(1)
const totalPages = ref(1)
const alertMsg = ref('')
const alertType = ref('success')
const activeStats = ref({})
let pollInterval = null

const searchQuery = ref('')
const statusFilter = ref('ALL')

const statusFilters = [
  { label: 'All', value: 'ALL' },
  { label: 'Running', value: 'RUNNING' },
  { label: 'Completed', value: 'COMPLETED' },
]

const statusCount = (val) => {
  if (val === 'ALL') return campaigns.value.length
  return campaigns.value.filter(c => c.status === val).length
}

const totalCostAll = computed(() => {
  return campaigns.value.reduce((sum, c) => sum + (c.totalCost || 0), 0).toFixed(4)
})

const filteredCampaigns = computed(() => {
  let list = campaigns.value
  if (statusFilter.value !== 'ALL') list = list.filter(c => c.status === statusFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => c.name.toLowerCase().includes(q))
  }
  return list
})

const form = ref({ name: '', templateName: '', file: null })

const showAlert = (msg, type = 'success') => {
  alertMsg.value = msg
  alertType.value = type
  setTimeout(() => { alertMsg.value = '' }, 5000)
}

const fetchCampaigns = async () => {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    let url = `/api/v1/campaigns?page=${page.value}&campaignType=META`
    if (activeMetaChannelId.value) url += `&channelId=${activeMetaChannelId.value}`
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
    campaigns.value = res.data.data
    if (res.data.meta) totalPages.value = res.data.meta.totalPages || 1
    campaigns.value.forEach(c => { if (c.status !== 'PENDING') loadStats(c.id) })
  } catch (err) {
    console.error(err)
  } finally { loading.value = false }
}

const loadStats = async (id) => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${id}/stats`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    activeStats.value[id] = res.data.data.stats
    const campaign = campaigns.value.find(c => c.id === id)
    if (campaign && res.data.data.status) campaign.status = res.data.data.status
  } catch (err) {}
}

watch(activeMetaChannelId, () => {
  fetchCampaigns()
  if (showCreateModal.value) fetchTemplates()
})

const fetchTemplates = async () => {
  if (!activeMetaChannelId.value) return
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get(`/api/v1/meta/channel/${activeMetaChannelId.value}/meta-templates`, { headers: { Authorization: `Bearer ${token}` } })
    metaTemplates.value = (res.data.data?.data || []).filter(t => t.status === 'APPROVED')
  } catch (err) { console.error('Failed to fetch meta templates', err) }
}

const handleFileUpload = (event) => { form.value.file = event.target.files[0] }

const openModal = () => {
  showCreateModal.value = true
  if (activeMetaChannelId.value) {
    fetchTemplates()
  }
}

const closeModal = () => {
  showCreateModal.value = false
  form.value = { name: '', templateName: '', file: null }
}

const createCampaign = async () => {
  if (!form.value.name || !form.value.templateName || !form.value.file) {
    showAlert('Please fill all fields and upload a file.', 'error')
    return
  }
  if (!activeMetaChannelId.value) {
    showAlert('Please select a Meta channel first.', 'error')
    return
  }
  isSubmitting.value = true
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('name', form.value.name)
  formData.append('campaignType', 'META')
  formData.append('templateName', form.value.templateName)
  formData.append('channelId', activeMetaChannelId.value)
  const tpl = metaTemplates.value.find(t => t.name === form.value.templateName)
  if (tpl) formData.append('metaCategory', tpl.category)
  formData.append('file', form.value.file)
  try {
    const res = await axios.post('/api/v1/campaigns', formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } })
    await axios.post(`/api/v1/campaigns/${res.data.campaignId}/start`, {}, { headers: { Authorization: `Bearer ${token}` } })
    showAlert('Meta Campaign launched successfully! 🚀')
    closeModal()
    fetchCampaigns()
  } catch (err) {
    showAlert(err.response?.data?.error || 'Failed to create campaign', 'error')
  } finally { isSubmitting.value = false }
}

onMounted(() => {
  fetchCampaigns()
  pollInterval = setInterval(() => {
    campaigns.value.filter(c => c.status === 'RUNNING').forEach(c => loadStats(c.id))
  }, 10000)
})

onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.mc-root {
  padding: 0 0 4rem;
  min-height: 100vh;
  background: #F0F2F7;
  font-family: 'Inter', sans-serif;
  max-width: 1440px;
}

/* ═══ HERO ═══ */
.hero-header {
  background: linear-gradient(135deg, #0F172A 0%, #1a1f2e 50%, #0F172A 100%);
  padding: 2.5rem 2.5rem 0;
  position: relative;
  overflow: hidden;
}
.hero-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 60% 80% at 85% 50%, rgba(37,211,102,0.12) 0%, rgba(255,102,0,0.08) 50%, transparent 70%);
  pointer-events: none;
}
.hero-content { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; position: relative; z-index: 1; flex-wrap: wrap; }
.hero-left { display: flex; align-items: center; gap: 1.25rem; }
.hero-icon-wrap {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #25D366, #128C7E);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(37,211,102,0.35);
}
.hero-title { font-size: 2rem; font-weight: 900; color: #fff; margin: 0 0 0.3rem; letter-spacing: -0.03em; }
.hero-sub { font-size: 0.9rem; color: #94A3B8; margin: 0; font-weight: 500; }

.hero-stats {
  display: flex; align-items: center;
  margin-top: 2rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  padding: 1.25rem 2rem;
  position: relative; z-index: 1;
}
.hstat { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0 2rem; flex: 1; }
.hstat-val { font-size: 1.8rem; font-weight: 900; color: #fff; line-height: 1; }
.hstat-val.running { color: #60A5FA; }
.hstat-val.done { color: #34D399; }
.hstat-val.cost { color: #FBBF24; }
.hstat-lbl { font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; }
.hstat-sep { width: 1px; height: 40px; background: rgba(255,255,255,0.08); flex-shrink: 0; }

.btn-create {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #25D366, #128C7E);
  color: white; padding: 0.8rem 1.5rem;
  border: none; border-radius: 14px;
  font-weight: 800; font-size: 0.9rem;
  cursor: pointer; transition: all 0.25s;
  box-shadow: 0 6px 20px rgba(37,211,102,0.35);
  white-space: nowrap; font-family: inherit;
}
.btn-create:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(37,211,102,0.45); }

/* ═══ ALERTS ═══ */
.mc-alert {
  display: flex; align-items: center; gap: 10px;
  padding: 1rem 1.5rem;
  border-radius: 14px; font-weight: 600; font-size: 0.9rem;
  margin: 1.5rem 2.5rem 0;
}
.mc-alert.error { background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; }
.mc-alert.success { background: #F0FDF4; color: #16A34A; border: 1px solid #DCFCE7; }
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(-10px); }

/* ═══ FILTER TOOLBAR ═══ */
.filter-toolbar { display: flex; align-items: center; gap: 1rem; padding: 1.5rem 2.5rem; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 340px; }
.search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
.search-input {
  width: 100%; padding: 0.7rem 1rem 0.7rem 2.5rem;
  border: 1.5px solid #E2E8F0; border-radius: 12px;
  font-size: 0.875rem; color: #334155; background: white;
  outline: none; transition: all 0.2s; box-sizing: border-box;
  font-family: inherit; box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.search-input:focus { border-color: #25D366; box-shadow: 0 0 0 3px rgba(37,211,102,0.1); }
.status-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0.5rem 1rem; border-radius: 10px;
  border: 1.5px solid #E2E8F0; background: white;
  color: #64748B; font-size: 0.8rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
  font-family: inherit;
}
.status-pill:hover { border-color: #CBD5E1; color: #334155; }
.status-pill.active { background: #0F172A; color: white; border-color: #0F172A; }
.status-pill.running.active { background: #1D4ED8; border-color: #1D4ED8; }
.status-pill.completed.active { background: #059669; border-color: #059669; }
.pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #CBD5E1; }
.status-pill.active .pill-dot { background: rgba(255,255,255,0.6); }
.pill-badge { background: #F1F5F9; color: #64748B; padding: 1px 7px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; }
.status-pill.active .pill-badge { background: rgba(255,255,255,0.2); color: white; }

/* ═══ STATES ═══ */
.state-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 6rem 2rem; color: #64748B; font-weight: 600; }
.spin-ring { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #25D366; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.state-empty { display: flex; flex-direction: column; align-items: center; padding: 5rem 2rem; text-align: center; color: #64748B; }
.empty-art { margin-bottom: 1.5rem; }
.state-empty h3 { font-size: 1.4rem; font-weight: 800; color: #1E293B; margin: 0 0 0.5rem; }
.state-empty p { font-size: 0.95rem; margin: 0; color: #94A3B8; }

/* ═══ CARDS GRID ═══ */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.5rem; padding: 0 2.5rem 2rem; }
@media(max-width:640px) { .cards-grid { grid-template-columns: 1fr; padding: 0 1rem 2rem; } }

.camp-card {
  background: #fff; border-radius: 20px;
  border: 1px solid #E8EDF5;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03);
  display: flex; flex-direction: column; overflow: hidden;
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
.camp-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.08), 0 6px 16px rgba(0,0,0,0.04); border-color: #D1D9E8; }

.card-accent { height: 4px; width: 100%; }
.accent-pending   { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.accent-running   { background: linear-gradient(90deg, #25D366, #128C7E); }
.accent-completed { background: linear-gradient(90deg, #10B981, #34D399); }
.accent-failed    { background: linear-gradient(90deg, #EF4444, #F87171); }

.card-head { display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem 1.5rem 0; }
.card-icon-wrap { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-pending   { background: #FEF3C7; color: #D97706; }
.icon-running   { background: #DCFCE7; color: #128C7E; }
.icon-completed { background: #DCFCE7; color: #16A34A; }
.icon-failed    { background: #FEE2E2; color: #DC2626; }
.card-title-block { flex: 1; min-width: 0; }
.card-name { font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0 0 0.35rem; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.card-date { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: #94A3B8; font-weight: 600; }
.cat-badge { background: #ECFDF5; color: #059669; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0.35rem 0.9rem; border-radius: 30px;
  font-size: 0.72rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.06em;
  white-space: nowrap; flex-shrink: 0;
}
.badge-pending   { background: #FEF3C7; color: #B45309; }
.badge-running   { background: #DCFCE7; color: #128C7E; }
.badge-completed { background: #DCFCE7; color: #15803D; }
.badge-failed    { background: #FEE2E2; color: #B91C1C; }
.badge-pulse { width: 7px; height: 7px; border-radius: 50%; background: #25D366; animation: badge-pulse 1.4s infinite; }
@keyframes badge-pulse { 0%,100%{ transform:scale(1); opacity:1; } 50%{ transform:scale(1.6); opacity:0.4; } }

/* Cost chip */
.cost-row { padding: 0.75rem 1.5rem; }
.cost-chip { display: inline-flex; align-items: center; gap: 6px; background: #FFFBEB; border: 1px solid #FEF3C7; color: #B45309; font-size: 0.8rem; font-weight: 600; padding: 0.3rem 0.875rem; border-radius: 8px; }
.cost-chip strong { color: #D97706; font-weight: 900; }

/* Stats */
.card-stats { padding: 0 1.5rem 1rem; display: flex; flex-direction: column; gap: 1rem; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stat-box { display: flex; flex-direction: column; align-items: center; padding: 0.875rem 0.5rem; border-radius: 14px; gap: 4px; transition: transform 0.2s; }
.stat-box:hover { transform: translateY(-2px); }
.stat-n { font-size: 1.35rem; font-weight: 900; line-height: 1; }
.stat-l { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
.stat-box.total   { background: #F8FAFC; border: 1px solid #E2E8F0; } .stat-box.total   .stat-n { color: #0F172A; } .stat-box.total   .stat-l { color: #94A3B8; }
.stat-box.sent    { background: #ECFDF5; border: 1px solid #D1FAE5; } .stat-box.sent    .stat-n { color: #059669; } .stat-box.sent    .stat-l { color: #6EE7B7; }
.stat-box.read    { background: #EFF6FF; border: 1px solid #BFDBFE; } .stat-box.read    .stat-n { color: #2563EB; } .stat-box.read    .stat-l { color: #93C5FD; }
.stat-box.failed  { background: #FEF2F2; border: 1px solid #FEE2E2; } .stat-box.failed  .stat-n { color: #DC2626; } .stat-box.failed  .stat-l { color: #FCA5A5; }

/* Dual progress bar (Sent + Read) */
.prog-wrap {}
.prog-labels { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 7px; }
.prog-title { font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
.prog-pct { font-size: 1.1rem; font-weight: 900; }
.prog-pct.read { color: #2563EB; }
.prog-track { height: 8px; background: #F1F5F9; border-radius: 99px; overflow: hidden; position: relative; box-shadow: inset 0 1px 3px rgba(0,0,0,0.06); }
.prog-bar-sent { position: absolute; inset-y: 0; left: 0; background: #25D366; border-radius: 99px; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
.prog-bar-read { position: absolute; inset-y: 0; left: 0; background: #2563EB; border-radius: 99px; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
.prog-legend { display: flex; gap: 1rem; margin-top: 6px; font-size: 0.7rem; font-weight: 700; }
.legend-sent { color: #25D366; } .legend-read { color: #2563EB; }

.card-pending-banner {
  display: flex; align-items: center; gap: 0.75rem;
  margin: 0 1.5rem;
  background: linear-gradient(to right, #FFFBEB, #FEF9C3);
  border: 1px dashed #FCD34D;
  padding: 1rem 1.25rem; border-radius: 12px;
  color: #92400E; font-size: 0.875rem; font-weight: 600;
}

/* Card actions */
.card-actions {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px dashed #F1F5F9; margin-top: 0.75rem;
}
.actions-left, .actions-right { display: flex; align-items: center; gap: 8px; }
.act-btn {
  width: 38px; height: 38px; border-radius: 10px;
  border: 1.5px solid #E2E8F0; background: white;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #64748B; transition: all 0.2s;
}
.act-btn.refresh:hover { background: #EFF6FF; border-color: #BFDBFE; color: #2563EB; }
.btn-view {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 0.6rem 1.1rem;
  background: white; color: #0F172A;
  border: 1.5px solid #E2E8F0; border-radius: 10px;
  font-size: 0.85rem; font-weight: 800;
  text-decoration: none; transition: all 0.2s;
}
.btn-view:hover { background: #F8FAFC; border-color: #CBD5E1; transform: translateY(-1px); }

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 2rem; }
.page-btn { width: 40px; height: 40px; border-radius: 12px; border: 1.5px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; }
.page-btn:hover:not(:disabled) { border-color: #25D366; color: #25D366; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-numbers { display: flex; align-items: center; gap: 6px; }
.page-num { font-size: 0.95rem; font-weight: 800; color: #0F172A; }
.page-sep { color: #CBD5E1; }

/* ═══ MODAL ═══ */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.65); backdrop-filter: blur(6px); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 1rem; }
.modal-box { background: white; border-radius: 24px; width: 100%; max-width: 780px; max-height: 92vh; overflow: hidden; box-shadow: 0 32px 64px rgba(0,0,0,0.2); }
.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: scale(0.95); }

.modal-layout { display: grid; grid-template-columns: 260px 1fr; height: 100%; }

/* Guide panel */
.modal-guide {
  background: linear-gradient(160deg, #0F172A 0%, #1E293B 100%);
  padding: 2rem 1.5rem;
  display: flex; flex-direction: column; gap: 1.5rem;
  border-radius: 24px 0 0 24px;
}
.guide-header {
  display: flex; align-items: center; gap: 10px;
  font-size: 1rem; font-weight: 800; color: white;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.guide-header svg { color: #FF6600; }
.guide-items { display: flex; flex-direction: column; gap: 1.25rem; }
.guide-item { display: flex; gap: 0.875rem; }
.guide-item strong { display: block; font-size: 0.85rem; font-weight: 800; color: #F1F5F9; margin-bottom: 2px; }
.guide-item p { font-size: 0.77rem; color: #94A3B8; margin: 0; line-height: 1.5; }
.guide-num {
  width: 26px; height: 26px; border-radius: 8px;
  background: rgba(255,102,0,0.15); color: #FF6600;
  font-size: 0.8rem; font-weight: 900;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.guide-item.warn .guide-num { background: rgba(251,191,36,0.15); color: #FBBF24; }

/* Form panel */
.modal-form-panel { display: flex; flex-direction: column; max-height: 92vh; overflow-y: auto; }
.modal-form-header {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;
  padding: 1.75rem 1.75rem 1.25rem;
  border-bottom: 1px solid #F1F5F9;
  position: sticky; top: 0; background: white; z-index: 1;
}
.modal-form-header h2 { margin: 0 0 0.2rem; font-size: 1.15rem; font-weight: 800; color: #0F172A; }
.modal-form-header p { margin: 0; font-size: 0.85rem; color: #64748B; }
.modal-close-btn { width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; flex-shrink: 0; }
.modal-close-btn:hover { background: #FEE2E2; border-color: #FCA5A5; color: #DC2626; }

.channel-warning {
  display: flex; align-items: flex-start; gap: 10px;
  background: #FFFBEB; border: 1px dashed #FCD34D;
  padding: 1rem; border-radius: 12px;
  color: #B45309;
}
.channel-warning svg { color: #D97706; flex-shrink: 0; }
.channel-warning strong { display: block; margin-bottom: 2px; font-size: 0.9rem; }
.channel-warning p { margin: 0; font-size: 0.8rem; color: #92400E; }

.modal-form-body { padding: 1.5rem 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; flex: 1; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-label { font-size: 0.85rem; font-weight: 700; color: #334155; }
.form-input {
  width: 100%; padding: 0.75rem 1rem;
  border: 1.5px solid #E2E8F0; border-radius: 12px;
  font-family: inherit; font-size: 0.875rem; color: #334155;
  outline: none; transition: all 0.2s; box-sizing: border-box; background: white;
}
.form-input:focus { border-color: #25D366; box-shadow: 0 0 0 3px rgba(37,211,102,0.08); }
.form-hint { font-size: 0.78rem; color: #94A3B8; }
.form-hint.warn { color: #D97706; }

.file-drop {
  border: 2px dashed #E2E8F0; border-radius: 14px;
  padding: 1.5rem; text-align: center; cursor: pointer;
  transition: all 0.2s; display: flex; flex-direction: column;
  align-items: center; gap: 0.5rem;
  color: #64748B; font-size: 0.875rem; font-weight: 600;
}
.file-drop:hover { border-color: #25D366; background: #F0FDF4; color: #059669; }
.file-drop svg { color: #94A3B8; }
.file-drop small { font-size: 0.75rem; color: #94A3B8; font-weight: 400; }

.modal-form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem 1.75rem; border-top: 1px solid #F1F5F9; background: #FAFBFD; }
.btn-cancel { padding: 0.75rem 1.5rem; background: white; color: #64748B; border: 1.5px solid #E2E8F0; border-radius: 12px; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.btn-cancel:hover { background: #F8FAFC; border-color: #CBD5E1; }
.btn-submit {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0.75rem 1.75rem;
  background: linear-gradient(135deg, #25D366, #128C7E);
  color: white; border: none; border-radius: 12px;
  font-weight: 800; font-size: 0.875rem;
  cursor: pointer; transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(37,211,102,0.35);
  font-family: inherit;
}
.btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(37,211,102,0.45); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.spin-icon { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
