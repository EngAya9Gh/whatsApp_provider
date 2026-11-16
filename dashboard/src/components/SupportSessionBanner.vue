<template>
  <div v-if="session" class="ssb" dir="rtl" role="status">
    <i class="fas fa-user-shield"></i>
    <span class="ssb-text">
      أنت داخل حساب <b>{{ accountName }}</b> كدعم فني ({{ session.by }}) — باقي <b dir="ltr">{{ remaining }}</b>.
      لا يمكن تغيير كلمة السر أو مفاتيح API، وكل تعديل يُسجَّل في لوحة الأدمن.
    </span>
    <button type="button" class="ssb-end" :disabled="ending" @click="endSession">{{ ending ? '…' : 'إنهاء الجلسة' }}</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'

// Shown at the top of every page while an admin works inside the account ("log in as customer").
// Counts down the 30 minutes and signs out when they run out or the admin ends the session.
const tenant = ref({})
const now = ref(Date.now())
const ending = ref(false)
let timer = null

const read = () => {
  try { tenant.value = JSON.parse(localStorage.getItem('tenant') || '{}') } catch { tenant.value = {} }
}
const session = computed(() => (localStorage.getItem('token') && tenant.value?.impersonation) || null)
const accountName = computed(() => tenant.value?.name || tenant.value?.email || '')
const msLeft = computed(() => (session.value ? new Date(session.value.expiresAt).getTime() - now.value : 0))
const remaining = computed(() => {
  const s = Math.max(0, Math.floor(msLeft.value / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

const signOut = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('tenant')
  window.location.replace('/login')
}

const endSession = async () => {
  ending.value = true
  try { await axios.post('/api/auth/impersonation/end') } catch { /* the token stops working anyway */ }
  signOut()
}

onMounted(() => {
  read()
  window.addEventListener('tenant-updated', read)
  timer = setInterval(() => {
    now.value = Date.now()
    if (session.value && msLeft.value <= 0) signOut()
  }, 1000)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('tenant-updated', read)
})
</script>

<style scoped>
.ssb { position: fixed; inset-inline: 0; bottom: 0; z-index: 2000; box-shadow: 0 -4px 16px rgba(0, 0, 0, .18); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #b91c1c; color: #fff; padding: 8px 16px; font-size: 13px; line-height: 1.6; }
.ssb-text { flex: 1; min-width: 220px; }
.ssb-end { border: 1px solid rgba(255, 255, 255, .7); background: #fff; color: #b91c1c; font-weight: 700; font-size: 12px; border-radius: 999px; padding: 4px 14px; cursor: pointer; }
.ssb-end:disabled { opacity: .7; cursor: progress; }
</style>
