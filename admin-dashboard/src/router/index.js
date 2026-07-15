import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Overview from '../views/Overview.vue'
import Tenants from '../views/Tenants.vue'
import TenantDetail from '../views/TenantDetail.vue'
import BillingAdmin from '../views/BillingAdmin.vue'

const routes = [
  { path: '/login', component: Login, meta: { guest: true } },
  { path: '/', component: Overview, meta: { requiresAuth: true } },
  { path: '/tenants', component: Tenants, meta: { requiresAuth: true } },
  { path: '/tenants/:id', component: TenantDetail, meta: { requiresAuth: true } },
  { path: '/billing', component: BillingAdmin, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.meta.requiresAuth && !token) return next('/login')
  if (to.meta.guest && token) return next('/')
  next()
})

export default router
