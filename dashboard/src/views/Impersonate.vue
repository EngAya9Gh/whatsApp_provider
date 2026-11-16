<template>
  <div class="imp-page" dir="rtl">
    <div class="imp-card">
      <template v-if="!error">
        <i class="fas fa-spinner fa-spin"></i>
        <p>جارٍ فتح لوحة العميل… <span dir="ltr">Opening the customer dashboard…</span></p>
      </template>
      <template v-else>
        <i class="fas fa-circle-exclamation err"></i>
        <p>{{ error }}</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// Landing page of the admin's "log in as customer": the token arrives in the #fragment (never sent to the
// server), the account is loaded with it, then the normal dashboard opens with the support-session banner.
const error = ref('')

onMounted(async () => {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  history.replaceState(null, '', '/impersonate') // keep the token out of the history
  if (!token) {
    error.value = 'الرابط غير صالح. ارجع للوحة الأدمن واضغط «ادخل كهذا العميل» من جديد.'
    return
  }
  try {
    const res = await axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    const data = res.data.data
    if (!data?.impersonation) throw new Error('not a support session')
    localStorage.setItem('token', token)
    localStorage.setItem('tenant', JSON.stringify({ ...data, isSubUser: false }))
    window.location.replace('/dashboard')
  } catch {
    error.value = 'انتهت الجلسة أو الرابط غير صالح. ارجع للوحة الأدمن وافتحها من جديد.'
  }
})
</script>

<style scoped>
.imp-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 16px; }
.imp-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 28px 32px; text-align: center; max-width: 420px; color: #334155; }
.imp-card i { font-size: 28px; color: #FF6600; }
.imp-card i.err { color: #dc2626; }
.imp-card p { margin: 12px 0 0; font-size: 14px; line-height: 1.7; }
</style>
