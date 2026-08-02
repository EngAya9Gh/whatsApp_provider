<template>
  <div class="logs-root">
    <!-- ── Page Header ── -->
    <div class="logs-header">
      <div>
        <h2 class="logs-title">Logs & Analytics</h2>
        <p class="logs-subtitle">Track your messaging performance, errors, and delivery statuses in real-time.</p>
      </div>
      <button @click="exportCSV" class="btn-export">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export CSV
      </button>
    </div>

    <!-- ── Filters Bar ── -->
    <div class="filter-box">
      <div class="filter-grid">
        <!-- Phone Search -->
        <div class="filter-item">
          <label>Phone Number</label>
          <div class="input-wrap">
            <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" v-model="filters.phone" placeholder="e.g. 2010..." @keyup.enter="applyFilters" />
          </div>
        </div>
        
        <!-- Status Filter -->
        <div class="filter-item">
          <label>Status</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="DELIVERED">Delivered</option>
            <option value="READ">Read</option>
          </select>
        </div>

        <!-- Date From -->
        <div class="filter-item">
          <label>From Date</label>
          <input type="date" v-model="filters.dateFrom" @change="applyFilters" />
        </div>

        <!-- Date To -->
        <div class="filter-item">
          <label>To Date</label>
          <input type="date" v-model="filters.dateTo" @change="applyFilters" />
        </div>
      </div>
      
      <div class="filter-actions">
        <button @click="clearFilters" class="btn-clear">Clear Filters</button>
        <button @click="applyFilters" class="btn-apply">Apply Filters</button>
      </div>
    </div>

    <!-- ── Table ── -->
    <div class="table-card">
      <div v-if="loading" class="state-box">
        <div class="loader"></div>
        <span>Loading logs...</span>
      </div>
      
      <div v-else-if="logs.length === 0" class="state-box empty">
        <div class="text-4xl mb-4">📭</div>
        <h3 class="text-xl font-bold text-slate-700">No Logs Found</h3>
        <p class="text-slate-500 mt-2">Adjust your filters or send some messages to see logs here.</p>
      </div>

      <div v-else class="table-wrap">
        <table class="logs-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Phone Number</th>
              <th>Status</th>
              <th>Error Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>
                <div class="date-time">
                  <span class="d-date">{{ new Date(log.createdAt).toLocaleDateString() }}</span>
                  <span class="d-time">{{ new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
                </div>
              </td>
              <td>
                <span class="phone-val">{{ log.phone }}</span>
              </td>
              <td>
                <span :class="['badge', `badge-${(log.status || 'PENDING').toLowerCase()}`]">
                  <span class="badge-dot"></span>
                  {{ log.status }}
                </span>
              </td>
              <td>
                <span v-if="log.errorMessage" class="error-text" :title="log.errorMessage">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {{ truncate(log.errorMessage, 40) }}
                </span>
                <span v-else class="text-slate-400 font-medium">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Pagination ── -->
    <div v-if="totalPages >= 1" class="pagination">
      <button :disabled="page === 1" @click="page--; fetchLogs()" class="page-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="page-info">Page <strong>{{ page }}</strong> of <strong>{{ totalPages }}</strong></span>
      <button :disabled="page === totalPages || totalPages === 0" @click="page++; fetchLogs()" class="page-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const logs = ref([])
const page = ref(1)
const totalPages = ref(1)
const loading = ref(false)

const filters = ref({
  phone: '',
  status: '',
  dateFrom: '',
  dateTo: ''
})

const fetchLogs = async () => {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    const params = new URLSearchParams({
      page: page.value,
      ...(filters.value.phone && { phone: filters.value.phone }),
      ...(filters.value.status && { status: filters.value.status }),
      ...(filters.value.dateFrom && { from: filters.value.dateFrom }),
      ...(filters.value.dateTo && { to: filters.value.dateTo }),
    })
    
    const res = await axios.get(`/api/logs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    logs.value = res.data.data || []
    if (res.data.meta) {
      totalPages.value = res.data.meta.totalPages || 1
    }
  } catch (err) {
    console.error('Failed to load logs', err)
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  page.value = 1
  fetchLogs()
}

const clearFilters = () => {
  filters.value = { phone: '', status: '', dateFrom: '', dateTo: '' }
  page.value = 1
  fetchLogs()
}

const exportCSV = () => {
  if (logs.value.length === 0) {
    alert('No logs to export!')
    return
  }
  
  const headers = ['Date', 'Time', 'Phone', 'Status', 'Error']
  const csvRows = [headers.join(',')]
  
  for (const log of logs.value) {
    const d = new Date(log.createdAt)
    const row = [
      d.toLocaleDateString(),
      d.toLocaleTimeString(),
      log.phone,
      log.status,
      `"${(log.errorMessage || '').replace(/"/g, '""')}"`
    ]
    csvRows.push(row.join(','))
  }
  
  const csvString = csvRows.join('\n')
  const blob = new Blob([csvString], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.setAttribute('href', url)
  a.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`)
  a.click()
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.logs-root { padding: 2rem 2rem 3rem; min-height: 100vh; background: #F8FAFC; font-family: 'Inter', sans-serif; max-width: 1400px; margin: 0 auto; }

/* Header */
.logs-header { display:flex; align-items:flex-end; justify-content:space-between; gap:1.5rem; margin-bottom:2rem; flex-wrap:wrap; }
.logs-title { font-size:1.75rem; font-weight:800; color:#0F172A; margin:0 0 .25rem; letter-spacing:-.02em; }
.logs-subtitle { font-size:.9rem; color:#64748B; margin:0; font-weight:500; }

.btn-export { display:inline-flex; align-items:center; gap:8px; background:white; color:#0F172A; padding:.7rem 1.25rem; border:1.5px solid #E2E8F0; border-radius:12px; font-weight:700; font-size:.9rem; cursor:pointer; transition:all .2s; box-shadow:0 1px 3px rgba(0,0,0,.05); }
.btn-export:hover { border-color:#CBD5E1; background:#F8FAFC; transform:translateY(-1px); }

/* Filters */
.filter-box { background:white; border-radius:16px; padding:1.5rem; border:1px solid #E2E8F0; box-shadow:0 2px 8px rgba(0,0,0,.02); margin-bottom:1.5rem; }
.filter-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.25rem; margin-bottom:1.5rem; }
.filter-item label { display:block; font-size:.8rem; font-weight:700; color:#64748B; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em; }
.input-wrap { position:relative; }
.input-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94A3B8; pointer-events:none; }
.filter-item input, .filter-item select { width:100%; padding:.65rem .875rem; border:1.5px solid #E2E8F0; border-radius:10px; font-family:inherit; font-size:.875rem; color:#334155; outline:none; transition:border .2s; box-sizing:border-box; background:white; }
.input-wrap input { padding-left:2.25rem; }
.filter-item input:focus, .filter-item select:focus { border-color:#FF6600; box-shadow:0 0 0 3px rgba(255,102,0,.1); }
.filter-actions { display:flex; justify-content:flex-end; gap:1rem; padding-top:1.25rem; border-top:1px solid #F1F5F9; }
.btn-clear { background:transparent; color:#64748B; border:none; font-weight:700; font-size:.875rem; cursor:pointer; padding:.5rem 1rem; border-radius:8px; transition:background .2s; }
.btn-clear:hover { background:#F1F5F9; }
.btn-apply { background:#FF6600; color:white; border:none; padding:.6rem 1.5rem; border-radius:10px; font-weight:700; font-size:.875rem; cursor:pointer; transition:all .2s; box-shadow:0 4px 12px rgba(255,102,0,.25); }
.btn-apply:hover { background:#E55A00; transform:translateY(-1px); box-shadow:0 6px 16px rgba(255,102,0,.35); }

/* Table */
.table-card { background:white; border-radius:16px; border:1px solid #E2E8F0; box-shadow:0 2px 8px rgba(0,0,0,.02); overflow:hidden; }
.table-wrap { overflow-x:auto; }
.logs-table { width:100%; border-collapse:collapse; white-space:nowrap; }
.logs-table th, .logs-table td { padding:1.25rem 1.5rem; text-align:left; border-bottom:1px solid #F1F5F9; }
.logs-table th { background:#F8FAFC; font-weight:700; color:#64748B; font-size:.75rem; text-transform:uppercase; letter-spacing:.05em; border-bottom:2px solid #E2E8F0; }
.logs-table tbody tr { transition:background .2s; }
.logs-table tbody tr:hover { background:#F8FAFC; }

.date-time { display:flex; flex-direction:column; gap:2px; }
.d-date { font-weight:700; color:#334155; font-size:.9rem; }
.d-time { font-size:.75rem; color:#94A3B8; font-weight:600; }
.phone-val { font-weight:700; color:#0F172A; font-size:.95rem; }

/* Badges */
.badge { display:inline-flex; align-items:center; gap:6px; padding:.35rem .85rem; border-radius:20px; font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
.badge-dot { width:6px; height:6px; border-radius:50%; }
.badge-pending  { background:#F8FAFC; color:#64748B; border:1px solid #E2E8F0; } .badge-pending .badge-dot  { background:#94A3B8; }
.badge-sent     { background:#EFF6FF; color:#1D4ED8; border:1px solid #DBEAFE; } .badge-sent .badge-dot     { background:#3B82F6; }
.badge-delivered{ background:#F0FDF4; color:#15803D; border:1px solid #DCFCE7; } .badge-delivered .badge-dot{ background:#10B981; }
.badge-read     { background:#ECFDF5; color:#047857; border:1px solid #D1FAE5; } .badge-read .badge-dot     { background:#059669; }
.badge-failed   { background:#FEF2F2; color:#DC2626; border:1px solid #FEE2E2; } .badge-failed .badge-dot   { background:#EF4444; }

.error-text { display:inline-flex; align-items:center; gap:6px; color:#DC2626; font-size:.85rem; font-weight:600; background:#FEF2F2; padding:.35rem .75rem; border-radius:8px; border:1px dashed #FCA5A5; }

/* States */
.state-box { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; padding:5rem 2rem; color:#64748B; font-weight:600; }
.loader { width:36px; height:36px; border:3px solid #E2E8F0; border-top-color:#FF6600; border-radius:50%; animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* Pagination */
.pagination { display:flex; align-items:center; justify-content:center; gap:1rem; margin-top:2rem; }
.page-btn { width:36px; height:36px; border-radius:10px; border:1.5px solid #E2E8F0; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748B; transition:all .2s; }
.page-btn:hover:not(:disabled) { border-color:#FF6600; color:#FF6600; }
.page-btn:disabled { opacity:.4; cursor:not-allowed; }
.page-info { font-size:.875rem; font-weight:600; color:#64748B; }
</style>
