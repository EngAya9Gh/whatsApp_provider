<template>
  <div class="view-header">
    <h2>Campaign Details</h2>
    <div style="display: flex; gap: 1rem;">
      <button @click="$router.push('/campaigns')" class="btn-secondary">← Back to Campaigns</button>
    </div>
  </div>

  <div class="content-card" v-if="loading">
    <div class="loading-state">Loading campaign data...</div>
  </div>

  <div v-else-if="campaign" class="content-card">
    <div style="display: flex; justify-content: space-between; margin-bottom: 2rem;">
      <div>
        <h3>{{ campaign.name }}</h3>
        <p style="color: #64748B;">{{ campaign.message || 'Template Message' }}</p>
      </div>
      <div>
        <span :class="['status-badge', campaign.status.toLowerCase()]">{{ campaign.status }}</span>
      </div>
    </div>

    <!-- TABS -->
    <div class="modal-tabs" style="margin-bottom: 1.5rem;">
      <button :class="{ active: activeTab === 'targets' }" @click="activeTab = 'targets'; fetchTargets();">
        Targets & Numbers
      </button>
      <button :class="{ active: activeTab === 'interactions' }" @click="activeTab = 'interactions'; fetchInteractions();">
        Interactions & Replies
      </button>
    </div>

    <!-- TARGETS TAB -->
    <div v-if="activeTab === 'targets'">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
        <div style="display: flex; gap: 1rem; flex: 1;">
          <input v-model="targetSearch" @keyup.enter="fetchTargets" type="text" placeholder="Search phone number..." class="form-input" style="max-width: 300px;" />
          <select v-model="targetStatus" @change="fetchTargets" class="form-input" style="max-width: 150px;">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>
          <button @click="fetchTargets" class="btn-secondary">Search</button>
        </div>
        <div>
          <button @click="exportData('targets')" class="btn-primary" style="background: #10B981; border-color: #10B981;">
            ↓ Export Targets CSV
          </button>
        </div>
      </div>

      <div class="targets-container">
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
              <td><span :class="['status-badge', target.status.toLowerCase()]">{{ target.status }}</span></td>
              <td style="color: #DC2626; font-size: 0.85rem;">{{ target.error || '-' }}</td>
            </tr>
            <tr v-if="targets.length === 0">
              <td colspan="3" style="text-align: center; color: #94A3B8; padding: 2rem;">No targets found.</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination Controls -->
      <div v-if="targetTotalPages > 1" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
        <button :disabled="targetPage === 1" @click="targetPage--; fetchTargets()" class="btn-secondary">Previous</button>
        <span>Page {{ targetPage }} of {{ targetTotalPages }}</span>
        <button :disabled="targetPage === targetTotalPages" @click="targetPage++; fetchTargets()" class="btn-secondary">Next</button>
      </div>
    </div>

    <!-- INTERACTIONS TAB -->
    <div v-if="activeTab === 'interactions'">
      <div v-if="interactionStats" class="interactions-stats-row" style="margin-bottom: 2rem;">
        <div class="istat-card green">
          <div class="istat-num">{{ interactionStats.interacted }}</div>
          <div class="istat-label">Interacted</div>
        </div>
        <div class="istat-card red">
          <div class="istat-num">{{ interactionStats.notInteracted }}</div>
          <div class="istat-label">No Response</div>
        </div>
        <div class="istat-card blue" v-for="(count, btnText) in interactionStats.buttonBreakdown" :key="btnText">
          <div class="istat-num">{{ count }}</div>
          <div class="istat-label">{{ btnText }}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
        <div style="display: flex; gap: 1rem; flex: 1;">
          <input v-model="interactionSearch" @keyup.enter="fetchInteractions" type="text" placeholder="Search phone number..." class="form-input" style="max-width: 300px;" />
          <button @click="fetchInteractions" class="btn-secondary">Search</button>
        </div>
        <div>
          <button @click="exportData('interactions')" class="btn-primary" style="background: #10B981; border-color: #10B981;">
            ↓ Export Interactions CSV
          </button>
        </div>
      </div>

      <div class="targets-container">
        <table class="targets-table">
          <thead>
            <tr>
              <th>📱 Phone</th>
              <th>🔘 Response / Button</th>
              <th>🕑 Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="interaction in interactions" :key="interaction.id">
              <td>{{ interaction.phone }}</td>
              <td><span class="status-badge completed">{{ interaction.buttonText }}</span></td>
              <td style="font-size:0.8rem; color:#64748B;">{{ new Date(interaction.createdAt).toLocaleString() }}</td>
            </tr>
            <tr v-if="interactions.length === 0">
              <td colspan="3" style="text-align:center; color:#94A3B8; padding:2rem;">No interactions found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls -->
      <div v-if="interactionTotalPages > 1" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
        <button :disabled="interactionPage === 1" @click="interactionPage--; fetchInteractions()" class="btn-secondary">Previous</button>
        <span>Page {{ interactionPage }} of {{ interactionTotalPages }}</span>
        <button :disabled="interactionPage === interactionTotalPages" @click="interactionPage++; fetchInteractions()" class="btn-secondary">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const campaignId = route.params.id

const loading = ref(true)
const campaign = ref(null)
const activeTab = ref('targets')

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
const interactionSearch = ref('')
const interactionStats = ref(null)

onMounted(async () => {
  await fetchCampaignDetails()
  await fetchTargets()
})

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
        limit: 50,
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

const fetchInteractions = async () => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${campaignId}/interactions`, {
      params: {
        page: interactionPage.value,
        limit: 50,
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
.modal-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 2px solid #E2E8F0;
  padding-bottom: 0.5rem;
}
.modal-tabs button {
  background: none;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  color: #64748B;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s;
}
.modal-tabs button.active {
  background: #F1F5F9;
  color: #0F172A;
}
.modal-tabs button:hover:not(.active) {
  background: #F8FAFC;
}

.targets-container {
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
}
.targets-table {
  width: 100%;
  border-collapse: collapse;
}
.targets-table th, .targets-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #E2E8F0;
}
.targets-table th {
  background: #F8FAFC;
  font-size: 0.85rem;
  color: #64748B;
  position: sticky;
  top: 0;
}
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}
.status-badge.pending { background: #FEF3C7; color: #D97706; }
.status-badge.sent, .status-badge.completed { background: #D1FAE5; color: #059669; }
.status-badge.failed { background: #FEE2E2; color: #DC2626; }
.status-badge.running { background: #DBEAFE; color: #2563EB; }

.interactions-stats-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.istat-card {
  flex: 1;
  min-width: 120px;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.istat-card.green { background: #D1FAE5; color: #065F46; }
.istat-card.red { background: #FEE2E2; color: #991B1B; }
.istat-card.blue { background: #DBEAFE; color: #1E40AF; }
.istat-num {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.istat-label {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>

.btn-primary {
  background: #3B82F6;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
  text-decoration: none;
}
.btn-primary:hover {
  background: #2563EB;
}

.btn-secondary {
  background: #E2E8F0;
  color: #1E293B;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover {
  background: #CBD5E1;
}

.btn-back {
  background: none;
  border: 1px solid #E2E8F0;
  color: #64748B;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
  transition: all 0.2s;
}
.btn-back:hover {
  background: #F1F5F9;
  color: #334155;
}

.form-input, .form-select {
  padding: 0.5rem;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus, .form-select:focus {
  border-color: #3B82F6;
}
