<template>
  <div class="developer-tools p-6 md:p-8 font-sans text-slate-800" :class="{ 'rtl-mode': isAr }">
    <div class="mb-8">
      <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">{{ isAr ? 'أدوات المطورين' : 'Developer Tools' }}</h2>
      <p class="text-slate-500 font-medium text-lg">{{ isAr ? 'إدارة الـ Webhooks لربط رسائل واتساب مع أنظمتك الخاصة (مثل CRM و ERP).' : 'Manage Webhooks to integrate WhatsApp messages with your internal systems (CRM, ERP, etc).' }}</p>
    </div>

    <!-- Webhook Settings Card -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <!-- Tabs header -->
      <div class="flex border-b border-slate-100 bg-slate-50/50">
        <button class="flex-1 py-4 px-6 text-center font-bold text-[#FF6600] border-b-2 border-[#FF6600] bg-white">
          {{ isAr ? 'الويب هوك (Webhooks)' : 'Webhooks' }}
        </button>
      </div>

      <form @submit.prevent="saveSettings" class="p-6 space-y-8">
        
        <!-- Endpoint URL -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <span>🔗</span>
            <span>{{ isAr ? 'رابط الـ Webhook (HTTP Endpoint)' : 'Webhook Endpoint URL' }}</span>
          </label>
          <div class="flex">
            <span class="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm font-bold">
              POST
            </span>
            <input type="url" v-model="form.webhookUrl" required placeholder="https://api.yourdomain.com/webhook/receive" class="flex-1 min-w-0 block w-full px-4 py-2.5 rounded-none rounded-r-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] sm:text-sm outline-none transition-all font-mono" />
          </div>
          <p class="text-xs text-slate-500 mt-2">{{ isAr ? 'سنقوم بإرسال طلبات POST لهذا الرابط عند حدوث أي حدث تحدده بالأسفل.' : 'We will send POST requests to this URL when selected events occur.' }}</p>
        </div>

        <!-- Incoming Messages (الرسائل الواردة) -->
        <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <h4 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>📩</span> {{ isAr ? 'الرسائل الواردة (Incoming Messages)' : 'Incoming Messages' }}
          </h4>
          <div class="space-y-4">
            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="flex items-center h-5">
                <input type="radio" v-model="form.webhookEvents.incoming" value="ALL" class="w-4 h-4 accent-[#FF6600] text-[#FF6600] border-slate-300 focus:ring-[#FF6600]" />
              </div>
              <div class="text-sm">
                <span class="font-semibold text-slate-700 group-hover:text-[#FF6600] transition-colors">{{ isAr ? 'روبوت الدردشة + الدردشة المباشرة' : 'Chatbot + Live Chat' }}</span>
                <p class="text-slate-500 mt-1">{{ isAr ? 'استقبال جميع الرسائل التي يرسلها العملاء إلى رقمك.' : 'Receive all messages sent by customers to your number.' }}</p>
              </div>
            </label>

            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="flex items-center h-5">
                <input type="radio" v-model="form.webhookEvents.incoming" value="LIVE_CHAT" class="w-4 h-4 accent-[#FF6600] text-[#FF6600] border-slate-300 focus:ring-[#FF6600]" />
              </div>
              <div class="text-sm">
                <span class="font-semibold text-slate-700 group-hover:text-[#FF6600] transition-colors">{{ isAr ? 'الدردشة المباشرة فقط' : 'Live Chat Only' }}</span>
                <p class="text-slate-500 mt-1">{{ isAr ? 'استقبال الرسائل التي لم يقم روبوت الدردشة بالرد عليها فقط.' : 'Receive only messages that were not handled by the Auto Responder.' }}</p>
              </div>
            </label>

            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="flex items-center h-5">
                <input type="radio" v-model="form.webhookEvents.incoming" value="NONE" class="w-4 h-4 accent-[#FF6600] text-[#FF6600] border-slate-300 focus:ring-[#FF6600]" />
              </div>
              <div class="text-sm">
                <span class="font-semibold text-slate-700 group-hover:text-[#FF6600] transition-colors">{{ isAr ? 'إيقاف (لا ترسل)' : 'Disabled' }}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Delivery Statuses (حالات الرسائل) -->
        <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <h4 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>📊</span> {{ isAr ? 'حالات الرسائل والحملات (Delivery Statuses)' : 'Delivery Statuses' }}
          </h4>
          <div class="space-y-4">
            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="flex items-center h-5">
                <input type="checkbox" v-model="form.webhookEvents.statuses" class="w-4 h-4 rounded accent-[#FF6600] text-[#FF6600] border-slate-300 focus:ring-[#FF6600]" />
              </div>
              <div class="text-sm">
                <span class="font-semibold text-slate-700 group-hover:text-[#FF6600] transition-colors">{{ isAr ? 'إشعارات التسليم والقراءة (Sent, Delivered, Read, Failed)' : 'Delivery Receipts (Sent, Delivered, Read, Failed)' }}</span>
                <p class="text-slate-500 mt-1">{{ isAr ? 'استقبال إشعار فور تغير حالة أي رسالة أرسلتها (مفيد لتتبع إحصائيات الحملات برمجياً).' : 'Receive notifications when message status changes. Highly recommended for tracking campaign performance programmatically.' }}</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Headers (Optional) -->
        <div>
          <h4 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span>🛡️</span> {{ isAr ? 'ترويسة الطلب (Headers) - اختياري' : 'Custom Headers (Optional)' }}
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" v-model="form.webhookEvents.headers.key1" placeholder="Authorization" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] text-sm outline-none font-mono" />
            <input type="text" v-model="form.webhookEvents.headers.value1" placeholder="Bearer your-token-here" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] text-sm outline-none font-mono" />
          </div>
        </div>

        <div class="flex items-center gap-4 pt-4 border-t border-slate-100">
          <button type="submit" :disabled="loading" class="bg-[#FF6600] hover:bg-[#cc5200] text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5 border-none cursor-pointer disabled:opacity-50 flex items-center gap-2">
            <div v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ isAr ? 'حفظ الإعدادات' : 'Save Settings' }}
          </button>
          <span v-if="saved" class="text-green-600 font-bold flex items-center gap-1">
            ✓ {{ isAr ? 'تم الحفظ بنجاح!' : 'Saved successfully!' }}
          </span>
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

const loading = ref(false)
const saved = ref(false)

const form = ref({
  webhookUrl: '',
  webhookEvents: {
    incoming: 'ALL',
    statuses: true,
    headers: { key1: '', value1: '' }
  }
})

const fetchSettings = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data?.data) {
      const tenant = res.data.data
      form.value.webhookUrl = tenant.webhookUrl || ''
      if (tenant.webhookEvents) {
        let eventsStr = tenant.webhookEvents;
        if (typeof eventsStr === 'string') {
          eventsStr = JSON.parse(eventsStr);
        }
        if (eventsStr) {
          form.value.webhookEvents.incoming = eventsStr.incoming || 'ALL'
          form.value.webhookEvents.statuses = eventsStr.statuses ?? true
          if (eventsStr.headers) {
            form.value.webhookEvents.headers = eventsStr.headers
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch webhook settings:', error)
  }
}

const saveSettings = async () => {
  loading.value = true
  saved.value = false
  try {
    const token = localStorage.getItem('token')
    await axios.put('/api/auth/profile', {
      webhookUrl: form.value.webhookUrl,
      webhookEvents: JSON.stringify(form.value.webhookEvents)
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (error) {
    console.error('Failed to save webhook settings:', error)
    alert(isAr.value ? 'حدث خطأ أثناء الحفظ' : 'Failed to save settings')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.rtl-mode {
  direction: rtl;
}
.rtl-mode input {
  text-align: right;
}
.rtl-mode input[type="url"],
.rtl-mode .font-mono {
  direction: ltr;
  text-align: left;
}
</style>
