<template>
  <div class="overview-page">
    <div class="page-header">
      <div>
        <h1>Dashboard Overview</h1>
        <p class="subtitle">Platform performance and statistics</p>
      </div>
      <button @click="fetchStats" class="btn-refresh" :disabled="loading">
        <span class="icon">↻</span> Refresh
      </button>
    </div>

    <div v-if="loading" class="loading-state">Loading statistics...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else class="content-wrapper">
      
      <!-- Top Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon users">👥</div>
          <div class="stat-content">
            <div class="stat-label">Total Tenants</div>
            <div class="stat-value">{{ stats.totalTenants }}</div>
            <div class="stat-desc"><span class="highlight">{{ stats.activeTenants }}</span> active accounts</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon messages">📨</div>
          <div class="stat-content">
            <div class="stat-label">Total Messages Sent</div>
            <div class="stat-value">{{ stats.totalMessages }}</div>
            <div class="stat-desc">Successfully delivered</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon failed">⚠️</div>
          <div class="stat-content">
            <div class="stat-label">Failed Messages</div>
            <div class="stat-value">{{ stats.failedMessages }}</div>
            <div class="stat-desc">Delivery failures</div>
          </div>
        </div>
      </div>

      <div class="grid-layout">
        <!-- Plan Distribution -->
        <div class="panel">
          <h3>Plan Distribution</h3>
          <div class="plan-list">
            <div v-for="plan in formattedPlans" :key="plan.name" class="plan-item">
              <div class="plan-info">
                <div class="plan-name" :class="plan.name.toLowerCase()">{{ plan.name }}</div>
                <div class="plan-bar-container">
                  <div class="plan-bar" :style="{ width: plan.percentage + '%' }"></div>
                </div>
              </div>
              <div class="plan-count">{{ plan.count }}</div>
            </div>
          </div>
        </div>

        <!-- Recent Signups -->
        <div class="panel">
          <h3>Recent Signups</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tenant in stats.recentSignups" :key="tenant.id">
                <td>
                  <div class="tenant-name">{{ tenant.name }}</div>
                  <div class="tenant-email">{{ tenant.email }}</div>
                </td>
                <td><span class="badge" :class="tenant.plan.toLowerCase()">{{ tenant.plan }}</span></td>
                <td>
                  <span class="status-dot" :class="{ active: tenant.isActive }"></span>
                  {{ tenant.isActive ? 'Active' : 'Disabled' }}
                </td>
                <td class="date-col">{{ new Date(tenant.createdAt).toLocaleDateString() }}</td>
              </tr>
              <tr v-if="!stats.recentSignups?.length">
                <td colspan="4" class="empty-state">No recent signups</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const stats = ref({})
const loading = ref(true)
const error = ref('')

const fetchStats = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.get('http://localhost:3000/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    stats.value = res.data.data
  } catch (err) {
    error.value = 'Failed to load statistics. Please try again.'
    if (err.response?.status === 401) {
       // handle logout or refresh logic if needed
    }
  } finally {
    loading.value = false
  }
}

const formattedPlans = computed(() => {
  if (!stats.value.planCounts || !stats.value.totalTenants) return []
  return stats.value.planCounts.map(p => ({
    name: p.plan,
    count: p._count.plan,
    percentage: Math.round((p._count.plan / stats.value.totalTenants) * 100)
  })).sort((a, b) => b.count - a.count)
})

onMounted(fetchStats)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
h1 { font-size: 1.75rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem; }
.subtitle { color: #64748B; font-size: 0.95rem; }
.btn-refresh {
  background: white; border: 1px solid #E2E8F0; padding: 0.5rem 1rem;
  border-radius: 8px; font-weight: 600; color: #334155; cursor: pointer;
  display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s;
}
.btn-refresh:hover { background: #F8FAFC; border-color: #CBD5E1; }
.icon { font-size: 1.2rem; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.stat-card {
  background: white; padding: 1.5rem; border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; gap: 1.25rem; align-items: flex-start;
}
.stat-icon {
  width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;
}
.stat-icon.users { background: #EEF2FF; color: #4F46E5; }
.stat-icon.messages { background: #FFF7ED; color: #FF6600; }
.stat-icon.failed { background: #FEF2F2; color: #DC2626; }
.stat-label { color: #64748B; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 2rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem; line-height: 1; }
.stat-desc { color: #6b7280; font-size: 0.85rem; }
.highlight { color: #10B981; font-weight: 600; }

.grid-layout { display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; }
@media (max-width: 1024px) { .grid-layout { grid-template-columns: 1fr; } }

.panel { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.panel h3 { font-size: 1.1rem; font-weight: 700; color: #0F172A; margin-bottom: 1.5rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 0.75rem; }

.plan-list { display: flex; flex-direction: column; gap: 1.25rem; }
.plan-item { display: flex; align-items: center; gap: 1rem; }
.plan-info { flex: 1; }
.plan-name { font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; }
.plan-bar-container { height: 8px; background: #F8FAFC; border-radius: 4px; overflow: hidden; }
.plan-bar { height: 100%; background: #94A3B8; border-radius: 4px; }
.plan-count { font-weight: 700; color: #0F172A; min-width: 30px; text-align: right; }

.plan-name.free { color: #64748B; }
.plan-name.free + .plan-bar-container .plan-bar { background: #94A3B8; }
.plan-name.starter { color: #3B82F6; }
.plan-name.starter + .plan-bar-container .plan-bar { background: #3B82F6; }
.plan-name.pro { color: #FF6600; }
.plan-name.pro + .plan-bar-container .plan-bar { background: #FF6600; }
.plan-name.enterprise { color: #8B5CF6; }
.plan-name.enterprise + .plan-bar-container .plan-bar { background: #8B5CF6; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 1rem 0.5rem; text-align: left; border-bottom: 1px solid #F1F5F9; }
.data-table th { color: #64748B; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table tr:last-child td { border-bottom: none; }
.tenant-name { font-weight: 600; color: #0F172A; }
.tenant-email { font-size: 0.85rem; color: #64748B; }
.date-col { color: #64748B; font-size: 0.9rem; }

.badge { padding: 0.25rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
.badge.free { background: #F8FAFC; color: #64748B; }
.badge.starter { background: #EFF6FF; color: #3B82F6; }
.badge.pro { background: #FFF7ED; color: #FF6600; }
.badge.enterprise { background: #F5F3FF; color: #8B5CF6; }

.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #EF4444; margin-right: 6px; }
.status-dot.active { background: #10B981; }

.loading-state, .empty-state { text-align: center; padding: 3rem; color: #64748B; font-weight: 500; }
.error-msg { background: #FEF2F2; color: #DC2626; padding: 1rem; border-radius: 8px; }
</style>
