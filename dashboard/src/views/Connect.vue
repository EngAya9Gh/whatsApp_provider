<template>
  <div class="max-w-4xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">
    <div class="mb-8">
      <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">WhatsApp Connections</h2>
      <p class="text-slate-500 font-medium text-lg">Manage your WhatsApp numbers connected via Web QR (Standard) or Official Meta Cloud API.</p>
    </div>

    <!-- 1. Web Socket Connection -->
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-6 text-left">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-xl font-bold text-slate-900 m-0">Web QR Connection (Standard)</h3>
        <span :class="status === 'CONNECTED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border">
          {{ status }}
        </span>
      </div>
      <p class="text-slate-500 text-sm mt-2 mb-6 font-medium">Best for standard text and media messaging without strict Meta template approvals.</p>
      
      <hr class="border-t border-slate-100 my-6" />

      <div v-if="status === 'CONNECTED'" class="text-center py-6">
        <div class="text-5xl mb-6">✅</div>
        <p class="text-lg text-slate-700 mb-6 font-medium">WhatsApp Phone: <strong class="text-slate-900 font-bold">{{ phone }}</strong></p>
        <button @click="disconnect" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 px-6 py-2.5 rounded-lg font-bold shadow-sm transition-colors cursor-pointer">
          Disconnect QR Session
        </button>
      </div>

      <div v-else-if="status === 'CONNECTING'" class="text-center py-6">
        <p class="text-slate-600 font-medium mb-6">Open WhatsApp on your phone > Linked Devices > Link a Device.</p>
        <div v-if="qrCode" class="inline-block bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
          <qrcode-vue :value="qrCode" :size="250" level="H" />
        </div>
        <div v-else class="text-slate-400 font-medium animate-pulse">Generating QR Code...</div>
      </div>

      <div v-else class="text-center py-6">
        <button @click="connect" :disabled="loading" class="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer text-lg">
          {{ loading ? 'Starting Session...' : 'Link via QR Code' }}
        </button>
      </div>
    </div>

    <!-- 2. Meta Cloud API Connections -->
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-green-500 mt-8 text-left relative overflow-hidden">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 class="text-2xl font-extrabold text-slate-900 m-0 flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          Meta Cloud API (Official)
        </h2>
        <span class="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          PRO Feature
        </span>
      </div>

      <!-- Upgrade Banner for Non-Enabled users -->
      <div v-if="!isMetaEnabled" class="flex flex-col md:flex-row items-center gap-6 bg-orange-50 border border-orange-100 p-6 rounded-xl mt-4">
        <div class="bg-white p-3 rounded-full shadow-sm border border-orange-100 shrink-0">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF6600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <div class="flex-1 text-center md:text-start">
          <h3 class="text-xl font-bold text-orange-900 mb-2">Unlock Meta Cloud API</h3>
          <p class="text-orange-700 font-medium mb-4 text-sm md:text-base leading-relaxed">هذه الميزة متاحة فقط في باقة الأعمال (أو بطلب خاص من الإدارة)، تمنحك استقراراً تاماً وأزراراً تفاعلية رسمية.</p>
          <button @click="goToUpgrade" class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition-colors border-none cursor-pointer">
            اضغط هنا للترقية
          </button>
        </div>
      </div>

      <!-- Actual Meta Form for Enterprise users -->
      <div v-else>
        <p class="text-slate-500 text-sm font-medium mb-6">Required for sending Interactive Messages (Buttons & Lists). Connect via official Meta Developer portal.</p>
        
        <!-- Webhook Setup Info Box -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-5 my-6">
          <h4 class="flex items-center gap-2 text-slate-800 font-bold mb-3 mt-0 text-base">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> 
            Meta Webhook Setup
          </h4>
          <p class="text-sm text-slate-600 mb-4 font-medium">To receive replies and button clicks, configure this Webhook in your Meta Developer App (only once per app):</p>
          
          <div class="flex flex-col gap-3">
            <div class="flex flex-col sm:flex-row sm:items-center bg-white p-3 rounded-lg border border-slate-200 text-sm">
              <span class="font-bold text-slate-500 w-32 shrink-0 mb-1 sm:mb-0">Callback URL:</span>
              <code class="text-slate-900 font-mono select-all bg-slate-50 px-2 py-1 rounded w-full overflow-x-auto">{{ baseUrl }}/api/v1/meta/webhook</code>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center bg-white p-3 rounded-lg border border-slate-200 text-sm">
              <span class="font-bold text-slate-500 w-32 shrink-0 mb-1 sm:mb-0">Verify Token:</span>
              <code class="text-slate-900 font-mono select-all bg-slate-50 px-2 py-1 rounded w-full overflow-x-auto">wakeel_meta_secret_1234</code>
            </div>
          </div>
          <small class="block text-slate-400 mt-4 font-medium">* You can change the Verify Token in your .env file (META_VERIFY_TOKEN)</small>
        </div>
  
        <!-- ─── Embedded Signup Button ─── -->
        <div class="my-6 rounded-2xl overflow-hidden border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div class="p-6">
            <div class="flex flex-col md:flex-row items-start md:items-center gap-5">
              <!-- Icon -->
              <div class="w-14 h-14 rounded-2xl bg-[#1877f2] flex items-center justify-center shrink-0 shadow-lg shadow-blue-300/40">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>

              <!-- Text -->
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="text-xl font-extrabold text-slate-900 m-0">Connect with Embedded Signup</h4>
                  <span class="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-wide">NEW</span>
                </div>
                <p class="text-slate-600 text-sm font-medium leading-relaxed m-0">
                  اربط حساب WhatsApp Business الخاص بعميلك في دقيقتين عبر نافذة Facebook الرسمية — بدون نسخ ولصق أي بيانات.
                </p>
              </div>

              <!-- Button -->
              <button
                @click="launchEmbeddedSignup"
                class="shrink-0 flex items-center gap-3 bg-[#1877f2] hover:bg-[#166fe5] text-white px-6 py-3 rounded-xl font-bold text-base shadow-lg shadow-blue-400/30 hover:shadow-blue-400/50 transition-all hover:-translate-y-0.5 border-none cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </button>
            </div>

            <!-- Status Feedback -->
            <div v-if="embeddedSignupStatus" class="mt-4 flex items-center gap-3 p-3 rounded-xl text-sm font-semibold"
                 :class="{
                   'bg-blue-100 text-blue-800': embeddedSignupStatus === 'loading',
                   'bg-green-100 text-green-800': embeddedSignupStatus === 'success',
                   'bg-red-100 text-red-700': embeddedSignupStatus === 'error'
                 }">
              <div v-if="embeddedSignupStatus === 'loading'" class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
              <span v-else-if="embeddedSignupStatus === 'success'">✅</span>
              <span v-else-if="embeddedSignupStatus === 'error'">⚠️</span>
              {{ embeddedSignupMessage }}
            </div>
          </div>
        </div>

        <hr class="border-t border-slate-100 my-4" />

        <!-- Channels list -->
        <div v-if="metaChannels.length > 0" class="flex flex-col gap-4 mb-6">
          <div v-for="channel in metaChannels" :key="channel.id" class="flex justify-between items-center p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-3">
              <strong class="text-slate-900 font-bold text-lg">+{{ channel.phoneNumber }}</strong>
              <div class="flex items-center text-xs font-bold text-slate-500 uppercase">
                <span class="inline-block w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></span> {{ channel.status }}
              </div>
            </div>
            <button @click="deleteMetaChannel(channel.id)" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-md font-bold text-xs transition-colors border border-red-100 cursor-pointer">
              Remove
            </button>
          </div>
        </div>
        <div v-if="metaChannels.length === 0" class="text-slate-500 mb-6 font-medium text-sm">
          No Meta Cloud numbers configured yet — use the button above to connect a new number.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'
import QrcodeVue from 'qrcode.vue'

// ─── Config ───────────────────────────────────────────────────
const FB_APP_ID = import.meta.env.VITE_FB_APP_ID || ''
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID || ''

// ─── QR Session State ────────────────────────────────────────
const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
const isMetaEnabled = ref(tenant.metaEnabled || (tenant.allowedFeatures && tenant.allowedFeatures.includes('META_API')))
const status = ref(tenant.sessionStatus || 'DISCONNECTED')
const phone = ref(tenant.whatsappPhone || '')
const qrCode = ref('')
const loading = ref(false)
let socket = null

const goToUpgrade = () => { window.location.href = '/' }

// ─── Meta State ───────────────────────────────────────────────
const metaChannels = ref([])
const baseUrl = ref(window.location.origin)
const embeddedSignupStatus = ref('') // '', 'loading', 'success', 'error'
const embeddedSignupMessage = ref('')

// ─── Facebook SDK ─────────────────────────────────────────────
const loadFbSdk = () => {
  if (document.getElementById('facebook-jssdk')) return
  const script = document.createElement('script')
  script.id = 'facebook-jssdk'
  script.async = true
  script.defer = true
  script.crossOrigin = 'anonymous'
  script.src = 'https://connect.facebook.net/en_US/sdk.js'
  document.head.appendChild(script)

  window.fbAsyncInit = function () {
    window.FB.init({
      appId: FB_APP_ID,
      autoLogAppEvents: true,
      xfbml: true,
      version: 'v22.0'
    })
  }
}

// ─── Message event listener (captures IDs from popup) ─────────
const handleFbMessage = (event) => {
  if (!event.origin.endsWith('facebook.com')) return
  try {
    const data = JSON.parse(event.data)
    if (data.type === 'WA_EMBEDDED_SIGNUP') {
      if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
        // Store temporarily; the code exchange happens in fbLoginCallback
        window._embeddedSignupData = data.data
        console.log('[EmbeddedSignup] Received IDs:', data.data)
      } else if (data.event === 'CANCEL') {
        embeddedSignupStatus.value = 'error'
        embeddedSignupMessage.value = `Signup cancelled at step: ${data.data?.current_step || 'unknown'}`
      } else if (data.event === 'ERROR') {
        embeddedSignupStatus.value = 'error'
        embeddedSignupMessage.value = `Error: ${data.data?.error_message || 'Unknown error'}`
      }
    }
  } catch {
    // non-JSON messages from facebook, ignore
  }
}

// ─── Callback after FB.login() completes ──────────────────────
const fbLoginCallback = async (response) => {
  if (response.authResponse) {
    const code = response.authResponse.code
    const signupData = window._embeddedSignupData || {}
    const phone_number_id = signupData.phone_number_id
    const waba_id = signupData.waba_id

    if (!phone_number_id || !waba_id) {
      embeddedSignupStatus.value = 'error'
      embeddedSignupMessage.value = 'Could not capture phone_number_id or waba_id from Meta. Please try again.'
      return
    }

    embeddedSignupStatus.value = 'loading'
    embeddedSignupMessage.value = 'Saving your WhatsApp channel...'

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/v1/meta/embedded-signup/exchange', {
        code, phone_number_id, waba_id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      embeddedSignupStatus.value = 'success'
      embeddedSignupMessage.value = `✅ Connected! Phone: +${res.data.channel.phoneNumber}`
      fetchMetaChannels()
      delete window._embeddedSignupData
    } catch (err) {
      embeddedSignupStatus.value = 'error'
      embeddedSignupMessage.value = err.response?.data?.message || 'Failed to save channel. Please try again.'
    }
  } else {
    embeddedSignupStatus.value = 'error'
    embeddedSignupMessage.value = 'Facebook login cancelled or failed.'
  }
}

// ─── Launch the Embedded Signup Popup ─────────────────────────
const launchEmbeddedSignup = () => {
  if (!window.FB) {
    embeddedSignupStatus.value = 'error'
    embeddedSignupMessage.value = 'Facebook SDK not loaded yet. Please wait a moment and try again.'
    return
  }
  if (!FB_APP_ID || !FB_CONFIG_ID) {
    embeddedSignupStatus.value = 'error'
    embeddedSignupMessage.value = 'VITE_FB_APP_ID or VITE_FB_CONFIG_ID is not configured in .env'
    return
  }
  embeddedSignupStatus.value = ''
  embeddedSignupMessage.value = ''
  delete window._embeddedSignupData

  window.FB.login(fbLoginCallback, {
    config_id: FB_CONFIG_ID,
    response_type: 'code',
    override_default_response_type: true,
    extras: { setup: {} }
  })
}

// ─── Standard Meta Channels CRUD ──────────────────────────────
const fetchMetaChannels = async () => {
  if (!isMetaEnabled.value) return
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

const deleteMetaChannel = async (id) => {
  if (!confirm('Are you sure you want to remove this Meta connection?')) return
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

// ─── Socket + QR ──────────────────────────────────────────────
const initSocket = () => {
  socket = io('/', { path: '/socket.io' })
  socket.on('connect', () => { socket.emit('join-tenant', tenant.id) })
  socket.on('qr', (data) => { qrCode.value = data.qr })
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
  loadFbSdk()
  window.addEventListener('message', handleFbMessage)

  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/whatsapp/status', { headers: { Authorization: `Bearer ${token}` } })
    status.value = res.data.data.sessionStatus
    phone.value = res.data.data.whatsappPhone
    if (status.value === 'CONNECTING') initSocket()
  } catch (err) { console.error('Failed to get status') }

  fetchMetaChannels()
})

onUnmounted(() => {
  if (socket) socket.disconnect()
  window.removeEventListener('message', handleFbMessage)
})

const connect = async () => {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    await axios.post('/api/whatsapp/connect', {}, { headers: { Authorization: `Bearer ${token}` } })
    status.value = 'CONNECTING'
    initSocket()
  } catch (err) { console.error('Failed to connect', err) } finally { loading.value = false }
}

const disconnect = async () => {
  const token = localStorage.getItem('token')
  try {
    await axios.post('/api/whatsapp/disconnect', {}, { headers: { Authorization: `Bearer ${token}` } })
    status.value = 'DISCONNECTED'
    phone.value = ''
    if (socket) socket.disconnect()
  } catch (err) { console.error('Failed to disconnect', err) }
}
</script>
