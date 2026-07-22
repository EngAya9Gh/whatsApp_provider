<template>
  <div class="settings-container" :class="{ 'rtl-mode': isAr }">
    <div class="page-title">
      <h2>{{ isAr ? 'الإعدادات وبيانات المنشأة' : 'Settings & Business Info' }}</h2>
      <p class="subtitle">{{ isAr ? 'قم بإدارة بيانات منشأتك الضريبية والتي ستظهر في الفواتير الصادرة' : 'Manage your business details and Webhook URL' }}</p>
    </div>

    <!-- Business & Tax Details Card -->
    <div class="settings-card">
      <div class="card-header">
        <div class="header-icon">🏢</div>
        <div>
          <h3>{{ isAr ? 'بيانات المنشأة والضريبة' : 'Business & Tax Details' }}</h3>
          <p class="description">{{ isAr ? 'تستخدم هذه البيانات لإصدار الفواتير الضريبية الرسمية لخدماتك على المنصة' : 'These details will appear on your official tax invoices' }}</p>
        </div>
      </div>

      <form @submit.prevent="saveCompanyDetails" class="form-grid">
        <div class="form-group full-width">
          <label>{{ isAr ? 'اسم المنشأة / الشركة' : 'Company Name' }}</label>
          <input type="text" v-model="form.companyName" :placeholder="isAr ? 'مثال: شركة وكيـل' : 'e.g. Wakeel Trading Co.'" required />
        </div>

        <div class="form-group">
          <label>{{ isAr ? 'الرقم الضريبي' : 'VAT Number' }}</label>
          <input type="text" v-model="form.vatNumber" :placeholder="isAr ? 'مثال: 310003200400003' : 'e.g. 310003200400003'" />
        </div>

        <div class="form-group">
          <label>{{ isAr ? 'رقم السجل التجاري' : 'CRN' }}</label>
          <input type="text" v-model="form.crn" :placeholder="isAr ? 'مثال: 1010435662' : 'e.g. 1010435662'" />
        </div>

        <div class="form-group">
          <label>{{ isAr ? 'الشارع' : 'Street Address' }}</label>
          <input type="text" v-model="form.street" :placeholder="isAr ? 'مثال: طريق الإمام سعود بن عبدالعزيز' : 'e.g. King Fahd Road'" />
        </div>

        <div class="form-group">
          <label>{{ isAr ? 'الحي' : 'District' }}</label>
          <input type="text" v-model="form.district" :placeholder="isAr ? 'مثال: النخيل' : 'e.g. Olaya'" />
        </div>

        <div class="form-group">
          <label>{{ isAr ? 'المدينة' : 'City' }}</label>
          <input type="text" v-model="form.city" :placeholder="isAr ? 'مثال: الرياض' : 'e.g. Riyadh'" />
        </div>

        <div class="form-group">
          <label>{{ isAr ? 'البلد' : 'Country' }}</label>
          <input type="text" v-model="form.country" :placeholder="isAr ? 'مثال: المملكة العربية السعودية' : 'e.g. Saudi Arabia'" />
        </div>

        <div class="form-group">
          <label>{{ isAr ? 'رقم المبنى' : 'Building No' }}</label>
          <input type="text" v-model="form.buildingNo" :placeholder="isAr ? 'مثال: 5262' : 'e.g. 5262'" />
        </div>

        <div class="form-group">
          <label>{{ isAr ? 'الرمز البريدي' : 'Postal Code' }}</label>
          <input type="text" v-model="form.postalCode" :placeholder="isAr ? 'مثال: 12381' : 'e.g. 12381'" />
        </div>

        <div class="form-actions full-width">
          <button type="submit" class="btn-primary" :disabled="loadingTax">
            {{ loadingTax ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ البيانات' : 'Save Details') }}
          </button>
          <span v-if="savedTax" class="success-text">✓ {{ isAr ? 'تم الحفظ بنجاح!' : 'Saved successfully!' }}</span>
        </div>
      </form>
    </div>

    <!-- Webhook URL Card -->
    <div class="settings-card">
      <div class="card-header">
        <div class="header-icon">🔗</div>
        <div>
          <h3>{{ isAr ? 'رابط الـ Webhook' : 'Webhook URL' }}</h3>
          <p class="description">{{ isAr ? 'إعداد رابط Webhook لاستلام الإشعارات' : 'Receive real-time notifications for incoming messages' }}</p>
        </div>
      </div>

      <form @submit.prevent="saveWebhook">
        <div class="form-group full-width">
          <label>Endpoint URL</label>
          <input type="url" v-model="webhookUrl" placeholder="https://your-domain.com/webhook" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="loadingWebhook">
            {{ loadingWebhook ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الـ Webhook' : 'Save Webhook') }}
          </button>
          <span v-if="savedWebhook" class="success-text">✓ {{ isAr ? 'تم الحفظ بنجاح!' : 'Saved successfully!' }}</span>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const webhookUrl = ref('')
const loadingWebhook = ref(false)
const savedWebhook = ref(false)

const loadingTax = ref(false)
const savedTax = ref(false)

const form = ref({
  companyName: '',
  vatNumber: '',
  crn: '',
  street: '',
  district: '',
  city: '',
  country: '',
  buildingNo: '',
  postalCode: ''
})

const fetchProfile = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return
    
    const res = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const data = res.data.data
    webhookUrl.value = data.webhookUrl || ''
    form.value.companyName = data.companyName || data.name || ''
    
    const details = data.customFeatures?.companyDetails || {}
    form.value.vatNumber = details.vatNumber || ''
    form.value.crn = details.crn || ''
    form.value.street = details.street || ''
    form.value.district = details.district || ''
    form.value.city = details.city || ''
    form.value.country = details.country || ''
    form.value.buildingNo = details.buildingNo || ''
    form.value.postalCode = details.postalCode || ''
    
  } catch (err) {
    console.error('Error loading settings:', err)
  }
}

const saveCompanyDetails = async () => {
  loadingTax.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.put('/api/auth/profile', form.value, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // Update local storage tenant cache
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
    tenant.companyName = form.value.companyName
    if (!tenant.customFeatures) tenant.customFeatures = {}
    tenant.customFeatures.companyDetails = { ...form.value }
    localStorage.setItem('tenant', JSON.stringify(tenant))
    
    savedTax.value = true
    setTimeout(() => savedTax.value = false, 3500)
  } catch (err) {
    console.error('Error saving tax details:', err)
    alert('حدث خطأ أثناء حفظ البيانات الضريبية.')
  } finally {
    loadingTax.value = false
  }
}

const saveWebhook = () => {
  loadingWebhook.value = true
  setTimeout(() => {
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
    tenant.webhookUrl = webhookUrl.value
    localStorage.setItem('tenant', JSON.stringify(tenant))
    loadingWebhook.value = false
    savedWebhook.value = true
    setTimeout(() => savedWebhook.value = false, 3000)
  }, 500)
}

onMounted(fetchProfile)
</script>

<style scoped>
.settings-container {
  max-width: 850px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
/* Removed hardcoded font-family and direction: rtl; so it inherits from body[dir] */

.settings-container.rtl-mode {
  direction: rtl;
  text-align: right;
  font-family: 'Tajawal', system-ui, sans-serif;
}

.page-title h2 {
  font-size: 1.6rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 0.4rem 0;
}
.subtitle {
  color: #6B7280;
  font-size: 0.95rem;
  margin: 0 0 2rem 0;
}

.settings-card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid #E5E7EB;
  margin-bottom: 2rem;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #F3F4F6;
  padding-bottom: 1rem;
}

.header-icon {
  font-size: 2rem;
  background: #FFF7ED;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #111827;
}

.description {
  color: #6B7280;
  font-size: 0.85rem;
  margin: 0.25rem 0 0 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.full-width {
  grid-column: span 2;
}

label {
  font-size: 0.88rem;
  font-weight: 700;
  color: #374151;
}

input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 0.92rem;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

input:focus {
  border-color: #FF6600;
  box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn-primary {
  background: #FF6600;
  color: white;
  padding: 0.75rem 1.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 800;
  font-size: 0.95rem;
  transition: background 0.2s;
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.25);
}

.btn-primary:hover {
  background: #E65C00;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-text {
  color: #059669;
  font-weight: 700;
  font-size: 0.9rem;
}
</style>
