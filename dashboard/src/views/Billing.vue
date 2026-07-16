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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const usage = ref(null)

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
</style>
