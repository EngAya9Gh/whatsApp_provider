<template>
  <div class="app-root">
    <!-- Sidebar -->
    <aside v-if="showSidebar" class="sidebar">
      <a href="/" target="_blank" class="sidebar-logo">
        <img src="/logo.svg" alt="wakeel.." class="logo-img" />
      </a>

      <nav class="sidebar-nav">
        <!-- GENERAL -->
        <div class="nav-section-title">General</div>
        <router-link to="/dashboard" class="nav-item" exact-active-class="active">
          <span class="nav-icon">📊</span>
          <span class="nav-label">{{ $t('sidebar.dashboard') }}</span>
        </router-link>
        <router-link to="/connect" class="nav-item" active-class="active">
          <span class="nav-icon">📱</span>
          <span class="nav-label">Connections</span>
        </router-link>
        <router-link to="/live-chat" class="nav-item" active-class="active">
          <span class="nav-icon">💬</span>
          <span class="nav-label">Live Chat</span>
        </router-link>

        <!-- STANDARD (QR WEB) -->
        <div class="nav-section-title mt-4">Standard (QR)</div>
        <router-link to="/send-message" class="nav-item" active-class="active">
          <span class="nav-icon">📨</span>
          <span class="nav-label">{{ $t('sidebar.send_message') }}</span>
        </router-link>
        <router-link v-if="$hasFeature('BULK_CAMPAIGN')" to="/campaigns" class="nav-item" active-class="active">
          <span class="nav-icon">📢</span>
          <span class="nav-label">{{ $t('sidebar.campaigns') }}</span>
        </router-link>
        <router-link to="/templates" class="nav-item" active-class="active">
          <span class="nav-icon">📋</span>
          <span class="nav-label">{{ $t('sidebar.templates') }}</span>
        </router-link>
        <router-link v-if="$hasFeature('AUTO_RESPONDER')" to="/chatbot" class="nav-item" active-class="active">
          <span class="nav-icon">🤖</span>
          <span class="nav-label">Auto Responder</span>
        </router-link>

        <!-- META CLOUD -->
        <template v-if="$hasFeature('META_API')">
          <div class="nav-section-title mt-4 text-emerald-600">Meta Cloud</div>
          <router-link to="/meta-send-message" class="nav-item" active-class="active">
            <span class="nav-icon">📨</span>
            <span class="nav-label">Send Message</span>
          </router-link>
          <router-link to="/meta-templates" class="nav-item" active-class="active">
            <span class="nav-icon">📝</span>
            <span class="nav-label">Meta Templates</span>
          </router-link>
          <router-link to="/meta-campaigns" class="nav-item" active-class="active">
            <span class="nav-icon">📢</span>
            <span class="nav-label">Meta Campaigns</span>
          </router-link>
        </template>

        <!-- SYSTEM -->
        <div class="nav-section-title mt-4">System</div>
        <router-link to="/keys" class="nav-item" active-class="active">
          <span class="nav-icon">🔑</span>
          <span class="nav-label">{{ $t('sidebar.api_keys') }}</span>
        </router-link>
        <router-link to="/logs" class="nav-item" active-class="active">
          <span class="nav-icon">📋</span>
          <span class="nav-label">{{ $t('sidebar.message_logs') }}</span>
        </router-link>
        <router-link to="/billing" class="nav-item" active-class="active">
          <span class="nav-icon">💳</span>
          <span class="nav-label">{{ $t('sidebar.billing') }}</span>
        </router-link>
        <router-link to="/settings" class="nav-item" active-class="active">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">{{ $t('sidebar.settings') }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-details">
            <div class="user-name">{{ tenant?.name || 'Account' }}</div>
            <div class="user-plan">{{ tenant?.plan || 'FREE' }}</div>
          </div>
        </div>
        <button @click="toggleLang" class="lang-btn" title="Change Language">{{ currentLang === 'en' ? 'ع' : 'EN' }}</button>
        <button @click="logout" class="logout-btn" title="Logout">↩</button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="main-content" :class="{ 'full-width': !showSidebar }">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { setLanguage } from './i18n'

const router = useRouter()
const route = useRoute()
const { locale } = useI18n()
const currentLang = ref(locale.value)
const tenant = ref({})

const loadTenant = () => {
  try { tenant.value = JSON.parse(localStorage.getItem('tenant') || '{}') } catch { tenant.value = {} }
}
loadTenant()

const showSidebar = computed(() => !route.meta.guest && !route.meta.hideSidebar && route.path !== '/' && !!localStorage.getItem('token'))
const userInitial = computed(() => (tenant.value?.name || 'U')[0].toUpperCase())

const toggleLang = () => {
  const newLang = currentLang.value === 'en' ? 'ar' : 'en'
  currentLang.value = newLang
  setLanguage(newLang)
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('tenant')
  router.push('/login')
}

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data && res.data.data) {
        localStorage.setItem('tenant', JSON.stringify(res.data.data))
        loadTenant() // Update reactive state
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        logout()
      }
    }
  }
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');



body {
  font-family: 'Inter', system-ui, sans-serif;
  background: #F8FAFC;
  color: #1E293B;
  -webkit-font-smoothing: antialiased;
}

:root {
  --brand-primary: #FF6600;
  --brand-primary-dark: #cc5200;
  --brand-primary-glow: rgba(255, 102, 0, 0.2);
  --brand-dark: #1E293B;
  --brand-darker: #0F172A;
  --sidebar-width: 240px;
  --bg-main: #F8FAFC;
  --border: #E2E8F0;
  --text-muted: #64748B;
}
</style>

<style scoped>
.app-root {
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  background: var(--brand-darker);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  inset-inline-start: 0;
  z-index: 100;
  border-inline-end: 1px solid rgba(255,255,255,0.05);
}

.sidebar-logo {
  padding: 1.5rem 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  display: block;
  text-decoration: none;
}

.logo-img {
  height: 36px;
  filter: brightness(0) invert(1);
  opacity: 0.95;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}
.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
}

.nav-section-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: #64748B;
  padding: 0.75rem 0.875rem 0.25rem;
}

.nav-section-title.text-emerald-600 {
  color: #10B981;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.875rem;
  border-radius: 10px;
  color: #94A3B8;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(255,255,255,0.06);
  color: #E2E8F0;
}

.nav-item.active {
  background: var(--brand-primary);
  color: white;
  box-shadow: 0 4px 12px var(--brand-primary-glow);
}

.nav-icon { font-size: 1.1rem; width: 20px; text-align: center; }
.nav-label { font-size: 0.875rem; }

/* ── Sidebar Footer ── */
.sidebar-footer {
  padding: 1rem 0.75rem;
  border-top: 1px solid rgba(255,255,255,0.07);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 34px;
  height: 34px;
  background: var(--brand-primary);
  color: white;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.user-details { min-width: 0; }
.user-name {
  color: #E2E8F0;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-plan {
  color: #64748B;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lang-btn {
  background: rgba(255,255,255,0.07);
  border: none;
  color: #E2E8F0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.lang-btn:hover { background: rgba(255,255,255,0.15); }

.logout-btn {
  background: rgba(255,255,255,0.07);
  border: none;
  color: #64748B;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.logout-btn:hover { background: rgba(239,68,68,0.15); color: #ef4444; }

/* ── Main Content ── */
.main-content {
  margin-inline-start: var(--sidebar-width);
  flex: 1;
  padding: 2rem;
  min-height: 100vh;
}

.main-content.full-width {
  margin-inline-start: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
</style>
