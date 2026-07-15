<template>
  <div class="dashboard">
    <h1>Welcome, {{ tenant?.name }}</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <h3>WhatsApp Status</h3>
        <div class="status-badge" :class="tenant?.sessionStatus.toLowerCase()">
          {{ tenant?.sessionStatus }}
        </div>
      </div>
      
      <div class="stat-card" v-if="usage">
        <h3>Messages This Month</h3>
        <div class="stat-value">{{ usage.messagesSent }} / {{ usage.monthlyLimit }}</div>
        <p class="stat-subtext">Failed: {{ usage.messagesFailed }}</p>
      </div>
      
      <div class="stat-card" v-if="usage">
        <h3>Current Plan</h3>
        <div class="stat-value plan-name">{{ usage.plan }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const tenant = ref(JSON.parse(localStorage.getItem('tenant') || '{}'))
const usage = ref(null)

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('http://localhost:3000/api/billing/usage', {
      headers: { Authorization: `Bearer ${token}` }
    })
    usage.value = res.data.data
  } catch (err) {
    console.error('Failed to load usage data')
  }
})
</script>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
.stat-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
h3 { margin-top: 0; color: #6b7280; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 2rem; font-weight: bold; color: #111827; margin: 0.5rem 0; }
.plan-name { color: #3b82f6; }
.stat-subtext { color: #ef4444; margin: 0; font-size: 0.875rem; }
.status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: bold; font-size: 0.875rem; }
.connected { background: #d1fae5; color: #065f46; }
.disconnected { background: #fee2e2; color: #991b1b; }
.connecting { background: #fef3c7; color: #92400e; }
</style>
