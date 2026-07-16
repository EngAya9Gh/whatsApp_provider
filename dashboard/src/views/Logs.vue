<template>
  <div class="logs-container">
    <h2>OTP Message Logs</h2>
    
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Phone Number</th>
            <th>Status</th>
            <th>Error Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ new Date(log.createdAt).toLocaleString() }}</td>
            <td>{{ log.phone }}</td>
            <td>
              <span class="badge" :class="log.status.toLowerCase()">{{ log.status }}</span>
            </td>
            <td class="error-text">{{ log.errorMessage || '-' }}</td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="logs.length === 0" class="empty-state">
        No messages sent yet.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const logs = ref([])

onMounted(async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/logs', {
      headers: { Authorization: `Bearer ${token}` }
    })
    logs.value = res.data.data
  } catch (err) {
    console.error('Failed to load logs', err)
  }
})
</script>

<style scoped>
.table-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; margin-top: 1rem; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
.data-table th { background: #f9fafb; font-weight: 500; color: #6b7280; font-size: 0.875rem; text-transform: uppercase; }
.badge { padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; }
.sent { background: #d1fae5; color: #065f46; }
.failed { background: #fee2e2; color: #991b1b; }
.error-text { color: #ef4444; font-size: 0.875rem; }
.empty-state { text-align: center; padding: 3rem; color: #6b7280; }
</style>
