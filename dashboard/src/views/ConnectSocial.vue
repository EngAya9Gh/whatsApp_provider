<template>
  <div class="p-6 max-w-5xl mx-auto pb-24" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'انستغرام وماسنجر' : 'Instagram & Messenger' }}</h1>
      <p class="text-slate-500 mt-1 max-w-3xl leading-relaxed">{{ isAr
        ? 'اربط صفحة فيسبوك وحساب انستغرام المربوط بها، فتصل الرسائل الخاصة إلى المحادثات المباشرة مثل رسائل واتساب: بتذكرة وفريق ودوام وسير وموظف ذكي.'
        : 'Connect a Facebook Page and its Instagram account: direct messages reach Live Chat like WhatsApp messages, with tickets, teams, hours, flows and the AI agent.' }}</p>
    </div>

    <div v-if="loading" class="flex justify-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>

    <template v-else>
      <!-- Before connecting -->
      <section class="card">
        <h2 class="card-title"><i class="fas fa-list-check text-slate-400"></i>{{ isAr ? 'قبل الربط' : 'Before connecting' }}</h2>
        <ol class="checklist">
          <li><b>{{ isAr ? 'حساب انستغرام احترافي:' : 'A professional Instagram account:' }}</b> {{ isAr ? 'من تطبيق انستغرام: الإعدادات ← نوع الحساب والأدوات ← التبديل إلى حساب احترافي.' : 'In Instagram: Settings → Account type and tools → Switch to professional account.' }}</li>
          <li><b>{{ isAr ? 'مربوط بصفحة فيسبوك:' : 'Linked to a Facebook Page:' }}</b> {{ isAr ? 'من إعدادات الصفحة أو Meta Business Suite ← الحسابات المرتبطة ← انستغرام.' : 'From the Page settings or Meta Business Suite → Linked accounts → Instagram.' }}</li>
          <li><b>{{ isAr ? 'السماح بالوصول للرسائل:' : 'Allow access to messages:' }}</b> {{ isAr ? 'من تطبيق انستغرام: الإعدادات ← الرسائل والردود على القصص ← التحكم في الرسائل ← الأدوات المتصلة ← «السماح بالوصول إلى الرسائل».' : 'In Instagram: Settings → Messages and story replies → Message controls → Connected tools → "Allow access to messages".' }}</li>
          <li><b>{{ isAr ? 'أنت مسؤول في الصفحة' : 'You are an admin of the Page' }}</b> {{ isAr ? '(لديك تحكم كامل فيها).' : '(full control).' }}</li>
        </ol>
      </section>

      <div v-if="!config.configId" class="warn">
        <i class="fas fa-circle-info"></i>
        <span>{{ isAr ? 'ربط انستغرام وماسنجر غير مفعّل على المنصة بعد. تواصل مع الدعم.' : 'Instagram & Messenger are not enabled on the platform yet. Contact support.' }}
          <small class="block opacity-70 mt-1" dir="ltr">META_FB_PAGES_CONFIG_ID</small>
        </span>
      </div>

      <!-- Connected channels -->
      <section class="card">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 class="card-title !mb-0"><i class="fas fa-plug text-slate-400"></i>{{ isAr ? 'القنوات المربوطة' : 'Connected channels' }}</h2>
          <button type="button" class="primary" :disabled="!config.configId || busy" @click="login">
            <i class="fab fa-facebook"></i>{{ isAr ? 'ربط صفحة وحساب انستغرام' : 'Connect a Page & Instagram' }}
          </button>
        </div>
        <div v-if="!channels.length" class="text-sm text-slate-400 py-6 text-center">{{ isAr ? 'لا توجد قنوات مربوطة بعد.' : 'No channels connected yet.' }}</div>
        <div v-for="c in channels" :key="c.id" class="row">
          <img v-if="c.picture" :src="c.picture" class="avatar" alt="" />
          <span v-else class="avatar icon"><i :class="kindIcon(c.kind)"></i></span>
          <div class="min-w-0 flex-1">
            <div class="font-bold text-slate-800 truncate"><i :class="kindIcon(c.kind)" class="me-1"></i>{{ c.name }}</div>
            <div class="text-xs text-slate-500">
              {{ kindLabel(c.kind) }}<template v-if="c.kind === 'INSTAGRAM' && c.pageName"> · {{ isAr ? 'عبر صفحة' : 'via page' }} {{ c.pageName }}</template>
              <template v-if="c.billing.price"> · {{ c.billing.price }} {{ isAr ? 'ر.س شهرياً' : 'SAR / month' }}</template>
              <span v-if="c.billing.state === 'UNPAID'" class="text-red-600 font-bold"> · {{ isAr ? 'متوقف: الرصيد لا يكفي' : 'Stopped: balance too low' }}</span>
            </div>
          </div>
          <span class="pill" :class="c.status === 'CONNECTED' ? 'on' : 'off'">{{ c.status === 'CONNECTED' ? (isAr ? 'متصل' : 'Connected') : (isAr ? 'مفصول' : 'Disconnected') }}</span>
          <button v-if="c.status === 'CONNECTED'" type="button" class="danger" @click="disconnect(c)"><i class="fas fa-link-slash"></i></button>
        </div>
      </section>

      <!-- Pages shared in the Facebook popup -->
      <section v-if="session" class="card">
        <h2 class="card-title"><i class="fas fa-hand-pointer text-slate-400"></i>{{ isAr ? 'اختر ما تريد ربطه' : 'Choose what to connect' }}</h2>
        <div v-for="p in session.pages" :key="p.id" class="page">
          <div class="flex items-center gap-3 mb-3">
            <img v-if="p.picture" :src="p.picture" class="avatar" alt="" />
            <div class="font-bold text-slate-800">{{ p.name }}</div>
          </div>
          <label class="opt" :class="{ disabled: p.messenger === 'ELSEWHERE' }">
            <input type="checkbox" v-model="pick[p.id].messenger" :disabled="p.messenger === 'ELSEWHERE'" />
            <i class="fab fa-facebook-messenger text-blue-600"></i>
            <span>{{ isAr ? 'رسائل ماسنجر للصفحة' : 'The page\'s Messenger inbox' }}</span>
            <small v-if="p.messenger === 'HERE'" class="tag">{{ isAr ? 'مربوطة' : 'connected' }}</small>
            <small v-if="p.messenger === 'ELSEWHERE'" class="tag red">{{ isAr ? 'مربوطة بحساب وكيل آخر' : 'on another Wakeel account' }}</small>
            <small v-if="session.prices.MESSENGER" class="price">{{ session.prices.MESSENGER }} {{ isAr ? 'ر.س/شهر' : 'SAR/mo' }}</small>
          </label>
          <label v-if="p.instagram" class="opt" :class="{ disabled: p.instagram.state === 'ELSEWHERE' }">
            <input type="checkbox" v-model="pick[p.id].instagram" :disabled="p.instagram.state === 'ELSEWHERE'" />
            <i class="fab fa-instagram text-pink-600"></i>
            <span dir="ltr">@{{ p.instagram.username }}</span>
            <small v-if="p.instagram.state === 'HERE'" class="tag">{{ isAr ? 'مربوط' : 'connected' }}</small>
            <small v-if="p.instagram.state === 'ELSEWHERE'" class="tag red">{{ isAr ? 'مربوط بحساب وكيل آخر' : 'on another Wakeel account' }}</small>
            <small v-if="session.prices.INSTAGRAM" class="price">{{ session.prices.INSTAGRAM }} {{ isAr ? 'ر.س/شهر' : 'SAR/mo' }}</small>
          </label>
          <p v-else class="text-xs text-slate-500 mt-1"><i class="fab fa-instagram me-1"></i>{{ isAr ? 'لا يوجد حساب انستغرام احترافي مربوط بهذه الصفحة.' : 'No professional Instagram account is linked to this page.' }}</p>
          <button type="button" class="primary mt-3" :disabled="busy || (!pick[p.id].messenger && !pick[p.id].instagram)" @click="finish(p)">
            <i class="fas" :class="busy ? 'fa-spinner fa-spin' : 'fa-check'"></i>{{ isAr ? 'ربط' : 'Connect' }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Swal from 'sweetalert2'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const loading = ref(true)
const busy = ref(false)
const config = ref({})
const channels = ref([])
const session = ref(null)
const pick = ref({})

const kindIcon = (kind) => (kind === 'INSTAGRAM' ? 'fab fa-instagram text-pink-600' : 'fab fa-facebook-messenger text-blue-600')
const kindLabel = (kind) => (kind === 'INSTAGRAM' ? 'Instagram' : 'Messenger')
const errorText = (err) => err?.response?.data?.error?.message || err?.message || ''

async function load() {
  try {
    const [cfg, list] = await Promise.all([axios.get('/api/v1/social/config'), axios.get('/api/v1/social/channels')])
    config.value = cfg.data.data || {}
    channels.value = list.data.data || []
    if (config.value.appId) loadSdk(config.value.appId)
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر التحميل' : 'Could not load', text: errorText(err) })
  } finally {
    loading.value = false
  }
}

// Facebook SDK (the same app as the WhatsApp connection)
function loadSdk(appId) {
  const init = () => { try { window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: 'v21.0' }) } catch { /* already initialised */ } }
  if (window.FB) return init()
  window.fbAsyncInit = init
  if (document.getElementById('facebook-jssdk')) return
  const script = document.createElement('script')
  script.id = 'facebook-jssdk'
  script.async = true
  script.defer = true
  script.crossOrigin = 'anonymous'
  script.src = 'https://connect.facebook.net/en_US/sdk.js'
  document.head.appendChild(script)
}

// The popup must open straight from the click (popup blockers), so no await before FB.login
function login() {
  if (!window.FB) return Swal.fire({ icon: 'info', title: isAr.value ? 'لحظة، يتم تحميل فيسبوك… حاول مرة أخرى' : 'Facebook is still loading, try again' })
  // A "User access token" configuration hands back the user token itself; the server checks with Meta that
  // it was issued to our app. (A code from the JavaScript SDK is tied to the SDK's own redirect address.)
  window.FB.login((response) => {
    const accessToken = response?.authResponse?.accessToken
    const code = response?.authResponse?.code
    if (!accessToken && !code) return
    ;(async () => {
      busy.value = true
      try {
        const res = await axios.post('/api/v1/social/connect/start', accessToken ? { accessToken } : { code })
        session.value = res.data.data
        pick.value = Object.fromEntries(session.value.pages.map(p => [p.id, {
          messenger: p.messenger === 'FREE',
          instagram: !!p.instagram && p.instagram.state === 'FREE'
        }]))
      } catch (err) {
        Swal.fire({ icon: 'error', title: isAr.value ? 'لم يكتمل الربط' : 'Not connected', text: errorText(err) })
      } finally {
        busy.value = false
      }
    })()
  }, { config_id: config.value.configId })
}

async function finish(page) {
  busy.value = true
  try {
    await axios.post('/api/v1/social/connect/finish', { sessionId: session.value.sessionId, pageId: page.id, ...pick.value[page.id] })
    const list = await axios.get('/api/v1/social/channels')
    channels.value = list.data.data || []
    session.value.pages = session.value.pages.filter(p => p.id !== page.id)
    if (!session.value.pages.length) session.value = null
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success', title: isAr.value ? 'تم الربط، الرسائل الجديدة تصل للمحادثات المباشرة' : 'Connected: new messages reach Live Chat' })
  } catch (err) {
    const code = err?.response?.data?.error?.code
    Swal.fire({
      icon: 'error',
      title: isAr.value ? 'لم يكتمل الربط' : 'Not connected',
      text: code === 'SESSION_EXPIRED' ? (isAr.value ? 'انتهت جلسة فيسبوك، اربط من جديد.' : errorText(err))
        : code === 'INSUFFICIENT_BALANCE' ? (isAr.value ? 'رصيد المحفظة لا يغطي اشتراك القناة. اشحن الرصيد من «الاستهلاك والفواتير».' : errorText(err))
          : errorText(err)
    })
  } finally {
    busy.value = false
  }
}

async function disconnect(channel) {
  const ok = await Swal.fire({
    icon: 'warning',
    title: isAr.value ? `فصل ${channel.name}؟` : `Disconnect ${channel.name}?`,
    text: isAr.value ? 'لن تصل رسائله الجديدة. المحادثات والتذاكر السابقة تبقى.' : 'New messages stop arriving. Past conversations and tickets stay.',
    showCancelButton: true,
    confirmButtonText: isAr.value ? 'فصل' : 'Disconnect',
    cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel',
    confirmButtonColor: '#dc2626'
  })
  if (!ok.isConfirmed) return
  try {
    await axios.delete(`/api/v1/social/channels/${channel.id}`)
    const list = await axios.get('/api/v1/social/channels')
    channels.value = list.data.data || []
  } catch (err) {
    Swal.fire({ icon: 'error', text: errorText(err) })
  }
}

onMounted(load)
</script>

<style scoped>
.card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); padding: 20px; margin-bottom: 16px; }
.card-title { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #1e293b; font-size: 15px; margin-bottom: 14px; }
.checklist { margin: 0; padding-inline-start: 20px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #475569; line-height: 1.7; }
.checklist b { color: #1e293b; }
.warn { display: flex; gap: 10px; align-items: flex-start; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-radius: 14px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; }
.primary { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 12px; border: none; background: #FF6600; color: white; font-weight: 700; font-size: 14px; cursor: pointer; }
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid #f1f5f9; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.avatar.icon { background: #f8fafc; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; }
.pill { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
.pill.on { background: #ecfdf5; color: #047857; }
.pill.off { background: #f1f5f9; color: #64748b; }
.danger { width: 34px; height: 34px; border-radius: 10px; border: 1px solid #fecaca; background: white; color: #dc2626; cursor: pointer; }
.page { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 12px; }
.opt { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: pointer; font-size: 14px; color: #334155; }
.opt:hover { background: #f8fafc; }
.opt.disabled { opacity: 0.55; cursor: not-allowed; }
.opt input { accent-color: #FF6600; width: 16px; height: 16px; }
.tag { font-size: 11px; background: #ecfdf5; color: #047857; border-radius: 999px; padding: 1px 8px; }
.tag.red { background: #fef2f2; color: #b91c1c; }
.price { margin-inline-start: auto; font-size: 11.5px; color: #64748b; }
</style>
