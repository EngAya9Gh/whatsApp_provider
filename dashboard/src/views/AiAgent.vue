<template>
  <div class="p-6 max-w-6xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'الموظف الذكي' : 'AI Agent' }}</h1>
      <p class="text-slate-500 mt-1">{{ isAr ? 'موظف آلي يرد على عملائك في واتساب من معلومات نشاطك، ويحوّل المحادثة لفريقك عندما يحتاج العميل موظفاً.' : 'An AI agent that answers customers on WhatsApp from your business info, and hands the chat to your team when needed.' }}</p>
    </div>

    <div v-if="loading" class="flex justify-center p-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
    <div v-else-if="loadError" class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">{{ loadError }}</div>

    <template v-else>
      <!-- Setup: what is left before the agent answers real customers -->
      <section class="card mb-5">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <h2 class="card-title m-0">{{ isAr ? 'تشغيل الموظف الذكي' : 'Turning the agent on' }}</h2>
          <span class="status-pill" :class="status.cls"><i class="fas fa-circle text-[7px]"></i> {{ status.text }}</span>
        </div>

        <div class="grid md:grid-cols-3 gap-3 mt-4">
          <div class="step" :class="{ done: form.aiConfigured }">
            <span class="step-dot"><i v-if="form.aiConfigured" class="fas fa-check"></i><template v-else>1</template></span>
            <div class="min-w-0">
              <div class="step-title">{{ isAr ? 'مفتاح Gemini' : 'Gemini key' }}</div>
              <div class="step-sub">{{ form.aiConfigured ? (isAr ? 'مضاف ويعمل.' : 'Added.') : (isAr ? 'مطلوب ليعمل الموظف الذكي.' : 'Required for the agent to work.') }}</div>
              <router-link v-if="!form.aiConfigured" to="/settings" class="step-link">{{ isAr ? 'إضافته من الإعدادات' : 'Add it in Settings' }}</router-link>
            </div>
          </div>

          <div class="step" :class="{ done: savedTopics > 0 }">
            <span class="step-dot"><i v-if="savedTopics > 0" class="fas fa-check"></i><template v-else>2</template></span>
            <div class="min-w-0">
              <div class="step-title">{{ isAr ? 'معلومات النشاط' : 'Business information' }}</div>
              <div class="step-sub">
                <template v-if="savedTopics > 0">{{ isAr ? `المواضيع المحفوظة: ${savedTopics}. كلما زادت المعلومات قلّ التحويل لفريقك.` : `Saved topics: ${savedTopics}. More info means fewer hand-offs.` }}</template>
                <template v-else>{{ isAr ? 'أضف موضوعاً واحداً على الأقل واكتب معلوماته ثم احفظ.' : 'Add at least one topic, fill it in, and save.' }}</template>
              </div>
            </div>
          </div>

          <div class="step" :class="{ done: activeChannels.length > 0 }">
            <span class="step-dot"><i v-if="activeChannels.length" class="fas fa-check"></i><template v-else>3</template></span>
            <div class="min-w-0">
              <div class="step-title">{{ isAr ? 'التشغيل على رقم' : 'Run it on a number' }}</div>
              <div v-if="activeChannels.length" class="step-sub">
                {{ isAr ? 'يعمل في سير الواتساب على:' : 'Active in the chat flow of:' }}
                <span v-for="c in activeChannels" :key="c.id" class="chan-chip" dir="ltr">{{ c.label }}</span>
              </div>
              <div v-else class="step-sub">{{ isAr ? 'في «سير الواتساب» أضف خطوة «موظف ذكي» بعد خطوة البداية، ثم انشر السير.' : 'In "Chat Flows", add an "AI agent" step after the start step, then publish.' }}</div>
              <router-link to="/flows" class="step-link">{{ activeChannels.length ? (isAr ? 'تعديل السير' : 'Edit the flow') : (isAr ? 'فتح سير الواتساب' : 'Open Chat Flows') }}</router-link>
            </div>
          </div>
        </div>

        <p class="tip">
          <i class="fas fa-lightbulb text-amber-500"></i>
          {{ isAr
            ? 'السير يبدأ مع أول رسالة من العميل، أو بعد مدة صمت (24 ساعة افتراضياً، وتُغيَّر من خطوة البداية). لتجربته من جوالك: احذف محادثتك من «المحادثات المباشرة» ثم راسل الرقم من جديد، أو جرّبه هنا في «جرّب الموظف الذكي».'
            : 'The flow starts on a customer\'s first message, or after a silence (24 hours by default, set on the start step). To try it from your phone: delete your conversation in Live Chat, then message the number again, or use "Try the agent" here.' }}
        </p>
      </section>

      <div class="grid lg:grid-cols-5 gap-5">
        <!-- Settings -->
        <div class="lg:col-span-3 space-y-5">
          <section class="card">
            <h2 class="card-title">{{ isAr ? 'الشخصية' : 'Persona' }}</h2>
            <div class="grid sm:grid-cols-3 gap-3 mt-3">
              <div class="sm:col-span-2">
                <label class="lbl">{{ isAr ? 'اسم الموظف الذكي' : 'Agent name' }}</label>
                <input v-model="form.name" maxlength="60" class="inp" :disabled="!canManage" />
              </div>
              <div>
                <label class="lbl">{{ isAr ? 'أقصى عدد ردود قبل التحويل' : 'Max replies before hand-off' }}</label>
                <input v-model.number="form.maxTurns" type="number" min="1" max="30" class="inp" :disabled="!canManage" />
              </div>
            </div>
            <label class="lbl mt-3">{{ isAr ? 'تعليمات وأسلوب الرد' : 'Instructions & tone' }}</label>
            <textarea v-model="form.instructions" rows="3" maxlength="2000" class="inp" :disabled="!canManage" :placeholder="isAr ? 'مثال: رد بلهجة سعودية ودودة، وشجّع العميل على الحجز.' : 'e.g. Be warm and brief, and encourage booking.'"></textarea>
          </section>

          <section class="card">
            <h2 class="card-title">{{ isAr ? 'معلومات النشاط' : 'Business information' }}</h2>
            <p class="card-sub">{{ isAr ? 'الموظف الذكي يجيب من هذه المعلومات فقط، ويحوّل لفريقك أي سؤال جوابه غير موجود هنا.' : 'The agent answers only from this; anything not covered goes to your team.' }}</p>

            <!-- Topic picker: always visible, hides topics already added -->
            <div v-if="canManage" class="topic-bar">
              <span class="topic-bar-label">{{ isAr ? 'أضف موضوعاً:' : 'Add a topic:' }}</span>
              <button v-for="t in availableTopics" :key="t.key" type="button" class="starter" @click="addEntry(t.key)">
                <i class="fas" :class="t.icon"></i> {{ topicLabel(t) }}
              </button>
              <button type="button" class="starter custom" @click="addEntry('custom')">
                <i class="fas fa-plus"></i> {{ isAr ? 'عنوان آخر' : 'Other title' }}
              </button>
            </div>

            <div v-if="form.knowledge.length === 0" class="empty-kb">
              {{ isAr ? 'اختر موضوعاً من الأعلى لتبدأ. ابدأ بـ«من نحن» و«الأسعار والباقات» و«أوقات العمل».' : 'Pick a topic above to start, e.g. "About us", "Prices & plans" and "Working hours".' }}
            </div>

            <div class="space-y-3">
              <div v-for="(entry, i) in form.knowledge" :key="entry.id" :ref="el => setEntryEl(entry.id, el)" class="kb-entry" :class="{ blank: !entry.content.trim() }">
                <div class="flex items-center gap-2 mb-2">
                  <span class="kb-icon"><i class="fas" :class="topicOf(entry).icon"></i></span>
                  <select class="inp sel font-semibold" :class="{ grow: topicKey(entry) !== 'custom' }" :value="topicKey(entry)" :disabled="!canManage" @change="setTopic(entry, $event.target.value)">
                    <option v-for="t in TOPICS" :key="t.key" :value="t.key" :disabled="t.key !== topicKey(entry) && usedKeys.has(t.key)">{{ topicLabel(t) }}</option>
                    <option value="custom">{{ isAr ? 'عنوان آخر…' : 'Other title…' }}</option>
                  </select>
                  <input v-if="topicKey(entry) === 'custom'" v-model="entry.title" maxlength="120" class="inp flex-1 font-semibold title-inp" :disabled="!canManage" :placeholder="isAr ? 'اكتب العنوان (مثال: العروض الحالية)' : 'Write the title (e.g. Current offers)'" />
                  <button v-if="canManage" type="button" class="del-btn" @click="form.knowledge.splice(i, 1)" :title="isAr ? 'حذف' : 'Delete'"><i class="fas fa-trash"></i></button>
                </div>
                <textarea v-model="entry.content" :rows="topicKey(entry) === 'faq' ? 6 : 3" class="inp" :disabled="!canManage" :placeholder="topicHint(entry)"></textarea>
                <p v-if="!entry.content.trim()" class="kb-warn"><i class="fas fa-circle-exclamation"></i> {{ isAr ? 'فارغ: لن يستخدمه الموظف الذكي حتى تكتب المعلومة.' : 'Empty: the agent will not use it until you fill it in.' }}</p>
              </div>
            </div>

            <div class="flex items-center justify-between mt-3 text-xs" :class="knowledgeChars > MAX_CHARS ? 'text-[#d03b3b] font-semibold' : 'text-slate-400'">
              <span>{{ fmtNum(knowledgeChars) }} / {{ fmtNum(MAX_CHARS) }} {{ isAr ? 'حرف' : 'characters' }}</span>
            </div>
          </section>

          <div v-if="canManage" class="flex items-center justify-end gap-3">
            <span v-if="dirty" class="text-xs text-amber-700">{{ isAr ? 'تغييرات غير محفوظة' : 'Unsaved changes' }}</span>
            <button type="button" class="save-btn" :disabled="saving || knowledgeChars > MAX_CHARS" @click="save">
              <i class="fas" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i> {{ isAr ? 'حفظ' : 'Save' }}
            </button>
          </div>
        </div>

        <!-- Playground -->
        <div class="lg:col-span-2">
          <section class="card playground">
            <div class="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 class="card-title"><i class="fas fa-flask text-[#6366f1] me-1"></i>{{ isAr ? 'جرّب الموظف الذكي' : 'Try the agent' }}</h2>
                <p class="card-sub m-0">{{ isAr ? 'اكتب كأنك عميل. التجربة تستخدم آخر إعدادات محفوظة.' : 'Write as a customer. Uses the last saved settings.' }}</p>
              </div>
              <button v-if="chat.length" type="button" class="text-xs font-semibold text-slate-500 bg-transparent border-none cursor-pointer" @click="chat = []">{{ isAr ? 'مسح' : 'Clear' }}</button>
            </div>

            <div ref="chatBox" class="chat-box">
              <div v-if="!chat.length" class="text-center text-xs text-slate-400 py-10">{{ isAr ? 'مثال: كم سعر الباقة؟ / أبي أكلم موظف' : 'e.g. How much is the plan? / I want a person' }}</div>
              <template v-for="(m, i) in chat" :key="i">
                <div class="bubble" :class="m.role">{{ m.text }}</div>
                <div v-if="m.handoff" class="handoff">
                  <i class="fas fa-user-check"></i> {{ isAr ? 'هنا تُحوَّل المحادثة لفريقك' : 'The chat goes to your team here' }}<span v-if="m.reason"> — {{ m.reason }}</span>
                </div>
              </template>
              <div v-if="thinking" class="bubble agent typing"><i class="fas fa-ellipsis fa-beat-fade"></i></div>
            </div>

            <p v-if="dirty" class="text-[11px] text-amber-700 mt-2">{{ isAr ? 'احفظ التغييرات أولاً لتجربتها.' : 'Save your changes to test them.' }}</p>
            <form class="flex gap-2 mt-3" @submit.prevent="sendTest">
              <input v-model="testInput" class="inp flex-1" :disabled="thinking || ended" :placeholder="ended ? (isAr ? 'انتهت التجربة — امسحها لتبدأ من جديد' : 'Ended — clear to restart') : (isAr ? 'اكتب رسالة…' : 'Type a message…')" />
              <button type="submit" class="send-btn" :disabled="thinking || ended || !testInput.trim()"><i class="fas fa-paper-plane"></i></button>
            </form>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Swal from 'sweetalert2'
import { aiErrorMessage } from '../utils/aiErrors'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const MAX_CHARS = 40000

const canManage = (() => {
  try {
    const t = JSON.parse(localStorage.getItem('tenant') || '{}')
    return !t.isSubUser || !!t.subUser?.permissions?.can_manage_chatbot
  } catch {
    return false
  }
})()

// ─── Knowledge topics ─────────────────────────────────────────
// Stored as plain titles; a title matching a topic (in either language, or an alias) shows as that topic.
const TOPICS = [
  { key: 'about', icon: 'fa-building', ar: 'من نحن', en: 'About us', aliases: ['نبذة عنا', 'عن الشركة', 'عن النشاط', 'About'],
    hint: ['مثال: نحن متجر … في الرياض منذ 2018، نبيع … ونخدم …', 'e.g. We are a … store in Riyadh since 2018, selling …'] },
  { key: 'services', icon: 'fa-box-open', ar: 'المنتجات والخدمات', en: 'Products & services', aliases: ['الخدمات', 'المنتجات', 'خدماتنا', 'منتجاتنا', 'Services', 'Products'],
    hint: ['مثال: نقدّم 3 خدمات: … و… و…، ومدة تنفيذ كل خدمة …', 'e.g. We offer 3 services: …, … and …; each takes …'] },
  { key: 'prices', icon: 'fa-tags', ar: 'الأسعار والباقات', en: 'Prices & plans', aliases: ['الأسعار', 'الباقات', 'الأسعار والعروض', 'Prices', 'Pricing'],
    hint: ['مثال: الباقة الأساسية 99 ريال شهرياً وتشمل …، والمتقدمة 199 ريال وتشمل …', 'e.g. Basic plan: 99 SAR a month, includes …; Pro plan: 199 SAR, includes …'] },
  { key: 'hours', icon: 'fa-clock', ar: 'أوقات العمل', en: 'Working hours', aliases: ['أوقات الدوام', 'ساعات العمل', 'ساعات الدوام', 'الدوام', 'مواعيد العمل', 'Opening hours', 'Hours'],
    hint: ['مثال: من الأحد إلى الخميس، 9 صباحاً حتى 5 مساءً. الجمعة والسبت إجازة.', 'e.g. Sunday to Thursday, 9 am to 5 pm. Closed Friday and Saturday.'] },
  { key: 'location', icon: 'fa-location-dot', ar: 'الموقع والفروع', en: 'Location & branches', aliases: ['الموقع', 'الفروع', 'العنوان', 'Location', 'Address', 'Branches'],
    hint: ['مثال: الفرع الرئيسي: الرياض – حي العليا، شارع … رابط الخريطة: …', 'e.g. Main branch: Riyadh, Olaya district, … street. Map link: …'] },
  { key: 'delivery', icon: 'fa-truck', ar: 'التوصيل والشحن', en: 'Delivery & shipping', aliases: ['التوصيل', 'الشحن', 'Delivery', 'Shipping'],
    hint: ['مثال: التوصيل داخل الرياض خلال يومين بـ 20 ريال، ومجاني للطلبات فوق 200 ريال.', 'e.g. Delivery in Riyadh within 2 days for 20 SAR; free over 200 SAR.'] },
  { key: 'payment', icon: 'fa-credit-card', ar: 'طرق الدفع', en: 'Payment methods', aliases: ['الدفع', 'Payment'],
    hint: ['مثال: نقبل مدى وفيزا وApple Pay، والدفع عند الاستلام داخل الرياض.', 'e.g. We accept Mada, Visa and Apple Pay, and cash on delivery in Riyadh.'] },
  { key: 'returns', icon: 'fa-rotate-left', ar: 'سياسة الاسترجاع', en: 'Return policy', aliases: ['الاسترجاع', 'الاستبدال', 'الاسترجاع والاستبدال', 'Returns', 'Refunds'],
    hint: ['مثال: يمكن الاسترجاع خلال 7 أيام من الاستلام إذا كان المنتج بحالته الأصلية.', 'e.g. Returns within 7 days of delivery if the item is unused.'] },
  { key: 'faq', icon: 'fa-circle-question', ar: 'أسئلة شائعة', en: 'FAQ', aliases: ['الأسئلة الشائعة', 'الأسئلة', 'Questions'],
    hint: ['س: هل يوجد ضمان؟\nج: نعم، سنة كاملة على كل المنتجات.\n\nس: هل تشحنون خارج المملكة؟\nج: …', 'Q: Is there a warranty?\nA: Yes, one full year on all products.\n\nQ: Do you ship abroad?\nA: …'] },
  { key: 'contact', icon: 'fa-address-book', ar: 'التواصل والحسابات', en: 'Contact & social', aliases: ['التواصل', 'تواصل معنا', 'Contact', 'Contact us'],
    hint: ['مثال: الهاتف …، البريد …، إنستغرام @…', 'e.g. Phone …, email …, Instagram @…'] }
]
const CUSTOM = { key: 'custom', icon: 'fa-pen', hint: ['اكتب المعلومة كما تريد أن يعرفها الموظف الذكي…', 'Write the information as the agent should know it…'] }

// Same title whatever the hamza, diacritics or case
const norm = (s) => String(s || '').trim().toLowerCase()
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ')
const TOPIC_BY_TITLE = new Map(TOPICS.flatMap(t => [t.ar, t.en, ...t.aliases].map(title => [norm(title), t])))

const topicOf = (entry) => TOPIC_BY_TITLE.get(norm(entry.title)) || CUSTOM
const topicKey = (entry) => topicOf(entry).key
const topicLabel = (t) => (isAr.value ? t.ar : t.en)
const topicHint = (entry) => topicOf(entry).hint[isAr.value ? 0 : 1]

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const form = ref({ name: '', instructions: '', maxTurns: 8, knowledge: [], aiConfigured: false })
const activeChannels = ref([])
const savedTopics = ref(0)
let savedSnapshot = ''

const usedKeys = computed(() => new Set(form.value.knowledge.map(topicKey).filter(k => k !== 'custom')))
const availableTopics = computed(() => TOPICS.filter(t => !usedKeys.value.has(t.key)))

const editable = () => JSON.stringify({ name: form.value.name, instructions: form.value.instructions, maxTurns: form.value.maxTurns, knowledge: form.value.knowledge })
const dirty = computed(() => editable() !== savedSnapshot)
const knowledgeChars = computed(() => form.value.knowledge.reduce((s, k) => s + (k.title || '').length + (k.content || '').length, 0))
const fmtNum = (n) => new Intl.NumberFormat('en-US').format(n)

const status = computed(() => {
  const ready = form.value.aiConfigured && savedTopics.value > 0
  if (activeChannels.value.length && ready) return { cls: 'on', text: isAr.value ? 'يعمل' : 'Running' }
  if (activeChannels.value.length) return { cls: 'warn', text: isAr.value ? 'مفعّل لكن ينقصه إعداد' : 'On, but setup is missing' }
  return { cls: 'off', text: isAr.value ? 'غير مفعّل على أي رقم' : 'Not on any number yet' }
})

// New entries scroll into view with the cursor where the user types next
const entryEls = {}
const setEntryEl = (id, el) => { if (el) entryEls[id] = el; else delete entryEls[id] }
const focusEntry = (id, selector) => nextTick(() => {
  const el = entryEls[id]
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.querySelector(selector)?.focus({ preventScroll: true })
})

const newId = () => Math.random().toString(36).slice(2, 10)
const addEntry = (key) => {
  const topic = TOPICS.find(t => t.key === key)
  const id = newId()
  form.value.knowledge.push({ id, title: topic ? topicLabel(topic) : '', content: '' })
  focusEntry(id, topic ? 'textarea' : '.title-inp')
}
const setTopic = (entry, key) => {
  const topic = TOPICS.find(t => t.key === key)
  entry.title = topic ? topicLabel(topic) : ''
  if (!topic) focusEntry(entry.id, '.title-inp')
}

const applyAgent = (data) => {
  form.value = {
    name: data.name,
    instructions: data.instructions,
    maxTurns: data.maxTurns,
    knowledge: data.knowledge.map(k => ({ ...k })),
    aiConfigured: data.aiConfigured
  }
  activeChannels.value = data.activeChannels || []
  savedTopics.value = data.knowledge.filter(k => String(k.content || '').trim()).length
  savedSnapshot = editable()
}

const save = async () => {
  saving.value = true
  try {
    const res = await axios.put('/api/v1/ai/agent', {
      name: form.value.name,
      instructions: form.value.instructions,
      maxTurns: form.value.maxTurns,
      knowledge: form.value.knowledge
    })
    applyAgent(res.data.data)
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم الحفظ' : 'Saved', timer: 1300, showConfirmButton: false })
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر الحفظ' : 'Could not save', text: err.response?.data?.error?.message || err.message, confirmButtonColor: '#FF6600' })
  } finally {
    saving.value = false
  }
}

// ─── Playground ───────────────────────────────────────────────
const chat = ref([])
const testInput = ref('')
const thinking = ref(false)
const chatBox = ref(null)
const ended = computed(() => chat.value.some(m => m.handoff))

const scrollDown = () => nextTick(() => { if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight })

const sendTest = async () => {
  const text = testInput.value.trim()
  if (!text) return
  chat.value.push({ role: 'customer', text })
  testInput.value = ''
  thinking.value = true
  scrollDown()
  try {
    // Only the conversation itself: error notes are not part of it
    const messages = chat.value.filter(m => m.role !== 'error').map(m => ({ role: m.role, text: m.text }))
    const res = await axios.post('/api/v1/ai/agent/test', { messages })
    const r = res.data.data
    chat.value.push({ role: 'agent', text: r.reply || (isAr.value ? '(بدون رد)' : '(no reply)'), handoff: r.handoff, reason: r.reason })
  } catch (err) {
    chat.value.push({ role: 'error', text: aiErrorMessage(err, isAr.value) })
  } finally {
    thinking.value = false
    scrollDown()
  }
}

onMounted(async () => {
  try {
    const res = await axios.get('/api/v1/ai/agent')
    applyAgent(res.data.data)
  } catch (err) {
    loadError.value = err.response?.status === 403
      ? (isAr.value ? 'الموظف الذكي غير متاح في اشتراكك أو صلاحياتك.' : 'The AI agent is not available on your plan or permissions.')
      : (isAr.value ? 'تعذّر التحميل.' : 'Could not load.')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.card { background: white; border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px 20px; }
.card-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.card-sub { font-size: 0.75rem; color: #94a3b8; margin: 0; }
.lbl { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
.inp { width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; outline: none; background: white; resize: vertical; }
.inp:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.12); }
.inp:disabled { background: #f8fafc; color: #64748b; }

/* Setup steps */
.status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; border-radius: 999px; padding: 4px 11px; }
.status-pill.on { background: #ecfdf5; color: #047857; }
.status-pill.warn { background: #fffbeb; color: #b45309; }
.status-pill.off { background: #f1f5f9; color: #64748b; }
.step { display: flex; align-items: flex-start; gap: 10px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; background: #fcfcfd; }
.step.done { border-color: #a7f3d0; background: #f0fdf9; }
.step-dot { width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: #fff7f2; color: #FF6600; border: 1.5px solid #fed7aa; }
.step.done .step-dot { background: #10b981; color: white; border-color: #10b981; }
.step-title { font-size: 13.5px; font-weight: 700; color: #0f172a; }
.step-sub { font-size: 12px; color: #64748b; margin-top: 2px; line-height: 1.6; }
.step-link { display: inline-block; margin-top: 6px; font-size: 12.5px; font-weight: 700; color: #FF6600; text-decoration: none; }
.chan-chip { display: inline-block; font-size: 11.5px; font-weight: 700; color: #047857; background: white; border: 1px solid #a7f3d0; border-radius: 999px; padding: 1px 8px; margin: 2px 2px 0; }
.tip { display: flex; align-items: flex-start; gap: 8px; margin: 12px 0 0; font-size: 12px; line-height: 1.7; color: #64748b; }

/* Knowledge */
.topic-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 12px; }
.topic-bar-label { font-size: 12px; font-weight: 700; color: #334155; margin-inline-end: 2px; }
.starter { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 12px; cursor: pointer; }
.starter i { font-size: 11px; color: #94a3b8; }
.starter:hover { border-color: #FF6600; color: #FF6600; }
.starter:hover i { color: #FF6600; }
.starter.custom { border-style: dashed; }
.empty-kb { text-align: center; color: #64748b; font-size: 13px; border: 1.5px dashed #e2e8f0; border-radius: 14px; padding: 18px; margin-top: 12px; }
.kb-entry { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; background: #fcfcfd; margin-top: 12px; }
.kb-entry.blank { border-color: #fde68a; }
.kb-icon { width: 36px; height: 36px; flex-shrink: 0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; background: #fff7f2; color: #FF6600; }
.sel { width: auto; min-width: 150px; cursor: pointer; }
.sel.grow { flex: 1; }
.kb-warn { margin: 6px 0 0; font-size: 11.5px; color: #b45309; }
.del-btn { width: 36px; height: 36px; flex-shrink: 0; border-radius: 10px; border: none; background: #fef2f2; color: #ef4444; cursor: pointer; }
.save-btn { background: #FF6600; color: white; border: none; border-radius: 12px; padding: 10px 26px; font-weight: 700; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.save-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* Playground */
.playground { position: sticky; top: 16px; }
.chat-box { height: 420px; overflow-y: auto; background: #efeae2; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.bubble { max-width: 85%; padding: 8px 11px; border-radius: 12px; font-size: 13px; line-height: 1.55; white-space: pre-line; box-shadow: 0 1px 1px rgba(0,0,0,0.06); }
.bubble.customer { align-self: flex-end; background: #dcf8c6; }
.bubble.agent { align-self: flex-start; background: white; }
.bubble.error { align-self: center; background: #fef2f2; color: #b91c1c; font-size: 12px; }
.bubble.typing { color: #94a3b8; }
.handoff { align-self: center; font-size: 11.5px; font-weight: 600; color: #9a3412; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 999px; padding: 4px 10px; text-align: center; }
.send-btn { width: 42px; flex-shrink: 0; border-radius: 10px; border: none; background: #FF6600; color: white; cursor: pointer; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
