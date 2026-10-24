<template>
  <div class="p-6 max-w-6xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'تحليلات Meta' : 'Meta Analytics' }}</h1>
      <p class="text-slate-500 mt-1">{{ isAr ? 'المحادثات والتذاكر وأداء الفريق على أرقام واتساب الرسمية (Cloud API).' : 'Conversations, tickets and team performance on your official WhatsApp numbers (Cloud API).' }}</p>
    </div>

    <!-- Filters: one row above everything they scope -->
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
      <div v-if="isEmpty" class="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <i class="fas fa-circle-info text-slate-400 mt-1"></i>
        <div class="flex-1">
          <div>{{ isAr ? `لا توجد رسائل أو تذاكر أو حملات على أرقام Meta خلال آخر ${days} يوماً.` : `No messages, tickets or campaigns on Meta numbers in the last ${days} days.` }}</div>
          <!-- Last activity whatever the period: tells "too short a period" apart from "nothing recorded" -->
          <div class="text-xs text-slate-500 mt-1.5">
            <template v-if="!data.coverage.metaChannels">{{ isAr ? 'لا يوجد رقم Meta مربوط بهذا الحساب.' : 'No Meta number is connected to this account.' }}</template>
            <template v-else-if="!lastActivity">{{ isAr ? 'لم تُسجَّل أي رسالة أو حملة أو محادثة على أرقام Meta لهذا الحساب حتى الآن.' : 'No message, campaign or conversation has ever been recorded on this account’s Meta numbers.' }}</template>
            <template v-else>
              {{ isAr ? 'آخر نشاط مسجّل:' : 'Latest recorded activity:' }}
              <span v-if="data.coverage.lastApiMessageAt"> {{ isAr ? 'رسالة API' : 'API message' }} {{ fmt.date(data.coverage.lastApiMessageAt) }} ·</span>
              <span v-if="data.coverage.lastCampaignAt"> {{ isAr ? 'حملة' : 'campaign' }} {{ fmt.date(data.coverage.lastCampaignAt) }} ·</span>
              <span v-if="data.coverage.lastChatAt"> {{ isAr ? 'محادثة' : 'conversation' }} {{ fmt.date(data.coverage.lastChatAt) }}</span>
            </template>
          </div>
        </div>
        <button v-if="days < 365 && lastActivity" type="button" class="text-[#FF6600] font-semibold bg-transparent border-none cursor-pointer" @click="setDays(365)">{{ isAr ? 'عرض آخر سنة' : 'Show last year' }}</button>
      </div>

      <p v-if="data.truncated" class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
        {{ isAr ? 'الفترة كبيرة جداً، فحُسبت الأرقام على أحدث الرسائل فقط. اختر فترة أقصر لأرقام دقيقة.' : 'Large period: figures use the most recent messages only. Pick a shorter period for exact numbers.' }}
      </p>

      <!-- Conversations KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile :label="isAr ? 'محادثات جديدة' : 'New conversations'" icon="fas fa-comment-medical" :value="fmt.num(c.new)" :delta="c.newChange" />
        <StatTile :label="isAr ? 'رسائل العملاء' : 'Customer messages'" icon="fas fa-arrow-down" :value="fmt.num(c.inbound)" :delta="c.inboundChange" />
        <StatTile :label="isAr ? 'الرسائل المرسلة' : 'Messages sent'" icon="fas fa-arrow-up" :value="fmt.num(data.sent.total)" :delta="data.sent.change" :hint="isAr ? 'محادثات + API + حملات' : 'chats + API + campaigns'" />
        <StatTile :label="isAr ? 'متوسط زمن الرد' : 'Avg. response time'" icon="far fa-clock" :value="fmt.duration(c.avgResponseMinutes)" :delta="c.avgResponseChange" :up-is-good="false" :hint="c.medianResponseMinutes !== null ? (isAr ? `الوسيط ${fmt.duration(c.medianResponseMinutes)}` : `median ${fmt.duration(c.medianResponseMinutes)}`) : ''" />
        <StatTile :label="isAr ? 'بانتظار الرد' : 'Awaiting reply'" icon="fas fa-hourglass-half" :value="fmt.num(c.awaitingReply)" :hint="isAr ? 'آخر رسالة من العميل' : 'customer wrote last'" />
        <StatTile :label="isAr ? 'نسبة الوصول' : 'Delivery rate'" icon="fas fa-check-double" :value="fmt.percent(data.delivery.deliveredRate)" :hint="isAr ? `القراءة ${fmt.percent(data.delivery.readRate)}` : `read ${fmt.percent(data.delivery.readRate)}`" />
      </div>

      <!-- Daily trend -->
      <section class="card">
        <h2 class="card-title">{{ isAr ? 'حركة الرسائل اليومية' : 'Daily messages' }}</h2>
        <TrendChart
          :rows="data.daily"
          :series="trendSeries"
          :is-ar="isAr"
          :aria-label="isAr ? 'رسائل العملاء والرسائل المرسلة يومياً' : 'Customer messages and messages sent per day'"
        />
      </section>

      <div class="grid lg:grid-cols-3 gap-5">
        <section class="card lg:col-span-2">
          <h2 class="card-title">{{ isAr ? 'أوقات الذروة' : 'Peak hours' }}</h2>
          <p class="card-sub">{{ isAr ? 'رسائل العملاء حسب اليوم والساعة' : 'Customer messages by day and hour' }} · <span dir="ltr">{{ data.range.timezone }}</span></p>
          <HeatmapChart :matrix="data.heatmap" :is-ar="isAr" :unit="isAr ? 'رسالة' : 'messages'" />
        </section>
        <section class="card">
          <h2 class="card-title">{{ isAr ? 'تسليم الرسائل' : 'Message delivery' }}</h2>
          <p class="card-sub">{{ isAr ? 'المحادثات والـ API والحملات، حسب آخر حالة أبلغت بها Meta' : 'Chats, API and campaigns, by the latest status Meta reported' }}</p>
          <BarList :items="deliveryItems" />
          <p v-if="data.delivery.failed" class="mt-3 text-xs font-semibold text-[#d03b3b] flex items-center gap-1.5">
            <i class="fas fa-circle-exclamation"></i>
            {{ isAr ? `فشل ${fmt.num(data.delivery.failed)} رسالة (${fmt.percent(data.delivery.failedRate)})` : `${fmt.num(data.delivery.failed)} failed (${fmt.percent(data.delivery.failedRate)})` }}
          </p>
        </section>
      </div>

      <!-- Meta's own counts -->
      <section v-if="data.metaReported" class="card meta-reported">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h2 class="card-title m-0"><i class="fas fa-cloud text-[#2a78d6] me-1"></i>{{ isAr ? 'حسب أرقام Meta' : 'According to Meta' }}</h2>
          <template v-if="data.metaReported.available">
            <span class="text-sm text-slate-600"><strong class="text-slate-900 text-lg">{{ fmt.num(data.metaReported.sent) }}</strong> {{ isAr ? 'أُرسلت' : 'sent' }}</span>
            <span class="text-sm text-slate-600"><strong class="text-slate-900 text-lg">{{ fmt.num(data.metaReported.delivered) }}</strong> {{ isAr ? 'وصلت' : 'delivered' }}</span>
          </template>
          <span v-else class="text-sm text-slate-500">
            {{ data.metaReported.reason === 'NO_CREDENTIALS'
              ? (isAr ? 'الرقم بدون بيانات ربط كاملة (WABA ID / Token).' : 'The number is missing WABA ID / token.')
              : (isAr ? 'تعذّر جلب الأرقام من Meta' : 'Could not load Meta’s numbers') }}<span v-if="data.metaReported.message" dir="ltr">: {{ data.metaReported.message }}</span>
          </span>
        </div>
        <p class="card-sub mt-2 mb-0">{{ isAr ? 'تشمل كل ما أُرسل من الرقم، حتى من خارج النظام (مثل لوحة مطوري Meta). الأرقام أعلاه وأسفله تشمل ما مرّ عبر النظام فقط.' : 'Covers everything the number sent, even outside the platform (e.g. Meta’s developer console). The other figures cover only what went through the platform.' }}</p>
      </section>

      <!-- Sent by source -->
      <section class="card">
        <h2 class="card-title">{{ isAr ? 'الرسائل المرسلة حسب المصدر' : 'Messages sent by source' }}</h2>
        <p class="card-sub">{{ isAr ? '«—» يعني أن Meta لم تُبلغ بحالة هذه الرسائل (حملات أُرسلت قبل تفعيل تتبّع الوصول).' : '"—" means Meta did not report a status for these messages (campaigns sent before delivery tracking).' }}</p>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ isAr ? 'المصدر' : 'Source' }}</th>
                <th>{{ isAr ? 'أُرسلت' : 'Sent' }}</th>
                <th>{{ isAr ? 'وصلت' : 'Delivered' }}</th>
                <th>{{ isAr ? 'قُرئت' : 'Read' }}</th>
                <th>{{ isAr ? 'فشلت' : 'Failed' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="src in data.sent.bySource" :key="src.key">
                <td class="font-semibold text-slate-800">{{ sourceLabel(src.key) }}</td>
                <td>{{ fmt.num(src.sent) }}</td>
                <td>{{ fmt.num(src.delivered) }}</td>
                <td>{{ fmt.num(src.read) }}</td>
                <td>{{ fmt.num(src.failed) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Tickets -->
      <section class="card">
        <h2 class="card-title">{{ isAr ? 'التذاكر' : 'Tickets' }}</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <StatTile :label="isAr ? 'فُتحت' : 'Opened'" :value="fmt.num(t.opened)" :delta="t.openedChange" />
          <StatTile :label="isAr ? 'أُغلقت' : 'Closed'" :value="fmt.num(t.closed)" :delta="t.closedChange" />
          <StatTile :label="isAr ? 'مفتوحة الآن' : 'Open now'" :value="fmt.num(t.openNow)" />
          <StatTile :label="isAr ? 'متوسط زمن الحل' : 'Avg. resolution'" :value="fmt.durationHours(t.avgResolutionHours)" :delta="t.resolutionChange" :up-is-good="false" />
          <StatTile :label="isAr ? 'متوسط التقييم' : 'Avg. rating'" :value="t.avgRating !== null ? (isAr ? `${t.avgRating} من 5` : `${t.avgRating} / 5`) : '—'" :delta="t.ratingChange" :hint="isAr ? `${t.ratedCount} تقييم` : `${t.ratedCount} ratings`" />
        </div>
        <h3 class="text-sm font-bold text-slate-700 mb-3">{{ isAr ? 'توزيع التقييمات' : 'Rating distribution' }}</h3>
        <BarList :items="ratingItems" :empty-text="isAr ? 'لا توجد تقييمات في هذه الفترة' : 'No ratings in this period'" />
      </section>

      <!-- Team -->
      <section class="card">
        <h2 class="card-title">{{ isAr ? 'أداء الفريق' : 'Team performance' }}</h2>
        <p class="card-sub">{{ isAr ? 'زمن الرد وعدد الرسائل لكل موظف يُحسبان من رسائله المرسلة بعد هذا التحديث.' : 'Per-agent response time and message counts come from messages sent after this update.' }}</p>
        <div v-if="data.agents.length === 0" class="text-sm text-slate-400 text-center py-6">{{ isAr ? 'لا يوجد موظفون' : 'No team members' }}</div>
        <div v-else class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ isAr ? 'الموظف' : 'Agent' }}</th>
                <th>{{ isAr ? 'تذاكر مسندة' : 'Assigned' }}</th>
                <th>{{ isAr ? 'تذاكر مغلقة' : 'Closed' }}</th>
                <th>{{ isAr ? 'متوسط التقييم' : 'Avg. rating' }}</th>
                <th>{{ isAr ? 'متوسط زمن الرد' : 'Avg. response' }}</th>
                <th>{{ isAr ? 'متوسط زمن الحل' : 'Avg. resolution' }}</th>
                <th>{{ isAr ? 'رسائل' : 'Messages' }}</th>
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
                <td>{{ fmt.num(a.ticketsAssigned) }}</td>
                <td>{{ fmt.num(a.ticketsClosed) }}</td>
                <td>{{ a.avgRating !== null ? `${a.avgRating} ★` : '—' }}</td>
                <td>{{ fmt.duration(a.avgResponseMinutes) }}</td>
                <td>{{ fmt.durationHours(a.avgResolutionHours) }}</td>
                <td>{{ fmt.num(a.messagesSent) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid lg:grid-cols-2 gap-5">
        <section class="card">
          <h2 class="card-title">{{ isAr ? 'مراحل العميل' : 'Customer stages' }}</h2>
          <template v-if="data.stages">
            <p class="card-sub">{{ isAr ? 'عدد المحادثات في كل مرحلة الآن، و(+) من دخلها خلال الفترة' : 'Conversations in each stage now, and (+) how many entered it in this period' }}</p>
            <BarList :items="stageItems" />
          </template>
          <p v-else class="text-sm text-slate-400 py-4">
            {{ isAr ? 'مراحل العميل غير مفعّلة.' : 'Customer stages are off.' }}
            <router-link to="/inbox-settings?tab=stages" class="text-[#FF6600] font-semibold">{{ isAr ? 'تفعيلها' : 'Turn on' }}</router-link>
          </p>
        </section>
        <section class="card">
          <h2 class="card-title">{{ isAr ? 'الوسوم' : 'Tags' }}</h2>
          <p class="card-sub">{{ isAr ? 'عدد المحادثات التي تحمل كل وسم' : 'Conversations carrying each tag' }}</p>
          <BarList :items="tagItems" :empty-text="isAr ? 'لا توجد وسوم' : 'No tags'" />
        </section>
      </div>

      <!-- Meta campaigns -->
      <section class="card">
        <h2 class="card-title">{{ isAr ? 'حملات Meta في هذه الفترة' : 'Meta campaigns in this period' }}</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatTile :label="isAr ? 'الحملات' : 'Campaigns'" :value="fmt.num(data.campaigns.count)" />
          <StatTile :label="isAr ? 'المستهدفون' : 'Recipients'" :value="fmt.num(data.campaigns.targets)" />
          <StatTile :label="isAr ? 'أُرسلت' : 'Sent'" :value="fmt.num(data.campaigns.sent)" />
          <StatTile :label="isAr ? 'تفاعلات الأزرار' : 'Button clicks'" :value="fmt.num(data.campaigns.interactions)" />
        </div>
        <div v-if="data.campaigns.list.length" class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ isAr ? 'الحملة' : 'Campaign' }}</th>
                <th>{{ isAr ? 'التصنيف' : 'Category' }}</th>
                <th>{{ isAr ? 'التاريخ' : 'Date' }}</th>
                <th>{{ isAr ? 'المستهدفون' : 'Recipients' }}</th>
                <th>{{ isAr ? 'وصلت' : 'Delivered' }}</th>
                <th>{{ isAr ? 'قُرئت' : 'Read' }}</th>
                <th>{{ isAr ? 'تفاعلات' : 'Clicks' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cm in data.campaigns.list" :key="cm.id">
                <td class="font-semibold text-slate-800">{{ cm.name }}</td>
                <td>{{ cm.category || '—' }}</td>
                <td>{{ fmt.date(cm.createdAt) }}</td>
                <td>{{ fmt.num(cm.targets) }}</td>
                <td>{{ fmt.num(cm.delivered) }}</td>
                <td>{{ fmt.num(cm.read) }}</td>
                <td>{{ fmt.num(cm.interactions) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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

const c = computed(() => data.value.conversations)
const t = computed(() => data.value.tickets)

// Categorical slots 1 & 2 (validated pair)
const trendSeries = computed(() => [
  { key: 'inbound', label: isAr.value ? 'رسائل العملاء' : 'Customer messages', color: '#2a78d6' },
  { key: 'outbound', label: isAr.value ? 'الرسائل المرسلة' : 'Messages sent', color: '#eb6834' }
])

const sourceLabel = (key) => ({
  chat: isAr.value ? 'المحادثات (فريق + أتمتة)' : 'Chats (team + automation)',
  api: isAr.value ? 'الـ API وصفحة إرسال Meta' : 'API & Meta send page',
  campaigns: isAr.value ? 'حملات Meta' : 'Meta campaigns'
}[key] || key)

const lastActivity = computed(() => {
  const cov = data.value.coverage || {}
  return cov.lastApiMessageAt || cov.lastCampaignAt || cov.lastChatAt || null
})

// Nothing at all in the period → suggest a longer one
const isEmpty = computed(() => {
  const d = data.value
  return !d.conversations.inbound && !d.sent.total && !d.tickets.opened && !d.campaigns.count
})

const deliveryItems = computed(() => {
  const d = data.value.delivery
  return [
    { key: 'sent', label: isAr.value ? 'أُرسلت' : 'Sent', value: d.sent, display: fmt.num(d.sent) },
    { key: 'delivered', label: isAr.value ? 'وصلت' : 'Delivered', value: d.delivered, display: `${fmt.num(d.delivered)} · ${fmt.percent(d.deliveredRate)}` },
    { key: 'read', label: isAr.value ? 'قُرئت' : 'Read', value: d.read, display: `${fmt.num(d.read)} · ${fmt.percent(d.readRate)}` }
  ]
})

const ratingItems = computed(() => {
  const dist = t.value.ratingDistribution
  if (!dist.some(Boolean)) return []
  return [5, 4, 3, 2, 1].map(star => ({ key: star, label: '★'.repeat(star), value: dist[star - 1], display: fmt.num(dist[star - 1]) }))
})

const stageItems = computed(() => {
  const s = data.value.stages
  if (!s) return []
  const ordered = [...s.list.filter(x => x.group === 'MAIN'), ...s.list.filter(x => x.group === 'LOST')]
  return [
    ...ordered.map(x => ({ key: x.id, label: x.name, dot: x.color, value: x.current, display: x.entered ? `${fmt.num(x.current)} (+${fmt.num(x.entered)})` : fmt.num(x.current) })),
    { key: 'none', label: isAr.value ? 'بدون مرحلة' : 'No stage', dot: '#cbd5e1', value: s.noStage, display: fmt.num(s.noStage) }
  ]
})

const tagItems = computed(() => data.value.tags.map(tag => ({ key: tag.id, label: tag.name, dot: tag.color, value: tag.count, display: fmt.num(tag.count) })))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/v1/analytics/meta', { params: { days: days.value, channelId: channelId.value || undefined } })
    data.value = res.data.data
  } catch (err) {
    data.value = null
    error.value = err.response?.status === 403
      ? (isAr.value ? 'تحليلات Meta غير متاحة في اشتراكك أو صلاحياتك.' : 'Meta analytics is not available on your plan or permissions.')
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
