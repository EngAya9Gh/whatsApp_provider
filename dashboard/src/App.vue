<template>
  <div class="app-root">
    <!-- Sidebar -->
    <aside v-if="showSidebar" class="sidebar">
      <!-- Logo -->
      <a href="/" target="_blank" class="sidebar-logo">
        <img src="/logo.svg" alt="wakeel" class="logo-img" />
      </a>

      <nav class="sidebar-nav">
        <!-- GENERAL -->
        <div class="nav-section-title">General</div>
        <router-link to="/dashboard" class="nav-item" exact-active-class="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span class="nav-label">{{ $t('sidebar.dashboard') }}</span>
        </router-link>
        <router-link v-if="!isSubUser || subUserPerms?.can_manage_settings" to="/connect" class="nav-item" active-class="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span class="nav-label">{{ $t('sidebar.connections') }}</span>
        </router-link>
        <router-link v-if="!isSubUser || subUserPerms?.can_view_live_chat" to="/live-chat" class="nav-item" active-class="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span class="nav-label">{{ $t('sidebar.live_chat') }}</span>
        </router-link>

        <!-- STANDARD (QR WEB) -->
        <template v-if="$hasFeature('BAILEYS_SEND_MESSAGE') || $hasFeature('SEND_MESSAGE') || $hasFeature('BAILEYS_CAMPAIGN') || $hasFeature('TEMPLATES') || $hasFeature('BAILEYS_AUTORESPONDER')">
          <div class="nav-section-title mt-4">{{ $t('sidebar.standard_mode') }}</div>
          <router-link v-if="($hasFeature('BAILEYS_SEND_MESSAGE') || $hasFeature('SEND_MESSAGE')) && (!isSubUser || subUserPerms?.can_send_message)" to="/send-message" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span class="nav-label">{{ $t('sidebar.send_message') }}</span>
          </router-link>
          <router-link v-if="$hasFeature('BAILEYS_CAMPAIGN') && (!isSubUser || subUserPerms?.can_view_campaigns)" to="/campaigns" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
            <span class="nav-label">{{ $t('sidebar.campaigns') }}</span>
          </router-link>
          <router-link v-if="$hasFeature('TEMPLATES') && (!isSubUser || subUserPerms?.can_view_templates)" to="/templates" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span class="nav-label">{{ $t('sidebar.templates') }}</span>
          </router-link>
          <router-link v-if="$hasFeature('BAILEYS_AUTORESPONDER') && (!isSubUser || subUserPerms?.can_view_chatbot)" to="/chatbot" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
            <span class="nav-label">{{ $t('sidebar.auto_responder') }}</span>
          </router-link>
        </template>

        <!-- META CLOUD -->
        <template v-if="$hasFeature('META_API') || $hasFeature('META_CAMPAIGN') || $hasFeature('META_AUTORESPONDER')">
          <div class="nav-section-title mt-4" style="color:#25D366">{{ $t('sidebar.meta_cloud') }}</div>
          <GlobalMetaSelector />
          <router-link v-if="$hasFeature('META_SEND_MESSAGE') && (!isSubUser || subUserPerms?.can_send_message)" to="/meta-send-message" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span class="nav-label">{{ $t('sidebar.meta_send_message') }}</span>
          </router-link>
          <router-link v-if="$hasFeature('META_TEMPLATES') && (!isSubUser || subUserPerms?.can_view_templates)" to="/meta-templates" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span class="nav-label">{{ $t('sidebar.meta_templates') }}</span>
          </router-link>
          <router-link v-if="$hasFeature('META_CAMPAIGN') && (!isSubUser || subUserPerms?.can_view_campaigns)" to="/meta-campaigns" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
            <span class="nav-label">{{ $t('sidebar.meta_campaigns') }}</span>
          </router-link>
          <router-link v-if="$hasFeature('META_AUTORESPONDER') && (!isSubUser || subUserPerms?.can_view_chatbot)" to="/meta-chatbot" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>
            <span class="nav-label">{{ $t('sidebar.meta_chatbot') }}</span>
          </router-link>
          <router-link v-if="!isSubUser || subUserPerms?.can_view_chatbot" to="/meta-flows" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span class="nav-label">{{ $t('sidebar.meta_flows') }}</span>
          </router-link>
          <router-link v-if="!isSubUser || subUserPerms?.can_manage_settings" to="/meta-business-profile" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span class="nav-label">{{ $t('sidebar.meta_business_profile') }}</span>
          </router-link>
        </template>

        <!-- SYSTEM -->
        <div class="nav-section-title mt-4">{{ $t('sidebar.system') }}</div>
        <router-link v-if="!isSubUser || subUserPerms?.can_view_api_keys" to="/keys" class="nav-item" active-class="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          <span class="nav-label">{{ $t('sidebar.api_keys') }}</span>
        </router-link>
        <router-link v-if="!isSubUser || subUserPerms?.can_view_logs" to="/logs" class="nav-item" active-class="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span class="nav-label">{{ $t('sidebar.message_logs') }}</span>
        </router-link>
        <router-link v-if="!isSubUser || subUserPerms?.can_view_billing" to="/billing" class="nav-item" active-class="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <span class="nav-label">{{ $t('sidebar.billing') }}</span>
        </router-link>
        <router-link v-if="!isSubUser || subUserPerms?.can_manage_settings" to="/settings" class="nav-item" active-class="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span class="nav-label">{{ $t('sidebar.settings') }}</span>
        </router-link>
        <router-link v-if="!isSubUser" to="/developer" class="nav-item" active-class="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span class="nav-label">{{ $t('sidebar.developer_tools') }}</span>
        </router-link>
        <!-- إدارة المستخدمين -->
        <router-link v-if="!isSubUser || subUserPerms?.can_manage_sub_users" to="/sub-users" class="nav-item" active-class="active">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span class="nav-label">{{ locale === 'ar' ? 'إدارة المستخدمين' : 'Team Members' }}</span>
        </router-link>
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar" :class="isSubUser ? 'avatar-sub' : ''">
            {{ userInitial }}
          </div>
          <div class="user-details">
            <div class="user-name">{{ displayName }}</div>
            <div v-if="isSubUser" class="user-plan-badge badge-sub">{{ subUserRole }}</div>
            <div v-else class="user-plan-badge" :class="planClass">{{ tenant?.plan || 'FREE' }}</div>
          </div>
        </div>
        <button @click="toggleLang" class="lang-btn" title="Change Language">{{ currentLang === 'en' ? 'ع' : 'EN' }}</button>
        <button @click="logout" class="logout-btn" title="Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
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
import GlobalMetaSelector from './components/GlobalMetaSelector.vue'

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

// ── Sub-user awareness ────────────────────────────────────
const isSubUser   = computed(() => !!tenant.value?.isSubUser)
const subUserPerms = computed(() => tenant.value?.subUser?.permissions || null)
const subUserRole  = computed(() => {
  const r = tenant.value?.subUser?.role
  return r === 'ADMIN' ? 'Admin' : r === 'MANAGER' ? 'Manager' : r === 'AGENT' ? 'Agent' : r || ''
})
const displayName = computed(() => {
  if (isSubUser.value) return tenant.value?.subUser?.name || tenant.value?.name || 'User'
  return tenant.value?.name || 'Account'
})
// ─────────────────────────────────────────────────────────

const userInitial = computed(() => (displayName.value || 'U')[0].toUpperCase())

const planClass = computed(() => {
  const plan = tenant.value?.plan || 'FREE'
  if (plan === 'ENTERPRISE') return 'badge-enterprise'
  if (plan === 'PRO') return 'badge-pro'
  if (plan === 'ADVANCED') return 'badge-advanced'
  if (plan === 'STARTER') return 'badge-starter'
  return 'badge-free'
})

const toggleLang = () => {
  const newLang = currentLang.value === 'en' ? 'ar' : 'en'
  currentLang.value = newLang
  setLanguage(newLang)
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('tenant')
  window.location.href = '/login'
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
        loadTenant()
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
  height: 100vh;
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
  min-height: 0; /* Ensures flex container can shrink and trigger scroll */
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

.nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.nav-item:hover .nav-icon,
.nav-item.active .nav-icon {
  opacity: 1;
}
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
.user-plan-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 2px;
}
.badge-free    { background: rgba(100,116,139,0.2); color: #94A3B8; }
.badge-starter { background: rgba(59,130,246,0.2); color: #60A5FA; }
.badge-advanced{ background: rgba(168,85,247,0.2); color: #C084FC; }
.badge-pro     { background: rgba(251,191,36,0.2); color: #FCD34D; }
.badge-enterprise { background: rgba(255,102,0,0.2); color: #FF6600; }
.badge-sub     { background: rgba(16,185,129,0.2); color: #34D399; }
.avatar-sub    { background: linear-gradient(135deg, #10B981, #059669) !important; }

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
