import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import Connect from '../views/Connect.vue'
import ApiKeys from '../views/ApiKeys.vue'
import Logs from '../views/Logs.vue'
import Billing from '../views/Billing.vue'
import Settings from '../views/Settings.vue'

import Landing from '../views/Landing.vue'

const routes = [
  { path: '/login', component: Login, meta: { guest: true } },
  { path: '/register', component: Register, meta: { guest: true } },
  { path: '/', component: Landing },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/connect', component: Connect, meta: { requiresAuth: true } },
  { path: '/keys', component: ApiKeys, meta: { requiresAuth: true } },
  { path: '/logs', component: Logs, meta: { requiresAuth: true } },
  { path: '/billing', component: Billing, meta: { requiresAuth: true } },
  { path: '/settings', component: Settings, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.guest && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
