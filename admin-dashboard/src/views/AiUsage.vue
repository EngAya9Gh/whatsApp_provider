<template>
  <div class="p-6 max-w-6xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'استهلاك الذكاء الاصطناعي' : 'AI usage' }}</h1>
        <p class="text-slate-500 mt-1 text-sm max-w-2xl">
          {{ isAr
            ? 'كل طلب لـ Gemini يُسجَّل مع عدد التوكنات. «المفتاح المشترك» = GEMINI_API_KEY على السيرفر (أنتم تدفعون)، «مفتاحه» = مفتاح العميل نفسه (هو يدفع لجوجل). حالياً تسجيل فقط، لا يُمنع أحد.'
            : 'Every Gemini request is recorded with its tokens. "Shared key" = GEMINI_API_KEY on the server (you pay); "own key" = the customer\'s key (they pay Google). Recording only for now: nobody is blocked.' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="month" type="month" class="month" @change="load" />
        <button class="refresh" @click="load"><span :class="{ spin: loading }">↻</span></button>
      </div>
    </div>

    <div v-if="error" class="card text-red-600 text-sm">{{ error }}</div>

    <template v-else-if="data">
      <div class="grid md:grid-cols-3 gap-4 mb-5">
        <div class="card">
          <div class="label">{{ isAr ? 'على المفتاح المشترك' : 'On the shared key' }}</div>
          <div class="big">{{ fmt(data.totals.shared.inputTokens + data.totals.shared.outputTokens) }} <span class="unit">{{ isAr ? 'توكن' : 'tokens' }}</span></div>
          <div class="sub">{{ fmt(data.totals.shared.requests) }} {{ isAr ? 'طلب' : 'requests' }} · {{ isAr ? 'داخل' : 'in' }} {{ fmt(data.totals.shared.inputTokens) }} · {{ isAr ? 'خارج' : 'out' }} {{ fmt(data.totals.shared.outputTokens) }}</div>
        </div>
        <div class="card">
          <div class="label">{{ isAr ? 'الكلفة التقريبية عليكم' : 'Estimated cost to you' }}</div>
          <div class="big" v-if="data.pricesSet">${{ (data.totals.shared.estimatedCostUsd || 0).toFixed(4) }}</div>
          <div class="sub warn" v-else>
            {{ isAr ? 'أدخل أسعار جوجل لكل مليون توكن في الإعدادات ليظهر المبلغ.' : 'Enter Google\'s per-million-token prices in Settings to see it.' }}
            <router-link to="/settings" class="link">{{ isAr ? 'الإعدادات' : 'Settings' }}</router-link>
          </div>
        </div>
        <div class="card">
          <div class="label">{{ isAr ? 'المفتاح المشترك على السيرفر' : 'Shared key on the server' }}</div>
          <div class="big" :class="data.sharedKeyConfigured ? 'ok' : 'muted'">{{ data.sharedKeyConfigured ? (isAr ? 'مفعّل' : 'Set') : (isAr ? 'غير مضاف' : 'Not set') }}</div>
          <div class="sub">{{ data.sharedKeyConfigured
            ? (isAr ? 'كل عميل بلا مفتاح خاص يستخدمه.' : 'Every customer without their own key uses it.')
            : (isAr ? 'لا يعمل الذكاء الاصطناعي إلا لمن أضاف مفتاحه.' : 'AI only works for customers with their own key.') }}</div>
        </div>
      </div>

      <div class="card p-0 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th class="th text-start">{{ isAr ? 'العميل' : 'Customer' }}</th>
              <th class="th">{{ isAr ? 'طلبات (مشترك)' : 'Requests (shared)' }}</th>
              <th class="th">{{ isAr ? 'توكن (مشترك)' : 'Tokens (shared)' }}</th>
              <th class="th">{{ isAr ? 'الكلفة' : 'Cost' }}</th>
              <th class="th">{{ isAr ? 'طلبات بمفتاحه' : 'Requests (own key)' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="data.tenants.length === 0"><td colspan="5" class="td text-center text-slate-400 py-8">{{ isAr ? 'لا استهلاك في هذا الشهر.' : 'No usage this month.' }}</td></tr>
            <tr v-for="t in data.tenants" :key="t.tenantId" class="border-t border-slate-100">
              <td class="td">
                <router-link :to="`/tenants/${t.tenantId}`" class="font-semibold text-slate-800 hover:text-orange-600">{{ t.name }}</router-link>
                <div class="text-xs text-slate-400">{{ t.email }} · {{ t.plan }}</div>
              </td>
              <td class="td text-center">{{ fmt(t.shared.requests) }}</td>
              <td class="td text-center">{{ fmt(t.shared.inputTokens + t.shared.outputTokens) }}</td>
              <td class="td text-center">{{ t.shared.estimatedCostUsd === null ? '—' : '$' + t.shared.estimatedCostUsd.toFixed(4) }}</td>
              <td class="td text-center text-slate-500">{{ fmt(t.own.requests) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-else class="card text-slate-400 text-sm">{{ isAr ? 'جارٍ التحميل…' : 'Loading…' }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const now = new Date()
const month = ref(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`)
const data = ref(null)
const loading = ref(false)
const error = ref('')

const fmt = (n) => Number(n || 0).toLocaleString(isAr.value ? 'ar-SA' : 'en-US')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/admin/ai-usage', {
      params: { month: month.value },
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    data.value = res.data.data
  } catch (err) {
    error.value = err.response?.data?.message || (isAr.value ? 'تعذّر تحميل الاستهلاك' : 'Could not load usage')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
.card.p-0 { padding: 0; }
.label { font-size: 12px; font-weight: 700; color: #64748b; }
.big { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 6px; }
.big.ok { color: #15803d; }
.big.muted { color: #94a3b8; }
.unit { font-size: 13px; font-weight: 600; color: #64748b; }
.sub { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.5; }
.sub.warn { color: #b45309; }
.link { color: #ea580c; font-weight: 700; margin-inline-start: 4px; }
.th { padding: 10px 12px; font-weight: 700; white-space: nowrap; }
.td { padding: 10px 12px; vertical-align: top; }
.month { border: 1px solid #e2e8f0; border-radius: 10px; padding: 7px 10px; font-size: 13px; background: white; }
.refresh { display: inline-flex; align-items: center; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; font-weight: 600; cursor: pointer; }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
