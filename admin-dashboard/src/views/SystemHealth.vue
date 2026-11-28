<template>
  <div class="p-6 max-w-6xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'حالة النظام' : 'System health' }}</h1>
        <p class="text-slate-500 mt-1 text-sm">{{ isAr ? 'Redis وقواعد البيانات وطوابير العمل في الخلفية. تتحدّث كل 10 ثوانٍ.' : 'Redis, databases and background queues. Refreshes every 10 seconds.' }}</p>
      </div>
      <button type="button" class="refresh" :disabled="loading" @click="load()">
        <span :class="{ spin: loading }">↻</span> {{ isAr ? 'تحديث' : 'Refresh' }}
      </button>
    </div>

    <div v-if="error" class="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{{ error }}</div>

    <template v-if="health">
      <!-- Summary -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div v-for="c in summary" :key="c.key" class="card flex items-start gap-3">
          <span class="dot" :class="c.tone"></span>
          <div class="min-w-0">
            <div class="text-sm font-bold text-slate-800">{{ c.title }}</div>
            <div class="text-xs mt-0.5" :class="c.tone === 'bad' ? 'text-red-600' : c.tone === 'warn' ? 'text-amber-700' : 'text-slate-500'">{{ c.text }}</div>
          </div>
        </div>
      </div>

      <!-- Platform speed (services/metrics.js) -->
      <div class="card p-0 overflow-hidden mb-5">
        <div class="px-5 py-4 border-b border-slate-100">
          <h2 class="font-bold text-slate-800">{{ isAr ? `سرعة المنصة خلال آخر ${windowMinutes} دقائق` : `Platform speed over the last ${windowMinutes} minutes` }}</h2>
          <p class="text-xs text-slate-500 mt-1">{{ isAr ? 'الأرقام بالميلي ثانية. p50 = نصف الحالات كانت أسرع من هذا الرقم، وp95 = 95% منها. الأحمر يعني أبطأ من الهدف.' : 'Milliseconds. p50 = half of the cases were faster than this, p95 = 95% of them. Red means slower than the target.' }}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-slate-500 bg-slate-50">
                <th class="th text-start">{{ isAr ? 'المسار' : 'Path' }}</th>
                <th class="th">{{ isAr ? 'العدد' : 'Count' }}</th>
                <th class="th">p50</th>
                <th class="th">p95</th>
                <th class="th">{{ isAr ? 'الأقصى' : 'Max' }}</th>
                <th class="th">{{ isAr ? 'الهدف (p95)' : 'Target (p95)' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in health.latency || []" :key="m.name" class="border-t border-slate-100">
                <td class="td font-medium text-slate-800">{{ isAr ? m.ar : m.en }}</td>
                <td class="td text-center" dir="ltr">{{ m.count }}</td>
                <td class="td text-center" dir="ltr">{{ m.count ? m.p50 : '—' }}</td>
                <td class="td text-center" dir="ltr" :class="m.count && m.p95 > targetOf(m.name) ? 'text-red-600 font-bold' : ''">{{ m.count ? m.p95 : '—' }}</td>
                <td class="td text-center" dir="ltr">{{ m.count ? m.max : '—' }}</td>
                <td class="td text-center text-slate-400" dir="ltr">{{ targetOf(m.name) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid lg:grid-cols-[1fr_340px] gap-5">
        <!-- Queues -->
        <div class="card p-0 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100">
            <h2 class="font-bold text-slate-800">{{ isAr ? 'طوابير العمل في الخلفية (BullMQ)' : 'Background queues (BullMQ)' }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ isAr ? '«العمّال» = العمليات المتصلة التي تعالج هذا الطابور الآن.' : '"Workers" = connected processes handling this queue right now.' }}</p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-slate-500 bg-slate-50">
                  <th class="th text-start">{{ isAr ? 'الطابور' : 'Queue' }}</th>
                  <th class="th">{{ isAr ? 'العمّال' : 'Workers' }}</th>
                  <th class="th">{{ isAr ? 'بالانتظار' : 'Waiting' }}</th>
                  <th class="th">{{ isAr ? 'قيد التنفيذ' : 'Active' }}</th>
                  <th class="th">{{ isAr ? 'مؤجلة' : 'Delayed' }}</th>
                  <th class="th">{{ isAr ? 'فشلت' : 'Failed' }}</th>
                  <th class="th">{{ isAr ? 'اكتملت' : 'Done' }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="q in health.queues" :key="q.name">
                  <tr class="border-t border-slate-100">
                    <td class="td">
                      <div class="font-semibold text-slate-800">{{ isAr ? q.ar : q.en }}</div>
                      <div class="text-[11px] text-slate-400 font-mono" dir="ltr">{{ q.name }}</div>
                      <div v-if="queueWarning(q)" class="text-xs text-red-600 mt-1">⚠ {{ queueWarning(q) }}</div>
                    </td>
                    <td class="td text-center"><span class="pill" :class="q.workers > 0 ? 'ok' : 'bad'">{{ q.workers ?? '—' }}</span></td>
                    <td class="td text-center font-semibold" :class="(q.counts?.waiting || 0) > 100 ? 'text-amber-600' : 'text-slate-700'">{{ q.counts?.waiting ?? '—' }}</td>
                    <td class="td text-center">{{ q.counts?.active ?? '—' }}</td>
                    <td class="td text-center">{{ q.counts?.delayed ?? '—' }}</td>
                    <td class="td text-center" :class="(q.counts?.failed || 0) > 0 ? 'text-red-600 font-semibold' : ''">{{ q.counts?.failed ?? '—' }}</td>
                    <td class="td text-center text-slate-400">{{ q.counts?.completed ?? '—' }}</td>
                  </tr>
                  <tr v-if="q.recentFailures?.length" class="bg-red-50/40">
                    <td colspan="7" class="px-5 py-2">
                      <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <span class="text-[11px] font-bold text-red-700">
                          {{ isAr ? 'آخر الأخطاء' : 'Latest failures' }}
                          <span class="font-normal" :class="isOld(q) ? 'text-slate-500' : 'text-red-700'">· {{ lastFailureLabel(q) }}</span>
                        </span>
                        <button type="button" class="clean" :disabled="cleaning === q.name" @click="cleanFailed(q)">
                          {{ cleaning === q.name ? (isAr ? 'جارِ المسح…' : 'Clearing…') : (isAr ? `مسح الأخطاء (${q.counts.failed})` : `Clear failures (${q.counts.failed})`) }}
                        </button>
                      </div>
                      <p v-if="isOld(q)" class="text-[11px] text-slate-500 mb-1">{{ isAr ? 'أخطاء قديمة ولا جديد منذ أكثر من يوم: غالباً لا شيء يستدعي القلق. امسحها لتلاحظ أي خطأ جديد بسرعة.' : 'Old failures and nothing new for over a day: likely nothing to worry about. Clear them to spot new ones quickly.' }}</p>
                      <div v-for="f in q.recentFailures" :key="f.id" class="text-xs text-slate-600 flex gap-2 py-0.5">
                        <span class="text-slate-400 whitespace-nowrap">{{ fmtTime(f.at) }}</span>
                        <span class="truncate" dir="auto" :title="f.reason">{{ f.reason || '—' }}</span>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Redis + process -->
        <div class="space-y-5">
          <div class="card">
            <h2 class="font-bold text-slate-800 mb-3 flex items-center gap-2"><span class="dot" :class="health.redis.connected ? 'ok' : 'bad'"></span>Redis</h2>
            <dl class="kv">
              <dt>{{ isAr ? 'العنوان' : 'Address' }}</dt><dd dir="ltr">{{ health.redis.host }}:{{ health.redis.port }}</dd>
              <dt>{{ isAr ? 'الحالة' : 'Status' }}</dt><dd>{{ health.redis.connected ? (isAr ? `متصل (${health.redis.pingMs} ms)` : `Connected (${health.redis.pingMs} ms)`) : (health.redis.error || health.redis.status) }}</dd>
              <template v-if="health.redis.connected">
                <dt>{{ isAr ? 'الإصدار' : 'Version' }}</dt><dd dir="ltr">{{ health.redis.version }}</dd>
                <dt>{{ isAr ? 'يعمل منذ' : 'Up for' }}</dt><dd>{{ duration(health.redis.uptimeSeconds) }}</dd>
                <dt>{{ isAr ? 'الذاكرة' : 'Memory' }}</dt><dd dir="ltr">{{ health.redis.usedMemory }}<span v-if="health.redis.maxMemory && health.redis.maxMemory !== '0B'"> / {{ health.redis.maxMemory }}</span></dd>
                <dt>{{ isAr ? 'الاتصالات' : 'Clients' }}</dt><dd>{{ health.redis.connectedClients }}</dd>
                <dt>{{ isAr ? 'المفاتيح' : 'Keys' }}</dt><dd>{{ health.redis.keys }}</dd>
                <dt>{{ isAr ? 'سياسة الحذف' : 'Eviction' }}</dt>
                <dd dir="ltr" :class="evictionOk ? '' : 'text-red-600 font-semibold'">{{ health.redis.evictionPolicy || '—' }}</dd>
              </template>
            </dl>
            <p v-if="health.redis.connected && !evictionOk" class="mt-3 text-xs text-red-700 bg-red-50 rounded-lg p-2.5 leading-relaxed">
              {{ isAr ? 'يجب أن تكون noeviction، وإلا قد يحذف Redis رسائل في الطابور عند امتلاء الذاكرة. على السيرفر:' : 'Should be noeviction, otherwise Redis may drop queued jobs when memory is full. On the server:' }}
              <code class="block mt-1 font-mono" dir="ltr">redis-cli CONFIG SET maxmemory-policy noeviction</code>
            </p>
          </div>

          <div class="card">
            <h2 class="font-bold text-slate-800 mb-3">{{ isAr ? 'عملية الخادم التي أجابت' : 'Server process that answered' }}</h2>
            <dl class="kv">
              <dt>{{ isAr ? 'الدور' : 'Role' }}</dt><dd>{{ roleLabel }}</dd>
              <dt>PID</dt><dd dir="ltr">{{ health.process.pid }}</dd>
              <dt>{{ isAr ? 'يعمل منذ' : 'Up for' }}</dt><dd>{{ duration(health.process.uptimeSeconds) }}</dd>
              <dt>{{ isAr ? 'الذاكرة' : 'Memory' }}</dt><dd dir="ltr">{{ health.process.memoryMb }} MB</dd>
              <dt>Node</dt><dd dir="ltr">{{ health.process.node }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </template>
    <div v-else-if="loading" class="py-16 text-center text-slate-400">{{ isAr ? 'جارِ الفحص…' : 'Checking…' }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const health = ref(null)
const loading = ref(false)
// What each path should stay under at p95 (ms); above it the number turns red
const TARGETS = { 'webhook.handle': 500, 'inbound.wait': 1000, 'inbound.total': 2000, 'status.total': 3000, 'inbox.list': 300, 'inbox.messages': 300 }
const targetOf = (name) => TARGETS[name] || 1000
const windowMinutes = computed(() => health.value?.latency?.[0]?.windowMinutes || 5)
const error = ref('')
let timer = null

const cleaning = ref('')
const DAY_MS = 24 * 60 * 60 * 1000
const lastFailureAt = (q) => (q.recentFailures?.[0]?.at ? new Date(q.recentFailures[0].at).getTime() : null)
const isOld = (q) => !!lastFailureAt(q) && Date.now() - lastFailureAt(q) > DAY_MS
const lastFailureLabel = (q) => {
  const at = lastFailureAt(q)
  if (!at) return ''
  const minutes = Math.floor((Date.now() - at) / 60000)
  if (minutes < 60) return isAr.value ? `آخرها قبل ${minutes} دقيقة` : `last one ${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return isAr.value ? `آخرها قبل ${hours} ساعة` : `last one ${hours} h ago`
  const days = Math.floor(hours / 24)
  return isAr.value ? `آخرها قبل ${days} يوم` : `last one ${days} days ago`
}

const cleanFailed = async (q) => {
  const ok = window.confirm(isAr.value
    ? `مسح ${q.counts.failed} خطأ من «${q.ar}»؟ لن يُعاد إرسال شيء، تُحذف السجلات فقط.`
    : `Clear ${q.counts.failed} failures from "${q.en}"? Nothing is sent again; only the records are removed.`)
  if (!ok) return
  cleaning.value = q.name
  try {
    await axios.post(`/api/admin/system/queues/${q.name}/clean-failed`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
    await load()
  } catch (err) {
    error.value = isAr.value ? `تعذّر المسح: ${err.response?.data?.error?.message || err.message}` : `Could not clear: ${err.response?.data?.error?.message || err.message}`
  } finally {
    cleaning.value = ''
  }
}

const evictionOk = computed(() => !health.value?.redis?.evictionPolicy || health.value.redis.evictionPolicy === 'noeviction')
const roleLabel = computed(() => ({
  all: isAr.value ? 'عملية واحدة (الواجهة + العمل في الخلفية)' : 'Single process (API + background)',
  api: isAr.value ? 'الواجهة فقط (العمل في الخلفية بعملية منفصلة)' : 'API only (background in a separate process)',
  worker: isAr.value ? 'عامل الخلفية' : 'Background worker'
}[health.value?.process?.role] || health.value?.process?.role))

const summary = computed(() => {
  const h = health.value
  const webhook = h.queues.find(q => q.name === 'meta-webhook-queue')
  const workersOk = webhook && webhook.workers > 0
  return [
    { key: 'redis', title: 'Redis', tone: h.redis.connected ? (evictionOk.value ? 'ok' : 'warn') : 'bad', text: h.redis.connected ? (isAr.value ? `يعمل · ${h.redis.version} · ${h.redis.pingMs} ms` : `Running · ${h.redis.version} · ${h.redis.pingMs} ms`) : (isAr.value ? 'غير متصل' : 'Not connected') },
    { key: 'mysql', title: 'MySQL', tone: h.mysql.connected ? 'ok' : 'bad', text: h.mysql.connected ? (isAr.value ? `متصل · ${h.mysql.pingMs} ms` : `Connected · ${h.mysql.pingMs} ms`) : (isAr.value ? 'غير متصل' : 'Not connected') },
    { key: 'mongo', title: 'MongoDB', tone: h.mongo.connected ? 'ok' : 'bad', text: h.mongo.connected ? (isAr.value ? 'متصل' : 'Connected') : (isAr.value ? 'غير متصل' : 'Not connected') },
    { key: 'workers', title: isAr.value ? 'عامل الرسائل الواردة' : 'Incoming-message worker', tone: workersOk ? 'ok' : 'bad', text: workersOk ? (isAr.value ? `${webhook.workers} يعمل الآن` : `${webhook.workers} running`) : (isAr.value ? 'لا يوجد عامل! الرسائل الواردة لن تُعالج' : 'None! Incoming messages are not processed') }
  ]
})

const queueWarning = (q) => {
  if (q.error) return q.error
  if (q.workers === 0 && q.name !== 'campaign-queue') return isAr.value ? 'لا يوجد عامل يعالج هذا الطابور. هل عملية العامل (wakeel-worker) تعمل؟' : 'No worker is handling this queue. Is the worker process running?'
  if (q.paused) return isAr.value ? 'الطابور متوقف مؤقتاً' : 'The queue is paused'
  return ''
}

const duration = (seconds = 0) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d) return isAr.value ? `${d} يوم و${h} ساعة` : `${d}d ${h}h`
  if (h) return isAr.value ? `${h} ساعة و${m} دقيقة` : `${h}h ${m}m`
  return isAr.value ? `${m} دقيقة` : `${m}m`
}
const fmtTime = (iso) => (iso ? new Intl.DateTimeFormat(isAr.value ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '')

const load = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/admin/system/health', { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
    health.value = res.data.data
    error.value = ''
  } catch (err) {
    error.value = isAr.value ? `تعذّر الفحص: ${err.response?.data?.error?.message || err.response?.data?.error || err.message}` : `Check failed: ${err.response?.data?.error?.message || err.response?.data?.error || err.message}`
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  timer = setInterval(load, 10000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
.dot { width: 10px; height: 10px; border-radius: 999px; flex-shrink: 0; margin-top: 5px; display: inline-block; }
.dot.ok { background: #10b981; box-shadow: 0 0 0 4px #d1fae5; }
.dot.warn { background: #f59e0b; box-shadow: 0 0 0 4px #fef3c7; }
.dot.bad { background: #ef4444; box-shadow: 0 0 0 4px #fee2e2; }
.th { padding: 10px 12px; font-weight: 700; white-space: nowrap; }
.td { padding: 10px 12px; vertical-align: top; }
.pill { display: inline-block; min-width: 26px; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 12px; }
.pill.ok { background: #ecfdf5; color: #047857; }
.pill.bad { background: #fef2f2; color: #b91c1c; }
.kv { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 13px; }
.kv dt { color: #64748b; }
.kv dd { color: #0f172a; font-weight: 600; margin: 0; }
.clean { font-size: 11px; font-weight: 700; color: #b91c1c; background: white; border: 1px solid #fecaca; border-radius: 8px; padding: 3px 10px; cursor: pointer; }
.clean:hover { background: #fef2f2; }
.clean:disabled { opacity: 0.6; cursor: wait; }
.refresh { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; font-weight: 600; font-size: 13px; cursor: pointer; }
.spin { display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
