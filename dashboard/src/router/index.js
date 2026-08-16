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
import SubUsers from '../views/SubUsers.vue'
import Contacts from '../views/Contacts.vue'

import Landing from '../views/Landing.vue'
import InvoiceView from '../views/InvoiceView.vue'
import LiveChat from '../views/LiveChat.vue'
import PrivacyPolicy from '../views/PrivacyPolicy.vue'
import TermsOfService from '../views/TermsOfService.vue'

import MessageSend from '../views/MessageSend.vue'
import Templates from '../views/Templates.vue'
import Campaigns from '../views/Campaigns.vue'
import CampaignDetails from '../views/CampaignDetails.vue'

import MetaTemplates from '../views/MetaTemplates.vue'
import MetaCampaigns from '../views/MetaCampaigns.vue'
import MetaAutoReply from '../views/MetaAutoReply.vue'
import MetaSendMessage from '../views/MetaSendMessage.vue'
import MetaChatbot from '../views/MetaChatbot.vue'
import MetaBusinessProfile from '../views/MetaBusinessProfile.vue'
import MetaFlows from '../views/MetaFlows.vue'

const routes = [
  { path: '/login', component: Login, meta: { guest: true } },
  { path: '/register', component: Register, meta: { guest: true } },
  { path: '/', component: Landing },
  { path: '/privacy', component: PrivacyPolicy, meta: { hideSidebar: true } },
  { path: '/terms', component: TermsOfService, meta: { hideSidebar: true } },
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
  { path: '/developer', component: () => import('../views/DeveloperTools.vue'), meta: { requiresAuth: true } },
  { path: '/sub-users', component: SubUsers, meta: { requiresAuth: true } },
  { path: '/contacts', component: Contacts, meta: { requiresAuth: true } },

  // Meta Cloud Routes
  { path: '/meta-send-message', component: MetaSendMessage, meta: { requiresAuth: true } },
  { path: '/meta-templates', component: MetaTemplates, meta: { requiresAuth: true } },
  { path: '/meta-campaigns', component: MetaCampaigns, meta: { requiresAuth: true } },
  { path: '/meta-chatbot', component: MetaChatbot, meta: { requiresAuth: true } },
  { path: '/meta-autoreply', component: MetaAutoReply, meta: { requiresAuth: true } },
  { path: '/meta-business-profile', component: MetaBusinessProfile, meta: { requiresAuth: true } },
  { path: '/meta-flows', component: MetaFlows, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  let tenant = null
  try {
    tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
  } catch (e) {}
  
  if (to.meta.requiresAuth && !token) {
    return next('/login')
  } 
  
  if (to.meta.guest && token) {
    return next('/dashboard')
  } 

  // --- Sub-User Permissions Guard ---
  if (to.meta.requiresAuth && tenant && tenant.isSubUser) {
    const perms = tenant.subUser?.permissions || {}
    
    // Map paths to their required permissions
    const routePermMap = {
      '/sub-users': perms.can_manage_sub_users,
      '/keys': perms.can_view_api_keys,
      '/developer': perms.can_view_api_keys,
      '/logs': perms.can_view_logs,
      '/billing': perms.can_view_billing,
      '/settings': perms.can_manage_settings,
      '/connect': perms.can_manage_settings,
      '/live-chat': perms.can_view_live_chat,
      '/contacts': perms.can_manage_contacts,
      
      '/send-message': perms.can_send_message,
      '/campaigns': perms.can_view_campaigns,
      '/templates': perms.can_view_templates,
      '/chatbot': perms.can_view_chatbot,
      
      '/meta-send-message': perms.can_send_message,
      '/meta-templates': perms.can_view_templates,
      '/meta-campaigns': perms.can_view_campaigns,
      '/meta-chatbot': perms.can_view_chatbot,
      '/meta-autoreply': perms.can_view_chatbot,
      '/meta-flows': perms.can_view_chatbot,
      '/meta-business-profile': perms.can_manage_settings,
    }

    const basePath = '/' + to.path.split('/')[1]
    
    // If the permission evaluates strictly to false, block access
    if (routePermMap[to.path] === false || routePermMap[basePath] === false) {
      return next('/dashboard') // Redirect to dashboard if not allowed
    }
  }

  next()
})

export default router
