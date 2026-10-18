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
            <h1 class="hero-title">{{ isAr ? 'إعدادات المنصة' : 'Platform Settings' }}</h1>
            <p class="hero-sub">{{ isAr ? 'إدارة بيانات المنشأة الضريبية، إعدادات التذاكر والدعم، والذكاء الاصطناعي' : 'Manage your business details, ticket & support settings, and AI configuration' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Main Content ══ -->
    <div class="page-content">
      <div class="settings-container">
        
        <!-- ══ Navigation Tabs Bar ══ -->
        <div class="settings-tabs-wrapper">
          <div class="settings-tabs-bar">
            <button 
              type="button"
              class="tab-btn" 
              :class="{ active: currentTab === 'business' }"
              @click="currentTab = 'business'"
            >
              <span class="tab-icon">🏢</span>
              <span class="tab-title">{{ isAr ? 'بيانات المنشأة والضريبة' : 'Business & Tax' }}</span>
            </button>

            <button 
              type="button"
              class="tab-btn" 
              :class="{ active: currentTab === 'tickets' }"
              @click="currentTab = 'tickets'"
            >
              <span class="tab-icon">🎫</span>
              <span class="tab-title">{{ isAr ? 'إعدادات التذاكر والدعم' : 'Tickets & Support' }}</span>
            </button>

            <button 
              type="button"
              class="tab-btn" 
              :class="{ active: currentTab === 'ai' }"
              @click="currentTab = 'ai'"
            >
              <span class="tab-icon">🤖</span>
              <span class="tab-title">{{ isAr ? 'الذكاء الاصطناعي (AI)' : 'AI Settings' }}</span>
            </button>

            <button 
              type="button"
              class="tab-btn" 
              :class="{ active: currentTab === 'security' }"
              @click="currentTab = 'security'"
            >
              <span class="tab-icon">🔒</span>
              <span class="tab-title">{{ isAr ? 'الأمان وكلمة المرور' : 'Security' }}</span>
            </button>
          </div>
        </div>

        <!-- ══ TAB 1: Business Details ══ -->
        <div class="settings-card" v-if="currentTab === 'business'">
          <div class="card-header">
            <div>
              <h3 class="card-title">{{ isAr ? 'المعلومات التجارية والضريبية' : 'Tax & Business Information' }}</h3>
              <p class="card-desc">{{ isAr ? 'تستخدم هذه البيانات لإصدار الفواتير الضريبية الرسمية لخدماتك على المنصة' : 'These details will appear on your official tax invoices' }}</p>
            </div>
            <div class="header-icon-bg">🏢</div>
          </div>

          <form @submit.prevent="saveGeneralSettings('business')" class="form-grid">
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
              <button type="submit" class="btn-save" :disabled="saving">
                <span v-if="saving" class="spinner-sm"></span>
                {{ saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ بيانات المنشأة' : 'Save Business Details') }}
              </button>
              <transition name="fade">
                <span v-if="savedSuccess === 'business'" class="success-msg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ isAr ? 'تم حفظ بيانات المنشأة بنجاح!' : 'Business details saved successfully!' }}
                </span>
              </transition>
            </div>
          </form>
        </div>

        <!-- ══ TAB 2: Tickets & Support Settings ══ -->
        <div class="settings-card" v-if="currentTab === 'tickets'">
          <div class="card-header">
            <div>
              <h3 class="card-title">{{ isAr ? 'إعدادات تذاكر الدعم الفني وخدمة العملاء' : 'Ticket & Customer Support Settings' }}</h3>
              <p class="card-desc">{{ isAr ? 'تخصيص الفتح التلقائي للتذاكر، مهلة الإغلاق عند عدم النشاط، وخيارات تقييم الخدمة عبر واتساب' : 'Configure ticket auto-creation, inactivity auto-close, and WhatsApp CSAT ratings' }}</p>
            </div>
            <div class="header-icon-bg">🎫</div>
          </div>

          <form @submit.prevent="saveGeneralSettings('tickets')" class="form-grid">
            
            <!-- Section 1: Auto-Create Tickets -->
            <div class="form-divider full-width">
              <span>{{ isAr ? 'فتح التذاكر التلقائي (Auto-Create Tickets)' : 'Automatic Ticket Creation' }}</span>
            </div>

            <div class="form-group full-width">
              <label class="toggle-card" :class="{ active: form.autoCreateTickets }">
                <input type="checkbox" v-model="form.autoCreateTickets" class="hidden-checkbox" />
                <div class="toggle-switch">
                  <div class="toggle-slider"></div>
                </div>
                <div class="toggle-info">
                  <span class="toggle-title">{{ isAr ? 'تفعيل فتح التذاكر تلقائياً عند استلام رسالة عميل' : 'Auto-Create Tickets on Inbound Customer Messages' }}</span>
                  <span class="toggle-desc">{{ isAr ? 'عند تفعيل هذا الخيار، يتم فتح تذكرة دعم فني جديدة تلقائياً بمجرد مراسلة العميل إذا لم تكن هناك تذكرة نشطة حالياً.' : 'Automatically creates a new ticket whenever a client sends a message if no open ticket exists.' }}</span>
                </div>
              </label>
            </div>

            <!-- Section 2: Auto-Close Inactivity -->
            <div class="form-divider full-width">
              <span>{{ isAr ? 'الإغلاق التلقائي للتذاكر غير النشطة (Ticket Auto-Close)' : 'Ticket Inactivity Auto-Close' }}</span>
            </div>

            <div class="form-group full-width">
              <label class="toggle-card" :class="{ active: form.autoCloseEnabled }">
                <input type="checkbox" v-model="form.autoCloseEnabled" class="hidden-checkbox" />
                <div class="toggle-switch">
                  <div class="toggle-slider"></div>
                </div>
                <div class="toggle-info">
                  <span class="toggle-title">{{ isAr ? 'تفعيل الإغلاق التلقائي للتذاكر غير النشطة' : 'Enable Auto-Close for Inactive Tickets' }}</span>
                  <span class="toggle-desc">{{ isAr ? 'إغلاق التذكرة وإرسال رسالة التقييم تلقائياً بعد فترة من عدم استجابة العميل (شريطة أن يكون آخر رد صادراً من فريق الدعم).' : 'Automatically closes ticket and sends rating message if client remains inactive after support response.' }}</span>
                </div>
              </label>
            </div>

            <div class="form-group full-width" v-if="form.autoCloseEnabled">
              <label>{{ isAr ? 'مهلة إغلاق التذكرة عند عدم رد العميل' : 'Inactivity Timeout' }}</label>
              <select v-model="form.autoCloseHours" class="input-std">
                <option :value="12">{{ isAr ? '12 ساعة (نصف يوم)' : '12 Hours (Half day)' }}</option>
                <option :value="24">{{ isAr ? '24 ساعة (يوم واحد - موصى به لواتساب)' : '24 Hours (1 Day - Recommended)' }}</option>
                <option :value="48">{{ isAr ? '48 ساعة (يومان)' : '48 Hours (2 Days)' }}</option>
                <option :value="72">{{ isAr ? '72 ساعة (3 أيام)' : '72 Hours (3 Days)' }}</option>
              </select>
              <span style="font-size: 0.8rem; color: #64748B; margin-top: 4px;">
                {{ isAr ? 'ملاحظة هامة: يتم الإغلاق فقط إذا كان آخر رد صادراً من موظف الدعم. إذا كان العميل هو من أرسل آخر رسالة فلن تُغلق التذكرة.' : 'Note: Only closes if last reply was from support team. Will never close if client spoke last.' }}
              </span>
            </div>

            <!-- Section 3: WhatsApp Rating CSAT -->
            <div class="form-divider full-width">
              <span>{{ isAr ? 'إعدادات تقييم الخدمة (WhatsApp CSAT Rating)' : 'Customer Satisfaction Rating Settings' }}</span>
            </div>

            <div class="form-group full-width">
              <label>{{ isAr ? 'طريقة إرسال التقييم للعميل' : 'Rating Input Method' }}</label>
              <div class="rating-options-grid">
                <label class="rating-option-card" :class="{ selected: form.ratingType === 'LIST_5_STARS' }">
                  <input type="radio" value="LIST_5_STARS" v-model="form.ratingType" class="hidden-radio" />
                  <div class="option-header">
                    <span class="option-badge recommended">{{ isAr ? 'موصى به' : 'Recommended' }}</span>
                    <span class="option-title">{{ isAr ? 'قائمة تفاعلية (5 نجوم)' : 'Interactive List (5 Stars)' }}</span>
                  </div>
                  <div class="option-stars">⭐⭐⭐⭐⭐ (1 - 5)</div>
                  <p class="option-desc">
                    {{ isAr ? 'قائمة منسدلة بـ 5 خيارات (1 إلى 5 نجوم) مع وصف لكل تقييم. تمنح العميل تقييماً دقيقاً وشاملاً.' : 'A 5-row list from 1 to 5 stars with descriptions.' }}
                  </p>
                </label>

                <label class="rating-option-card" :class="{ selected: form.ratingType === 'BUTTONS_3' }">
                  <input type="radio" value="BUTTONS_3" v-model="form.ratingType" class="hidden-radio" />
                  <div class="option-header">
                    <span class="option-title">{{ isAr ? 'أزرار سريعة (3 خيارات)' : 'Quick Buttons (3 Options)' }}</span>
                  </div>
                  <div class="option-stars">1⭐ | 3⭐ | 5⭐</div>
                  <p class="option-desc">
                    {{ isAr ? '3 أزرار تفاعلية سريعة. (ملاحظة: تفرض شركة Meta حداً أقصى 3 أزرار لأي رسالة في واتساب).' : '3 quick reply buttons (Meta Cloud API limit: max 3 buttons).' }}
                  </p>
                </label>

                <label class="rating-option-card" :class="{ selected: form.ratingType === 'TEXT' }">
                  <input type="radio" value="TEXT" v-model="form.ratingType" class="hidden-radio" />
                  <div class="option-header">
                    <span class="option-title">{{ isAr ? 'رسالة نصية مع رد رقمي' : 'Plain Text with Number' }}</span>
                  </div>
                  <div class="option-stars">1 ... 5 💬</div>
                  <p class="option-desc">
                    {{ isAr ? 'يرسل نصاً عادياً ويطلب من العميل الرد برقم من 1 إلى 5.' : 'Sends a regular text asking client to reply with a number 1-5.' }}
                  </p>
                </label>
              </div>
            </div>

            <div class="form-group full-width">
              <label>{{ isAr ? 'رسالة التقييم بعد إغلاق التذكرة' : 'Rating Message after Close' }}</label>
              <textarea 
                v-model="form.ratingMessageText" 
                :placeholder="isAr ? 'تم إغلاق التذكرة الخاصة بك. نأمل أن نكون قد وفقنا في خدمتك! يرجى تقييم الخدمة من 1 إلى 5 (حيث 5 هو الأفضل).' : 'Your ticket has been closed. Please rate our service:'" 
                class="input-std" 
                rows="3"
              ></textarea>
              <span style="font-size: 0.8rem; color: #64748B; margin-top: 4px;">
                {{ isAr ? 'يمكنك تخصيص نص الرسالة الترحيبية التي تظهر للعميل قبل خيارات التقييم.' : 'Customize the greeting message shown to the client before rating options.' }}
              </span>
            </div>

            <div class="form-actions full-width">
              <button type="submit" class="btn-save" :disabled="saving">
                <span v-if="saving" class="spinner-sm"></span>
                {{ saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ إعدادات التذاكر' : 'Save Ticket Settings') }}
              </button>
              <transition name="fade">
                <span v-if="savedSuccess === 'tickets'" class="success-msg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ isAr ? 'تم حفظ إعدادات التذاكر بنجاح!' : 'Ticket settings saved successfully!' }}
                </span>
              </transition>
            </div>
          </form>
        </div>

        <!-- ══ TAB 3: AI Configuration ══ -->
        <div class="settings-card" v-if="currentTab === 'ai'">
          <div class="card-header">
            <div>
              <h3 class="card-title">{{ isAr ? 'إعدادات الذكاء الاصطناعي (Gemini AI)' : 'AI Configuration' }}</h3>
              <p class="card-desc">{{ isAr ? 'ربط مفتاح API لمساعد الذكاء الاصطناعي لتوليد الردود التلقائية الذكية وتحليل المحادثات' : 'Connect Gemini API Key for smart auto-replies and message analysis' }}</p>
            </div>
            <div class="header-icon-bg">🤖</div>
          </div>

          <form @submit.prevent="saveGeneralSettings('ai')" class="form-grid">
            <div class="form-group full-width">
              <label>{{ isAr ? 'مفتاح Gemini API Key' : 'Gemini API Key' }}</label>
              <div class="input-wrap">
                <input 
                  type="password" 
                  v-model="form.geminiKey" 
                  placeholder="AIzaSyB..." 
                  class="input-std" 
                />
              </div>
              <span style="font-size: 0.8rem; color: #64748B; margin-top: 4px;">
                {{ isAr ? 'يمكنك الحصول على مفتاح API مجاناً من Google AI Studio لتفعيل الردود الذكية في المحادثة المباشرة والمساعد الآلي.' : 'Get a free API key from Google AI Studio to power smart replies in Live Chat and bot.' }}
              </span>
            </div>

            <div class="form-actions full-width">
              <button type="submit" class="btn-save" :disabled="saving">
                <span v-if="saving" class="spinner-sm"></span>
                {{ saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ إعدادات AI' : 'Save AI Settings') }}
              </button>
              <transition name="fade">
                <span v-if="savedSuccess === 'ai'" class="success-msg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ isAr ? 'تم حفظ إعدادات الذكاء الاصطناعي بنجاح!' : 'AI settings saved successfully!' }}
                </span>
              </transition>
            </div>
          </form>
        </div>

        <!-- ══ TAB 4: Security & Password ══ -->
        <div class="settings-card" v-if="currentTab === 'security'">
          <div class="card-header">
            <div>
              <h3 class="card-title">{{ isAr ? 'أمان الحساب وكلمة المرور' : 'Account Security & Password' }}</h3>
              <p class="card-desc">{{ isAr ? 'قم بتحديث كلمة المرور الخاصة بحساب الإدارة لحماية بياناتك والتحكم بصلاحيات الدخول' : 'Update your administrator password to keep your account secure' }}</p>
            </div>
            <div class="header-icon-bg">🔒</div>
          </div>

          <form @submit.prevent="savePassword" class="form-grid">
            <div class="form-group full-width">
              <label>{{ isAr ? 'كلمة المرور الجديدة' : 'New Password' }}</label>
              <input 
                type="password" 
                v-model="passwordForm.newPassword" 
                :placeholder="isAr ? 'أدخل كلمة مرور جديدة (6 أحرف على الأقل)' : 'Min 6 characters'" 
                required 
                class="input-std" 
              />
            </div>

            <div class="form-group full-width">
              <label>{{ isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password' }}</label>
              <input 
                type="password" 
                v-model="passwordForm.confirmPassword" 
                :placeholder="isAr ? 'أعد إدخال كلمة المرور' : 'Re-enter password'" 
                required 
                class="input-std" 
              />
            </div>

            <div v-if="passwordError" class="error-msg full-width">
              {{ passwordError }}
            </div>

            <div class="form-actions full-width">
              <button type="submit" class="btn-save" :disabled="savingPassword">
                <span v-if="savingPassword" class="spinner-sm"></span>
                {{ savingPassword ? (isAr ? 'جاري التحديث...' : 'Updating...') : (isAr ? 'تحديث كلمة المرور' : 'Update Password') }}
              </button>
              <transition name="fade">
                <span v-if="savedSuccess === 'security'" class="success-msg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ isAr ? 'تم تحديث كلمة المرور بنجاح!' : 'Password updated successfully!' }}
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
import Swal from 'sweetalert2'

const { locale } = useI18n()
const isAr = computed(() => {
  return locale.value === 'ar' || 
         localStorage.getItem('app_lang') === 'ar' || 
         localStorage.getItem('lang') === 'ar' || 
         document.documentElement.lang === 'ar' || 
         document.documentElement.dir === 'rtl'
})

const currentTab = ref('business')
const saving = ref(false)
const savingPassword = ref(false)
const savedSuccess = ref(null)
const passwordError = ref('')

const form = ref({
  companyName: '',
  vatNumber: '',
  crn: '',
  street: '',
  district: '',
  city: '',
  country: '',
  buildingNo: '',
  postalCode: '',
  autoCreateTickets: true,
  ratingMessageText: '',
  ratingType: 'LIST_5_STARS',
  autoCloseEnabled: true,
  autoCloseHours: 24,
  geminiKey: ''
})

const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
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
    const ticketSettings = data.customFeatures?.ticketSettings || {}
    const aiSettings = data.customFeatures?.aiSettings || {}
    Object.assign(form.value, {
      vatNumber: details.vatNumber || '',
      crn: details.crn || '',
      street: details.street || '',
      district: details.district || '',
      city: details.city || '',
      country: details.country || '',
      buildingNo: details.buildingNo || '',
      postalCode: details.postalCode || '',
      autoCreateTickets: ticketSettings.autoCreateTickets !== false,
      ratingMessageText: ticketSettings.ratingMessageText || '',
      ratingType: ticketSettings.ratingType || 'LIST_5_STARS',
      autoCloseEnabled: ticketSettings.autoCloseEnabled !== false,
      autoCloseHours: Number(ticketSettings.autoCloseHours) || 24,
      geminiKey: aiSettings.geminiKey || ''
    })
    
  } catch (err) {
    console.error('Error loading settings:', err)
  }
}

const saveGeneralSettings = async (section) => {
  saving.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.put('/api/auth/profile', {
      companyName: form.value.companyName,
      vatNumber: form.value.vatNumber,
      crn: form.value.crn,
      street: form.value.street,
      district: form.value.district,
      city: form.value.city,
      country: form.value.country,
      buildingNo: form.value.buildingNo,
      postalCode: form.value.postalCode,
      autoCreateTickets: form.value.autoCreateTickets,
      ratingMessageText: form.value.ratingMessageText,
      ratingType: form.value.ratingType,
      autoCloseEnabled: form.value.autoCloseEnabled,
      autoCloseHours: form.value.autoCloseHours,
      geminiKey: form.value.geminiKey
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // Update local storage tenant cache
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
    tenant.companyName = form.value.companyName
    if (!tenant.customFeatures) tenant.customFeatures = {}
    tenant.customFeatures.companyDetails = { 
      vatNumber: form.value.vatNumber,
      crn: form.value.crn,
      street: form.value.street,
      district: form.value.district,
      city: form.value.city,
      country: form.value.country,
      buildingNo: form.value.buildingNo,
      postalCode: form.value.postalCode
    }
    tenant.customFeatures.ticketSettings = { 
      autoCreateTickets: form.value.autoCreateTickets,
      ratingMessageText: form.value.ratingMessageText,
      ratingType: form.value.ratingType,
      autoCloseEnabled: form.value.autoCloseEnabled,
      autoCloseHours: form.value.autoCloseHours
    }
    tenant.customFeatures.aiSettings = {
      geminiKey: form.value.geminiKey
    }
    localStorage.setItem('tenant', JSON.stringify(tenant))
    
    savedSuccess.value = section
    setTimeout(() => {
      if (savedSuccess.value === section) savedSuccess.value = null
    }, 3500)
  } catch (err) {
    console.error('Error saving settings:', err)
    Swal.fire({
      icon: 'error',
      title: isAr.value ? 'خطأ' : 'Error',
      text: isAr.value ? 'حدث خطأ أثناء حفظ الإعدادات.' : 'Error saving settings.',
      confirmButtonColor: '#FF6600'
    })
  } finally {
    saving.value = false
  }
}

const savePassword = async () => {
  passwordError.value = ''
  if (!passwordForm.value.newPassword || passwordForm.value.newPassword.length < 6) {
    passwordError.value = isAr.value ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' : 'Password must be at least 6 characters.'
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = isAr.value ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.'
    return
  }

  savingPassword.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.put('/api/auth/profile', {
      password: passwordForm.value.newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
    savedSuccess.value = 'security'
    setTimeout(() => {
      if (savedSuccess.value === 'security') savedSuccess.value = null
    }, 3500)
  } catch (err) {
    console.error('Error updating password:', err)
    passwordError.value = isAr.value ? 'حدث خطأ أثناء تحديث كلمة المرور.' : 'Failed to update password.'
  } finally {
    savingPassword.value = false
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

/* ═══ MAIN CONTAINER ═══ */
.page-content { padding: 2.5rem; margin-top: -2.5rem; position: relative; z-index: 10; }
.settings-container {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ═══ TABS BAR ═══ */
.settings-tabs-wrapper {
  width: 100%;
}
.settings-tabs-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.settings-tabs-bar::-webkit-scrollbar {
  height: 4px;
}
.settings-tabs-bar::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 4px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: #64748B;
  font-weight: 700;
  font-size: 0.92rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.tab-icon {
  font-size: 1.15rem;
}
.tab-btn:hover {
  background: #F8FAFC;
  color: #0F172A;
}
.tab-btn.active {
  background: linear-gradient(135deg, #FF6600, #E55A00);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.25);
}

@media (max-width: 640px) {
  .page-content { padding: 1.5rem 1rem; margin-top: -1.5rem; }
  .settings-tabs-bar {
    gap: 0.35rem;
    padding: 0.4rem;
  }
  .tab-btn {
    padding: 0.6rem 0.85rem;
    font-size: 0.82rem;
    gap: 0.4rem;
  }
  .settings-card {
    padding: 1.5rem !important;
  }
}

/* ═══ CARD ═══ */
.settings-card {
  background: white;
  border-radius: 20px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
  padding: 2.5rem;
}
.card-header {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #F1F5F9;
}
.card-title { font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem; }
.card-desc { font-size: 0.88rem; color: #64748B; margin: 0; font-weight: 500; line-height: 1.5; }
.header-icon-bg { font-size: 2.5rem; opacity: 0.15; user-select: none; }

/* ═══ FORM ═══ */
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
  font-size: 0.92rem; font-weight: 800; color: #0F172A;
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
.error-msg { color: #EF4444; font-weight: 700; font-size: 0.88rem; }
.spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ═══ Rating Options ═══ */
.rating-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 0.35rem;
}

.rating-option-card {
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 1.1rem 1.25rem;
  cursor: pointer;
  background: white;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: relative;
}
.rating-option-card:hover {
  border-color: #CBD5E1;
  background: #F8FAFC;
}
.rating-option-card.selected {
  border-color: #FF6600;
  background: #FFF9F5;
  box-shadow: 0 0 0 2px rgba(255, 102, 0, 0.15);
}

.hidden-radio {
  display: none;
}

.option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.option-title {
  font-weight: 800;
  font-size: 0.95rem;
  color: #0F172A;
}
.option-badge.recommended {
  background: #FEF3C7;
  color: #B45309;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 20px;
}
.option-stars {
  font-size: 0.9rem;
  color: #FF6600;
  font-weight: 700;
}
.option-desc {
  font-size: 0.8rem;
  color: #64748B;
  margin: 0;
  line-height: 1.4;
}

/* ═══ Auto-Close & Auto-Create Toggle Card ═══ */
.toggle-card {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  padding: 1.1rem 1.25rem;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.toggle-card:hover {
  background: #F8FAFC;
  border-color: #CBD5E1;
}
.toggle-card.active {
  border-color: #FF6600;
  background: #FFF9F5;
  box-shadow: 0 0 0 2px rgba(255, 102, 0, 0.12);
}
.hidden-checkbox {
  display: none;
}
.toggle-switch {
  width: 46px;
  height: 26px;
  background: #CBD5E1;
  border-radius: 20px;
  position: relative;
  transition: background 0.25s ease;
  flex-shrink: 0;
}
.toggle-card.active .toggle-switch {
  background: #FF6600;
}
.toggle-slider {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.25s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}
.toggle-card.active .toggle-slider {
  transform: translateX(20px);
}
.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.toggle-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0F172A;
}
.toggle-desc {
  font-size: 0.8rem;
  color: #64748B;
  line-height: 1.35;
}
</style>
