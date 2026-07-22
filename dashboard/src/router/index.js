import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import Connect from '../views/Connect.vue'
import ApiKeys from '../views/ApiKeys.vue'
import Logs from '../views/Logs.vue'
import Billing from '../views/Billing.vue'
import Settings from '../views/Settings.vue'
import Chatbot from '../views/Chatbot.vue'

import Landing from '../views/Landing.vue'
import InvoiceView from '../views/InvoiceView.vue'
import LiveChat from '../views/LiveChat.vue'

import MessageSend from '../views/MessageSend.vue'
import Templates from '../views/Templates.vue'
import Campaigns from '../views/Campaigns.vue'
import CampaignDetails from '../views/CampaignDetails.vue'

import MetaTemplates from '../views/MetaTemplates.vue'
import MetaCampaigns from '../views/MetaCampaigns.vue'
import MetaAutoReply from '../views/MetaAutoReply.vue'
import MetaSendMessage from '../views/MetaSendMessage.vue'

const routes = [
  { path: '/login', component: Login, meta: { guest: true } },
  { path: '/register', component: Register, meta: { guest: true } },
  { path: '/', component: Landing },
  { path: '/invoice/:id', component: InvoiceView, meta: { hideSidebar: true } },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/connect', component: Connect, meta: { requiresAuth: true } },
  { path: '/live-chat', component: LiveChat, meta: { requiresAuth: true } },
  { path: '/send-message', component: MessageSend, meta: { requiresAuth: true } },
  { path: '/chatbot', component: Chatbot, meta: { requiresAuth: true } },
  { path: '/templates', component: Templates, meta: { requiresAuth: true } },
  { path: '/campaigns', component: Campaigns, meta: { requiresAuth: true } },
  { path: '/campaigns/:id', component: CampaignDetails, meta: { requiresAuth: true } },
  { path: '/keys', component: ApiKeys, meta: { requiresAuth: true } },
  { path: '/logs', component: Logs, meta: { requiresAuth: true } },
  { path: '/billing', component: Billing, meta: { requiresAuth: true } },
  { path: '/settings', component: Settings, meta: { requiresAuth: true } },

  // Meta Cloud Routes
  { path: '/meta-send-message', component: MetaSendMessage, meta: { requiresAuth: true } },
  { path: '/meta-templates', component: MetaTemplates, meta: { requiresAuth: true } },
  { path: '/meta-campaigns', component: MetaCampaigns, meta: { requiresAuth: true } },
  { path: '/meta-autoreply', component: MetaAutoReply, meta: { requiresAuth: true } },
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
