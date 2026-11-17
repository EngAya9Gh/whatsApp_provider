<template>
  <div class="tester" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="tester-head">
      <span class="head-icon"><i class="fas fa-flask"></i></span>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-slate-800 text-sm">{{ isAr ? 'جرّب السير' : 'Test the flow' }}</div>
        <div class="text-xs text-slate-500">{{ isAr ? 'اكتب كأنك العميل' : 'Write as if you were the customer' }}</div>
      </div>
      <button type="button" class="icon-btn" :disabled="!messages.length || sending" :title="isAr ? 'محادثة جديدة' : 'New conversation'" @click="reset">
        <i class="fas fa-rotate-left"></i>
      </button>
      <button type="button" class="icon-btn" :title="isAr ? 'إغلاق التجربة' : 'Close the test'" @click="$emit('close')">
        <i class="fas fa-xmark"></i>
      </button>
    </div>

    <div class="safe-note">
      <i class="fas fa-shield-halved"></i>
      <span>
        {{ isAr
          ? 'تجربة على المسودة الحالية: لا يصل شيء لأي عميل، ولا تتغير أي محادثة أو وسم. لا تحتاج أن تنشر أو تنتظر مدة الصمت.'
          : 'Runs your current draft: nothing reaches any customer and no conversation or tag changes. No need to publish or wait for the silence period.' }}
        <template v-if="hasAi">
          {{ isAr ? 'خطوة «موظف ذكي» ترد فعلاً عبر Gemini وتُحسب من استهلاكك.' : 'The "AI agent" step really answers through Gemini and counts toward your usage.' }}
        </template>
      </span>
    </div>

    <div ref="scrollEl" class="chat">
      <div v-if="!messages.length" class="empty">
        <i class="fab fa-whatsapp"></i>
        <p>{{ isAr ? 'ابدأ برسالة مثل «مرحبا»، وشاهد السير يرد خطوة بخطوة. الخطوة التي يقف عندها السير تُضاء على اللوحة.' : 'Start with a message like "Hi" and watch the flow answer step by step. The step it waits on lights up on the canvas.' }}</p>
        <div class="flex flex-wrap gap-2 justify-center mt-2">
          <button v-for="s in starters" :key="s" type="button" class="chip" @click="send({ text: s })">{{ s }}</button>
        </div>
      </div>

      <template v-for="(m, i) in messages" :key="i">
        <div v-if="m.from === 'me'" class="msg me"><div class="bubble">{{ m.text }}</div></div>

        <div v-else-if="m.from === 'bot'" class="msg bot">
          <div class="bubble">
            <span v-if="m.ai" class="ai-label"><i class="fas fa-robot"></i> {{ isAr ? 'رد الموظف الذكي' : 'AI agent reply' }}</span>
            <span v-if="m.retry" class="retry-label">{{ isAr ? 'أعاد السؤال: الرد لم يطابق أي خيار' : 'Asked again: the reply matched no option' }}</span>
            {{ m.text }}
          </div>
          <a v-if="m.url" :href="m.url" target="_blank" rel="noopener noreferrer" class="wa-btn wa-link"><i class="fas fa-arrow-up-right-from-square"></i> {{ m.buttonText }}</a>
          <template v-if="m.options">
            <template v-if="m.options.length <= 3">
              <button v-for="o in m.options" :key="o.id" type="button" class="wa-btn" :disabled="!isLastQuestion(i) || sending" @click="send({ text: o.title, interactiveId: o.id })">{{ o.title }}</button>
            </template>
            <template v-else>
              <button type="button" class="wa-btn" :disabled="!isLastQuestion(i) || sending" @click="m.open = !m.open"><i class="fas fa-list-ul"></i> {{ m.buttonLabel }}</button>
              <div v-if="m.open && isLastQuestion(i)" class="wa-list">
                <button v-for="o in m.options" :key="o.id" type="button" :disabled="sending" @click="send({ text: o.title, interactiveId: o.id })">{{ o.title }}</button>
              </div>
            </template>
          </template>
        </div>

        <div v-else class="sys" :class="m.tone">
          <i :class="m.icon"></i><span>{{ m.text }}</span>
          <button v-if="m.nodeId" type="button" class="sys-link" @click="$emit('focus', m.nodeId)">{{ isAr ? 'اعرض' : 'Show' }}</button>
        </div>
      </template>

      <div v-if="sending" class="msg bot"><div class="bubble typing"><span></span><span></span><span></span></div></div>

      <div v-if="ended" class="ended">
        <button type="button" class="chip strong" @click="reset"><i class="fas fa-rotate-left"></i> {{ isAr ? 'ابدأ محادثة جديدة' : 'Start a new conversation' }}</button>
      </div>
    </div>

    <form class="composer" @submit.prevent="send({ text: draft })">
      <input
        v-model="draft"
        class="composer-input"
        maxlength="1000"
        :disabled="sending"
        :placeholder="ended ? (isAr ? 'أي رسالة تبدأ السير من جديد…' : 'Any message starts the flow again…') : (isAr ? 'اكتب رسالة كأنك العميل…' : 'Write as the customer…')"
      />
      <button type="submit" class="send" :disabled="sending || !draft.trim()" :title="isAr ? 'إرسال' : 'Send'">
        <i class="fas" :class="sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
      </button>
    </form>

    <!-- Real phone -->
    <div class="real">
      <button type="button" class="real-toggle" @click="showReal = !showReal">
        <i class="fas fa-mobile-screen-button"></i>
        <span class="flex-1 text-start">{{ isAr ? 'التجربة من جوالك على واتساب' : 'Test from your phone on WhatsApp' }}</span>
        <i class="fas" :class="showReal ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </button>
      <div v-if="showReal" class="real-body">
        <ol>
          <li>{{ isAr ? 'انشر السير وفعّله (الزر أعلى الصفحة).' : 'Publish the flow and turn it on (top of the page).' }}</li>
          <li>{{ isAr ? `أرسل رسالة لرقم القناة. يبدأ السير مع أول رسالة من رقم جديد، أو بعد ${silenceHours} ساعة من آخر رسالة للعميل، وما دامت المحادثة غير مسندة لموظف.` : `Send a message to the channel's number. The flow starts on a new number's first message, or after ${silenceHours}h since the customer's last message, while the chat is not assigned.` }}</li>
          <li>{{ isAr ? 'رقمك راسل القناة قبل قليل؟ اكتبه هنا لتبدأ رسالتك التالية السير من أوله فوراً:' : 'Your number wrote recently? Enter it so your next message starts the flow from the top right away:' }}</li>
        </ol>
        <form class="flex gap-2 mt-2" @submit.prevent="restart">
          <input v-model="phone" dir="ltr" class="composer-input flex-1" inputmode="tel" placeholder="9665XXXXXXXX" />
          <button type="submit" class="restart-btn" :disabled="restarting || !phone.trim()">
            <i class="fas" :class="restarting ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i>
            {{ isAr ? 'ابدأ من جديد' : 'Start over' }}
          </button>
        </form>
        <p v-if="live && hasDraftChanges" class="warn-line"><i class="fas fa-circle-info"></i> {{ isAr ? 'على الجوال يعمل آخر نسخة منشورة؛ تعديلاتك غير المنشورة تظهر هنا فقط.' : 'Your phone gets the last published version; unpublished edits show here only.' }}</p>
        <p v-if="!live" class="warn-line"><i class="fas fa-triangle-exclamation"></i> {{ isAr ? 'السير غير منشور أو غير مفعّل الآن، فلن يرد على واتساب.' : 'The flow is not published or not on, so it will not answer on WhatsApp.' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import { CONDITION_CHECKS } from '../../data/flowNodes'

const props = defineProps({
  channelId: { type: String, required: true },
  isAr: { type: Boolean, default: true },
  getGraph: { type: Function, required: true }, // current draft { nodes, edges }
  tagMap: { type: Object, default: () => ({}) },
  stageMap: { type: Object, default: () => ({}) },
  agentMap: { type: Object, default: () => ({}) },
  hasAi: { type: Boolean, default: false },
  live: { type: Boolean, default: false }, // published and on
  hasDraftChanges: { type: Boolean, default: false },
  silenceHours: { type: Number, default: 24 }
})
const emit = defineEmits(['close', 'live', 'problems', 'focus'])

const messages = ref([])
const draft = ref('')
const sending = ref(false)
const ended = ref(false)
const scrollEl = ref(null)
let convo = { state: null, history: [], tags: [], stageId: null }

const starters = computed(() => (props.isAr ? ['مرحبا', 'السلام عليكم', 'كم السعر؟'] : ['Hi', 'Hello', 'How much is it?']))
const isLastQuestion = (i) => !ended.value && messages.value.slice(i + 1).every(m => m.from === 'sys') && !!convo.state

const scrollDown = async () => {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

const ar = (a, e) => (props.isAr ? a : e)

/** What the flow did, in plain words */
function toMessage(r) {
  switch (r.kind) {
    case 'text': return { from: 'bot', text: r.text, ai: r.ai }
    case 'question': return { from: 'bot', text: r.text, options: r.options, buttonLabel: r.buttonLabel, retry: r.retry, open: false }
    case 'link': return { from: 'bot', text: r.text, url: r.url, buttonText: r.buttonText }
    case 'note': return { from: 'sys', tone: 'note', icon: 'fas fa-note-sticky', text: ar(`ملاحظة داخلية للفريق: ${r.text}`, `Team note: ${r.text}`) }
    case 'tag': {
      const name = props.tagMap[r.tagId]?.name || '—'
      return { from: 'sys', icon: 'fas fa-tag', text: r.action === 'REMOVE' ? ar(`أزال وسم «${name}»`, `Removed the "${name}" tag`) : ar(`أضاف وسم «${name}»`, `Added the "${name}" tag`) }
    }
    case 'stage': return { from: 'sys', icon: 'fas fa-route', text: ar(`نقل العميل لمرحلة «${props.stageMap[r.stageId]?.name || '—'}»`, `Moved the customer to "${props.stageMap[r.stageId]?.name || '—'}"`) }
    case 'check': {
      const check = CONDITION_CHECKS.find(c => c.key === r.check)
      const label = check ? (props.isAr ? check.ar : check.en) : r.check
      const yes = r.result ? ar('نعم', 'Yes') : ar('لا', 'No')
      const extra = r.check === 'WORKING_HOURS' ? ar(' (حسب ساعات عمل الرقم الآن)', ' (by the number\'s hours, now)') : r.check === 'ASSIGNED' ? ar(' (في التجربة لا أحد مسند)', ' (nobody is assigned in a test)') : ''
      return { from: 'sys', icon: 'fas fa-code-branch', text: `${ar('شرط', 'Condition')} «${label}»: ${yes}${extra}` }
    }
    case 'assign':
      if (r.mode === 'AGENT') return { from: 'sys', tone: 'handoff', icon: 'fas fa-user-check', text: ar(`تتحوّل المحادثة إلى «${props.agentMap[r.agentId]?.name || '—'}»`, `The chat goes to "${props.agentMap[r.agentId]?.name || '—'}"`) }
      return r.hasTeam
        ? { from: 'sys', tone: 'handoff', icon: 'fas fa-users', text: ar('تتحوّل المحادثة لفريق الرقم (حسب الدوام والتوزيع)', "The chat goes to the number's team (by shift & routing)") }
        : { from: 'sys', tone: 'warn', icon: 'fas fa-triangle-exclamation', text: ar('يطلب تحويلها للفريق، لكن لا يوجد فريق مسؤول عن هذا الرقم، فتبقى بدون إسناد. أنشئه من «الفرق والشيفتات».', 'It hands off to the team, but no team owns this number, so it stays unassigned. Create one on Teams & Shifts.') }
    case 'warning':
      return { from: 'sys', tone: 'warn', icon: 'fas fa-arrows-spin', text: ar('السير يدور بين خطوات لا تنتظر العميل، فأوقفناه. تأكد أن الحلقة فيها سؤال.', 'The flow loops through steps that never wait for the customer, so it was stopped. Put a question in the loop.') }
    case 'end': return { from: 'sys', tone: 'end', icon: 'fas fa-flag-checkered', text: ar('انتهى السير', 'The flow ended') }
    default: return null
  }
}

async function send(input) {
  const text = String(input.text || '').trim()
  if (!text || sending.value) return
  // After the end, the next message starts the flow from the top again (like on WhatsApp)
  ended.value = false
  messages.value.push({ from: 'me', text })
  draft.value = ''
  sending.value = true
  scrollDown()
  try {
    const res = await axios.post(`/api/v1/flows/${props.channelId}/test`, { ...props.getGraph(), ...convo, input: { text, interactiveId: input.interactiveId || null } })
    const data = res.data.data
    convo = { state: data.state, history: data.history, tags: data.tags, stageId: data.stageId }
    for (const r of data.replies) {
      const m = toMessage(r)
      if (m) messages.value.push(m)
    }
    ended.value = data.ended
    emit('problems', [])
    emit('live', { nodeId: data.state?.nodeId || null, steps: data.steps })
  } catch (err) {
    messages.value.pop()
    draft.value = text
    const e = err.response?.data?.error
    if (e?.errors) {
      emit('problems', e.errors)
      messages.value.push({ from: 'sys', tone: 'warn', icon: 'fas fa-circle-exclamation', text: ar('بعض الخطوات التي يمر بها العميل ناقصة (معلّمة بالأحمر). أصلحها ثم أعد المحاولة.', 'Some steps the customer goes through are incomplete (marked in red). Fix them and try again.'), nodeId: e.errors.find(p => p.nodeId)?.nodeId || null })
    } else {
      messages.value.push({ from: 'sys', tone: 'warn', icon: 'fas fa-circle-exclamation', text: e?.message || err.message })
    }
  } finally {
    sending.value = false
    scrollDown()
  }
}

function reset(clearLive = true) {
  messages.value = []
  convo = { state: null, history: [], tags: [], stageId: null }
  ended.value = false
  if (clearLive) emit('live', { nodeId: null, steps: [] })
}

// ─── Real phone: the next message from this number starts the flow from the top ───
const showReal = ref(false)
const phone = ref((() => { try { return localStorage.getItem('wakeel.flowTestPhone') || '' } catch { return '' } })())
const restarting = ref(false)

async function restart() {
  restarting.value = true
  try {
    const res = await axios.post(`/api/v1/flows/${props.channelId}/restart`, { phone: phone.value })
    const data = res.data.data
    try { localStorage.setItem('wakeel.flowTestPhone', data.phone) } catch { /* private mode */ }
    Swal.fire({
      icon: data.live ? 'success' : 'warning',
      title: data.found ? ar('جاهز', 'Ready') : ar('رقم جديد', 'New number'),
      text: (data.found
        ? ar(`الرسالة التالية من ${data.phone} تبدأ السير من أوله.`, `The next message from ${data.phone} starts the flow from the top.`)
        : ar(`الرقم ${data.phone} لم يراسل هذه القناة بعد، فأول رسالة منه تبدأ السير تلقائياً.`, `${data.phone} has not written to this channel yet, so its first message starts the flow anyway.`))
        + (data.live ? '' : ar(' لكن السير غير منشور أو غير مفعّل الآن، فانشره وفعّله أولاً.', ' But the flow is not published or not on now: publish it and turn it on first.')),
      confirmButtonColor: '#FF6600'
    })
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message
    Swal.fire({ icon: 'error', title: msg === 'Write the full number with the country code' ? ar('اكتب الرقم كاملاً مع رمز الدولة', 'Write the full number with the country code') : msg, confirmButtonColor: '#FF6600' })
  } finally {
    restarting.value = false
  }
}

defineExpose({ reset })
</script>

<style scoped>
.tester { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.tester-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #f1f5f9; }
.head-icon { width: 32px; height: 32px; border-radius: 10px; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.icon-btn { width: 30px; height: 30px; border-radius: 8px; border: none; background: #f8fafc; color: #64748b; cursor: pointer; flex-shrink: 0; }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.safe-note { display: flex; gap: 8px; margin: 10px 12px 0; padding: 8px 10px; border-radius: 10px; background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; font-size: 11.5px; line-height: 1.6; }
.safe-note i { margin-top: 3px; }
.chat { flex: 1; min-height: 160px; overflow-y: auto; margin: 10px 12px; padding: 10px; border-radius: 14px; background: #efeae2; display: flex; flex-direction: column; gap: 6px; }
.empty { margin: auto; text-align: center; color: #64748b; font-size: 12px; line-height: 1.7; padding: 10px; }
.empty .fa-whatsapp { font-size: 28px; color: #25d366; margin-bottom: 6px; }
.chip { padding: 5px 12px; border-radius: 999px; border: 1px solid #d1d5db; background: white; color: #334155; font-size: 12px; font-weight: 600; cursor: pointer; }
.chip:hover { border-color: #FF6600; color: #c2410c; }
.chip.strong { border-color: #FF6600; color: #c2410c; display: inline-flex; align-items: center; gap: 6px; }
.msg { display: flex; flex-direction: column; gap: 3px; max-width: 88%; }
.msg.me { align-self: flex-end; }
.msg.bot { align-self: flex-start; }
.bubble { padding: 7px 10px; border-radius: 10px; font-size: 12.5px; line-height: 1.55; color: #111827; white-space: pre-line; word-break: break-word; box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06); }
.msg.me .bubble { background: #d9fdd3; }
.msg.bot .bubble { background: white; }
.ai-label { display: block; font-size: 10.5px; font-weight: 700; color: #4f46e5; margin-bottom: 2px; }
.retry-label { display: block; font-size: 10.5px; font-weight: 700; color: #b45309; margin-bottom: 2px; }
.wa-btn { background: white; border: none; border-radius: 10px; padding: 6px 10px; font-size: 12px; color: #0a7cff; font-weight: 600; text-align: center; box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06); cursor: pointer; }
.wa-btn:disabled { color: #94a3b8; cursor: default; }
.wa-link { text-decoration: none; display: block; }
.wa-btn:not(:disabled):hover { background: #f0f7ff; }
.wa-list { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06); display: flex; flex-direction: column; }
.wa-list button { border: none; background: none; padding: 7px 10px; font-size: 12px; text-align: start; border-bottom: 1px solid #f1f5f9; cursor: pointer; color: #111827; }
.wa-list button:hover { background: #f8fafc; }
.sys { align-self: center; max-width: 95%; display: flex; align-items: flex-start; gap: 6px; background: #fff7d6; color: #6b5a14; font-size: 11px; line-height: 1.55; padding: 4px 10px; border-radius: 8px; }
.sys i { margin-top: 2px; }
.sys.handoff { background: #ffedd5; color: #9a3412; }
.sys.note { background: #f1f5f9; color: #475569; }
.sys.warn { background: #fee2e2; color: #b91c1c; }
.sys.end { background: #e2e8f0; color: #334155; font-weight: 700; }
.sys-link { border: none; background: none; color: inherit; font-weight: 800; text-decoration: underline; cursor: pointer; font-size: 11px; padding: 0; }
.ended { text-align: center; margin-top: 4px; }
.typing { display: inline-flex; gap: 3px; padding: 10px 12px; }
.typing span { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; animation: blink 1.2s infinite; }
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 50% { opacity: 0.3; } }
.composer { display: flex; gap: 8px; padding: 0 12px 10px; }
.composer-input { flex: 1; min-width: 0; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 13px; outline: none; background: white; }
.composer-input:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.12); }
.send { width: 38px; height: 38px; border-radius: 999px; border: none; background: #25d366; color: white; cursor: pointer; flex-shrink: 0; }
.send:disabled { opacity: 0.5; cursor: not-allowed; }
.real { border-top: 1px solid #f1f5f9; }
.real-toggle { width: 100%; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: none; background: none; cursor: pointer; font-size: 12.5px; font-weight: 700; color: #334155; }
.real-body { padding: 0 14px 12px; font-size: 12px; color: #475569; line-height: 1.7; }
.real-body ol { list-style: decimal; padding-inline-start: 18px; margin: 0; }
.restart-btn { padding: 0 12px; border-radius: 999px; border: 1px solid #fed7aa; background: #fff7ed; color: #c2410c; font-weight: 700; font-size: 12px; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
.restart-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.warn-line { margin-top: 8px; color: #b45309; font-size: 11.5px; }
</style>
