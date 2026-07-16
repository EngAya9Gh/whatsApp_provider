<template>
  <div class="billing-container">
    <h2>Usage & Billing</h2>
    
    <div class="plan-card" v-if="usage">
      <h3>Current Plan: <span>{{ usage.plan }}</span></h3>
      
      <div class="progress-section">
        <div class="progress-labels">
          <span>Messages Sent</span>
          <span>{{ usage.messagesSent }} / {{ usage.monthlyLimit }}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: progressPercentage + '%' }" :class="{ 'warning': progressPercentage > 80, 'danger': progressPercentage >= 100 }"></div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat">
          <label>Failed Deliveries</label>
          <div class="value failed">{{ usage.messagesFailed }}</div>
        </div>
        <div class="stat">
          <label>Remaining</label>
          <div class="value">{{ usage.remaining }}</div>
        </div>
      </div>
    </div>

    <div class="plan-card" style="margin-top: 2rem; max-width: 800px;">
      <h3>Your Invoices</h3>
      <table class="invoices-table" v-if="invoices.length > 0">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Cycle</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in invoices" :key="inv.id">
            <td>{{ new Date(inv.createdAt).toLocaleDateString() }}</td>
            <td>{{ inv.description }}</td>
            <td>{{ inv.billingCycle }}</td>
            <td class="amount">{{ inv.amount }}</td>
            <td>
              <span class="status-badge" :class="inv.status.toLowerCase()">{{ inv.status }}</span>
            </td>
            <td>
              <router-link :to="`/invoice/${inv.id}`" class="view-link" target="_blank">View Receipt</router-link>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        No invoices found.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const usage = ref(null)
const invoices = ref([])

onMounted(async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/billing/usage', {
      headers: { Authorization: `Bearer ${token}` }
    })
    usage.value = res.data.data
  } catch (err) {
    console.error('Failed to load usage')
  }

  try {
    const invRes = await axios.get('/api/billing/invoices', {
      headers: { Authorization: `Bearer ${token}` }
    })
    invoices.value = invRes.data.data
  } catch (err) {
    console.error('Failed to load invoices')
  }
})

const progressPercentage = computed(() => {
  if (!usage.value) return 0
  if (usage.value.monthlyLimit === 0) return 0
  return Math.min(100, (usage.value.messagesSent / usage.value.monthlyLimit) * 100)
})
</script>

<style scoped>
.plan-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 1.5rem; max-width: 600px; }
h3 { margin-top: 0; color: #1E293B; }
h3 span { color: #3b82f6; }
.progress-section { margin: 2rem 0; }
.progress-labels { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 500; }
.progress-bar-bg { background: #e5e7eb; height: 12px; border-radius: 9999px; overflow: hidden; }
.progress-bar-fill { background: #10b981; height: 100%; transition: width 0.3s ease; }
.progress-bar-fill.warning { background: #f59e0b; }
.progress-bar-fill.danger { background: #ef4444; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid #e5e7eb; padding-top: 1.5rem; }
.stat label { color: #6b7280; font-size: 0.875rem; }
.stat .value { font-size: 1.5rem; font-weight: bold; color: #111827; }
.stat .value.failed { color: #ef4444; }

.invoices-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
.invoices-table th, .invoices-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
.invoices-table th { color: #6b7280; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; }
.invoices-table .amount { font-weight: 700; color: #111827; }
.status-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
.status-badge.pending { background: #fef3c7; color: #d97706; }
.status-badge.paid { background: #d1fae5; color: #059669; }
.view-link { color: #3b82f6; text-decoration: none; font-weight: 600; font-size: 0.875rem; }
.view-link:hover { text-decoration: underline; }
.empty-state { text-align: center; color: #6b7280; padding: 2rem 0; font-style: italic; }
</style>
