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

    <!-- Available Channels -->
    <div class="card doc-card" style="margin-top: 2rem;">
      <h2 class="card-title">Available Channels</h2>
      <p class="doc-text">Use these Channel IDs (<code>channel_id</code>) in your API requests to route messages through specific numbers (Meta or Web QR). If omitted, the default Web QR connection is used.</p>
      
      <div v-if="channels.length === 0" class="empty-state">
        No Meta Channels found. (Default Web QR will be used).
      </div>
      <table class="data-table" v-else>
        <thead>
          <tr>
            <th>Phone Number</th>
            <th>Provider</th>
            <th>Channel ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ch in channels" :key="ch.id">
            <td>+{{ ch.phoneNumber }}</td>
            <td><span class="badge" :class="ch.providerType === 'META_CLOUD' ? 'bg-primary' : 'bg-gray'">{{ ch.providerType }}</span></td>
            <td class="key-cell">
              <code>{{ ch.id }}</code>
              <button @click="copyKey(ch.id)" class="btn-small" style="margin-inline-start: 0.5rem;" title="Copy">📋</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- API Documentation -->
    <div class="card doc-card">
      <h2 class="card-title">API Documentation</h2>
      <p class="doc-text">Use your API Key in the <code>Authorization</code> header as a Bearer token.</p>
      
      <div class="doc-endpoint">
        <h4>1. Send OTP Message</h4>
        <code>POST {{ baseUrl }}/api/v1/otp/send</code>
        <pre class="code-block">
{
  "phone": "966500000000"
}
        </pre>
      </div>

      <div class="doc-endpoint">
        <h4>2. Send Custom Text Message</h4>
        <code>POST {{ baseUrl }}/api/v1/message/send</code>
        <pre class="code-block">
{
  "phone": "966500000000",
  "message": "Hello, this is a custom message!",
  "channel_id": "optional-channel-id-here"
}
        </pre>
      </div>

      <div class="doc-endpoint">
        <h4>3. Upload & Send Media (Image/PDF)</h4>
        <code>POST {{ baseUrl }}/api/v1/message/upload-media</code>
        <p class="doc-text" style="font-size: 0.85rem; margin-top: 0.5rem;">Note: This request requires <code>Content-Type: multipart/form-data</code></p>
        <pre class="code-block">
Form Data:
- phone: "966500000000"
- type: "image" (or "pdf")
- caption: "Optional caption"
- channel_id: "optional-channel-id-here"
- file: (Attach File Binary)
        </pre>
      </div>

      <div class="doc-endpoint">
        <h4>4. Send Message via Template</h4>
        <code>POST {{ baseUrl }}/api/v1/templates/send</code>
        <pre class="code-block">
{
  "phone": "966500000000",
  "templateId": "your-template-id",
  "channel_id": "optional-channel-id-here",
  "variables": {
    "name": "Ahmed",
    "order_id": "12345"
  }
}
        </pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const keys = ref([])
const channels = ref([])
const loading = ref(false)
const newlyGeneratedKey = ref(null)
const baseUrl = ref(window.location.origin)

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

const fetchChannels = async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/meta/channels', {
      headers: { Authorization: `Bearer ${token}` }
    })
    channels.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch channels', err)
  }
}

onMounted(() => {
  fetchKeys()
  fetchChannels()
})

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
.badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
.bg-primary { background: #dbeafe; color: #1e40af; }
.bg-gray { background: #f3f4f6; color: #374151; }
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

/* New styles for docs */
.doc-card { background: white; border-radius: 8px; padding: 2rem; margin-top: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.doc-text { color: #4b5563; margin-bottom: 1.5rem; }
.doc-endpoint { margin-bottom: 2rem; }
.doc-endpoint h4 { margin-bottom: 0.5rem; color: #1f2937; }
.code-block { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 6px; font-family: monospace; font-size: 0.875rem; overflow-x: auto; margin-top: 0.5rem; }
</style>
