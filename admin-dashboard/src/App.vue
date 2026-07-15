<template>
  <div class="app-root">
    <!-- Sidebar -->
    <aside v-if="isAuthenticated" class="sidebar">
      <div class="sidebar-logo">
        <img src="/logo.svg" alt="wakeel.." />
        <span class="admin-badge">Admin</span>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" exact-active-class="active">
          <span class="nav-icon">📊</span> {{ $t('sidebar.overview') }}
        </router-link>
        <router-link to="/tenants" class="nav-item" active-class="active">
          <span class="nav-icon">👥</span> {{ $t('sidebar.tenants') }}
        </router-link>
        <router-link to="/billing" class="nav-item" active-class="active">
          <span class="nav-icon">💰</span> {{ $t('sidebar.billing') }}
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="admin-info">
          <div class="admin-avatar">A</div>
          <div>
            <div class="admin-name">Administrator</div>
            <div class="admin-role">wakeel.. Admin</div>
          </div>
        </div>
        <button @click="toggleLang" class="lang-btn" title="Change Language">{{ currentLang === 'en' ? 'ع' : 'EN' }}</button>
        <button @click="logout" class="logout-btn" :title="$t('sidebar.logout')">↩</button>
      </div>
    </aside>

    <div class="main-content" :class="{ 'no-sidebar': !isAuthenticated }">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLanguage } from './i18n'

const router = useRouter()
const route = useRoute()
const { locale } = useI18n()
const currentLang = ref(locale.value)
const isAuthenticated = computed(() => !route.meta.guest && !!localStorage.getItem('admin_token'))

const toggleLang = () => {
  const newLang = currentLang.value === 'en' ? 'ar' : 'en'
  currentLang.value = newLang
  setLanguage(newLang)
}

const logout = () => {
  localStorage.removeItem('admin_token')
  router.push('/login')
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: #F1F5F9; color: #1E293B; -webkit-font-smoothing: antialiased; }
:root {
  --brand: #FF6600;
  --brand-dark: #cc5200;
  --brand-glow: rgba(255,102,0,0.18);
  --sidebar-bg: #0F172A;
  --sidebar-w: 240px;
}
a { text-decoration: none; color: inherit; }
</style>

<style scoped>
.app-root { display: flex; min-height: 100vh; }

.sidebar {
  width: var(--sidebar-w);
  background: var(--sidebar-bg);
  min-height: 100vh;
  position: fixed;
  top: 0; inset-inline-start: 0;
  display: flex; flex-direction: column;
  border-inline-end: 1px solid rgba(255,255,255,0.05);
}

.sidebar-logo {
  padding: 1.5rem 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; gap: 0.75rem;
}
.sidebar-logo img { height: 32px; filter: brightness(0) invert(1); }
.admin-badge {
  background: var(--brand);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sidebar-nav {
  flex: 1; padding: 1rem 0.75rem;
  display: flex; flex-direction: column; gap: 2px;
}
.nav-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.65rem 0.875rem; border-radius: 10px;
  color: #94A3B8; font-weight: 500; font-size: 0.875rem;
  transition: all 0.2s;
}
.nav-item:hover { background: rgba(255,255,255,0.06); color: #E2E8F0; }
.nav-item.active { background: var(--brand); color: white; box-shadow: 0 4px 12px var(--brand-glow); }
.nav-icon { width: 20px; text-align: center; }

.sidebar-footer {
  padding: 1rem 0.75rem;
  border-top: 1px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; gap: 0.75rem;
}
.admin-info { display: flex; align-items: center; gap: 0.625rem; flex: 1; }
.admin-avatar {
  width: 34px; height: 34px;
  background: var(--brand); color: white;
  border-radius: 9px; display: flex; align-items: center; justify-content: center;
  font-weight: 700;
}
.admin-name { color: #E2E8F0; font-size: 0.8rem; font-weight: 600; }
.admin-role { color: #64748B; font-size: 0.7rem; }
.lang-btn {
  background: rgba(255,255,255,0.07); border: none; color: #E2E8F0;
  width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.lang-btn:hover { background: rgba(255,255,255,0.15); }

.logout-btn {
  background: rgba(255,255,255,0.07); border: none; color: #64748B;
  width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 1rem;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.logout-btn:hover { background: rgba(239,68,68,0.15); color: #ef4444; }

.main-content { margin-inline-start: var(--sidebar-w); flex: 1; padding: 2rem; min-height: 100vh; }
.main-content.no-sidebar { margin-inline-start: 0; display: flex; align-items: center; justify-content: center; padding: 0; }
</style>
