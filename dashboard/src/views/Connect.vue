<template>
  <div class="cn-root">

    <!-- ── Hero Header ── -->
    <div class="hero-header">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          </div>
          <div>
            <h1 class="hero-title">WhatsApp Connections</h1>
            <p class="hero-sub">Manage your messaging channels (Web QR & Official Meta API)</p>
          </div>
        </div>
      </div>
    </div>

    <div class="cn-body">
      <!-- 1. Web QR Connection -->
      <div class="cn-card">
        <div class="card-head">
          <div class="ch-left">
            <div class="ch-icon qr">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div>
              <h2 class="ch-title">Web QR Connection (Standard)</h2>
              <p class="ch-sub">Best for standard text and media messaging without strict Meta template approvals.</p>
            </div>
          </div>
          <span :class="['status-badge', status === 'CONNECTED' ? 'bg-success' : 'bg-idle']">
            <span class="pulse" v-if="status === 'CONNECTED'"></span>
            {{ status }}
          </span>
        </div>

        <div class="card-body">
          <div v-if="status === 'CONNECTED'" class="state-connected">
            <div class="sc-icon">✅</div>
            <div class="sc-info">
              <span class="sc-lbl">WhatsApp Phone Number</span>
              <strong class="sc-val">{{ phone }}</strong>
            </div>
            <button @click="disconnect" class="btn-disconnect">Disconnect QR Session</button>
          </div>

          <div v-else-if="status === 'CONNECTING'" class="state-qr">
            <p class="qr-inst">Open WhatsApp on your phone &gt; Linked Devices &gt; Link a Device.</p>
            <div class="qr-box">
              <qrcode-vue v-if="qrCode" :value="qrCode" :size="220" level="H" />
              <div v-else class="qr-loading">Generating QR Code...</div>
            </div>
          </div>

          <div v-else class="state-idle">
            <button @click="connect" :disabled="loading" class="btn-connect qr-btn">
              {{ loading ? 'Starting Session...' : 'Link via QR Code' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Meta API Connection -->
      <div class="cn-card meta-card">
        <div class="card-accent"></div>
        <div class="card-head">
          <div class="ch-left">
            <div class="ch-icon meta">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </div>
            <div>
              <div class="flex-title">
                <h2 class="ch-title">Meta Cloud API (Official)</h2>
                <span class="pro-badge">PRO FEATURE</span>
              </div>
              <p class="ch-sub">Required for sending Interactive Messages (Buttons & Lists).</p>
            </div>
          </div>
        </div>

        <div class="card-body pt-0">
          <!-- Upgrade Banner for Non-Enabled -->
          <div v-if="!isMetaEnabled" class="upgrade-banner">
            <div class="ub-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div class="ub-content">
              <h3>Unlock Meta Cloud API</h3>
              <p>هذه الميزة متاحة فقط في باقة الأعمال (أو بطلب خاص من الإدارة)، تمنحك استقراراً تاماً وأزراراً تفاعلية رسمية.</p>
              <button @click="goToUpgrade" class="btn-upgrade">اضغط هنا للترقية</button>
            </div>
          </div>

          <!-- Enabled Users -->
          <div v-else>
            <!-- Webhook Info -->
            <div class="webhook-box">
              <h4 class="wh-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Meta Webhook Setup
              </h4>
              <p class="wh-desc">Configure this Webhook in your Meta Developer App (only once per app):</p>
              
              <div class="wh-grid">
                <div class="wh-row">
                  <span class="wh-lbl">Callback URL:</span>
                  <code class="wh-val">{{ baseUrl }}/api/v1/meta/webhook</code>
                </div>
                <div class="wh-row">
                  <span class="wh-lbl">Verify Token:</span>
                  <code class="wh-val">wakeel_meta_secret_1234</code>
                </div>
              </div>
              <small class="wh-hint">* You can change the Verify Token in your .env file (META_VERIFY_TOKEN)</small>
            </div>

            <!-- Embedded Signup -->
            <div class="embedded-box">
              <div class="eb-flex">
                <div class="eb-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div class="eb-content">
                  <div class="eb-title-row">
                    <h3>Connect with Embedded Signup</h3>
                    <span class="new-badge">NEW</span>
                  </div>
                  <p>اربط حساب WhatsApp Business الخاص بعميلك في دقيقتين عبر نافذة Facebook الرسمية — بدون نسخ ولصق أي بيانات.</p>
                </div>
                <button @click="launchEmbeddedSignup" class="btn-fb">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continue with Facebook
                </button>
              </div>

              <!-- Status Feedback -->
              <div v-if="embeddedSignupStatus" :class="['fb-status', embeddedSignupStatus]">
                <div v-if="embeddedSignupStatus === 'loading'" class="fb-spinner"></div>
                <span v-else-if="embeddedSignupStatus === 'success'">✅</span>
                <span v-else-if="embeddedSignupStatus === 'error'">⚠️</span>
                {{ embeddedSignupMessage }}
              </div>
            </div>

            <!-- Channels List -->
            <div v-if="metaChannels.length > 0" class="channels-list">
              <div v-for="channel in metaChannels" :key="channel.id" class="channel-item">
                <div class="ci-left">
                  <strong class="ci-phone">+{{ channel.phoneNumber }}</strong>
                  <span class="ci-status"><span class="ci-dot"></span>{{ channel.status }}</span>
                </div>
                <button @click="deleteMetaChannel(channel.id)" class="btn-remove">Remove</button>
              </div>
            </div>
            <div v-else class="channels-empty">
              No Meta Cloud numbers configured yet — use the button above to connect a new number.
            </div>
          </div>
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
  window.fbAsyncInit = function () {
    if (window.FB) {
      window.FB.init({
        appId: FB_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0'
      })
    }
  }

  if (document.getElementById('facebook-jssdk')) {
    // Script already injected. If FB object exists but not initialized, 
    // calling init directly might throw if already init'd, but we can rely on it being loaded.
    if (window.FB) {
      try {
        window.FB.init({
          appId: FB_APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v21.0'
        })
      } catch (e) { /* already initialized */ }
    }
    return
  }
  
  const script = document.createElement('script')
  script.id = 'facebook-jssdk'
  script.async = true
  script.defer = true
  script.crossOrigin = 'anonymous'
  script.src = 'https://connect.facebook.net/en_US/sdk.js'
  document.head.appendChild(script)
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
const fbLoginCallback = (response) => {
  // FB SDK throws errors if you pass an async function directly to FB.login()
  // So we use a standard sync function here, and run async code inside.
  (async () => {
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
  })();
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
    display: 'popup',
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

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.cn-root {
  padding: 0 0 4rem; min-height: 100vh;
  background: #F0F2F7; font-family: 'Inter', sans-serif;
}

/* ═══ HERO ═══ */
.hero-header {
  background: linear-gradient(135deg, #0F172A 0%, #1a1f2e 50%, #0F172A 100%);
  padding: 3rem 3rem 4rem; position: relative; overflow: hidden;
}
.hero-glow {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 0%, rgba(255,102,0,0.15) 0%, transparent 50%);
  pointer-events: none;
}
.hero-content { display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 1; }
.hero-left { display: flex; align-items: center; gap: 1.25rem; }
.hero-icon-wrap {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #FF6600, #E65C00);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(255,102,0,0.3);
}
.hero-title { font-size: 2rem; font-weight: 900; color: #fff; margin: 0 0 0.3rem; letter-spacing: -0.03em; }
.hero-sub { font-size: 0.95rem; color: #94A3B8; margin: 0; font-weight: 500; }

.cn-body {
  max-width: 900px; margin: -2.5rem auto 0;
  padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;
  position: relative; z-index: 10;
}

/* ═══ CARDS ═══ */
.cn-card {
  background: white; border-radius: 20px;
  border: 1px solid #E8EDF5;
  box-shadow: 0 12px 32px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03);
  overflow: hidden; position: relative;
}
.cn-card.meta-card { border-top: 4px solid #10B981; }

.card-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 2rem 2rem 1.5rem;
}
.ch-left { display: flex; gap: 1.25rem; align-items: flex-start; }
.ch-icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ch-icon.qr { background: #FFF7ED; color: #F97316; }
.ch-icon.meta { background: #ECFDF5; color: #10B981; }
.flex-title { display: flex; align-items: center; gap: 12px; margin-bottom: 0.25rem; }
.ch-title { font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0 0 0.25rem; }
.ch-sub { font-size: 0.9rem; color: #64748B; margin: 0; }
.pro-badge { background: #EFF6FF; color: #2563EB; font-size: 0.65rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; border: 1px solid #BFDBFE; }
.status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0.4rem 1rem; border-radius: 30px;
  font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
}
.bg-success { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
.bg-idle { background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0; }
.pulse { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; animation: p 1.5s infinite; }
@keyframes p { 0%,100%{transform:scale(1); opacity:1;} 50%{transform:scale(1.5); opacity:0.5;} }

.card-body { padding: 0 2rem 2.5rem; }

/* QR States */
.state-connected { text-align: center; padding: 2rem; background: #F8FAFC; border-radius: 16px; border: 1px dashed #CBD5E1; }
.sc-icon { font-size: 3rem; margin-bottom: 1rem; }
.sc-info { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 4px; }
.sc-lbl { font-size: 0.85rem; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.sc-val { font-size: 1.5rem; color: #0F172A; font-weight: 900; }
.btn-disconnect { background: white; color: #DC2626; border: 1.5px solid #FCA5A5; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.btn-disconnect:hover { background: #FEF2F2; border-color: #EF4444; }

.state-qr { text-align: center; padding: 2rem; }
.qr-inst { font-size: 0.95rem; font-weight: 600; color: #475569; margin-bottom: 1.5rem; }
.qr-box { display: inline-block; padding: 1.5rem; background: white; border: 2px solid #E2E8F0; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
.qr-loading { width: 220px; height: 220px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #94A3B8; animation: pulse 1.5s infinite; background: #F8FAFC; border-radius: 12px; }

.state-idle { text-align: center; padding: 2rem; }
.btn-connect {
  background: linear-gradient(135deg, #FF6600, #E65C00);
  color: white; padding: 1rem 2rem; border-radius: 14px;
  font-weight: 800; font-size: 1.05rem; border: none; cursor: pointer;
  box-shadow: 0 6px 20px rgba(255,102,0,0.25); transition: all 0.2s; font-family: inherit;
}
.btn-connect:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(255,102,0,0.35); }
.btn-connect:disabled { opacity: 0.6; cursor: not-allowed; }

/* Meta Card */
.upgrade-banner { display: flex; align-items: center; gap: 1.5rem; background: #FFFBEB; border: 1px solid #FDE68A; padding: 1.5rem; border-radius: 16px; margin-top: 1rem; }
.ub-icon { width: 48px; height: 48px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #D97706; box-shadow: 0 4px 10px rgba(217,119,6,0.1); flex-shrink: 0; }
.ub-content h3 { margin: 0 0 0.25rem; font-size: 1.15rem; font-weight: 800; color: #92400E; }
.ub-content p { margin: 0 0 1rem; font-size: 0.9rem; color: #B45309; line-height: 1.5; }
.btn-upgrade { background: #F59E0B; color: white; padding: 0.6rem 1.25rem; border-radius: 10px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.btn-upgrade:hover { background: #D97706; }

.webhook-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 1.25rem; border-radius: 16px; margin-bottom: 1.5rem; }
.wh-title { display: flex; align-items: center; gap: 6px; font-size: 0.95rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem; }
.wh-desc { font-size: 0.85rem; color: #64748B; margin: 0 0 1rem; }
.wh-grid { display: flex; flex-direction: column; gap: 8px; }
.wh-row { display: flex; align-items: center; gap: 1rem; background: white; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid #E2E8F0; }
.wh-lbl { font-size: 0.85rem; font-weight: 700; color: #64748B; width: 100px; }
.wh-val { flex: 1; font-family: monospace; font-size: 0.85rem; color: #0F172A; background: #F1F5F9; padding: 4px 8px; border-radius: 6px; user-select: all; }
.wh-hint { display: block; margin-top: 0.75rem; font-size: 0.75rem; color: #94A3B8; font-weight: 500; }

.embedded-box { background: linear-gradient(135deg, #EFF6FF, #E0E7FF); border: 1px solid #BFDBFE; padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; }
.eb-flex { display: flex; align-items: center; gap: 1.5rem; }
.eb-icon { width: 52px; height: 52px; background: #1877F2; border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(24,119,242,0.25); flex-shrink: 0; }
.eb-content { flex: 1; }
.eb-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 0.25rem; }
.eb-title-row h3 { font-size: 1.1rem; font-weight: 800; color: #1E3A8A; margin: 0; }
.new-badge { background: #1D4ED8; color: white; font-size: 0.65rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; }
.eb-content p { font-size: 0.85rem; color: #1E40AF; margin: 0; font-weight: 500; }
.btn-fb { display: flex; align-items: center; gap: 8px; background: #1877F2; color: white; padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(24,119,242,0.3); font-family: inherit; flex-shrink: 0; }
.btn-fb:hover { background: #166FE5; transform: translateY(-2px); }

.fb-status { margin-top: 1rem; padding: 0.75rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.fb-status.loading { background: #DBEAFE; color: #1E40AF; }
.fb-status.success { background: #DCFCE7; color: #166534; }
.fb-status.error { background: #FEE2E2; color: #991B1B; }
.fb-spinner { width: 16px; height: 16px; border: 2px solid #2563EB; border-right-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }

.channels-list { display: flex; flex-direction: column; gap: 0.75rem; border-top: 1px dashed #E2E8F0; padding-top: 1.5rem; }
.channel-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: white; border: 1px solid #E2E8F0; border-radius: 12px; transition: all 0.2s; }
.channel-item:hover { border-color: #CBD5E1; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
.ci-left { display: flex; align-items: center; gap: 1rem; }
.ci-phone { font-size: 1.1rem; font-weight: 800; color: #0F172A; }
.ci-status { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 800; color: #64748B; text-transform: uppercase; }
.ci-dot { width: 8px; height: 8px; background: #22C55E; border-radius: 50%; }
.btn-remove { background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.btn-remove:hover { background: #FCA5A5; color: white; border-color: #FCA5A5; }

.channels-empty { font-size: 0.9rem; color: #64748B; text-align: center; padding: 2rem; border: 1px dashed #CBD5E1; border-radius: 16px; margin-top: 1.5rem; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 50% { opacity: .5; } }

@media(max-width: 640px) {
  .hero-header { padding: 2rem 1.5rem 3.5rem; }
  .cn-body { padding: 0 1rem; }
  .card-head { flex-direction: column; gap: 1rem; }
  .eb-flex { flex-direction: column; align-items: stretch; text-align: center; }
  .eb-icon { margin: 0 auto; }
  .eb-title-row { justify-content: center; }
  .wh-row { flex-direction: column; align-items: flex-start; gap: 4px; }
}
</style>
