<template>
  <div class="p-6 max-w-6xl mx-auto pb-28" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'ويدجت الموقع' : 'Website chat widget' }}</h1>
        <p class="text-slate-500 mt-1 max-w-2xl leading-relaxed">{{ isAr
          ? 'زر محادثة يظهر في زاوية موقعك. الزائر يكتب من الموقع مباشرة، ورسالته تصل إلى المحادثات المباشرة مثل رسائل واتساب: بتذكرة وفريق ودوام وسير وموظف ذكي.'
          : 'A chat button in the corner of your website. Visitors write from the page and their messages reach Live Chat like WhatsApp messages: with tickets, teams, hours, flows and the AI agent.' }}</p>
      </div>
      <button v-if="widgets.length" type="button" class="ghost" @click="createWidget"><i class="fas fa-plus"></i>{{ isAr ? 'ويدجت لموقع آخر' : 'Widget for another site' }}</button>
    </div>

    <div v-if="loading" class="flex justify-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
    <div v-else-if="loadError" class="card text-center text-slate-500 py-10">{{ loadError }}</div>

    <!-- No widget yet -->
    <div v-else-if="!widgets.length" class="card text-center py-12">
      <div class="mx-auto w-14 h-14 rounded-2xl bg-orange-50 text-[#FF6600] flex items-center justify-center text-2xl mb-4"><i class="fas fa-comment-dots"></i></div>
      <h2 class="font-bold text-slate-800 text-lg">{{ isAr ? 'لا يوجد ويدجت بعد' : 'No widget yet' }}</h2>
      <ol class="steps">
        <li><span>1</span>{{ isAr ? 'أنشئ الويدجت واختر شكله' : 'Create the widget and pick its look' }}</li>
        <li><span>2</span>{{ isAr ? 'انسخ سطر الكود إلى موقعك' : 'Copy one line of code to your website' }}</li>
        <li><span>3</span>{{ isAr ? 'ردّ على الزوار من المحادثات المباشرة' : 'Answer visitors from Live Chat' }}</li>
      </ol>
      <button type="button" class="save mt-6" :disabled="saving" @click="createWidget"><i class="fas fa-plus"></i>{{ isAr ? 'أنشئ الويدجت' : 'Create the widget' }}</button>
    </div>

    <template v-else>
      <!-- Several widgets: one per website -->
      <div v-if="widgets.length > 1" class="flex flex-wrap gap-2 mb-4">
        <button v-for="w in widgets" :key="w.id" type="button" class="pill" :class="{ on: w.id === currentId }" @click="select(w.id)">
          <span class="dot" :class="w.billing?.state === 'UNPAID' ? 'bg-red-500' : w.settings.enabled ? 'bg-emerald-500' : 'bg-slate-300'"></span>{{ w.name || w.settings.title }}
        </button>
      </div>

      <!-- Monthly fee from the wallet (set by the platform; none = free) -->
      <div v-if="current?.billing?.price" class="fee" :class="{ stopped: current.billing.state === 'UNPAID' }">
        <i class="fas" :class="current.billing.state === 'UNPAID' ? 'fa-circle-pause' : 'fa-wallet'"></i>
        <span v-if="current.billing.state === 'UNPAID'">{{ isAr
          ? `الويدجت متوقف ومختفٍ من موقعك لأن رصيد المحفظة لا يغطي اشتراكه (${current.billing.price} ر.س شهرياً). اشحن الرصيد ويعود خلال ساعة، أو جدّده الآن.`
          : `The widget is stopped and hidden from your site: the wallet does not cover its fee (${current.billing.price} SAR a month). Top up and it returns within the hour, or renew now.` }}</span>
        <span v-else>{{ isAr
          ? `الاشتراك ${current.billing.price} ر.س شهرياً من رصيد المحفظة نفسه${current.billing.paidUntil ? ` · مدفوع حتى ${formatDay(current.billing.paidUntil)}` : ''}. يظهر في «الاستهلاك والفواتير» باسم «ويدجت الموقع».`
          : `${current.billing.price} SAR a month from your wallet${current.billing.paidUntil ? ` · paid until ${formatDay(current.billing.paidUntil)}` : ''}. Shown under "Website widget" in Usage & Billing.` }}</span>
        <span v-if="current.billing.state === 'UNPAID'" class="fee-actions">
          <router-link to="/billing" class="ghost">{{ isAr ? 'المحفظة' : 'Wallet' }}</router-link>
          <button type="button" class="save" :disabled="saving" @click="renew">{{ isAr ? 'جدّد الآن' : 'Renew now' }}</button>
        </span>
      </div>

      <div class="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div>
          <!-- Install -->
          <section class="card">
            <h2 class="card-title"><span class="num">1</span>{{ isAr ? 'ضعه على موقعك' : 'Put it on your website' }}</h2>
            <p class="text-xs text-slate-500 -mt-2 mb-3 leading-relaxed">{{ isAr
              ? 'سطر واحد يُلصق في موقعك مرة واحدة، وبعدها يظهر الزر في كل الصفحات. اختر منصة موقعك:'
              : 'One line, pasted once, and the button shows on every page. Pick your website platform:' }}</p>
            <div class="tabs" role="tablist">
              <button v-for="p in platforms" :key="p.key" type="button" role="tab" :aria-selected="platform === p.key" :class="{ on: platform === p.key }" @click="platform = p.key">{{ p.label }}</button>
            </div>
            <ol class="how">
              <li v-for="(step, i) in currentPlatform.steps" :key="i">{{ step }}</li>
            </ol>
            <div class="code" dir="ltr">
              <code>{{ currentPlatform.jsOnly ? jsSnippet : snippet }}</code>
              <button type="button" class="copy" @click="copy(currentPlatform.jsOnly ? jsSnippet : snippet)"><i class="far fa-copy"></i>{{ isAr ? 'نسخ' : 'Copy' }}</button>
            </div>
            <p v-if="currentPlatform.note" class="note warn"><i class="fas fa-triangle-exclamation"></i>{{ currentPlatform.note }}</p>
            <div class="flex flex-wrap gap-2 mt-3">
              <a :href="tryUrl" target="_blank" rel="noopener" class="ghost"><i class="fas fa-up-right-from-square"></i>{{ isAr ? 'جرّبه الآن في صفحة تجربة' : 'Try it on a test page' }}</a>
            </div>
            <p class="note"><i class="fas fa-circle-info"></i>{{ isAr
              ? 'الويدجت قناة مثل رقم الواتساب: اضبط فريقه وأوقات عمله ورسالة خارج الدوام من صفحة «الفرق والشيفتات»، وسيره والموظف الذكي من «سير الواتساب»، وستجده هناك باسمه.'
              : 'The widget is a channel like a WhatsApp number: set its team, working hours and away message on Teams & Shifts, and its flow and AI agent on Chat Flows, where it appears under its name.' }}</p>
          </section>

          <!-- Look -->
          <section class="card">
            <h2 class="card-title"><span class="num">2</span>{{ isAr ? 'الشكل والنصوص' : 'Look and texts' }}</h2>
            <div class="grid sm:grid-cols-2 gap-4">
              <label class="field">
                <span>{{ isAr ? 'اسم الويدجت (يظهر لفريقك فقط)' : 'Widget name (only your team sees it)' }}</span>
                <input v-model="form.name" class="inp" maxlength="80" :placeholder="isAr ? 'مثال: موقع المتجر' : 'e.g. Store website'" />
              </label>
              <label class="field">
                <span>{{ isAr ? 'العنوان أعلى النافذة' : 'Title at the top' }}</span>
                <input v-model="form.settings.title" class="inp" maxlength="60" />
              </label>
              <label class="field sm:col-span-2">
                <span>{{ isAr ? 'رسالة الترحيب' : 'Welcome message' }}</span>
                <textarea v-model="form.settings.welcome" class="inp" rows="2" maxlength="500"></textarea>
              </label>
              <label class="field">
                <span>{{ isAr ? 'اللون' : 'Colour' }}</span>
                <span class="flex items-center gap-2">
                  <input v-model="form.settings.color" type="color" class="swatch" />
                  <input v-model="form.settings.color" class="inp" dir="ltr" maxlength="7" />
                </span>
              </label>
              <div class="field">
                <span>{{ isAr ? 'مكانه في الصفحة' : 'Corner of the page' }}</span>
                <div class="seg">
                  <button type="button" :class="{ on: form.settings.position === 'right' }" @click="form.settings.position = 'right'">{{ isAr ? 'يمين' : 'Right' }}</button>
                  <button type="button" :class="{ on: form.settings.position === 'left' }" @click="form.settings.position = 'left'">{{ isAr ? 'يسار' : 'Left' }}</button>
                </div>
              </div>
              <div class="field">
                <span>{{ isAr ? 'لغة الويدجت' : 'Widget language' }}</span>
                <div class="seg">
                  <button type="button" :class="{ on: form.settings.language === 'ar' }" @click="form.settings.language = 'ar'">العربية</button>
                  <button type="button" :class="{ on: form.settings.language === 'en' }" @click="form.settings.language = 'en'">English</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Before the chat -->
          <section class="card">
            <h2 class="card-title"><span class="num">3</span>{{ isAr ? 'قبل أول رسالة' : 'Before the first message' }}</h2>
            <label class="row mb-4">
              <Switch :on="form.settings.askName" @toggle="form.settings.askName = !form.settings.askName" />
              <span>
                <span class="row-title">{{ isAr ? 'اسأل عن الاسم' : 'Ask for the name' }}</span>
                <span class="row-desc">{{ isAr ? 'يظهر الاسم في المحادثات المباشرة بدل «زائر».' : 'The name shows in Live Chat instead of "Visitor".' }}</span>
              </span>
            </label>
            <div class="field">
              <span>{{ isAr ? 'رقم الجوال' : 'Mobile number' }}</span>
              <div class="seg">
                <button v-for="opt in phoneOptions" :key="opt.key" type="button" :class="{ on: form.settings.askPhone === opt.key }" @click="form.settings.askPhone = opt.key">{{ opt.label }}</button>
              </div>
            </div>
            <p class="note"><i class="fas fa-circle-info"></i>{{ isAr
              ? 'الرقم المكتوب في الموقع غير موثّق، فيظهر لفريقك فقط ولا يُربط بجهات الاتصال أو الـ CRM إلا إذا تابع العميل على واتساب.'
              : 'A number typed on a website is not verified: your team sees it, but it is not linked to contacts or the CRM unless the customer continues on WhatsApp.' }}</p>
          </section>

          <!-- WhatsApp -->
          <section class="card">
            <h2 class="card-title"><span class="num">4</span>{{ isAr ? 'زر «تابع على واتساب»' : '"Continue on WhatsApp" button' }}</h2>
            <p class="text-xs text-slate-500 -mt-2 mb-3 leading-relaxed">{{ isAr
              ? 'الزائر يكمل المحادثة على واتساب برمز قصير (مثل W-3FA9C1). عندما يرسله إلى رقمك، نربط المحادثتين بملاحظة للفريق، فتعرفون أنه نفس الشخص ولا تخسرونه عندما يغلق الموقع.'
              : 'The visitor continues on WhatsApp with a short code (like W-3FA9C1). When it reaches your number, both conversations get a team note linking them, so you know it is the same person and do not lose them when they leave the site.' }}</p>
            <div class="flex flex-wrap gap-2 items-center">
              <input v-model="form.settings.whatsappNumber" class="inp max-w-xs" dir="ltr" :placeholder="isAr ? 'بدون زر (فارغ)' : 'No button (empty)'" />
              <button v-for="n in whatsappNumbers" :key="n.id" type="button" class="chip" @click="form.settings.whatsappNumber = n.digits">{{ n.label }}</button>
            </div>
          </section>

          <!-- Websites -->
          <section class="card">
            <h2 class="card-title"><span class="num">5</span>{{ isAr ? 'المواقع المسموح بها' : 'Allowed websites' }}</h2>
            <textarea v-model="domainsText" class="inp" rows="2" dir="ltr" placeholder="mystore.com, shop.mystore.com"></textarea>
            <p class="note"><i class="fas fa-shield-halved"></i>{{ isAr
              ? 'اتركها فارغة ليعمل على أي موقع. إذا كتبت مواقعك، لا يعمل الويدجت في مواقع أخرى حتى لو نسخ أحد الكود (والنطاقات الفرعية مسموحة تلقائياً).'
              : 'Leave empty to work on any site. If you list your sites, the widget does not work elsewhere even if someone copies the code (subdomains are allowed).' }}</p>
          </section>

          <section class="card flex flex-wrap items-center justify-between gap-3">
            <label class="row">
              <Switch :on="form.settings.enabled" @toggle="form.settings.enabled = !form.settings.enabled" />
              <span>
                <span class="row-title">{{ form.settings.enabled ? (isAr ? 'الويدجت يعمل' : 'The widget is on') : (isAr ? 'الويدجت متوقف' : 'The widget is off') }}</span>
                <span class="row-desc">{{ isAr ? 'عند الإيقاف يختفي الزر من موقعك وتبقى المحادثات السابقة.' : 'When off, the button disappears from your site; past conversations stay.' }}</span>
              </span>
            </label>
            <button type="button" class="danger" @click="removeWidget"><i class="far fa-trash-can"></i>{{ isAr ? 'حذف الويدجت' : 'Delete widget' }}</button>
          </section>
        </div>

        <!-- Preview -->
        <aside class="preview-wrap">
          <div class="text-xs font-bold text-slate-500 mb-2">{{ isAr ? 'معاينة' : 'Preview' }}</div>
          <div class="preview" :dir="form.settings.language === 'en' ? 'ltr' : 'rtl'">
            <div class="pv-panel">
              <div class="pv-head" :style="{ background: color }">
                <b>{{ form.settings.title || '—' }}</b>
                <small><span class="pv-dot"></span>{{ form.settings.language === 'en' ? 'We are online' : 'متصلون الآن' }}</small>
              </div>
              <div class="pv-body">
                <div v-if="form.settings.welcome" class="pv-msg">{{ form.settings.welcome }}</div>
                <div class="pv-msg me" :style="{ background: color }">{{ form.settings.language === 'en' ? 'Hi, is this available?' : 'مرحباً، هل المنتج متوفر؟' }}</div>
              </div>
              <div v-if="form.settings.askName || form.settings.askPhone !== 'OFF'" class="pv-form">
                <div v-if="form.settings.askName" class="pv-input">{{ form.settings.language === 'en' ? 'Name' : 'الاسم' }}</div>
                <div v-if="form.settings.askPhone !== 'OFF'" class="pv-input">{{ form.settings.language === 'en' ? 'Mobile number' : 'رقم الجوال' }}{{ form.settings.askPhone === 'OPTIONAL' ? (form.settings.language === 'en' ? ' (optional)' : ' (اختياري)') : '' }}</div>
              </div>
              <div v-if="form.settings.whatsappNumber" class="pv-wa">🟢 {{ form.settings.language === 'en' ? 'Continue on WhatsApp' : 'تابع على واتساب' }}</div>
            </div>
            <div class="pv-launcher" :class="form.settings.position" :style="{ background: color }"><i class="fas fa-comment"></i></div>
          </div>
        </aside>
      </div>

      <div class="savebar mt-5">
        <span class="text-sm text-slate-500">{{ dirty ? (isAr ? 'لديك تغييرات غير محفوظة' : 'You have unsaved changes') : (isAr ? 'كل التغييرات محفوظة' : 'All changes saved') }}</span>
        <button type="button" class="save" :disabled="saving || !dirty" @click="save">
          <i class="fas" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i>{{ isAr ? 'حفظ' : 'Save' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Swal from 'sweetalert2'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const Switch = (props, { emit }) => h('button', {
  type: 'button',
  class: ['switch', { on: props.on }],
  role: 'switch',
  'aria-checked': String(!!props.on),
  onClick: (e) => { e.preventDefault(); emit('toggle') }
}, [h('span', { class: 'knob' })])
Switch.props = ['on']
Switch.emits = ['toggle']

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const widgets = ref([])
const currentId = ref(null)
const form = ref(null)
const saved = ref('')
const domainsText = ref('')
const metaChannels = ref([])

const phoneOptions = computed(() => [
  { key: 'OFF', label: isAr.value ? 'لا تسأل' : 'Do not ask' },
  { key: 'OPTIONAL', label: isAr.value ? 'اختياري' : 'Optional' },
  { key: 'REQUIRED', label: isAr.value ? 'مطلوب' : 'Required' }
])

const errorText = (err) => err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || ''
const toast = (icon, title) => Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, icon, title })

const color = computed(() => (/^#[0-9a-f]{6}$/i.test(form.value?.settings?.color || '') ? form.value.settings.color : '#FF6600'))
const payload = () => ({
  name: form.value.name,
  settings: { ...form.value.settings, allowedDomains: domainsText.value.split(/[\s,]+/).filter(Boolean) }
})
const dirty = computed(() => !!form.value && JSON.stringify(payload()) !== saved.value)

const origin = window.location.origin
const snippet = computed(() => `<script src="${origin}/api/v1/webchat/widget.js" data-id="${currentId.value}" async><\/script>`)
const tryUrl = computed(() => `${origin}/api/v1/webchat/try/${currentId.value}`)
// For boxes that take JavaScript only (no HTML tags): the same widget, added by a few lines of JS
const jsSnippet = computed(() => `(function(){var s=document.createElement('script');s.src='${origin}/api/v1/webchat/widget.js';s.async=true;s.setAttribute('data-id','${currentId.value}');document.body.appendChild(s);})();`)
const current = computed(() => widgets.value.find(w => w.id === currentId.value) || null)
const formatDay = (iso) => new Intl.DateTimeFormat(isAr.value ? 'ar-u-nu-latn-ca-gregory' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

// Where the line goes on each website platform
const platform = ref('html')
const platforms = computed(() => isAr.value ? [
  { key: 'html', label: 'موقع عادي', steps: ['افتح ملف القالب المشترك لكل الصفحات (عادةً footer أو layout).', 'الصق السطر قبل </body> مباشرة واحفظ.', 'افتح موقعك: يظهر الزر في الزاوية.'] },
  { key: 'wordpress', label: 'ووردبريس', steps: ['من «الإضافات» ثبّت إضافة WPCode (Insert Headers and Footers) وفعّلها.', 'افتح Code Snippets ← Header & Footer.', 'الصق السطر في خانة Footer واحفظ.'] },
  { key: 'shopify', label: 'شوبيفاي', steps: ['Online Store ← Themes ← زر (…) بجانب القالب ← Edit code.', 'افتح الملف layout/theme.liquid.', 'الصق السطر قبل </body> مباشرة واحفظ.'] },
  { key: 'salla', label: 'سلة', jsOnly: true, steps: ['من لوحة سلة: «تصميم المتجر» ثم تخصيص الثيم بالأكواد.', 'في خانة JavaScript الصق الكود أدناه (نسخة JavaScript بدون وسوم) واحفظ.'], note: 'تشترط سلة أن يكون للمتجر دومين خاص، وأن تكون لديك صلاحية تصميم المتجر.' },
  { key: 'zid', label: 'زد', steps: ['زد لا يوفّر لكل الباقات خانة لإضافة كود يدوياً؛ تُضاف السكربتات عندهم عادةً عبر تطبيقات متجر زد.', 'إذا وجدت في لوحة متجرك خانة للأكواد المخصصة، الصق السطر فيها. وإلا اسأل دعم زد عن إضافة سكربت خارجي لمتجرك.'] }
] : [
  { key: 'html', label: 'Any website', steps: ['Open the template shared by all pages (usually the footer or layout).', 'Paste the line right before </body> and save.', 'Open your site: the button is in the corner.'] },
  { key: 'wordpress', label: 'WordPress', steps: ['Plugins → install and activate WPCode (Insert Headers and Footers).', 'Open Code Snippets → Header & Footer.', 'Paste the line in the Footer box and save.'] },
  { key: 'shopify', label: 'Shopify', steps: ['Online Store → Themes → (…) next to the theme → Edit code.', 'Open layout/theme.liquid.', 'Paste the line right before </body> and save.'] },
  { key: 'salla', label: 'Salla', jsOnly: true, steps: ['In Salla: Store design, then customise the theme with code.', 'Paste the code below (JavaScript version, no tags) in the JavaScript box and save.'], note: 'Salla requires your own store domain and the store-design permission.' },
  { key: 'zid', label: 'Zid', steps: ['Zid does not give every plan a box for manual code; scripts are usually added through Zid apps.', 'If your store has a custom code box, paste the line there. Otherwise ask Zid support about adding an external script.'] }
])
const currentPlatform = computed(() => platforms.value.find(p => p.key === platform.value) || platforms.value[0])

// The tenant's WhatsApp numbers, to fill the "Continue on WhatsApp" number in one click
const whatsappNumbers = computed(() => metaChannels.value
  .filter(c => c.providerType === 'META_CLOUD')
  .map(c => ({ id: c.id, digits: String(c.displayPhoneNumber || c.phoneNumber || '').replace(/\D/g, ''), label: c.displayPhoneNumber || c.phoneNumber || c.name }))
  .filter(n => n.digits.length >= 8))

function select(id) {
  const widget = widgets.value.find(w => w.id === id)
  if (!widget) return
  currentId.value = id
  form.value = { name: widget.name, settings: { ...widget.settings } }
  domainsText.value = (widget.settings.allowedDomains || []).join(', ')
  saved.value = JSON.stringify(payload())
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [res, channels] = await Promise.all([
      axios.get('/api/v1/webchat/widgets'),
      axios.get('/api/v1/channels').catch(() => ({ data: { data: [] } }))
    ])
    widgets.value = res.data.data || []
    metaChannels.value = channels.data.data || []
    if (widgets.value.length) select(widgets.value.find(w => w.id === currentId.value)?.id || widgets.value[0].id)
  } catch (err) {
    loadError.value = errorText(err) || (isAr.value ? 'تعذّر تحميل الويدجت' : 'Could not load the widgets')
  } finally {
    loading.value = false
  }
}

async function createWidget() {
  saving.value = true
  try {
    const res = await axios.post('/api/v1/webchat/widgets', {
      name: widgets.value.length ? (isAr.value ? `موقع ${widgets.value.length + 1}` : `Website ${widgets.value.length + 1}`) : (isAr.value ? 'موقعي' : 'My website'),
      settings: isAr.value ? {} : { title: 'Chat with us', welcome: 'Hi 👋 How can we help?', language: 'en' }
    })
    widgets.value.push(res.data.data)
    select(res.data.data.id)
    toast('success', isAr.value ? 'تم إنشاء الويدجت، انسخ الكود إلى موقعك' : 'Widget created, copy the code to your site')
  } catch (err) {
    if (err?.response?.data?.error?.code === 'INSUFFICIENT_BALANCE') {
      Swal.fire({ icon: 'info', title: isAr.value ? 'الرصيد لا يكفي' : 'Balance too low', text: isAr.value ? 'ويدجت الموقع اشتراك شهري يُخصم من رصيد المحفظة. اشحن الرصيد من «الاستهلاك والفواتير» ثم أنشئه.' : errorText(err) })
    } else {
      toast('error', errorText(err))
    }
  } finally {
    saving.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const res = await axios.put(`/api/v1/webchat/widgets/${currentId.value}`, payload())
    const i = widgets.value.findIndex(w => w.id === currentId.value)
    widgets.value[i] = res.data.data
    select(res.data.data.id)
    toast('success', isAr.value ? 'تم الحفظ' : 'Saved')
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'لم يُحفظ' : 'Not saved', text: errorText(err) })
  } finally {
    saving.value = false
  }
}

async function renew() {
  saving.value = true
  try {
    const res = await axios.post(`/api/v1/webchat/widgets/${currentId.value}/renew`)
    const i = widgets.value.findIndex(w => w.id === currentId.value)
    widgets.value[i] = res.data.data
    toast('success', isAr.value ? 'تم التجديد، الويدجت يعمل الآن' : 'Renewed, the widget is on')
  } catch (err) {
    Swal.fire({ icon: 'info', title: isAr.value ? 'لم يتجدد' : 'Not renewed', text: err?.response?.data?.error?.code === 'INSUFFICIENT_BALANCE' ? (isAr.value ? 'الرصيد لا يكفي بعد. اشحن المحفظة أولاً.' : errorText(err)) : errorText(err) })
  } finally {
    saving.value = false
  }
}

async function removeWidget() {
  const ok = await Swal.fire({
    icon: 'warning',
    title: isAr.value ? 'حذف الويدجت؟' : 'Delete the widget?',
    text: isAr.value ? 'سيتوقف الزر في موقعك. إذا كان له تذاكر في التقارير فلن يُحذف، أوقفه بدلاً من ذلك.' : 'The button stops working on your site. A widget with tickets in the reports cannot be deleted; switch it off instead.',
    showCancelButton: true,
    confirmButtonText: isAr.value ? 'حذف' : 'Delete',
    cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel',
    confirmButtonColor: '#dc2626'
  })
  if (!ok.isConfirmed) return
  try {
    await axios.delete(`/api/v1/webchat/widgets/${currentId.value}`)
    widgets.value = widgets.value.filter(w => w.id !== currentId.value)
    currentId.value = null
    form.value = null
    if (widgets.value.length) select(widgets.value[0].id)
    toast('success', isAr.value ? 'تم الحذف' : 'Deleted')
  } catch (err) {
    Swal.fire({ icon: 'info', title: isAr.value ? 'لم يُحذف' : 'Not deleted', text: err?.response?.data?.error?.code === 'HAS_TICKETS' ? (isAr.value ? 'لهذا الويدجت تذاكر في التقارير. أوقفه من المفتاح بدلاً من حذفه.' : errorText(err)) : errorText(err) })
  }
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast('success', isAr.value ? 'تم النسخ' : 'Copied')
  } catch {
    Swal.fire({ title: isAr.value ? 'انسخ الكود' : 'Copy the code', input: 'textarea', inputValue: text })
  }
}

onMounted(load)
</script>

<style scoped>
.card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); padding: 20px; margin-bottom: 16px; }
.card-title { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #1e293b; font-size: 15px; margin-bottom: 14px; }
.num { width: 24px; height: 24px; border-radius: 8px; background: #fff7ed; color: #ea580c; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
.steps { list-style: none; padding: 0; margin: 18px auto 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 22px; font-size: 13px; color: #475569; }
.steps li { display: flex; align-items: center; gap: 8px; }
.steps span { width: 22px; height: 22px; border-radius: 50%; background: #f1f5f9; color: #334155; font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #334155; font-weight: 600; }
.inp { width: 100%; padding: 8px 11px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; background: white; outline: none; font-weight: 400; color: #0f172a; }
.inp:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.12); }
.swatch { width: 40px; height: 36px; padding: 2px; border: 1px solid #cbd5e1; border-radius: 10px; background: white; cursor: pointer; flex-shrink: 0; }
.seg { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; width: fit-content; }
.seg button { padding: 7px 14px; font-size: 13px; background: white; color: #475569; border: none; cursor: pointer; font-weight: 600; }
.seg button + button { border-inline-start: 1px solid #e2e8f0; }
.seg button.on { background: #fff7ed; color: #c2410c; }
.row { display: flex; gap: 14px; align-items: flex-start; cursor: pointer; }
.row-title { display: block; font-weight: 700; font-size: 14px; color: #1e293b; }
.row-desc { display: block; font-size: 12.5px; color: #64748b; margin-top: 3px; line-height: 1.65; }
.note { display: flex; gap: 8px; margin-top: 12px; font-size: 12px; color: #475569; background: #f8fafc; border-radius: 10px; padding: 10px 12px; line-height: 1.65; }
.note i { color: #3b82f6; margin-top: 3px; }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.tabs button { padding: 6px 12px; border-radius: 999px; border: 1px solid #e2e8f0; background: white; color: #475569; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.tabs button.on { border-color: #FF6600; background: #fff7ed; color: #c2410c; }
.how { margin: 0 0 10px; padding-inline-start: 20px; font-size: 13px; color: #334155; line-height: 1.9; }
.note.warn i { color: #d97706; }
.fee { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; background: #f0f9ff; border: 1px solid #bae6fd; color: #075985; border-radius: 14px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.7; }
.fee.stopped { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
.fee > span:first-of-type { flex: 1; min-width: 220px; }
.fee-actions { display: flex; gap: 8px; }
.code { display: flex; align-items: center; gap: 10px; background: #0f172a; color: #e2e8f0; border-radius: 12px; padding: 12px 14px; }
.code code { flex: 1; min-width: 0; font-size: 12px; overflow-x: auto; white-space: nowrap; }
.copy { display: inline-flex; align-items: center; gap: 6px; background: #1e293b; color: white; border: 1px solid #334155; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; flex-shrink: 0; }
.ghost { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 10px; border: 1px solid #cbd5e1; background: white; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
.ghost:hover { border-color: #94a3b8; }
.chip { padding: 6px 10px; border-radius: 999px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; font-size: 12px; cursor: pointer; direction: ltr; }
.pill { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; border: 1px solid #e2e8f0; background: white; color: #334155; font-size: 13px; font-weight: 600; cursor: pointer; }
.pill.on { border-color: #FF6600; background: #fff7ed; color: #c2410c; }
.pill .dot { width: 8px; height: 8px; border-radius: 50%; }
.danger { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 10px; border: 1px solid #fecaca; background: white; color: #dc2626; font-size: 13px; font-weight: 600; cursor: pointer; }
:deep(.switch) { position: relative; width: 44px; height: 24px; border-radius: 12px; border: none; background: #cbd5e1; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
:deep(.switch.on) { background: #10b981; }
:deep(.switch .knob) { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); }
:deep(.switch.on .knob) { left: 23px; }
.savebar { position: sticky; bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
.save { display: inline-flex; align-items: center; gap: 8px; padding: 9px 20px; border-radius: 12px; border: none; background: #FF6600; color: white; font-weight: 700; font-size: 14px; cursor: pointer; }
.save:disabled { opacity: 0.5; cursor: not-allowed; }
.preview-wrap { position: sticky; top: 16px; }
.preview { background: repeating-linear-gradient(45deg, #f8fafc, #f8fafc 10px, #f1f5f9 10px, #f1f5f9 20px); border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.pv-panel { background: white; border-radius: 14px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12); overflow: hidden; }
.pv-head { color: white; padding: 12px 14px; }
.pv-head b { display: block; font-size: 14px; }
.pv-head small { font-size: 11.5px; opacity: 0.9; display: flex; align-items: center; gap: 6px; }
.pv-dot { width: 7px; height: 7px; border-radius: 50%; background: #86efac; display: inline-block; }
.pv-body { background: #f6f7f9; padding: 12px; display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
.pv-msg { max-width: 85%; background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 7px 10px; font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; align-self: flex-start; color: #1f2937; }
.pv-msg.me { align-self: flex-end; color: white; border: none; }
.pv-form { padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid #e5e7eb; }
.pv-input { border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 9px; font-size: 12px; color: #9ca3af; }
.pv-wa { font-size: 11.5px; color: #15803d; background: #f0fdf4; text-align: center; padding: 7px; border-top: 1px solid #dcfce7; }
.pv-launcher { width: 48px; height: 48px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18); }
.pv-launcher.right { align-self: flex-end; }
.pv-launcher.left { align-self: flex-start; }
[dir='rtl'] .pv-launcher.right { align-self: flex-start; }
[dir='rtl'] .pv-launcher.left { align-self: flex-end; }
</style>
