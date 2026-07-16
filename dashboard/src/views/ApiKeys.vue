<template>
  <div class="api-keys-container">
    <div class="header-section">
      <h2>API Keys</h2>
      <button @click="generateKey" class="btn-primary" :disabled="loading">Generate New Key</button>
    </div>

    <div v-if="newlyGeneratedKey" class="success-banner">
      <strong>Important:</strong> Copy your new API key now. You won't be able to see it again!
      <div class="key-display">
        <code>{{ newlyGeneratedKey }}</code>
        <button @click="copyKey(newlyGeneratedKey)" class="btn-primary">Copy</button>
      </div>
    </div>

    <div v-if="keys.length === 0" class="empty-state">
      No API Keys found. Generate one to start using the API.
    </div>

    <div class="table-container" v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>Name / Description</th>
            <th>API Key (Masked)</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="key in keys" :key="key.id">
            <td>{{ key.label || 'Default Key' }}</td>
            <td class="key-cell">
              <code>sk_{{ key.keyPrefix }}************************</code>
              <button @click="copyKey(`sk_${key.keyPrefix}************************`)" class="btn-small" style="margin-inline-start: 0.5rem;" title="Copy">📋</button>
            </td>
            <td>{{ new Date(key.createdAt).toLocaleDateString() }}</td>
            <td>
              <button @click="revokeKey(key.id)" class="btn-danger btn-small">Revoke</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const keys = ref([])
const loading = ref(false)
const newlyGeneratedKey = ref(null)

const fetchKeys = async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/keys', {
      headers: { Authorization: `Bearer ${token}` }
    })
    keys.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch keys', err)
  }
}

onMounted(fetchKeys)

const generateKey = async () => {
  loading.value = true
  newlyGeneratedKey.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await axios.post('/api/keys', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    newlyGeneratedKey.value = res.data.data.key
    fetchKeys()
  } catch (err) {
    console.error('Failed to generate key', err)
  } finally {
    loading.value = false
  }
}

const revokeKey = async (id) => {
  if (!confirm('Are you sure you want to revoke this key? Any apps using it will stop working.')) return
  const token = localStorage.getItem('token')
  try {
    await axios.delete(`/api/keys/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    // Hide the newly generated key if it was the one deleted
    newlyGeneratedKey.value = null
    fetchKeys()
  } catch (err) {
    console.error('Failed to revoke key', err)
  }
}

const copyKey = (text) => {
  navigator.clipboard.writeText(text)
  alert('API Key copied to clipboard')
}
</script>

<style scoped>
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.btn-primary { background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; }
.btn-small { padding: 0.25rem 0.5rem; font-size: 0.875rem; border: none; border-radius: 4px; cursor: pointer; background: #e5e7eb; color: #1E293B; margin-left: 0.5rem; }
.btn-danger { background: #ef4444; color: white; }
.table-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
.data-table th { background: #f9fafb; font-weight: 500; color: #6b7280; font-size: 0.875rem; text-transform: uppercase; }
.key-cell { display: flex; align-items: center; }
code { background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px; color: #111827; font-family: monospace; }
.empty-state { text-align: center; padding: 3rem; color: #6b7280; background: white; border-radius: 8px; }
.success-banner { background: #d1fae5; color: #065f46; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #10b981; }
.key-display { display: flex; align-items: center; gap: 1rem; margin-top: 1rem; }
.key-display code { font-size: 1.25rem; padding: 0.5rem 1rem; background: white; border: 1px solid #a7f3d0; color: #047857; }
</style>
