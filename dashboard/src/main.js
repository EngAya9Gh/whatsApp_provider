import { createApp } from 'vue'
import './tailwind.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import axios from 'axios'

// Global error tracking for debugging
window.onerror = function (msg, url, lineNo, columnNo, error) {
  fetch('http://localhost:8888/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'window.onerror', msg, url, lineNo, columnNo, stack: error?.stack })
  }).catch(e => {})
  return false;
};

// Global request interceptor to include Authorization header
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global interceptor for expired tokens
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const authHeader = error.config?.headers?.Authorization || '';
      if (!authHeader.startsWith('Bearer sk_')) {
        localStorage.removeItem('token')
        router.push('/login')
      }
    }
    return Promise.reject(error)
  }
)

const app = createApp(App)
app.use(router)
app.use(i18n)

app.config.errorHandler = (err, instance, info) => {
  fetch('http://localhost:8888/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'vue.errorHandler', msg: err.message, info, stack: err.stack })
  }).catch(e => {})
}

app.config.globalProperties.$hasFeature = (feature) => {
  try {
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    if (!tenant.allowedFeatures) return true; // Fallback if old session
    return tenant.allowedFeatures.includes(feature);
  } catch (e) {
    return false;
  }
}

app.mount('#app')
