<template>
  <div class="tenants-page">
    <div class="page-header">
      <div>
        <h1>Tenants Management</h1>
        <p class="subtitle">View and manage all registered clients on the platform</p>
      </div>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" v-model="searchQuery" placeholder="Search by name or email..." @input="handleSearch" />
      </div>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading-state">Loading tenants...</div>
      <div v-else-if="error" class="error-msg">{{ error }}</div>
      <div v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Status</th>
              <th>Plan</th>
              <th>API Keys</th>
              <th>Messages</th>
              <th>WhatsApp Session</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tenant in tenants" :key="tenant.id">
              <td>
                <div class="tenant-name">{{ tenant.name }}</div>
                <div class="tenant-email">{{ tenant.email }}</div>
                <div class="tenant-date">Joined: {{ new Date(tenant.createdAt).toLocaleDateString() }}</div>
              </td>
              <td>
                <span class="status-badge" :class="tenant.isActive ? 'active' : 'disabled'">
                  {{ tenant.isActive ? 'Active' : 'Disabled' }}
                </span>
              </td>
              <td>
                <span class="badge" :class="tenant.plan.toLowerCase()">{{ tenant.plan }}</span>
              </td>
              <td>{{ tenant._count?.apiKeys || 0 }}</td>
              <td>{{ tenant._count?.messageLogs || 0 }}</td>
              <td>
                <span class="session-status" :class="tenant.sessionStatus?.toLowerCase() || 'disconnected'">
                  {{ tenant.sessionStatus || 'DISCONNECTED' }}
                </span>
              </td>
              <td>
                <router-link :to="`/tenants/${tenant.id}`" class="btn-action">View Details</router-link>
              </td>
            </tr>
            <tr v-if="tenants.length === 0">
              <td colspan="7" class="empty-state">No tenants found matching your search.</td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="pagination" v-if="totalPages > 1">
          <button :disabled="currentPage === 1" @click="changePage(currentPage - 1)">Previous</button>
          <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
          <button :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const tenants = ref([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
let searchTimeout = null

const fetchTenants = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.get(`http://localhost:3000/api/admin/tenants?page=${currentPage.value}&search=${searchQuery.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    tenants.value = res.data.data.tenants
    totalPages.value = res.data.data.pages
  } catch (err) {
    error.value = 'Failed to load tenants.'
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchTenants()
  }, 500)
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchTenants()
  }
}

onMounted(fetchTenants)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
h1 { font-size: 1.75rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem; }
.subtitle { color: #64748B; font-size: 0.95rem; }

.search-box {
  position: relative;
  width: 300px;
}
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.9rem; color: #6b7280; }
.search-box input {
  width: 100%; padding: 0.65rem 1rem 0.65rem 2.5rem; border: 1px solid #E2E8F0;
  border-radius: 8px; font-size: 0.9rem; outline: none; transition: border-color 0.2s;
}
.search-box input:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }

.panel { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow-x: auto; }

.data-table { width: 100%; border-collapse: collapse; min-width: 800px; }
.data-table th, .data-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #F1F5F9; }
.data-table th { color: #64748B; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; background: #F8FAFC; }
.data-table tr:last-child td { border-bottom: none; }

.tenant-name { font-weight: 700; color: #0F172A; margin-bottom: 0.25rem; }
.tenant-email { font-size: 0.85rem; color: #64748B; margin-bottom: 0.25rem; }
.tenant-date { font-size: 0.75rem; color: #6b7280; }

.status-badge { padding: 0.25rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.status-badge.active { background: #D1FAE5; color: #065F46; }
.status-badge.disabled { background: #FEE2E2; color: #991B1B; }

.badge { padding: 0.25rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
.badge.free { background: #F8FAFC; color: #64748B; }
.badge.starter { background: #EFF6FF; color: #3B82F6; }
.badge.pro { background: #FFF7ED; color: #FF6600; }
.badge.enterprise { background: #F5F3FF; color: #8B5CF6; }

.session-status { font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 6px; }
.session-status.connected { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
.session-status.disconnected { background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; }

.btn-action {
  display: inline-block; padding: 0.5rem 1rem; background: #FFF7ED; color: #FF6600;
  border-radius: 8px; font-weight: 600; font-size: 0.85rem; transition: all 0.2s;
}
.btn-action:hover { background: #FF6600; color: white; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #F1F5F9; }
.pagination button { padding: 0.5rem 1rem; border: 1px solid #E2E8F0; background: white; border-radius: 6px; cursor: pointer; font-weight: 600; color: #334155; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination button:hover:not(:disabled) { background: #F8FAFC; border-color: #CBD5E1; }
.page-info { font-size: 0.9rem; color: #64748B; font-weight: 500; }

.loading-state, .empty-state { text-align: center; padding: 3rem; color: #64748B; font-weight: 500; }
.error-msg { background: #FEF2F2; color: #DC2626; padding: 1rem; border-radius: 8px; }
</style>
