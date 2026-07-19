<template>
  <div class="connect-container">
    <h2>WhatsApp Connections</h2>
    <p class="subtitle">Manage your WhatsApp numbers connected via Web QR (Baileys) or Official Meta Cloud API.</p>

    <!-- 1. Baileys (Web Socket) Connection -->
    <div class="status-card">
      <div class="card-header">
        <h3>Web QR Connection (Standard)</h3>
        <span class="badge" :class="status === 'CONNECTED' ? 'bg-success' : 'bg-gray'">{{ status }}</span>
      </div>
      <p class="desc">Best for standard text and media messaging without strict Meta template approvals.</p>
      <hr />

      <div v-if="status === 'CONNECTED'" class="connected-state">
        <div class="icon">✅</div>
        <p>WhatsApp Phone: <strong>{{ phone }}</strong></p>
        <button @click="disconnect" class="btn-danger">Disconnect QR Session</button>
      </div>

      <div v-else-if="status === 'CONNECTING'" class="connecting-state">
        <p>Open WhatsApp on your phone > Linked Devices > Link a Device.</p>
        <div class="qr-box" v-if="qrCode">
          <qrcode-vue :value="qrCode" :size="250" level="H" />
        </div>
        <div v-else class="loading">Generating QR Code...</div>
      </div>

      <div v-else class="disconnected-state">
        <button @click="connect" class="btn-primary" :disabled="loading">
          {{ loading ? 'Starting Session...' : 'Link via QR Code' }}
        </button>
      </div>
    </div>

    <!-- 2. Meta Cloud API Connections -->
    <div class="status-card meta-card">
      <div class="card-header">
        <h3>Meta Cloud API (Official)</h3>
        <span class="badge bg-primary">RECOMMENDED FOR INTERACTIVE</span>
      </div>
      <p class="desc">Required for sending Interactive Messages (Buttons & Lists). Connect via official Meta Developer portal.</p>
      <hr />

      <div v-if="metaChannels.length > 0" class="channels-list">
        <div v-for="channel in metaChannels" :key="channel.id" class="channel-item">
          <div class="channel-info">
            <strong>+{{ channel.phoneNumber }}</strong>
            <span class="status-dot"></span> {{ channel.status }}
          </div>
          <button @click="deleteMetaChannel(channel.id)" class="btn-danger-sm">Remove</button>
        </div>
      </div>

      <div v-if="showMetaForm" class="meta-form">
        <h4>Add Meta Number</h4>
        <div class="form-group">
          <label>Phone Number (with Country Code e.g. 9665...)</label>
          <input type="text" v-model="metaForm.phoneNumber" placeholder="966500000000" />
        </div>
        <div class="form-group">
          <label>Phone Number ID (From Meta)</label>
          <input type="text" v-model="metaForm.metaPhoneNumberId" />
        </div>
        <div class="form-group">
          <label>WABA ID (WhatsApp Business Account ID)</label>
          <input type="text" v-model="metaForm.metaWabaId" />
        </div>
        <div class="form-group">
          <label>Permanent Access Token</label>
          <input type="password" v-model="metaForm.metaAccessToken" />
        </div>
        <div class="form-actions">
          <button @click="addMetaChannel" class="btn-primary" :disabled="metaLoading">
            {{ metaLoading ? 'Saving...' : 'Save Meta Connection' }}
          </button>
          <button @click="showMetaForm = false" class="btn-secondary">Cancel</button>
        </div>
      </div>
      <div v-else class="mt-4">
        <button @click="showMetaForm = true" class="btn-primary">Add Meta Number</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'
import QrcodeVue from 'qrcode.vue'

// Baileys State
const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
const status = ref(tenant.sessionStatus || 'DISCONNECTED')
const phone = ref(tenant.whatsappPhone || '')
const qrCode = ref('')
const loading = ref(false)
let socket = null

// Meta State
const metaChannels = ref([])
const showMetaForm = ref(false)
const metaLoading = ref(false)
const metaForm = ref({
  phoneNumber: '',
  metaPhoneNumberId: '',
  metaWabaId: '',
  metaAccessToken: ''
})

const fetchMetaChannels = async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/meta/channels', {
      headers: { Authorization: `Bearer ${token}` }
    })
    metaChannels.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch meta channels', err)
  }
}

const addMetaChannel = async () => {
  if (!metaForm.value.phoneNumber || !metaForm.value.metaPhoneNumberId || !metaForm.value.metaAccessToken) {
    alert('Please fill all required fields');
    return;
  }
  metaLoading.value = true
  const token = localStorage.getItem('token')
  try {
    await axios.post('/api/v1/meta/channel', metaForm.value, {
      headers: { Authorization: `Bearer ${token}` }
    })
    showMetaForm.value = false
    metaForm.value = { phoneNumber: '', metaPhoneNumberId: '', metaWabaId: '', metaAccessToken: '' }
    fetchMetaChannels()
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to add meta channel')
  } finally {
    metaLoading.value = false
  }
}

const deleteMetaChannel = async (id) => {
  if (!confirm('Are you sure you want to remove this Meta connection?')) return;
  const token = localStorage.getItem('token')
  try {
    await axios.delete(`/api/v1/meta/channel/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchMetaChannels()
  } catch (err) {
    alert('Failed to delete channel')
  }
}

const initSocket = () => {
  socket = io('/', { path: '/socket.io' })
  socket.on('connect', () => {
    socket.emit('join-tenant', tenant.id)
  })
  
  socket.on('qr', (data) => {
    qrCode.value = data.qr
  })
  
  socket.on('status', (data) => {
    status.value = data.status
    if (data.phone) phone.value = data.phone
    if (data.status === 'CONNECTED' || data.status === 'DISCONNECTED') {
      qrCode.value = ''
      tenant.sessionStatus = data.status
      if (data.phone) tenant.whatsappPhone = data.phone
      localStorage.setItem('tenant', JSON.stringify(tenant))
    }
  })
}

onMounted(async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/whatsapp/status', {
      headers: { Authorization: `Bearer ${token}` }
    })
    status.value = res.data.data.sessionStatus
    phone.value = res.data.data.whatsappPhone
    
    if (status.value === 'CONNECTING') {
      initSocket()
    }
  } catch (err) {
    console.error('Failed to get status')
  }

  fetchMetaChannels()
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})

const connect = async () => {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    await axios.post('/api/whatsapp/connect', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    status.value = 'CONNECTING'
    initSocket()
  } catch (err) {
    console.error('Failed to connect', err)
  } finally {
    loading.value = false
  }
}

const disconnect = async () => {
  const token = localStorage.getItem('token')
  try {
    await axios.post('/api/whatsapp/disconnect', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    status.value = 'DISCONNECTED'
    phone.value = ''
    if (socket) socket.disconnect()
  } catch (err) {
    console.error('Failed to disconnect', err)
  }
}
</script>

<style scoped>
.connect-container { max-width: 700px; margin: 0 auto; padding-bottom: 3rem; }
.subtitle { color: #6b7280; margin-bottom: 2rem; }
.status-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 1.5rem; text-align: left; }
.meta-card { border-top: 4px solid #10b981; }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-header h3 { margin: 0; }
.badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
.bg-success { background: #d1fae5; color: #065f46; }
.bg-gray { background: #f3f4f6; color: #374151; }
.bg-primary { background: #dbeafe; color: #1e40af; }
.desc { color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem; }

hr { border: 0; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }

.icon { font-size: 3rem; margin-bottom: 1rem; text-align: center; }
.connected-state, .connecting-state, .disconnected-state { text-align: center; }

.btn-primary, .btn-danger, .btn-secondary { padding: 0.75rem 1.5rem; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 1rem; margin-right: 0.5rem; }
.btn-primary { background: #3b82f6; color: white; }
.btn-danger { background: #ef4444; color: white; }
.btn-secondary { background: #f3f4f6; color: #374151; }
.btn-danger-sm { background: #fee2e2; color: #991b1b; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: bold; }

.qr-box { background: #f3f4f6; padding: 1rem; border-radius: 8px; margin-top: 1rem; display: inline-block; }

.channels-list { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
.channel-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; }
.status-dot { display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-left: 0.5rem; margin-right: 0.25rem; }

.meta-form { background: #f9fafb; padding: 1.5rem; border-radius: 8px; border: 1px dashed #d1d5db; }
.meta-form h4 { margin-top: 0; margin-bottom: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; color: #374151; }
.form-group input { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; }
.mt-4 { margin-top: 1rem; }
</style>
