<template>
  <div class="connect-container">
    <h2>WhatsApp Connection</h2>
    
    <div class="status-card">
      <div v-if="status === 'CONNECTED'" class="connected-state">
        <div class="icon">✅</div>
        <h3>Successfully Connected</h3>
        <p>WhatsApp Phone: <strong>{{ phone }}</strong></p>
        <button @click="disconnect" class="btn-danger">Disconnect WhatsApp</button>
      </div>

      <div v-else-if="status === 'CONNECTING'" class="connecting-state">
        <h3>Link a Device</h3>
        <p>Open WhatsApp on your phone > Linked Devices > Link a Device.</p>
        <div class="qr-box" v-if="qrCode">
          <qrcode-vue :value="qrCode" :size="250" level="H" />
        </div>
        <div v-else class="loading">Generating QR Code...</div>
      </div>

      <div v-else class="disconnected-state">
        <h3>Not Connected</h3>
        <p>You need to link your WhatsApp to start sending OTPs.</p>
        <button @click="connect" class="btn-primary" :disabled="loading">
          {{ loading ? 'Starting Session...' : 'Connect Now' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'
import QrcodeVue from 'qrcode.vue'

const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
const status = ref(tenant.sessionStatus || 'DISCONNECTED')
const phone = ref(tenant.whatsappPhone || '')
const qrCode = ref('')
const loading = ref(false)
let socket = null

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
      // Update local storage
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
.connect-container { max-width: 600px; margin: 0 auto; }
.status-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; margin-top: 1.5rem; }
.icon { font-size: 3rem; margin-bottom: 1rem; }
.btn-primary, .btn-danger { padding: 0.75rem 1.5rem; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 1rem; }
.btn-primary { background: #3b82f6; color: white; }
.btn-danger { background: #ef4444; color: white; }
.qr-box { background: #f3f4f6; padding: 1rem; border-radius: 8px; margin-top: 1rem; overflow-wrap: break-word; }
.raw-qr { color: #6b7280; font-size: 0.875rem; }
</style>
