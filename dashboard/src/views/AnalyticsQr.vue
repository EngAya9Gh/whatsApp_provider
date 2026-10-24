<template>
  <div class="p-6 max-w-6xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'تحليلات الربط العادي' : 'QR Connection Analytics' }}</h1>
      <p class="text-slate-500 mt-1">{{ isAr ? 'الرسائل المرسلة عبر الـ API والحملات على رقم الواتساب المربوط بالـ QR.' : 'API messages and campaigns sent through your QR-linked WhatsApp number.' }}</p>
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div class="inline-flex bg-white border border-slate-200 rounded-xl p-1">
        <button
          v-for="p in presets"
          :key="p.days"
          type="button"
          @click="setDays(p.days)"
          class="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors border-none cursor-pointer"
          :class="days === p.days ? 'bg-slate-800 text-white' : 'bg-transparent text-slate-500 hover:text-slate-800'"
        >{{ p.label }}</button>
      </div>
      <span class="text-xs text-slate-400">{{ isAr ? `النسب مقارنة بالـ ${days} يوماً السابقة` : `Changes vs the previous ${days} days` }}</span>
    </div>

    <div v-if="loading && !data" class="flex justify-center p-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
    <div v-else-if="error" class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
      <i class="fas fa-lock text-2xl text-slate-300 mb-3 block"></i>{{ error }}
    </div>

    <div v-else-if="data" class="space-y-5 transition-opacity" :class="{ 'opacity-50': loading }">
      <!-- Connection + monthly usage -->
      <div class="grid md:grid-cols-2 gap-5">
        <section class="card flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" :class="connected ? 'bg-emerald-50 text-[#0ca30c]' : 'bg-red-50 text-[#d03b3b]'">
            <i class="fas" :class="connected ? 'fa-link' : 'fa-link-slash'"></i>
          </div>
          <div>
            <div class="text-xs text-slate-400 font-semibold">{{ isAr ? 'حالة الربط' : 'Connection' }}</div>
            <div class="font-bold text-slate-800">
              {{ connected ? (isAr ? 'متصل' : 'Connected') : (isAr ? 'غير متصل' : 'Disconnected') }}
              <template v-if="data.connection.phone"><span class="text-slate-400 font-normal text-sm"> · </span><span class="text-slate-500 font-normal text-sm" dir="ltr">+{{ data.connection.phone }}</span></template>
            </div>
            <router-link v-if="!connected" to="/connect" class="text-xs font-semibold text-[#FF6600]">{{ isAr ? 'إعادة الربط' : 'Reconnect' }}</router-link>
          </div>
        </section>
        <section class="card">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs text-slate-400 font-semibold">{{ isAr ? 'استهلاك هذا الشهر' : 'Usage this month' }}</div>
            <div class="text-sm font-bold text-slate-800">
              {{ fmt.num(data.usage.messagesSent) }}
              <span class="text-slate-400 font-normal">/ {{ data.usage.unlimited ? (isAr ? 'غير محدود' : 'unlimited') : fmt.num(data.usage.monthlyLimit) }}</span>
            </div>
          </div>
          <template v-if="!data.usage.unlimited">
            <div class="meter-track"><div class="meter-fill" :class="usageLevel" :style="{ width: `${usagePct}%` }"></div></div>
            <p v-if="usageLevel !== 'ok'" class="text-xs font-semibold mt-2 flex items-center gap-1.5" :class="usageLevel === 'critical' ? 'text-[#d03b3b]' : 'text-[#b45309]'">
              <i class="fas fa-triangle-exclamation"></i>
              {{ isAr ? `استُهلك ${usagePct}% من الباقة — متبقٍ ${fmt.num(data.usage.remaining)} رسالة` : `${usagePct}% of the plan used — ${fmt.num(data.usage.remaining)} messages left` }}
            </p>
            <p v-else class="text-xs text-slate-400 mt-2">{{ isAr ? `متبقٍ ${fmt.num(data.usage.remaining)} رسالة` : `${fmt.num(data.usage.remaining)} messages left` }}</p>
          </template>
        </section>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatTile :label="isAr ? 'إجمالي الرسائل' : 'Total messages'" icon="fas fa-paper-plane" :value="fmt.num(m.total)" :delta="m.totalChange" />
        <StatTile :label="isAr ? 'أُرسلت بنجاح' : 'Sent'" icon="fas fa-check" :value="fmt.num(m.sent)" :delta="m.sentChange" />
        <StatTile :label="isAr ? 'فشلت' : 'Failed'" icon="fas fa-circle-exclamation" :value="fmt.num(m.failed)" />
        <StatTile :label="isAr ? 'نسبة النجاح' : 'Success rate'" icon="fas fa-percent" :value="fmt.percent(m.successRate)" />
        <StatTile :label="isAr ? 'المستلمون' : 'Recipients'" icon="fas fa-users" :value="fmt.num(m.recipients)" :hint="isAr ? 'أرقام مختلفة' : 'unique numbers'" />
      </div>

      <section class="card">
        <h2 class="card-title">{{ isAr ? 'الرسائل يومياً' : 'Messages per day' }}</h2>
        <TrendChart
          :rows="data.daily"
          :series="trendSeries"
          :is-ar="isAr"
          :aria-label="isAr ? 'الرسائل الناجحة والفاشلة يومياً' : 'Sent and failed messages per day'"
        />
      </section>

      <div class="grid lg:grid-cols-3 gap-5">
        <section class="card lg:col-span-2">
          <h2 class="card-title">{{ isAr ? 'أوقات الإرسال' : 'Sending hours' }}</h2>
          <p class="card-sub">{{ isAr ? 'الرسائل حسب اليوم والساعة' : 'Messages by day and hour' }} · <span dir="ltr">{{ data.range.timezone }}</span></p>
          <HeatmapChart :matrix="data.heatmap" :is-ar="isAr" :unit="isAr ? 'رسالة' : 'messages'" />
        </section>
        <section class="card">
          <h2 class="card-title">{{ isAr ? 'أنواع الرسائل' : 'Message types' }}</h2>
          <p class="card-sub">{{ isAr ? 'المرسلة عبر الـ API' : 'Sent through the API' }}</p>
          <BarList :items="typeItems" />
        </section>
      </div>

      <section v-if="data.topErrors.length" class="card">
        <h2 class="card-title flex items-center gap-2"><i class="fas fa-circle-exclamation text-[#d03b3b]"></i>{{ isAr ? 'أكثر أسباب الفشل' : 'Top failure reasons' }}</h2>
        <ul class="mt-3 divide-y divide-slate-100">
          <li v-for="e in data.topErrors" :key="e.reason" class="flex items-center justify-between gap-4 py-2.5 text-sm">
            <span class="text-slate-600 break-all" dir="ltr">{{ e.reason }}</span>
            <strong class="text-slate-800 whitespace-nowrap">{{ fmt.num(e.count) }}</strong>
          </li>
        </ul>
      </section>

      <section class="card">
        <h2 class="card-title">{{ isAr ? 'الحملات في هذه الفترة' : 'Campaigns in this period' }}</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatTile :label="isAr ? 'الحملات' : 'Campaigns'" :value="fmt.num(data.campaigns.count)" />
          <StatTile :label="isAr ? 'أُرسلت' : 'Sent'" :value="fmt.num(data.campaigns.sent)" :hint="isAr ? `من ${fmt.num(data.campaigns.targets)}` : `of ${fmt.num(data.campaigns.targets)}`" />
          <StatTile :label="isAr ? 'فشلت' : 'Failed'" :value="fmt.num(data.campaigns.failed)" />
          <StatTile :label="isAr ? 'تفاعلات الأزرار' : 'Button clicks'" :value="fmt.num(data.campaigns.interactions)" />
        </div>
        <div v-if="data.campaigns.list.length" class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ isAr ? 'الحملة' : 'Campaign' }}</th>
                <th>{{ isAr ? 'التاريخ' : 'Date' }}</th>
                <th>{{ isAr ? 'المستهدفون' : 'Recipients' }}</th>
                <th>{{ isAr ? 'أُرسلت' : 'Sent' }}</th>
                <th>{{ isAr ? 'فشلت' : 'Failed' }}</th>
                <th>{{ isAr ? 'قيد الانتظار' : 'Pending' }}</th>
                <th>{{ isAr ? 'نسبة التفاعل' : 'Response rate' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cm in data.campaigns.list" :key="cm.id">
                <td><router-link :to="`/campaigns/${cm.id}`" class="font-semibold text-slate-800 hover:text-[#FF6600]">{{ cm.name }}</router-link></td>
                <td>{{ fmt.date(cm.createdAt) }}</td>
                <td>{{ fmt.num(cm.total) }}</td>
                <td>{{ fmt.num(cm.sent) }}</td>
                <td>{{ fmt.num(cm.failed) }}</td>
                <td>{{ fmt.num(cm.pending) }}</td>
                <td>{{ fmt.percent(cm.responseRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-sm text-slate-400 text-center py-4">{{ isAr ? 'لا توجد حملات في هذه الفترة' : 'No campaigns in this period' }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import StatTile from '../components/analytics/StatTile.vue'
import TrendChart from '../components/analytics/TrendChart.vue'
import HeatmapChart from '../components/analytics/HeatmapChart.vue'
import BarList from '../components/analytics/BarList.vue'
import { useAnalyticsFormat } from '../composables/useAnalyticsFormat'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const fmt = useAnalyticsFormat(isAr)

const days = ref(30)
const data = ref(null)
const loading = ref(true)
const error = ref('')

const presets = computed(() => [
  { days: 7, label: isAr.value ? '7 أيام' : '7 days' },
  { days: 30, label: isAr.value ? '30 يوماً' : '30 days' },
  { days: 90, label: isAr.value ? '90 يوماً' : '90 days' }
])

const m = computed(() => data.value.messages)
const connected = computed(() => data.value.connection.status === 'CONNECTED')

// Sent = categorical slot 1, failed = status "critical" (validated pair)
const trendSeries = computed(() => [
  { key: 'sent', label: isAr.value ? 'ناجحة' : 'Sent', color: '#2a78d6' },
  { key: 'failed', label: isAr.value ? 'فاشلة' : 'Failed', color: '#d03b3b' }
])

const typeLabels = computed(() => ({
  OTP: isAr.value ? 'رموز تحقق (OTP)' : 'OTP codes',
  CUSTOM: isAr.value ? 'رسائل نصية ووسائط' : 'Text & media',
  INTERACTIVE: isAr.value ? 'رسائل تفاعلية' : 'Interactive'
}))
const typeItems = computed(() => data.value.messages.byType.map(t => ({ key: t.type, label: typeLabels.value[t.type] || t.type, value: t.count, display: fmt.num(t.count) })))

const usagePct = computed(() => {
  const u = data.value.usage
  return u.monthlyLimit ? Math.min(100, Math.round((u.messagesSent / u.monthlyLimit) * 100)) : 0
})
const usageLevel = computed(() => (usagePct.value >= 95 ? 'critical' : usagePct.value >= 80 ? 'warning' : 'ok'))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/v1/analytics/qr', { params: { days: days.value } })
    data.value = res.data.data
  } catch (err) {
    data.value = null
    error.value = err.response?.status === 403
      ? (isAr.value ? 'تحليلات الربط العادي غير متاحة في اشتراكك أو صلاحياتك.' : 'QR analytics is not available on your plan or permissions.')
      : (isAr.value ? 'تعذّر تحميل التحليلات.' : 'Could not load analytics.')
  } finally {
    loading.value = false
  }
}

const setDays = (n) => {
  if (days.value === n) return
  days.value = n
  load()
}

onMounted(load)
</script>

<style scoped>
.card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 18px 20px;
}
.card-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.card-sub { font-size: 0.75rem; color: #94a3b8; margin: 0 0 14px; }
/* Meter: fill + lighter track of the same ramp; warning / critical only near the cap */
.meter-track { height: 10px; border-radius: 999px; background: #cde2fb; overflow: hidden; }
.meter-fill { height: 100%; border-radius: 999px; background: #2a78d6; transition: width 0.3s; }
.meter-fill.warning { background: #fab219; }
.meter-fill.critical { background: #d03b3b; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.data-table th { text-align: start; font-weight: 600; color: #64748b; font-size: 0.75rem; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.data-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155; font-variant-numeric: tabular-nums; white-space: nowrap; }
.data-table tr:last-child td { border-bottom: none; }
</style>
