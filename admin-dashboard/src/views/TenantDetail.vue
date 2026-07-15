<template>
  <div class="tenant-detail-page">
    <div class="page-header">
      <div class="header-left">
        <router-link to="/tenants" class="back-link">← Back to Tenants</router-link>
        <div v-if="tenant" class="title-row">
          <h1>{{ tenant.name }}</h1>
          <span class="status-badge" :class="tenant.isActive ? 'active' : 'disabled'">
            {{ tenant.isActive ? 'Active Account' : 'Disabled Account' }}
          </span>
        </div>
      </div>
      <div class="header-actions" v-if="tenant">
        <button @click="toggleStatus" class="btn-toggle" :class="tenant.isActive ? 'btn-danger' : 'btn-success'">
          {{ tenant.isActive ? 'Disable Account' : 'Enable Account' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Loading tenant details...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else-if="tenant" class="content-grid">
      
      <!-- Left Column: Details & Plan -->
      <div class="col-left">
        <div class="panel">
          <h3>Account Information</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="label">Email</span>
              <span class="value">{{ tenant.email }}</span>
            </div>
            <div class="info-item">
              <span class="label">Joined</span>
              <span class="value">{{ new Date(tenant.createdAt).toLocaleString() }}</span>
            </div>
            <div class="info-item">
              <span class="label">WhatsApp Status</span>
              <span class="value session-status" :class="tenant.sessionStatus?.toLowerCase() || 'disconnected'">
                {{ tenant.sessionStatus || 'DISCONNECTED' }}
              </span>
            </div>
          </div>
        </div>

        <div class="panel">
          <h3>Subscription Plan</h3>
          <div class="plan-manager">
            <div class="current-plan">
              <div class="plan-label">Current Plan</div>
              <div class="badge" :class="tenant.plan.toLowerCase()">{{ tenant.plan }}</div>
              <div class="limit-info">Limit: {{ tenant.monthlyLimit }} messages/month</div>
            </div>
            <div class="change-plan">
              <label>Change Plan</label>
              <div class="plan-select-group">
                <select v-model="selectedPlan">
                  <option value="FREE">FREE (100)</option>
                  <option value="STARTER">STARTER (1,000)</option>
                  <option value="PRO">PRO (10,000)</option>
                  <option value="ENTERPRISE">ENTERPRISE (Unlimited)</option>
                </select>
                <button @click="updatePlan" class="btn-primary" :disabled="isUpdatingPlan || selectedPlan === tenant.plan">
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: API Keys & Usage -->
      <div class="col-right">
        <div class="panel">
          <h3>Recent Usage (Last 6 Months)</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Sent</th>
                <th>Failed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="usage in tenant.usageRecords" :key="usage.id">
                <td>{{ new Date(usage.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }}</td>
                <td class="success-text">{{ usage.messagesSent }}</td>
                <td class="danger-text">{{ usage.messagesFailed }}</td>
              </tr>
              <tr v-if="!tenant.usageRecords.length">
                <td colspan="3" class="empty-state">No usage records found</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel">
          <h3>API Keys</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Prefix</th>
                <th>Last Used</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in tenant.apiKeys" :key="key.id">
                <td>{{ key.label || 'Default' }}</td>
                <td><code>sk_{{ key.keyPrefix }}...</code></td>
                <td>{{ key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never' }}</td>
              </tr>
              <tr v-if="!tenant.apiKeys.length">
                <td colspan="3" class="empty-state">No API keys generated</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const tenant = ref(null)
const loading = ref(true)
const error = ref('')
const selectedPlan = ref('')
const isUpdatingPlan = ref(false)

const fetchTenant = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.get(`http://localhost:3000/api/admin/tenants/${route.params.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    tenant.value = res.data.data
    selectedPlan.value = tenant.value.plan
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load tenant details.'
  } finally {
    loading.value = false
  }
}

const updatePlan = async () => {
  isUpdatingPlan.value = true
  try {
    const token = localStorage.getItem('admin_token')
    await axios.put(`http://localhost:3000/api/admin/tenants/${route.params.id}/plan`, 
      { plan: selectedPlan.value },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    await fetchTenant() // refresh data
    alert('Plan updated successfully!')
  } catch (err) {
    alert('Failed to update plan')
  } finally {
    isUpdatingPlan.value = false
  }
}

const toggleStatus = async () => {
  const action = tenant.value.isActive ? 'disable' : 'enable'
  if (!confirm(`Are you sure you want to ${action} this account?`)) return
  try {
    const token = localStorage.getItem('admin_token')
    await axios.put(`http://localhost:3000/api/admin/tenants/${route.params.id}/toggle`, 
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
    await fetchTenant()
  } catch (err) {
    alert('Failed to toggle status')
  }
}

onMounted(fetchTenant)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.back-link { display: inline-block; color: #64748B; font-size: 0.9rem; font-weight: 500; margin-bottom: 1rem; transition: color 0.2s; }
.back-link:hover { color: #FF6600; }
.title-row { display: flex; align-items: center; gap: 1rem; }
h1 { font-size: 2rem; font-weight: 800; color: #0F172A; }

.status-badge { padding: 0.35rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
.status-badge.active { background: #D1FAE5; color: #065F46; border: 1px solid #10B981; }
.status-badge.disabled { background: #FEE2E2; color: #991B1B; border: 1px solid #EF4444; }

.btn-toggle { padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 700; font-size: 0.9rem; border: none; cursor: pointer; transition: all 0.2s; }
.btn-danger { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
.btn-danger:hover { background: #DC2626; color: white; }
.btn-success { background: #F0FDF4; color: #166534; border: 1px solid #BBF7D0; }
.btn-success:hover { background: #166534; color: white; }

.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 1024px) { .content-grid { grid-template-columns: 1fr; } }

.panel { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 1.5rem; }
.panel h3 { font-size: 1.1rem; font-weight: 700; color: #0F172A; margin-bottom: 1.5rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 0.75rem; }

.info-list { display: flex; flex-direction: column; gap: 1rem; }
.info-item { display: flex; flex-direction: column; gap: 0.25rem; }
.info-item .label { color: #64748B; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.info-item .value { font-size: 1rem; color: #0F172A; font-weight: 500; }

.session-status { display: inline-block; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 6px; width: max-content; }
.session-status.connected { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
.session-status.disconnected { background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; }

.plan-manager { display: flex; flex-direction: column; gap: 1.5rem; }
.current-plan { background: #F8FAFC; padding: 1.25rem; border-radius: 12px; border: 1px solid #E2E8F0; }
.plan-label { color: #64748B; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; }
.limit-info { margin-top: 0.5rem; font-size: 0.85rem; color: #475569; }

.badge { display: inline-block; padding: 0.35rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 800; }
.badge.free { background: #F8FAFC; color: #64748B; }
.badge.starter { background: #EFF6FF; color: #3B82F6; }
.badge.pro { background: #FFF7ED; color: #FF6600; }
.badge.enterprise { background: #F5F3FF; color: #8B5CF6; }

.change-plan label { display: block; font-weight: 600; color: #334155; margin-bottom: 0.5rem; font-size: 0.9rem; }
.plan-select-group { display: flex; gap: 1rem; }
.plan-select-group select { flex: 1; padding: 0.75rem; border: 1px solid #E2E8F0; border-radius: 8px; font-family: inherit; font-size: 0.9rem; outline: none; }
.plan-select-group select:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.btn-primary { padding: 0 1.5rem; background: #FF6600; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-primary:hover:not(:disabled) { background: #cc5200; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 0.875rem 0.5rem; text-align: left; border-bottom: 1px solid #F1F5F9; font-size: 0.9rem; }
.data-table th { color: #64748B; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table tr:last-child td { border-bottom: none; }
code { background: #F8FAFC; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; color: #475569; }
.success-text { color: #10B981; font-weight: 600; }
.danger-text { color: #EF4444; font-weight: 600; }

.loading-state, .empty-state { text-align: center; padding: 3rem; color: #64748B; font-weight: 500; }
.error-msg { background: #FEF2F2; color: #DC2626; padding: 1rem; border-radius: 8px; }
</style>
