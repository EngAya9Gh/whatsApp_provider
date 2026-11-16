import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Overview from '../views/Overview.vue'
import Tenants from '../views/Tenants.vue'
import TenantDetail from '../views/TenantDetail.vue'
import BillingAdmin from '../views/BillingAdmin.vue'
import PlansAdmin from '../views/PlansAdmin.vue'
import Settings from '../views/Settings.vue'
import SystemHealth from '../views/SystemHealth.vue'
import AiUsage from '../views/AiUsage.vue'

const routes = [
  { path: '/login', component: Login, meta: { guest: true } },
  { path: '/', component: Overview, meta: { requiresAuth: true } },
  { path: '/tenants', component: Tenants, meta: { requiresAuth: true } },
  { path: '/tenants/:id', component: TenantDetail, meta: { requiresAuth: true } },
  { path: '/billing', component: BillingAdmin, meta: { requiresAuth: true } },
  { path: '/plans', component: PlansAdmin, meta: { requiresAuth: true } },
  { path: '/settings', component: Settings, meta: { requiresAuth: true } },
  { path: '/system', component: SystemHealth, meta: { requiresAuth: true } },
  { path: '/ai-usage', component: AiUsage, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.meta.requiresAuth && !token) return next('/login')
  if (to.meta.guest && token) return next('/')
  next()
})

export default router
