<template>
  <div class="p-6 max-w-6xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'الموظف الذكي' : 'AI Agent' }}</h1>
      <p class="text-slate-500 mt-1">{{ isAr ? 'موظف آلي يرد على عملائك في واتساب من معلومات نشاطك، ويحوّل المحادثة لفريقك عندما يحتاج العميل موظفاً.' : 'An AI agent that answers customers on WhatsApp from your business info, and hands the chat to your team when needed.' }}</p>
    </div>

    <div v-if="loading" class="flex justify-center p-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
    <div v-else-if="loadError" class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">{{ loadError }}</div>

    <template v-else>
      <div v-if="!form.aiConfigured" class="notice warn mb-4">
        <i class="fas fa-key"></i>
        <span class="flex-1">{{ isAr ? 'لم يُضف مفتاح Gemini بعد — الموظف الذكي لن يعمل بدونه.' : 'No Gemini key yet — the AI agent will not work without it.' }}</span>
        <router-link to="/settings" class="font-semibold text-[#FF6600]">{{ isAr ? 'إضافته من الإعدادات' : 'Add it in Settings' }}</router-link>
      </div>

      <!-- How to switch it on -->
      <div class="notice info mb-5">
        <i class="fas fa-circle-info"></i>
        <span class="flex-1">
          {{ isAr ? 'لتشغيله على رقم: افتح «سير الواتساب»، أضف خطوة' : 'To run it on a number: open "WhatsApp flows", add a' }}
          <strong>{{ isAr ? '«موظف ذكي»' : '"AI agent"' }}</strong>
          {{ isAr ? 'بعد خطوة البداية، ثم انشر السير.' : 'step after the start step, then publish.' }}
        </span>
        <router-link to="/flows" class="font-semibold text-[#FF6600]">{{ isAr ? 'سير الواتساب' : 'WhatsApp flows' }}</router-link>
      </div>

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
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="card-title">{{ isAr ? 'معلومات النشاط' : 'Business information' }}</h2>
                <p class="card-sub">{{ isAr ? 'الموظف الذكي يجيب من هذه المعلومات فقط، ويحوّل لفريقك أي سؤال جوابه غير موجود هنا.' : 'The agent answers only from this; anything not covered goes to your team.' }}</p>
              </div>
              <button v-if="canManage" type="button" class="add-btn" @click="addEntry"><i class="fas fa-plus"></i> {{ isAr ? 'إضافة' : 'Add' }}</button>
            </div>

            <div v-if="form.knowledge.length === 0" class="empty-kb">
              <p class="mb-3">{{ isAr ? 'ابدأ بالأساسيات:' : 'Start with the basics:' }}</p>
              <div class="flex flex-wrap gap-2 justify-center">
                <button v-for="s in starters" :key="s" type="button" class="starter" :disabled="!canManage" @click="addEntry(s)">+ {{ s }}</button>
              </div>
            </div>

            <div class="space-y-3">
              <div v-for="(entry, i) in form.knowledge" :key="entry.id" class="kb-entry">
                <div class="flex items-center gap-2 mb-2">
                  <input v-model="entry.title" maxlength="120" class="inp font-semibold" :disabled="!canManage" :placeholder="isAr ? 'العنوان (مثال: الأسعار)' : 'Title (e.g. Prices)'" />
                  <button v-if="canManage" type="button" class="del-btn" @click="form.knowledge.splice(i, 1)" :title="isAr ? 'حذف' : 'Delete'"><i class="fas fa-trash"></i></button>
                </div>
                <textarea v-model="entry.content" rows="3" class="inp" :disabled="!canManage" :placeholder="isAr ? 'اكتب المعلومة كما تريد أن يعرفها الموظف الذكي…' : 'Write the information as the agent should know it…'"></textarea>
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

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const form = ref({ name: '', instructions: '', maxTurns: 8, knowledge: [], aiConfigured: false })
let savedSnapshot = ''

const editable = () => JSON.stringify({ name: form.value.name, instructions: form.value.instructions, maxTurns: form.value.maxTurns, knowledge: form.value.knowledge })
const dirty = computed(() => editable() !== savedSnapshot)
const knowledgeChars = computed(() => form.value.knowledge.reduce((s, k) => s + (k.title || '').length + (k.content || '').length, 0))
const fmtNum = (n) => new Intl.NumberFormat('en-US').format(n)

const starters = computed(() => (isAr.value
  ? ['من نحن', 'الأسعار والباقات', 'أوقات العمل', 'الموقع والفروع', 'التوصيل والشحن', 'سياسة الاسترجاع', 'طرق الدفع']
  : ['About us', 'Prices & plans', 'Working hours', 'Location', 'Delivery', 'Return policy', 'Payment methods']))

const newId = () => Math.random().toString(36).slice(2, 10)
const addEntry = (title = '') => {
  form.value.knowledge.push({ id: newId(), title: typeof title === 'string' ? title : '', content: '' })
}

const errorMessage = (err) => err.response?.data?.error?.message || err.response?.data?.message || err.message

const applyAgent = (data) => {
  form.value = {
    name: data.name,
    instructions: data.instructions,
    maxTurns: data.maxTurns,
    knowledge: data.knowledge.map(k => ({ ...k })),
    aiConfigured: data.aiConfigured
  }
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
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر الحفظ' : 'Could not save', text: errorMessage(err), confirmButtonColor: '#FF6600' })
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
    const res = await axios.post('/api/v1/ai/agent/test', { messages: chat.value.map(m => ({ role: m.role, text: m.text })) })
    const r = res.data.data
    chat.value.push({ role: 'agent', text: r.reply || (isAr.value ? '(بدون رد)' : '(no reply)'), handoff: r.handoff, reason: r.reason })
  } catch (err) {
    chat.value.push({ role: 'error', text: errorMessage(err) })
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
.notice { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 14px; font-size: 0.85rem; }
.notice.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.notice.info { background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; }
.lbl { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
.inp { width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; outline: none; background: white; resize: vertical; }
.inp:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.12); }
.inp:disabled { background: #f8fafc; color: #64748b; }
.add-btn { white-space: nowrap; font-size: 13px; font-weight: 700; color: #FF6600; background: #fff7f2; border: none; border-radius: 10px; padding: 7px 12px; cursor: pointer; }
.empty-kb { text-align: center; color: #64748b; font-size: 13px; border: 1.5px dashed #e2e8f0; border-radius: 14px; padding: 18px; margin-top: 12px; }
.starter { font-size: 12.5px; font-weight: 600; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 12px; cursor: pointer; }
.starter:hover { border-color: #FF6600; color: #FF6600; }
.kb-entry { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; background: #fcfcfd; margin-top: 12px; }
.del-btn { width: 36px; height: 36px; flex-shrink: 0; border-radius: 10px; border: none; background: #fef2f2; color: #ef4444; cursor: pointer; }
.save-btn { background: #FF6600; color: white; border: none; border-radius: 12px; padding: 10px 26px; font-weight: 700; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.save-btn:disabled { opacity: 0.55; cursor: not-allowed; }
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
