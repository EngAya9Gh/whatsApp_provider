<template>
  <div class="auth-page">
    <div class="brand-panel">
      <div class="brand-content">
        <router-link to="/">
          <img src="/logo.svg" alt="wakeel.." class="brand-logo" />
        </router-link>
        <h2>{{ $t('login.features.title') }}</h2>
        <p>{{ $t('login.features.desc') }}</p>
        <div class="brand-features">
          <div class="feature-item">✅ {{ $t('login.features.f1') }}</div>
          <div class="feature-item">✅ {{ $t('login.features.f2') }}</div>
          <div class="feature-item">✅ {{ $t('login.features.f3') }}</div>
        </div>
      </div>
      <div class="brand-decoration"></div>
    </div>

    <div class="form-panel">
      <div class="form-box">
        <!-- Login Type Tabs -->
        <div class="login-tabs">
          <button class="login-tab" :class="{ active: loginMode === 'owner' }" @click="loginMode = 'owner'; error = ''">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0 1 14 0v2"/></svg>
            {{ locale === 'ar' ? 'حساب الشركة' : 'Company Account' }}
          </button>
          <button class="login-tab" :class="{ active: loginMode === 'sub' }" @click="loginMode = 'sub'; error = ''">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {{ locale === 'ar' ? 'دخول موظف' : 'Employee Login' }}
          </button>
        </div>

        <h1>{{ $t('login.welcome_back') }}</h1>
        <p class="form-subtitle">
          <template v-if="loginMode === 'sub'">
            {{ locale === 'ar' ? 'سجّل دخولك كموظف في الشركة' : 'Sign in as a company team member' }}
          </template>
          <template v-else>{{ $t('login.sign_in_desc') }}</template>
        </p>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>{{ $t('login.email') }}</label>
            <input type="email" v-model="email" placeholder="user@company.com" required />
          </div>
          <div class="form-group">
            <label>{{ $t('login.password') }}</label>
            <div class="input-wrapper">
              <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="••••••••••" required />
              <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <div v-if="error" class="error-msg">{{ error }}</div>
          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? $t('login.signing_in') : $t('login.sign_in_btn') }}
          </button>
        </form>

        <div v-if="loginMode !== 'sub'" class="form-footer">
          {{ $t('login.no_account') }}
          <router-link to="/register">{{ $t('login.create_one') }} →</router-link>
        </div>
        <div v-else class="sub-login-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ locale === 'ar' ? 'حسابك تم إنشاؤه من قِبَل مدير الشركة' : 'Your account was created by your company admin' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const loginMode = ref('owner')  // 'owner' | 'sub'
const router = useRouter()

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    if (loginMode.value === 'sub') {
      // تسجيل دخول المستخدم الفرعي
      const res = await axios.post('/api/auth/sub-login', {
        email: email.value,
        password: password.value
      })
      const data = res.data.data
      localStorage.setItem('token', data.token)
      // نخزن بيانات الـ tenant مع معلومات الـ sub-user
      localStorage.setItem('tenant', JSON.stringify({
        ...data.tenant,
        isSubUser: true,
        subUser: data.subUser,
      }))
      window.location.href = '/dashboard'
    } else {
      // تسجيل دخول صاحب الحساب (Owner)
      const res = await axios.post('/api/auth/login', {
        email: email.value,
        password: password.value
      })
      const data = res.data.data
      localStorage.setItem('token', data.token)
      localStorage.setItem('tenant', JSON.stringify({
        ...data.tenant,
        isSubUser: false,
      }))
      window.location.href = '/dashboard'
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.response?.data?.message || 'Invalid credentials'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

/* Brand Panel */
.brand-panel {
  flex: 1;
  background: #0F172A;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  position: relative;
  overflow: hidden;
}

.brand-content { position: relative; z-index: 2; max-width: 400px; }
.brand-logo { height: 44px; filter: brightness(0) invert(1); margin-bottom: 2rem; }
.brand-panel h2 { color: white; font-size: 1.875rem; font-weight: 700; margin-bottom: 0.75rem; }
.brand-panel p { color: #6b7280; font-size: 1rem; line-height: 1.6; margin-bottom: 2rem; }

.brand-features { display: flex; flex-direction: column; gap: 0.75rem; }
.feature-item { color: #CBD5E1; font-size: 0.9rem; font-weight: 500; }

.brand-decoration {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 102, 0, 0.12) 0%, transparent 70%);
  top: -100px;
  right: -100px;
}

/* Form Panel */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background: #F8FAFC;
}

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

input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  font-size: 0.9rem;
  transition: all 0.2s;
  background: white;
  color: #1E293B;
}
input:focus { outline: none; border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }

.btn-submit {
  width: 100%;
  padding: 0.875rem;
  background: #FF6600;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-submit:hover:not(:disabled) { background: #cc5200; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(255,102,0,0.3); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-msg { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }

.form-footer { text-align: center; margin-top: 1.5rem; color: #64748B; font-size: 0.9rem; }
.form-footer a { color: #FF6600; font-weight: 600; margin-left: 0.25rem; }
.form-footer a:hover { text-decoration: underline; }

/* Login Tabs */
.login-tabs {
  display: flex; gap: 0.5rem; margin-bottom: 1.5rem;
  background: #F1F5F9; border-radius: 12px; padding: 4px;
}
.login-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.6rem; border: none; border-radius: 9px; cursor: pointer;
  font-size: 0.82rem; font-weight: 700; color: #64748B; background: transparent;
  transition: all 0.2s; font-family: inherit;
}
.login-tab.active { background: white; color: #0F172A; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.login-tab:hover:not(.active) { color: #0F172A; }

.sub-login-hint {
  display: flex; align-items: center; gap: 0.5rem; justify-content: center;
  margin-top: 1.5rem; color: #94A3B8; font-size: 0.82rem;
}

@media (max-width: 768px) {
  .brand-panel { display: none; }
  .form-panel { width: 100%; }
}
</style>
