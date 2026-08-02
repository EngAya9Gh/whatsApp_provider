<template>
  <div class="settings-root" :class="{ 'rtl': isAr }">
    
    <!-- ══ Hero Header ══ -->
    <div class="hero-header">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div>
            <h1 class="hero-title">{{ isAr ? 'الإعدادات وبيانات المنشأة' : 'Settings & Business Info' }}</h1>
            <p class="hero-sub">{{ isAr ? 'قم بإدارة بيانات منشأتك الضريبية والتي ستظهر في الفواتير الصادرة' : 'Manage your business details and official tax information' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Main Content ══ -->
    <div class="page-content">
      <div class="settings-layout">
        
        <!-- Sidebar Navigation -->
        <div class="settings-sidebar">
          <div class="nav-group">
            <div class="nav-group-title">{{ isAr ? 'عام' : 'General' }}</div>
            <button class="nav-item active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>{{ isAr ? 'بيانات المنشأة' : 'Business Details' }}</span>
            </button>
            <button class="nav-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>{{ isAr ? 'الأمان' : 'Security' }}</span>
            </button>
          </div>
        </div>

        <!-- Form Area -->
        <div class="settings-card">
          <div class="card-header">
            <div>
              <h3 class="card-title">{{ isAr ? 'المعلومات الضريبية' : 'Tax Information' }}</h3>
              <p class="card-desc">{{ isAr ? 'تستخدم هذه البيانات لإصدار الفواتير الضريبية الرسمية لخدماتك على المنصة' : 'These details will appear on your official tax invoices' }}</p>
            </div>
            <div class="header-icon-bg">🏢</div>
          </div>

          <form @submit.prevent="saveCompanyDetails" class="form-grid">
            <div class="form-group full-width">
              <label>{{ isAr ? 'اسم المنشأة / الشركة' : 'Company Name' }}</label>
              <div class="input-wrap">
                <input type="text" v-model="form.companyName" :placeholder="isAr ? 'مثال: شركة وكيـل' : 'e.g. Wakeel Trading Co.'" required class="input-std" />
              </div>
            </div>

            <div class="form-group">
              <label>{{ isAr ? 'الرقم الضريبي' : 'VAT Number' }}</label>
              <div class="input-wrap">
                <input type="text" v-model="form.vatNumber" :placeholder="isAr ? 'مثال: 310003200400003' : 'e.g. 310003200400003'" class="input-std" />
              </div>
            </div>

            <div class="form-group">
              <label>{{ isAr ? 'رقم السجل التجاري' : 'CRN' }}</label>
              <div class="input-wrap">
                <input type="text" v-model="form.crn" :placeholder="isAr ? 'مثال: 1010435662' : 'e.g. 1010435662'" class="input-std" />
              </div>
            </div>

            <div class="form-divider full-width">
              <span>{{ isAr ? 'العنوان الوطني' : 'National Address' }}</span>
            </div>

            <div class="form-group">
              <label>{{ isAr ? 'الشارع' : 'Street Address' }}</label>
              <input type="text" v-model="form.street" :placeholder="isAr ? 'مثال: طريق الإمام سعود بن عبدالعزيز' : 'e.g. King Fahd Road'" class="input-std" />
            </div>

            <div class="form-group">
              <label>{{ isAr ? 'الحي' : 'District' }}</label>
              <input type="text" v-model="form.district" :placeholder="isAr ? 'مثال: النخيل' : 'e.g. Olaya'" class="input-std" />
            </div>

            <div class="form-group">
              <label>{{ isAr ? 'المدينة' : 'City' }}</label>
              <input type="text" v-model="form.city" :placeholder="isAr ? 'مثال: الرياض' : 'e.g. Riyadh'" class="input-std" />
            </div>

            <div class="form-group">
              <label>{{ isAr ? 'البلد' : 'Country' }}</label>
              <input type="text" v-model="form.country" :placeholder="isAr ? 'مثال: المملكة العربية السعودية' : 'e.g. Saudi Arabia'" class="input-std" />
            </div>

            <div class="form-group">
              <label>{{ isAr ? 'رقم المبنى' : 'Building No' }}</label>
              <input type="text" v-model="form.buildingNo" :placeholder="isAr ? 'مثال: 5262' : 'e.g. 5262'" class="input-std" />
            </div>

            <div class="form-group">
              <label>{{ isAr ? 'الرمز البريدي' : 'Postal Code' }}</label>
              <input type="text" v-model="form.postalCode" :placeholder="isAr ? 'مثال: 12381' : 'e.g. 12381'" class="input-std" />
            </div>

            <div class="form-actions full-width">
              <button type="submit" class="btn-save" :disabled="loadingTax">
                <span v-if="loadingTax" class="spinner-sm"></span>
                {{ loadingTax ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save Changes') }}
              </button>
              <transition name="fade">
                <span v-if="savedTax" class="success-msg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ isAr ? 'تم حفظ البيانات بنجاح!' : 'Saved successfully!' }}
                </span>
              </transition>
            </div>
          </form>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

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
    form.value.companyName = data.companyName || data.name || ''
    
    const details = data.customFeatures?.companyDetails || {}
    Object.assign(form.value, {
      vatNumber: details.vatNumber || '',
      crn: details.crn || '',
      street: details.street || '',
      district: details.district || '',
      city: details.city || '',
      country: details.country || '',
      buildingNo: details.buildingNo || '',
      postalCode: details.postalCode || ''
    })
    
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

onMounted(fetchProfile)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.settings-root {
  min-height: 100vh;
  background: #F0F2F7;
  font-family: 'Inter', sans-serif;
  padding-bottom: 4rem;
}
.settings-root.rtl {
  direction: rtl;
  font-family: 'Tajawal', system-ui, sans-serif;
}

/* ═══ HERO ═══ */
.hero-header {
  background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%);
  padding: 3rem 2.5rem;
  position: relative; overflow: hidden;
}
.hero-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 50% 80% at 90% 50%, rgba(255,102,0,0.15) 0%, transparent 60%);
  pointer-events: none;
}
.hero-content {
  display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
  position: relative; z-index: 1; flex-wrap: wrap;
}
.hero-left { display: flex; align-items: center; gap: 1.25rem; }
.hero-icon-wrap {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #FF6600, #E55A00);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(255,102,0,0.3);
}
.hero-title { font-size: 2rem; font-weight: 900; color: #fff; margin: 0 0 0.3rem; letter-spacing: -0.03em; }
.hero-sub { font-size: 0.95rem; color: #94A3B8; margin: 0; font-weight: 500; }


/* ═══ MAIN ═══ */
.page-content { padding: 2.5rem; margin-top: -2.5rem; position: relative; z-index: 10; }
.settings-layout {
  display: flex; gap: 2rem; align-items: flex-start;
  max-width: 1100px; margin: 0 auto;
}
@media (max-width: 800px) {
  .settings-layout { flex-direction: column; }
  .settings-sidebar { width: 100%; }
}

/* Sidebar */
.settings-sidebar {
  width: 240px; flex-shrink: 0;
}
.nav-group { display: flex; flex-direction: column; gap: 0.25rem; }
.nav-group-title { font-size: 0.75rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; padding: 0 0.5rem; }
.nav-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.85rem 1rem; border: none; background: transparent;
  border-radius: 12px; cursor: pointer; transition: all 0.2s;
  color: #64748B; font-weight: 700; font-size: 0.9rem; font-family: inherit;
  text-align: left;
}
.rtl .nav-item { text-align: right; }
.nav-item:hover { background: rgba(255,255,255,0.6); color: #0F172A; }
.nav-item.active { background: white; color: #FF6600; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }


/* Card */
.settings-card {
  flex: 1; background: white; border-radius: 20px;
  border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  padding: 2.5rem;
}
.card-header {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #F1F5F9;
}
.card-title { font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem; }
.card-desc { font-size: 0.9rem; color: #64748B; margin: 0; font-weight: 500; }
.header-icon-bg { font-size: 2.5rem; opacity: 0.1; user-select: none; }


/* Form */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.full-width { grid-column: 1 / -1; }

.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.85rem; font-weight: 700; color: #334155; }
.input-std {
  width: 100%; padding: 0.8rem 1rem; border: 1.5px solid #CBD5E1;
  border-radius: 12px; font-size: 0.9rem; font-family: inherit;
  color: #0F172A; background: white; outline: none; transition: all 0.2s; box-sizing: border-box;
}
.input-std:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }

.form-divider {
  margin: 1.5rem 0 0.5rem; padding-bottom: 0.5rem;
  border-bottom: 1px solid #F1F5F9;
  font-size: 0.9rem; font-weight: 800; color: #0F172A;
}

.form-actions {
  display: flex; align-items: center; gap: 1.25rem;
  margin-top: 1rem; padding-top: 1.5rem; border-top: 1px solid #F1F5F9;
}

.btn-save {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #FF6600, #E55A00); color: white;
  padding: 0.85rem 2rem; border: none; border-radius: 12px;
  font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: all 0.25s;
  box-shadow: 0 4px 12px rgba(255,102,0,0.25); font-family: inherit;
}
.btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(255,102,0,0.3); }
.btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

.success-msg { display: flex; align-items: center; gap: 6px; color: #10B981; font-weight: 700; font-size: 0.9rem; }
.spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
