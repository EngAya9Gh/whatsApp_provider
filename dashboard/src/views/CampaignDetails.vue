<template>
  <div class="campaign-details-page">
    <div class="page-header">
      <button @click="$router.push('/campaigns')" class="btn-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        {{ $te('campaigns.back') ? $t('campaigns.back') : ($i18n.locale === 'ar' ? 'العودة للحملات' : 'Back to Campaigns') }}
      </button>

      <div class="header-content" v-if="campaign">
        <div class="header-left">
          <h1 class="campaign-title">{{ campaign.name }}</h1>
          <p class="campaign-subtitle">{{ campaign.message || 'Template Message' }}</p>
          <div class="campaign-dates" v-if="campaign.startDate || campaign.endDate">
            <span class="date-badge" v-if="campaign.startDate" title="Tracking Starts At">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Starts: {{ new Date(campaign.startDate).toLocaleString() }}
            </span>
            <span class="date-badge" v-if="campaign.endDate" title="Tracking Ends At">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect></svg>
              Ends: {{ new Date(campaign.endDate).toLocaleString() }}
            </span>
          </div>
        </div>
        <div class="header-right">
          <span :class="['status-badge', campaign.status.toLowerCase()]">
            <span class="status-dot"></span>
            {{ campaign.status }}
          </span>
        </div>
      </div>
      <div v-else class="loading-pulse">
        <div class="pulse-line title"></div>
        <div class="pulse-line subtitle"></div>
      </div>
    </div>
    <!-- Modern Campaign Stats -->
    <div class="campaign-stats-modern" v-if="campaignStats">
      <div class="progress-container">
        <div class="progress-header">
          <span class="progress-title">Overall Sending Progress</span>
          <span class="progress-percentage">
            {{ Math.round((campaignStats.sent / (campaignStats.total || 1)) * 100) }}%
          </span>
        </div>
        <div class="progress-bar-modern">
          <div class="progress-fill-modern" :style="{ width: (campaignStats.sent / (campaignStats.total || 1) * 100) + '%' }"></div>
        </div>
      </div>

      <div class="stats-mini-grid">
        <div class="stat-pill">
          <span class="stat-pill-label">Total Numbers</span>
          <span class="stat-pill-value font-mono">{{ campaignStats.total }}</span>
        </div>
        <div class="stat-pill success">
          <span class="stat-pill-label">Sent Successfully</span>
          <span class="stat-pill-value font-mono">{{ campaignStats.sent }}</span>
        </div>
        <div class="stat-pill warning">
          <span class="stat-pill-label">Pending</span>
          <span class="stat-pill-value font-mono">{{ campaignStats.pending }}</span>
        </div>
        <div class="stat-pill danger">
          <span class="stat-pill-label">Failed</span>
          <span class="stat-pill-value font-mono">{{ campaignStats.failed }}</span>
        </div>
      </div>
    </div>
    <!-- TABS -->
    <div class="tabs-wrapper">
      <div class="tabs-container">
        <button :class="['tab-btn', { active: activeTab === 'targets' }]" @click="activeTab = 'targets'; fetchTargets();">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Targets & Numbers
        </button>
        <button :class="['tab-btn', { active: activeTab === 'interactions' }]" @click="activeTab = 'interactions'; fetchInteractions();">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Interactions & Replies
        </button>
      </div>
    </div>

    <!-- TARGETS TAB -->
    <div v-if="activeTab === 'targets'" class="tab-content fade-in">
      <div class="filters-bar">
        <div class="quick-filters">
          <button 
            v-for="status in ['ALL', 'PENDING', 'SENT', 'FAILED']" 
            :key="status"
            :class="['filter-pill', status.toLowerCase(), { active: targetStatus === status }]"
            @click="targetStatus = status; targetPage = 1; fetchTargets()"
          >
            <span class="filter-dot"></span>
            {{ status === 'ALL' ? 'All Numbers' : status }}
          </button>
        </div>

        <div class="actions-group">
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input v-model="targetSearch" @keyup.enter="fetchTargets" type="text" placeholder="Search phone number..." class="form-input" />
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button v-if="targets.some(t => t.status === 'FAILED')" @click="retryFailed" class="btn-retry" :disabled="retrying">
              <svg v-if="!retrying" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
              <svg v-else class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
              {{ retrying ? 'Retrying...' : 'Retry Failed' }}
            </button>
            <button v-if="$hasFeature('EXCEL_EXPORT')" @click="exportData('targets')" class="btn-export">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export CSV
            </button>
            <button v-else @click="alertUpgrade('Excel Export requires PRO plan')" class="btn-export" style="background:#cbd5e1;cursor:not-allowed;" title="Upgrade to PRO to unlock">
              🔒 Export CSV
            </button>
          </div>
        </div>
      </div>

      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Status</th>
              <th>Error Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="target in targets" :key="target.id">
              <td class="font-mono">{{ target.phone }}</td>
              <td>
                <span :class="['status-chip', target.status.toLowerCase()]">
                  {{ target.status }}
                </span>
              </td>
              <td class="error-text">{{ target.error || '-' }}</td>
            </tr>
            <tr v-if="targets.length === 0">
              <td colspan="3" class="empty-state">
                <div class="empty-content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <p>No targets found matching your criteria.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div v-if="targetTotalPages > 1" class="pagination">
        <button :disabled="targetPage === 1" @click="targetPage--; fetchTargets()" class="page-btn">← Prev</button>
        <span class="page-info">Page <strong>{{ targetPage }}</strong> of <strong>{{ targetTotalPages }}</strong></span>
        <button :disabled="targetPage === targetTotalPages" @click="targetPage++; fetchTargets()" class="page-btn">Next →</button>
      </div>
    </div>

    <!-- INTERACTIONS TAB -->
    <div v-if="activeTab === 'interactions'" class="tab-content fade-in">
      <div v-if="interactionStats" class="stats-grid">
        <div class="stat-card interacted">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ interactionStats.interacted }}</div>
            <div class="stat-label">Interacted</div>
          </div>
        </div>
        <div class="stat-card no-response">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ interactionStats.notInteracted }}</div>
            <div class="stat-label">No Response</div>
          </div>
        </div>
        <div class="stat-card button-stat" v-for="(count, btnText) in interactionStats.buttonBreakdown" :key="btnText">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ count }}</div>
            <div class="stat-label">"{{ btnText }}"</div>
          </div>
        </div>
      </div>

      <div class="filters-bar" style="margin-top: 2rem;">
        <div class="actions-group" style="width: 100%; justify-content: space-between;">
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input v-model="interactionSearch" @keyup.enter="fetchInteractions" type="text" placeholder="Search phone number..." class="form-input" />
          </div>
          <button v-if="$hasFeature('EXCEL_EXPORT')" @click="exportData('interactions')" class="btn-export">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export CSV
          </button>
          <button v-else @click="alertUpgrade('Excel Export requires PRO plan')" class="btn-export" style="background:#cbd5e1;cursor:not-allowed;" title="Upgrade to PRO to unlock">
            🔒 Export CSV
          </button>
        </div>
      </div>

      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Response / Button</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="interaction in interactions" :key="interaction.id">
              <td class="font-mono">{{ interaction.phone }}</td>
              <td><span class="status-chip completed">{{ interaction.buttonText }}</span></td>
              <td class="time-text">{{ new Date(interaction.createdAt).toLocaleString() }}</td>
            </tr>
            <tr v-if="interactions.length === 0">
              <td colspan="3" class="empty-state">
                <div class="empty-content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <p>No interactions recorded yet.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="interactionTotalPages > 1" class="pagination">
        <button :disabled="interactionPage === 1" @click="interactionPage--; fetchInteractions()" class="page-btn">← Prev</button>
        <span class="page-info">Page <strong>{{ interactionPage }}</strong> of <strong>{{ interactionTotalPages }}</strong></span>
        <button :disabled="interactionPage === interactionTotalPages" @click="interactionPage++; fetchInteractions()" class="page-btn">Next →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const campaignId = route.params.id

const loading = ref(true)
const campaign = ref(null)
const activeTab = ref('targets')
const retrying = ref(false)
const campaignStats = ref(null)

// Targets Pagination & Filters
const targets = ref([])
const targetPage = ref(1)
const targetTotalPages = ref(1)
const targetSearch = ref('')
const targetStatus = ref('ALL')

// Interactions Pagination & Filters
const interactions = ref([])
const interactionPage = ref(1)
const interactionTotalPages = ref(1)
const interactionStatus = ref('ALL')
const interactionSearch = ref('')
const interactionStats = ref(null)

const alertUpgrade = (msg) => {
  alert(msg)
}

onMounted(async () => {
  await fetchCampaignDetails()
  await fetchTargets()
  fetchCampaignStats()
})

const fetchCampaignStats = async () => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${campaignId}/stats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    campaignStats.value = res.data.data.stats
  } catch (err) {
    console.error('Failed to load stats', err)
  }
}

const fetchCampaignDetails = async () => {
  try {
    const res = await axios.get('/api/v1/campaigns', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    campaign.value = res.data.data.find(c => c.id === campaignId)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchTargets = async () => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${campaignId}/targets`, {
      params: {
        page: targetPage.value,
        limit: 20,
        status: targetStatus.value,
        search: targetSearch.value
      },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    targets.value = res.data.data.targets || res.data.data
    if (res.data.data.totalPages) {
      targetTotalPages.value = res.data.data.totalPages
    }
  } catch (err) {
    console.error(err)
  }
}

// Quick Search Watcher for seamless UX
let searchTimeout;
watch(targetSearch, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    targetPage.value = 1;
    fetchTargets();
  }, 500);
});

watch(interactionSearch, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    interactionPage.value = 1;
    fetchInteractions();
  }, 500);
});


const fetchInteractions = async () => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${campaignId}/interactions`, {
      params: {
        page: interactionPage.value,
        limit: 20,
        search: interactionSearch.value
      },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    interactions.value = res.data.data.interactions || []
    if (res.data.data.totalPages) {
      interactionTotalPages.value = res.data.data.totalPages
    }
    if (res.data.data.stats) {
      interactionStats.value = res.data.data.stats
    }
  } catch (err) {
    console.error(err)
  }
}

const retryFailed = async () => {
  retrying.value = true
  try {
    const res = await axios.post(`/api/v1/campaigns/${campaignId}/retry`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    alert(res.data.message || 'Retrying failed numbers...')
    setTimeout(() => {
      fetchTargets()
    }, 1000)
  } catch (err) {
    console.error('Failed to retry campaign', err)
    alert(err.response?.data?.message || 'Failed to retry campaign.')
  } finally {
    retrying.value = false
  }
}

const exportData = (type) => {
  let url = `/api/v1/campaigns/${campaignId}/export?type=${type}`
  if (type === 'targets' && targetStatus.value !== 'ALL') {
    url += `&status=${targetStatus.value}`
  }
  
  axios.get(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    responseType: 'blob'
  }).then(response => {
    const href = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = href
    link.setAttribute('download', `campaign_${campaignId}_${type}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
  }).catch(err => {
    console.error('Export failed', err)
    alert('Failed to export data')
  })
}
</script>

<style scoped>
.campaign-details-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Inter', system-ui, sans-serif;
  color: #1E293B;
}

/* Animations */
.fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Header */
.page-header {
  margin-bottom: 2rem;
}
.btn-back {
  background: white;
  border: 1px solid #E2E8F0;
  color: #64748B;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.btn-back:hover {
  background: #F8FAFC;
  color: #0F172A;
  transform: translateX(-3px);
  border-color: #CBD5E1;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
.campaign-title { font-size: 2rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem 0; line-height: 1.2; }
.campaign-subtitle { color: #64748B; font-size: 1.05rem; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.campaign-dates { display: flex; gap: 1rem; margin-top: 0.75rem; }
.date-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; font-weight: 600; color: #475569; background: #F1F5F9; padding: 0.3rem 0.75rem; border-radius: 6px; }

.status-badge {
  display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border-radius: 999px;
  font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; }

.status-badge.pending { background: #FEF3C7; color: #D97706; }
.status-badge.pending .status-dot { background: #F59E0B; }
.status-badge.sent, .status-badge.completed { background: #ECFDF5; color: #059669; }
.status-badge.sent .status-dot, .status-badge.completed .status-dot { background: #10B981; }
.status-badge.failed { background: #FEF2F2; color: #DC2626; }
.status-badge.failed .status-dot { background: #EF4444; }

/* Tabs */
.tabs-wrapper {
  margin-bottom: 2rem;
  border-bottom: 2px solid #F1F5F9;
}
.tabs-container {
  display: flex;
  gap: 2rem;
}
.tab-btn {
  background: none;
  border: none;
  font-size: 1.05rem;
  font-weight: 600;
  color: #64748B;
  cursor: pointer;
  padding: 1rem 0;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.tab-btn:hover { color: #334155; }
.tab-btn.active {
  color: #3B82F6;
  border-bottom-color: #3B82F6;
}

/* Quick Filters (Pills) */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.quick-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.filter-pill {
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #F1F5F9;
  color: #64748B;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.filter-pill:hover { background: #E2E8F0; color: #334155; }

.filter-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94A3B8;
  transition: background 0.2s ease;
}
.filter-pill.pending:not(.active) .filter-dot { background: #F59E0B; }
.filter-pill.sent:not(.active) .filter-dot { background: #10B981; }
.filter-pill.failed:not(.active) .filter-dot { background: #EF4444; }
.filter-pill.all:not(.active) .filter-dot { background: #64748B; }

.filter-pill.active .filter-dot { background: white; opacity: 0.8; }

/* specific pill colors */
.filter-pill.all.active { background: #1E293B; color: white; box-shadow: 0 4px 10px rgba(30, 41, 59, 0.2); }
.filter-pill.pending.active { background: #F59E0B; color: white; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.2); }
.filter-pill.sent.active { background: #10B981; color: white; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); }
.filter-pill.failed.active { background: #EF4444; color: white; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2); }

/* Actions Group */
.actions-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 12px;
  color: #94A3B8;
}
.form-input {
  padding: 0.65rem 1rem 0.65rem 2.5rem;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  min-width: 250px;
  transition: all 0.2s ease;
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05) inset;
}
.form-input:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-export {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  color: white;
  padding: 0.65rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
  transition: all 0.2s ease;
}
.btn-export:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3);
}

.btn-retry {
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  color: white;
  padding: 0.65rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 10px rgba(245, 158, 11, 0.2);
  transition: all 0.2s ease;
}
.btn-retry:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(245, 158, 11, 0.3);
}
.btn-retry:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes spin { 100% { transform: rotate(360deg); } }
.spin-icon { animation: spin 1s linear infinite; }

/* Table */
.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  border: 1px solid #E2E8F0;
  overflow: hidden;
  margin-bottom: 1.5rem;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th, .data-table td {
  padding: 1.2rem 1.5rem;
  text-align: left;
}
.data-table th {
  background: #F8FAFC;
  font-size: 0.85rem;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #E2E8F0;
}
.data-table td {
  border-bottom: 1px solid #F1F5F9;
  font-size: 0.95rem;
  color: #334155;
}
.data-table tr:hover td {
  background: #F8FAFC;
}
.data-table tr:last-child td {
  border-bottom: none;
}
.font-mono { font-family: 'JetBrains Mono', monospace, sans-serif; font-weight: 500; }
.error-text { color: #EF4444; font-size: 0.85rem; }
.time-text { color: #64748B; font-size: 0.85rem; }

/* Status Chips (small table versions) */
.status-chip {
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.status-chip.pending { background: #FEF3C7; color: #B45309; }
.status-chip.sent, .status-chip.completed { background: #D1FAE5; color: #047857; }
.status-chip.failed { background: #FEE2E2; color: #B91C1C; }

/* Empty state */
.empty-state { text-align: center; padding: 4rem 2rem !important; }
.empty-content { display: flex; flex-direction: column; align-items: center; gap: 1rem; color: #94A3B8; }
.empty-content svg { opacity: 0.5; }
.empty-content p { margin: 0; font-size: 1.05rem; font-weight: 500; }

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}
.stat-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  border: 1px solid #E2E8F0;
  transition: transform 0.2s ease;
}
.stat-card:hover { transform: translateY(-3px); }
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-content { display: flex; flex-direction: column; }
.stat-value { font-size: 2rem; font-weight: 800; color: #0F172A; line-height: 1; margin-bottom: 0.25rem; }
.stat-label { font-size: 0.85rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }

/* Card colors */
.stat-card.interacted .stat-icon { background: #ECFDF5; color: #10B981; }
.stat-card.no-response .stat-icon { background: #FEF2F2; color: #EF4444; }
.stat-card.button-stat .stat-icon { background: #EFF6FF; color: #3B82F6; }

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2rem;
}
.page-btn {
  background: white;
  border: 1px solid #E2E8F0;
  color: #334155;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.page-btn:hover:not(:disabled) {
  background: #F8FAFC;
  border-color: #CBD5E1;
  transform: translateY(-1px);
}
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { color: #64748B; font-size: 0.95rem; }
.page-info strong { color: #0F172A; }

/* Modern Stats */
.campaign-stats-modern { background: white; margin-bottom: 2rem; border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.progress-container { margin-bottom: 1.5rem; }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.progress-title { font-size: 0.85rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
.progress-percentage { font-size: 0.95rem; font-weight: 800; color: #0F172A; }
.progress-bar-modern { width: 100%; height: 10px; background: #F1F5F9; border-radius: 999px; overflow: hidden; }
.progress-fill-modern { height: 100%; background: linear-gradient(90deg, #FF6600 0%, #F97316 100%); transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 999px; }

.stats-mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.stat-pill { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transition: transform 0.2s ease; }
.stat-pill:hover { transform: translateY(-2px); }
.stat-pill.success { background: #F0FDF4; border-color: #DCFCE7; }
.stat-pill.warning { background: #FFFBEB; border-color: #FEF3C7; }
.stat-pill.danger { background: #FEF2F2; border-color: #FEE2E2; }
.stat-pill-label { font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase; }
.stat-pill.success .stat-pill-label { color: #166534; }
.stat-pill.warning .stat-pill-label { color: #B45309; }
.stat-pill.danger .stat-pill-label { color: #991B1B; }
.stat-pill-value { font-size: 1.2rem; font-weight: 800; color: #0F172A; }
.font-mono { font-family: 'JetBrains Mono', monospace; }
</style>
