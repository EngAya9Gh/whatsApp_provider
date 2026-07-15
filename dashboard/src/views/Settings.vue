<template>
  <div class="settings-container">
    <h2>Settings & Webhooks</h2>
    
    <div class="settings-card">
      <h3>Webhook URL</h3>
      <p class="description">Configure a webhook URL to receive real-time notifications about your WhatsApp connection status and incoming messages (if enabled in your plan).</p>
      
      <form @submit.prevent="saveWebhook">
        <div class="form-group">
          <label>Endpoint URL</label>
          <input type="url" v-model="webhookUrl" placeholder="https://your-domain.com/webhook" />
        </div>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Saving...' : 'Save Settings' }}
        </button>
        <span v-if="saved" class="success-text">Settings saved successfully!</span>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
// Note: Backend endpoint for updating webhook would be needed. 
// For now, this is a UI placeholder that saves to local state/storage.
const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
const webhookUrl = ref(tenant.webhookUrl || '')
const loading = ref(false)
const saved = ref(false)

const saveWebhook = () => {
  loading.value = true
  setTimeout(() => {
    tenant.webhookUrl = webhookUrl.value
    localStorage.setItem('tenant', JSON.stringify(tenant))
    loading.value = false
    saved.value = true
    setTimeout(() => saved.value = false, 3000)
  }, 1000)
}
</script>

<style scoped>
.settings-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 1.5rem; max-width: 600px; }
h3 { margin-top: 0; color: #111827; }
.description { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; line-height: 1.5; }
.form-group { margin-bottom: 1.5rem; }
label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
input { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; box-sizing: border-box; }
.btn-primary { background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.success-text { color: #10b981; margin-left: 1rem; font-size: 0.875rem; }
</style>
