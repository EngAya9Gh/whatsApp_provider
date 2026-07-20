import { createApp } from 'vue'
import './tailwind.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import axios from 'axios'

// Global interceptor for expired tokens
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

const app = createApp(App)
app.use(router)
app.use(i18n)
app.mount('#app')
