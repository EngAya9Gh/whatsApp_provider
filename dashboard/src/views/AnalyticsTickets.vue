<template>
  <div class="p-6 max-w-6xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'تحليلات التذاكر' : 'Ticket Analytics' }}</h1>
      <p class="text-slate-500 mt-1">{{ isAr ? 'كم تذكرة فُتحت وأُغلقت، وكم انتظرت حتى استلمها موظف، وكم أخذ أول رد، ولكل موظف.' : 'Tickets opened and closed, how long they waited for someone to take them, how long the first reply took, per agent.' }}</p>
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
      <select v-if="data?.channels?.length > 1" v-model="channelId" @change="load" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#FF6600]">
        <option value="">{{ isAr ? 'كل الأرقام' : 'All numbers' }}</option>
        <option v-for="ch in data.channels" :key="ch.id" :value="ch.id">{{ ch.name || ch.displayPhoneNumber || ch.phoneNumber }}</option>
      </select>
      <span class="text-xs text-slate-400">{{ isAr ? `النسب مقارنة بالـ ${days} يوماً السابقة` : `Changes vs the previous ${days} days` }}</span>
    </div>

    <div v-if="loading && !data" class="flex justify-center p-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
    <div v-else-if="error" class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
      <i class="fas fa-lock text-2xl text-slate-300 mb-3 block"></i>{{ error }}
    </div>

    <div v-else-if="data" class="space-y-5 transition-opacity" :class="{ 'opacity-50': loading }">
      <p v-if="!data.tracked" class="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <i class="fas fa-circle-info text-slate-400 mt-1"></i>
        <span>{{ isAr
          ? 'مدة الاستلام تُسجَّل للتذاكر من الآن فصاعداً، فستظهر أرقامها مع أول تذاكر يستلمها الفريق.'
          : 'Pick-up times are recorded from now on, so they appear with the first tickets your team takes.' }}</span>
      </p>

      <!-- Right now -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile :label="isAr ? 'مفتوحة الآن' : 'Open now'" icon="fas fa-ticket" :value="fmt.num(s.openNow)" />
        <StatTile :label="isAr ? 'بدون موظف الآن' : 'Unassigned now'" icon="fas fa-user-clock" :value="fmt.num(s.unassignedNow)"
          :hint="s.longestUnassignedMinutes !== null ? (isAr ? `أطولها ينتظر ${fmt.duration(s.longestUnassignedMinutes)}` : `longest waiting ${fmt.duration(s.longestUnassignedMinutes)}`) : ''" />
        <StatTile :label="isAr ? 'فُتحت' : 'Opened'" icon="fas fa-plus" :value="fmt.num(s.opened)" :delta="s.openedChange" />
        <StatTile :label="isAr ? 'أُغلقت' : 'Closed'" icon="fas fa-check" :value="fmt.num(s.closed)" :delta="s.closedChange" />
      </div>

      <!-- Speed -->
      <section class="card">
        <h2 class="card-title">{{ isAr ? 'السرعة' : 'Speed' }}</h2>
        <p class="card-sub">{{ isAr
          ? 'يبدأ العدّ عندما تصبح التذكرة للفريق: عند فتحها، أو لحظة تحويل السير أو الموظف الذكي لها. الوقت الذي كان البوت يرد فيه لا يُحسب.'
          : 'The clock starts when the ticket becomes the team\'s: when it opens, or when a flow or the AI agent hands it over. Time the bot was answering does not count.' }}</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile :label="isAr ? 'متوسط مدة الاستلام' : 'Avg. pick-up time'" icon="fas fa-hand" :value="fmt.duration(s.avgPickupMinutes)" :delta="s.pickupChange" :up-is-good="false"
            :hint="s.medianPickupMinutes !== null ? (isAr ? `الوسيط ${fmt.duration(s.medianPickupMinutes)} · ${s.pickedCount} تذكرة` : `median ${fmt.duration(s.medianPickupMinutes)} · ${s.pickedCount} tickets`) : (isAr ? 'حتى يستلمها موظف' : 'until a team member takes it')" />
          <StatTile :label="isAr ? 'متوسط أول رد' : 'Avg. first reply'" icon="far fa-clock" :value="fmt.duration(s.avgFirstReplyMinutes)" :delta="s.firstReplyChange" :up-is-good="false"
            :hint="s.medianFirstReplyMinutes !== null ? (isAr ? `الوسيط ${fmt.duration(s.medianFirstReplyMinutes)} · ${s.repliedCount} تذكرة` : `median ${fmt.duration(s.medianFirstReplyMinutes)} · ${s.repliedCount} tickets`) : ''" />
          <StatTile :label="isAr ? 'متوسط زمن الحل' : 'Avg. resolution'" icon="fas fa-flag-checkered" :value="fmt.durationHours(s.avgResolutionHours)" :delta="s.resolutionChange" :up-is-good="false" />
          <StatTile :label="isAr ? 'متوسط التقييم' : 'Avg. rating'" icon="fas fa-star" :value="s.avgRating !== null ? (isAr ? `${s.avgRating} من 5` : `${s.avgRating} / 5`) : '—'" :delta="s.ratingChange"
            :hint="isAr ? `${s.ratedCount} تقييم` : `${s.ratedCount} ratings`" />
        </div>
      </section>

      <div class="grid lg:grid-cols-2 gap-5">
        <section class="card">
          <h2 class="card-title">{{ isAr ? 'كيف استُلمت التذاكر' : 'How tickets were taken' }}</h2>
          <p class="card-sub">{{ isAr ? 'أول موظف أخذ كل تذكرة خلال الفترة، وبأي طريقة' : 'How each ticket first got an owner in this period' }}</p>
          <BarList :items="howTakenItems" :empty-text="isAr ? 'لم تُستلم تذاكر في هذه الفترة' : 'No tickets were taken in this period'" />
        </section>
        <section class="card">
          <h2 class="card-title">{{ isAr ? 'حسب التصنيف' : 'By category' }}</h2>
          <p class="card-sub">{{ isAr ? 'التذاكر التي فُتحت خلال الفترة' : 'Tickets opened in this period' }}</p>
          <BarList :items="categoryItems" color="#eb6834" :empty-text="isAr ? 'لا توجد تذاكر في هذه الفترة' : 'No tickets in this period'" />
        </section>
      </div>

      <section class="card">
        <h2 class="card-title">{{ isAr ? 'فُتحت وأُغلقت يومياً' : 'Opened and closed per day' }}</h2>
        <p class="card-sub">{{ isAr ? 'بتوقيت حسابك' : 'In your account time zone' }}</p>
        <TrendChart :rows="data.daily" :series="trendSeries" :is-ar="isAr" :aria-label="isAr ? 'التذاكر المفتوحة والمغلقة يومياً' : 'Tickets opened and closed per day'" />
      </section>

      <!-- Agents -->
      <section class="card">
        <h2 class="card-title">{{ isAr ? 'الموظفون' : 'Agents' }}</h2>
        <p class="card-sub">{{ isAr ? 'لكل موظف تذاكره الحالية. صاحب الحساب لا تُسند له تذاكر فلا يظهر هنا.' : 'Each agent\'s current tickets. The account owner is not assigned tickets, so does not appear here.' }}</p>
        <div v-if="data.agents.length === 0" class="text-sm text-slate-400 text-center py-6">{{ isAr ? 'لا يوجد موظفون' : 'No team members' }}</div>
        <div v-else class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ isAr ? 'الموظف' : 'Agent' }}</th>
                <th>{{ isAr ? 'عنده الآن' : 'Open now' }}</th>
                <th>{{ isAr ? 'استلم' : 'Taken' }}</th>
                <th>{{ isAr ? 'منها بالفتح' : 'By opening' }}</th>
                <th>{{ isAr ? 'أغلق' : 'Closed' }}</th>
                <th>{{ isAr ? 'مدة الاستلام' : 'Pick-up' }}</th>
                <th>{{ isAr ? 'أول رد' : 'First reply' }}</th>
                <th>{{ isAr ? 'زمن الحل' : 'Resolution' }}</th>
                <th>{{ isAr ? 'التقييم' : 'Rating' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in data.agents" :key="a.id" :class="{ 'opacity-50': !a.isActive }">
                <td>
                  <span class="inline-flex items-center gap-2 font-semibold text-slate-800">
                    <span class="w-2 h-2 rounded-full" :class="a.onShiftNow ? 'bg-emerald-500' : 'bg-slate-300'" :title="a.onShiftNow ? (isAr ? 'في الدوام' : 'On duty') : (isAr ? 'خارج الدوام' : 'Off duty')"></span>
                    {{ a.name }}
                  </span>
                </td>
                <td>{{ fmt.num(a.openNow) }}</td>
                <td>{{ fmt.num(a.taken) }}</td>
                <td>{{ fmt.num(a.takenByOpening) }}</td>
                <td>{{ fmt.num(a.closed) }}</td>
                <td>{{ fmt.duration(a.avgPickupMinutes) }}</td>
                <td>{{ fmt.duration(a.avgFirstReplyMinutes) }}</td>
                <td>{{ fmt.durationHours(a.avgResolutionHours) }}</td>
                <td>{{ a.avgRating !== null ? `${a.avgRating} ★` : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p v-if="data.truncated" class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
        {{ isAr ? 'الفترة كبيرة جداً، فحُسبت الأرقام على جزء من التذاكر. اختر فترة أقصر لأرقام دقيقة.' : 'Large period: figures use part of the tickets. Pick a shorter period for exact numbers.' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import StatTile from '../components/analytics/StatTile.vue'
import TrendChart from '../components/analytics/TrendChart.vue'
import BarList from '../components/analytics/BarList.vue'
import { useAnalyticsFormat } from '../composables/useAnalyticsFormat'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const fmt = useAnalyticsFormat(isAr)

const days = ref(30)
const channelId = ref('')
const data = ref(null)
const loading = ref(true)
const error = ref('')

const presets = computed(() => [
  { days: 7, label: isAr.value ? '7 أيام' : '7 days' },
  { days: 30, label: isAr.value ? '30 يوماً' : '30 days' },
  { days: 90, label: isAr.value ? '90 يوماً' : '90 days' },
  { days: 365, label: isAr.value ? 'سنة' : '1 year' }
])

const s = computed(() => data.value.summary)

// Same validated pair as the other analytics pages
const trendSeries = computed(() => [
  { key: 'opened', label: isAr.value ? 'فُتحت' : 'Opened', color: '#2a78d6' },
  { key: 'closed', label: isAr.value ? 'أُغلقت' : 'Closed', color: '#eb6834' }
])

const VIA_LABELS = {
  OPEN: ['فتح المحادثة', 'Opened the chat'],
  REPLY: ['أول رد', 'First reply'],
  ROUTING: ['التوزيع التلقائي', 'Automatic routing'],
  MANUAL: ['أسندها شخص', 'Assigned by someone'],
  SELF: ['أسندها لنفسه', 'Assigned it to themselves'],
  FLOW: ['سير الواتساب', 'Chat flow']
}
const howTakenItems = computed(() => data.value.howTaken.map(v => ({
  key: v.key,
  label: (VIA_LABELS[v.key] || [v.key, v.key])[isAr.value ? 0 : 1],
  value: v.count,
  display: fmt.num(v.count)
})))

const categoryItems = computed(() => data.value.byCategory.slice(0, 10).map(c => ({
  key: c.id,
  label: c.name || (isAr.value ? 'بدون تصنيف' : 'No category'),
  value: c.count,
  display: fmt.num(c.count)
})))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/v1/analytics/tickets', { params: { days: days.value, channelId: channelId.value || undefined } })
    data.value = res.data.data
  } catch (err) {
    data.value = null
    error.value = err.response?.status === 403
      ? (isAr.value ? 'تحليلات التذاكر غير متاحة في اشتراكك أو صلاحياتك.' : 'Ticket analytics is not available on your plan or permissions.')
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
.data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.data-table th { text-align: start; font-weight: 600; color: #64748b; font-size: 0.75rem; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.data-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155; font-variant-numeric: tabular-nums; white-space: nowrap; }
.data-table tr:last-child td { border-bottom: none; }
</style>
