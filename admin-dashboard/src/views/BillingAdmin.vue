<template>
  <div class="billing-admin-page">
    <div class="page-header">
      <div>
        <h1>Invoices</h1>
        <p class="subtitle">All invoices generated across the platform</p>
      </div>
    </div>

    <div class="panel">
      <div v-if="loading" class="empty-state">Loading invoices...</div>
      <table v-else-if="invoices.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Description</th>
            <th>Cycle</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in invoices" :key="inv.id">
            <td>{{ new Date(inv.createdAt).toLocaleDateString() }}</td>
            <td>
              <strong>{{ inv.tenant?.name }}</strong><br>
              <span class="email">{{ inv.tenant?.email }}</span>
            </td>
            <td>{{ inv.description }}</td>
            <td>{{ inv.billingCycle }}</td>
            <td class="amount">{{ inv.amount }}</td>
            <td>
              <select v-model="inv.status" @change="updateInvoiceStatus(inv.id, inv.status)" class="status-select" :class="inv.status.toLowerCase()">
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </td>
            <td>
              <a :href="getInvoiceUrl(inv.id)" target="_blank" class="view-link">View Receipt</a>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <span class="icon">📄</span>
        <h3>No Invoices Yet</h3>
        <p>You haven't generated any payment receipts for clients yet.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const invoices = ref([])
const loading = ref(true)

const getInvoiceUrl = (id) => {
  const baseUrl = window.location.origin.replace('5174', '5173')
  return `${baseUrl}/invoice/${id}`
}

const updateInvoiceStatus = async (id, status) => {
  try {
    const token = localStorage.getItem('admin_token')
    await axios.put(`/api/admin/invoices/${id}/status`, { status }, {
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch (err) {
    alert('Failed to update status')
  }
}

onMounted(async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.get('/api/admin/invoices', {
      headers: { Authorization: `Bearer ${token}` }
    })
    invoices.value = res.data.data
  } catch (err) {
    console.error('Failed to load global invoices', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-header { margin-bottom: 2rem; }
h1 { font-size: 1.75rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem; }
.subtitle { color: #64748B; font-size: 0.95rem; }

.panel { background: white; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 0; color: #64748B; }
.icon { font-size: 4rem; margin-bottom: 1.5rem; }
.empty-state h3 { font-size: 1.25rem; color: #0F172A; margin-bottom: 1rem; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #F1F5F9; font-size: 0.95rem; }
.data-table th { color: #64748B; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
.email { font-size: 0.8rem; color: #64748B; }
.amount { font-weight: 700; color: #0F172A; }

.status-badge { padding: 0.35rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
.status-badge.pending { background: #FFF7ED; color: #C2410C; }
.status-badge.paid { background: #F0FDF4; color: #15803D; }

.status-select { padding: 0.25rem 0.5rem; border-radius: 8px; font-weight: 700; font-size: 0.8rem; border: 1px solid #E2E8F0; outline: none; cursor: pointer; }
.status-select.pending { background: #FFF7ED; color: #C2410C; border-color: #FED7AA; }
.status-select.paid { background: #F0FDF4; color: #15803D; border-color: #BBF7D0; }
.status-select.cancelled { background: #FEE2E2; color: #991B1B; border-color: #FECACA; }

.view-link { color: #FF6600; font-weight: 600; text-decoration: none; }
.view-link:hover { text-decoration: underline; }
</style>
