<template>
  <div class="logs-root" :class="{ 'rtl': isAr }">
    
    <!-- ══ Hero Header ══ -->
    <div class="hero-header">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <div>
            <h1 class="hero-title">{{ isAr ? 'السجلات والتحليلات' : 'Logs & Analytics' }}</h1>
            <p class="hero-sub">{{ isAr ? 'تتبع أداء الرسائل، الأخطاء، وحالات التسليم في الوقت الفعلي' : 'Track your messaging performance, errors, and delivery statuses in real-time.' }}</p>
          </div>
        </div>
        
        <div class="hero-actions">
          <button @click="exportCSV" class="btn-export">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {{ isAr ? 'تصدير CSV' : 'Export CSV' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Main Content ══ -->
    <div class="page-content">
      
      <!-- ── Filters Bar ── -->
      <div class="filter-box">
        <div class="filter-grid">
          <!-- Phone Search -->
          <div class="filter-item">
            <label>{{ isAr ? 'رقم الهاتف' : 'Phone Number' }}</label>
            <div class="input-wrap">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" v-model="filters.phone" :placeholder="isAr ? 'مثال: 9665...' : 'e.g. 2010...'" @keyup.enter="applyFilters" />
            </div>
          </div>
          
          <!-- Status Filter -->
          <div class="filter-item">
            <label>{{ isAr ? 'الحالة' : 'Status' }}</label>
            <select v-model="filters.status" @change="applyFilters">
              <option value="">{{ isAr ? 'جميع الحالات' : 'All Statuses' }}</option>
              <option value="SENT">{{ isAr ? 'مرسلة' : 'Sent' }}</option>
              <option value="FAILED">{{ isAr ? 'فاشلة' : 'Failed' }}</option>
              <option value="DELIVERED">{{ isAr ? 'تم التسليم' : 'Delivered' }}</option>
              <option value="READ">{{ isAr ? 'تمت القراءة' : 'Read' }}</option>
            </select>
          </div>

          <!-- Date From -->
          <div class="filter-item">
            <label>{{ isAr ? 'من تاريخ' : 'From Date' }}</label>
            <input type="date" v-model="filters.dateFrom" @change="applyFilters" />
          </div>

          <!-- Date To -->
          <div class="filter-item">
            <label>{{ isAr ? 'إلى تاريخ' : 'To Date' }}</label>
            <input type="date" v-model="filters.dateTo" @change="applyFilters" />
          </div>
        </div>
        
        <div class="filter-actions">
          <button @click="clearFilters" class="btn-clear">{{ isAr ? 'مسح الفلاتر' : 'Clear Filters' }}</button>
          <button @click="applyFilters" class="btn-apply">{{ isAr ? 'تطبيق الفلاتر' : 'Apply Filters' }}</button>
        </div>
      </div>

      <!-- ── Table ── -->
      <div class="table-card">
        <div v-if="loading" class="state-box">
          <div class="spin-ring"></div>
          <span>{{ isAr ? 'جاري تحميل السجلات...' : 'Loading logs...' }}</span>
        </div>
        
        <div v-else-if="logs.length === 0" class="state-box empty">
          <div class="empty-art">📭</div>
          <h3>{{ isAr ? 'لا توجد سجلات' : 'No Logs Found' }}</h3>
          <p>{{ isAr ? 'قم بتعديل الفلاتر أو إرسال رسائل جديدة لترى السجلات هنا.' : 'Adjust your filters or send some messages to see logs here.' }}</p>
        </div>

        <div v-else class="table-wrap">
          <table class="logs-table">
            <thead>
              <tr>
                <th>{{ isAr ? 'التاريخ والوقت' : 'Date & Time' }}</th>
                <th>{{ isAr ? 'رقم الهاتف' : 'Phone Number' }}</th>
                <th>{{ isAr ? 'الحالة' : 'Status' }}</th>
                <th>{{ isAr ? 'تفاصيل الخطأ' : 'Error Details' }}</th>
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
                  <span :class="['status-pill', getStatusPill(log.status)]">
                    {{ isAr ? translateStatus(log.status) : log.status }}
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
      <div v-if="totalPages >= 1 && !loading && logs.length > 0" class="pagination">
        <button :disabled="page === 1" @click="page--; fetchLogs()" class="page-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="page-info">
          <template v-if="isAr">صفحة <strong>{{ page }}</strong> من <strong>{{ totalPages }}</strong></template>
          <template v-else>Page <strong>{{ page }}</strong> of <strong>{{ totalPages }}</strong></template>
        </span>
        <button :disabled="page === totalPages || totalPages === 0" @click="page++; fetchLogs()" class="page-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

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
    alert(isAr.value ? 'لا توجد سجلات لتصديرها!' : 'No logs to export!')
    return
  }
  
  const headers = isAr.value ? ['التاريخ', 'الوقت', 'الهاتف', 'الحالة', 'الخطأ'] : ['Date', 'Time', 'Phone', 'Status', 'Error']
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

const getStatusPill = (status) => {
  const s = (status || '').toUpperCase();
  if (s === 'SENT') return 'pill-blue'
  if (s === 'DELIVERED') return 'pill-green'
  if (s === 'READ') return 'pill-teal'
  if (s === 'FAILED') return 'pill-red'
  return 'pill-slate'
}

const translateStatus = (status) => {
  const s = (status || '').toUpperCase();
  if (s === 'SENT') return 'مرسلة'
  if (s === 'DELIVERED') return 'تم التسليم'
  if (s === 'READ') return 'تمت القراءة'
  if (s === 'FAILED') return 'فاشلة'
  if (s === 'PENDING') return 'قيد الانتظار'
  return status
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.logs-root {
  min-height: 100vh;
  background: #F0F2F7;
  font-family: 'Inter', sans-serif;
  padding-bottom: 4rem;
}
.logs-root.rtl {
  direction: rtl;
  font-family: 'Tajawal', system-ui, sans-serif;
}

/* ═══ HERO ═══ */
.hero-header {
  background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%);
  padding: 3rem 2.5rem;
  position: relative; overflow: hidden;
}
.hero-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 50% 80% at 90% 50%, rgba(255,102,0,0.15) 0%, transparent 60%);
  pointer-events: none;
}
.hero-content {
  display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
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
.hero-sub { font-size: 0.95rem; color: #94A3B8; margin: 0; font-weight: 500; }

.btn-export {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);
  padding: 0.85rem 1.5rem; border-radius: 14px; font-weight: 800; font-size: 0.9rem;
  cursor: pointer; transition: all 0.25s; backdrop-filter: blur(8px);
}
.btn-export:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }

/* ═══ MAIN ═══ */
.page-content { padding: 2.5rem; margin-top: -2.5rem; position: relative; z-index: 10; max-width: 1200px; margin-left: auto; margin-right: auto; }

/* Filters */
.filter-box { background: white; border-radius: 20px; padding: 1.5rem 2rem; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); margin-bottom: 2rem; }
.filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
.filter-item label { display: block; font-size: 0.8rem; font-weight: 800; color: #64748B; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
.input-wrap { position: relative; }
.input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
.rtl .input-icon { left: auto; right: 14px; }

.filter-item input, .filter-item select {
  width: 100%; padding: 0.8rem 1rem; border: 1.5px solid #CBD5E1;
  border-radius: 12px; font-family: inherit; font-size: 0.9rem; color: #0F172A;
  outline: none; transition: all 0.2s; box-sizing: border-box; background: white;
}
.input-wrap input { padding-left: 2.5rem; }
.rtl .input-wrap input { padding-left: 1rem; padding-right: 2.5rem; }
.filter-item input:focus, .filter-item select:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,.1); }

.filter-actions { display: flex; justify-content: flex-end; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid #F1F5F9; }
.btn-clear { background: transparent; color: #64748B; border: none; font-weight: 700; font-size: 0.9rem; cursor: pointer; padding: 0.6rem 1.2rem; border-radius: 10px; transition: background 0.2s; }
.btn-clear:hover { background: #F1F5F9; color: #0F172A; }
.btn-apply {
  background: linear-gradient(135deg, #FF6600, #E55A00); color: white; border: none;
  padding: 0.7rem 1.75rem; border-radius: 12px; font-weight: 800; font-size: 0.9rem;
  cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(255,102,0,.25);
}
.btn-apply:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(255,102,0,.35); }

/* Table */
.table-card { background: white; border-radius: 20px; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); overflow: hidden; }
.table-wrap { overflow-x: auto; }
.logs-table { width: 100%; border-collapse: collapse; white-space: nowrap; }
.logs-table th, .logs-table td { padding: 1.25rem 1.75rem; text-align: left; border-bottom: 1px solid #F1F5F9; }
.rtl .logs-table th, .rtl .logs-table td { text-align: right; }
.logs-table th { background: #F8FAFC; font-weight: 800; color: #64748B; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #E2E8F0; }
.logs-table tbody tr { transition: background 0.2s; }
.logs-table tbody tr:hover { background: #F8FAFC; }

.date-time { display: flex; flex-direction: column; gap: 3px; }
.d-date { font-weight: 800; color: #0F172A; font-size: 0.95rem; }
.d-time { font-size: 0.75rem; color: #64748B; font-weight: 600; }
.phone-val { font-weight: 800; color: #0F172A; font-size: 0.95rem; }

/* Status Pills */
.status-pill { font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid transparent; display: inline-block; }
.pill-green { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
.pill-teal { background: #F0FDF4; color: #16A34A; border-color: #BBF7D0; }
.pill-blue { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
.pill-red { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
.pill-slate { background: #F8FAFC; color: #475569; border-color: #E2E8F0; }

.error-text { display: inline-flex; align-items: center; gap: 6px; color: #DC2626; font-size: 0.85rem; font-weight: 600; background: #FEF2F2; padding: 0.4rem 0.85rem; border-radius: 10px; border: 1px dashed #FCA5A5; }

/* States */
.state-box { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 5rem 2rem; color: #64748B; font-weight: 600; }
.spin-ring { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #FF6600; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-art { font-size: 4rem; margin-bottom: 0.5rem; opacity: 0.9; }
.state-box h3 { font-size: 1.5rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem; }
.state-box p { color: #64748B; font-size: 0.95rem; margin: 0; font-weight: 500; }

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 1.5rem; margin-top: 2.5rem; }
.page-btn { width: 40px; height: 40px; border-radius: 12px; border: 1.5px solid #CBD5E1; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; }
.page-btn:hover:not(:disabled) { border-color: #FF6600; color: #FF6600; box-shadow: 0 2px 8px rgba(255,102,0,.1); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 0.9rem; font-weight: 600; color: #64748B; }
.page-info strong { color: #0F172A; font-weight: 800; }
</style>
