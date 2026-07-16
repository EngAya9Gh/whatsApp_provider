<template>
  <div class="auth-page">
    <div class="brand-panel">
      <div class="brand-content">
        <img src="/logo.svg" alt="wakeel.." class="brand-logo" />
        <h2>Join wakeel..</h2>
        <p>Create your account and start sending OTP messages to your users in minutes.</p>
        <div class="brand-features">
          <div class="feature-item">🚀 Up and running in minutes</div>
          <div class="feature-item">🔒 Secure &amp; encrypted</div>
          <div class="feature-item">📊 Full analytics dashboard</div>
        </div>
      </div>
      <div class="brand-decoration"></div>
    </div>

    <div class="form-panel">
      <div class="form-box">
        <h1>Create account</h1>
        <p class="form-subtitle">Start your free trial today</p>

        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label>Company / Full Name</label>
            <input type="text" v-model="name" placeholder="Your Company Inc." required />
          </div>
          <div class="form-group">
            <label>Email address</label>
            <input type="email" v-model="email" placeholder="you@company.com" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <div class="input-wrapper">
              <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="Min. 6 characters" required minlength="6" />
              <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label>Select Plan</label>
            <select v-model="selectedPlan" required class="plan-select">
              <option v-for="plan in availablePlans" :key="plan.planCode" :value="plan.planCode">
                {{ plan.name }} - ${{ plan.price }}/mo ({{ plan.limit }} Messages)
              </option>
            </select>
          </div>

          <div v-if="error" class="error-msg">{{ error }}</div>
          <div v-if="success" class="success-msg">{{ success }}</div>
          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? 'Creating account...' : 'Create account' }}
          </button>
        </form>

        <div class="form-footer">
          Already have an account?
          <router-link to="/login">Sign in →</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const name = ref('')
const email = ref('')
const password = ref('')
const selectedPlan = ref('FREE')
const availablePlans = ref([])

const error = ref('')
const success = ref('')
const loading = ref(false)
const showPassword = ref(false)
const router = useRouter()

onMounted(async () => {
  try {
    const res = await axios.get('/api/plans')
    availablePlans.value = res.data.data
  } catch (err) {
    console.error('Failed to load plans', err)
  }
})

const handleRegister = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    await axios.post('/api/auth/register', {
      name: name.value,
      email: email.value,
      password: password.value,
      companyName: name.value,
      plan: selectedPlan.value
    })
    success.value = 'Account created! Redirecting to login...'
    setTimeout(() => router.push('/login'), 1800)
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.error || 'Registration failed'
    error.value = msg
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page { display: flex; min-height: 100vh; width: 100%; }
.brand-panel { flex: 1; background: #0F172A; display: flex; align-items: center; justify-content: center; padding: 3rem; position: relative; overflow: hidden; }
.brand-content { position: relative; z-index: 2; max-width: 400px; }
.brand-logo { height: 44px; filter: brightness(0) invert(1); margin-bottom: 2rem; }
.brand-panel h2 { color: white; font-size: 1.875rem; font-weight: 700; margin-bottom: 0.75rem; }
.brand-panel p { color: #94a3b8; font-size: 1rem; line-height: 1.6; margin-bottom: 2rem; }
.brand-features { display: flex; flex-direction: column; gap: 0.75rem; }
.feature-item { color: #CBD5E1; font-size: 0.9rem; font-weight: 500; }
.brand-decoration { position: absolute; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 102, 0, 0.12) 0%, transparent 70%); bottom: -100px; left: -100px; }
.form-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 3rem; background: #F8FAFC; }
.form-box { width: 100%; max-width: 380px; }
.form-box h1 { font-size: 1.75rem; font-weight: 800; color: #0F172A; margin-bottom: 0.375rem; }
.form-subtitle { color: #64748B; margin-bottom: 2rem; }
.form-group { margin-bottom: 1.25rem; }
label { display: block; font-size: 0.875rem; font-weight: 600; color: #1E293B; margin-bottom: 0.5rem; }

/* Password input wrapper */
.input-wrapper { position: relative; }
.input-wrapper input { padding-right: 2.75rem; }
.eye-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #94A3B8;
  display: flex;
  align-items: center;
  padding: 0;
  transition: color 0.2s;
}
.eye-btn:hover { color: #FF6600; }
.eye-btn svg { width: 18px; height: 18px; }

input, select { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 0.9rem; transition: all 0.2s; background: white; color: #1E293B; }
input:focus, select:focus { outline: none; border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.btn-submit { width: 100%; padding: 0.875rem; background: #FF6600; color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; margin-top: 0.5rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.btn-submit:hover:not(:disabled) { background: #cc5200; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(255,102,0,0.3); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-msg { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
.success-msg { background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
.form-footer { text-align: center; margin-top: 1.5rem; color: #64748B; font-size: 0.9rem; }
.form-footer a { color: #FF6600; font-weight: 600; margin-left: 0.25rem; }
@media (max-width: 768px) { .brand-panel { display: none; } .form-panel { width: 100%; } }
</style>
