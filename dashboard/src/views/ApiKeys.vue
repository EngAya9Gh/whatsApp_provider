<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">API Keys</h2>
        <p class="text-slate-500 font-medium text-lg">Manage your API keys for programmatic access.</p>
      </div>
      <button @click="generateKey" :disabled="loading" class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50 flex items-center gap-2">
        <svg v-if="!loading" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
        {{ loading ? 'Generating...' : 'Generate New Key' }}
      </button>
    </div>

    <div v-if="newlyGeneratedKey" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-xl mb-8 shadow-sm">
      <div class="flex items-center gap-2 mb-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
        <strong class="font-bold text-lg">Important:</strong> <span class="font-medium">Copy your new API key now. You won't be able to see it again!</span>
      </div>
      <div class="flex flex-col sm:flex-row items-center gap-4 mt-4">
        <code class="text-xl px-6 py-3 bg-white border border-emerald-300 text-emerald-700 rounded-lg shadow-inner font-mono font-bold w-full sm:w-auto break-all">{{ newlyGeneratedKey }}</code>
        <button @click="copyKey(newlyGeneratedKey)" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-sm transition-colors border-none cursor-pointer w-full sm:w-auto">Copy Key</button>
      </div>
    </div>

    <div v-if="keys.length === 0" class="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm mb-12">
      <div class="text-6xl mb-4">🔑</div>
      <h3 class="text-xl font-bold text-slate-800 mb-2">No API Keys found</h3>
      <p class="text-slate-500 font-medium">Generate one to start using the API.</p>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-12" v-else>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-slate-600 border-collapse">
          <thead class="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              <th scope="col" class="px-6 py-4 font-bold rounded-tl-xl">Name / Description</th>
              <th scope="col" class="px-6 py-4 font-bold">API Key (Masked)</th>
              <th scope="col" class="px-6 py-4 font-bold">Created At</th>
              <th scope="col" class="px-6 py-4 font-bold rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in keys" :key="key.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-semibold text-slate-800">{{ key.label || 'Default Key' }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <code class="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md font-mono text-sm border border-slate-200">sk_{{ key.keyPrefix }}************************</code>
                  <button @click="copyKey(`sk_${key.keyPrefix}************************`)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 w-8 h-8 rounded-md flex items-center justify-center transition-colors border-none cursor-pointer" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
              </td>
              <td class="px-6 py-4 font-medium">{{ new Date(key.createdAt).toLocaleDateString() }}</td>
              <td class="px-6 py-4">
                <button @click="revokeKey(key.id)" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-md font-bold text-xs transition-colors border border-red-100 cursor-pointer">Revoke</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Available Channels -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-12">
      <h2 class="text-2xl font-extrabold text-slate-900 mb-2">Available Channels</h2>
      <p class="text-slate-500 font-medium mb-6">Use these Channel IDs (<code class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-sm border border-slate-200">channel_id</code>) in your API requests to route messages through specific numbers (Meta or Web QR). If omitted, the default Web QR connection is used.</p>
      
      <div v-if="channels.length === 0" class="bg-slate-50 border border-slate-200 text-slate-500 font-medium p-6 rounded-xl text-center">
        No Meta Channels found. (Default Web QR will be used).
      </div>
      <div class="overflow-x-auto" v-else>
        <table class="w-full text-sm text-left text-slate-600 border-collapse border border-slate-200 rounded-xl overflow-hidden">
          <thead class="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th scope="col" class="px-6 py-4 font-bold">Phone Number</th>
              <th scope="col" class="px-6 py-4 font-bold">Provider</th>
              <th scope="col" class="px-6 py-4 font-bold">Channel ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch in channels" :key="ch.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
              <td class="px-6 py-4 font-bold text-slate-800">+{{ ch.phoneNumber }}</td>
              <td class="px-6 py-4">
                <span :class="ch.providerType === 'META_CLOUD' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border">
                  {{ ch.providerType }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <code class="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md font-mono text-sm border border-slate-200">{{ ch.id }}</code>
                  <button @click="copyKey(ch.id)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 w-8 h-8 rounded-md flex items-center justify-center transition-colors border-none cursor-pointer" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- API Documentation -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <h2 class="text-2xl font-extrabold text-slate-900 mb-2">API Documentation</h2>
      <p class="text-slate-500 font-medium mb-8">Use your API Key in the <code class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-sm border border-slate-200">Authorization</code> header as a Bearer token.</p>
      
      <div class="flex flex-col gap-8">
        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 class="font-bold text-slate-800 m-0 flex items-center gap-2"><span class="bg-orange-100 text-orange-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> Send OTP Message</h4>
            <code class="bg-blue-100 text-blue-800 px-3 py-1 rounded-md font-mono text-sm font-bold border border-blue-200 shrink-0">POST {{ baseUrl }}/api/v1/otp/send</code>
          </div>
          <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
            <pre class="font-mono text-sm m-0"><code>{
  "phone": "966500000000"
}</code></pre>
          </div>
        </div>

        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 class="font-bold text-slate-800 m-0 flex items-center gap-2"><span class="bg-orange-100 text-orange-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> Send Custom Text Message</h4>
            <code class="bg-blue-100 text-blue-800 px-3 py-1 rounded-md font-mono text-sm font-bold border border-blue-200 shrink-0">POST {{ baseUrl }}/api/v1/message/send</code>
          </div>
          <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
            <pre class="font-mono text-sm m-0"><code>{
  "phone": "966500000000",
  "message": "Hello, this is a custom message!",
  "channel_id": "optional-channel-id-here"
}</code></pre>
          </div>
        </div>

        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 class="font-bold text-slate-800 m-0 flex items-center gap-2"><span class="bg-orange-100 text-orange-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> Upload & Send Media (Image/PDF)</h4>
              <p class="text-xs text-slate-500 mt-2 mb-0 ml-8 font-medium">Note: This request requires <code class="bg-slate-200 px-1 py-0.5 rounded">Content-Type: multipart/form-data</code></p>
            </div>
            <code class="bg-blue-100 text-blue-800 px-3 py-1 rounded-md font-mono text-sm font-bold border border-blue-200 shrink-0">POST {{ baseUrl }}/api/v1/message/upload-media</code>
          </div>
          <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
            <pre class="font-mono text-sm m-0"><code>Form Data:
- phone: "966500000000"
- type: "image" (or "pdf")
- caption: "Optional caption"
- channel_id: "optional-channel-id-here"
- file: (Attach File Binary)</code></pre>
          </div>
        </div>

        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 class="font-bold text-slate-800 m-0 flex items-center gap-2"><span class="bg-orange-100 text-orange-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span> Send Message via Template</h4>
            <code class="bg-blue-100 text-blue-800 px-3 py-1 rounded-md font-mono text-sm font-bold border border-blue-200 shrink-0">POST {{ baseUrl }}/api/v1/templates/send</code>
          </div>
          <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
            <pre class="font-mono text-sm m-0"><code>{
  "phone": "966500000000",
  "templateId": "your-template-id",
  "channel_id": "optional-channel-id-here",
  "variables": {
    "name": "Ahmed",
    "order_id": "12345"
  }
}</code></pre>
          </div>
        </div>
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

