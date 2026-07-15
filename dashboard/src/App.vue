<template>
  <div class="app-container">
    <nav v-if="isAuthenticated" class="navbar">
      <div class="logo">WhatsApp OTP SaaS</div>
      <div class="nav-links">
        <router-link to="/">Dashboard</router-link>
        <router-link to="/connect">WhatsApp</router-link>
        <router-link to="/keys">API Keys</router-link>
        <router-link to="/logs">Logs</router-link>
        <router-link to="/billing">Billing</router-link>
        <router-link to="/settings">Settings</router-link>
        <button @click="logout" class="btn-logout">Logout</button>
      </div>
    </nav>
    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const token = ref(localStorage.getItem('token'))

const isAuthenticated = computed(() => !!token.value)

const logout = () => {
  localStorage.removeItem('token')
  token.value = null
  router.push('/login')
}
</script>

<style>
.app-container { min-height: 100vh; display: flex; flex-direction: column; }
.navbar { background: #1f2937; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
.nav-links a { color: #d1d5db; text-decoration: none; margin-right: 1.5rem; }
.nav-links a:hover, .nav-links a.router-link-active { color: white; }
.btn-logout { background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
.main-content { padding: 2rem; flex: 1; }
</style>
