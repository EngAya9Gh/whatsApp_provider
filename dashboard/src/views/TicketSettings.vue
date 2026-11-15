<template>
  <div class="p-6 max-w-4xl mx-auto pb-28" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'إعدادات التذاكر' : 'Ticket settings' }}</h1>
      <p class="text-slate-500 mt-1">{{ isAr ? 'متى تُفتح التذكرة، ومتى يُعاد فتحها أو تُغلق، وماذا يصل للعميل بعد الإغلاق.' : 'When a ticket opens, reopens or closes, and what the customer gets after the close.' }}</p>
    </div>

    <div v-if="loading" class="flex justify-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
    <div v-else-if="loadError" class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">{{ loadError }}</div>

    <template v-else>
      <!-- Life of a ticket -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
        <h2 class="font-bold text-slate-800 mb-4">{{ isAr ? 'كيف تمشي التذكرة؟' : 'How a ticket works' }}</h2>
        <ol class="life">
          <li v-for="(step, i) in lifeSteps" :key="i">
            <span class="life-icon" :style="{ background: step.color }"><i :class="step.icon"></i></span>
            <div>
              <div class="font-semibold text-sm text-slate-800">{{ step.title }}</div>
              <div class="text-xs text-slate-500 leading-relaxed mt-0.5">{{ step.text }}</div>
            </div>
          </li>
        </ol>
      </div>

      <!-- 1. Opening -->
      <section class="card">
        <h2 class="card-title"><span class="num">1</span>{{ isAr ? 'فتح التذاكر' : 'Opening tickets' }}</h2>
        <label class="row">
          <span class="flex-1">
            <span class="row-title">{{ isAr ? 'افتح تذكرة تلقائياً عندما يراسلك عميل' : 'Open a ticket automatically when a customer writes' }}</span>
            <span class="row-desc">{{ isAr
              ? 'كل عميل يراسلك يحصل على تذكرة برقم ومسؤول، وتذهب لفريق الرقم حسب التوزيع. إذا أوقفته، تُفتح التذاكر يدوياً فقط من زر «فتح تذكرة» في المحادثات المباشرة.'
              : 'Every customer who writes gets a numbered ticket with an owner, routed to the number\'s team. When off, tickets are only opened by hand with "Open ticket" in Live Chat.' }}</span>
          </span>
          <Switch v-model="form.autoCreateTickets" />
        </label>

        <div v-if="form.autoCreateTickets" class="mt-4 pt-4 border-t border-slate-100">
          <div class="text-sm font-bold text-slate-700">{{ isAr ? 'الأرقام التي تفتح تذاكر' : 'Numbers that open tickets' }}</div>
          <p class="text-xs text-slate-500 mt-0.5 mb-3">{{ isAr ? 'أوقفه لرقم لا تريد له تذاكر، مثل رقم الحملات التسويقية.' : 'Turn it off for a number that needs no tickets, such as a marketing number.' }}</p>
          <div v-if="form.channels.length === 0" class="text-sm text-slate-400 bg-slate-50 rounded-xl px-4 py-3">{{ isAr ? 'لا توجد أرقام Meta مربوطة بعد.' : 'No Meta numbers connected yet.' }}</div>
          <div v-else class="space-y-2">
            <label v-for="ch in form.channels" :key="ch.id" class="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-slate-50/60">
              <i class="fab fa-whatsapp text-emerald-500 text-lg"></i>
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-semibold text-slate-800 truncate">{{ ch.name || (isAr ? 'رقم واتساب' : 'WhatsApp number') }}</span>
                <span class="block text-xs text-slate-500" dir="ltr">{{ ch.displayPhoneNumber || ch.phoneNumber }}</span>
              </span>
              <span class="text-xs font-semibold" :class="ch.autoCreateTickets ? 'text-emerald-600' : 'text-slate-400'">{{ ch.autoCreateTickets ? (isAr ? 'يفتح تذاكر' : 'Opens tickets') : (isAr ? 'بدون تذاكر' : 'No tickets') }}</span>
              <Switch v-model="ch.autoCreateTickets" />
            </label>
          </div>
        </div>
      </section>

      <!-- 2. Customer writes again after a close -->
      <section class="card">
        <h2 class="card-title"><span class="num">2</span>{{ isAr ? 'إذا راسلك العميل بعد إغلاق تذكرته' : 'When the customer writes again after a close' }}</h2>
        <div class="grid sm:grid-cols-2 gap-3">
          <label class="choice" :class="{ on: form.reopenHours > 0 }">
            <input type="radio" class="sr-only" :checked="form.reopenHours > 0" @change="form.reopenHours = lastReopenHours || 24" />
            <span class="flex items-center gap-2 font-bold text-sm text-slate-800"><i class="fas fa-redo text-emerald-600"></i>{{ isAr ? 'أعد فتح نفس التذكرة' : 'Reopen the same ticket' }}<span class="badge">{{ isAr ? 'موصى به' : 'Recommended' }}</span></span>
            <span class="block text-xs text-slate-500 mt-1.5 leading-relaxed">{{ isAr ? 'إذا راسل خلال المدة التالية ولم يقيّم الخدمة: المشكلة غالباً لم تُحل، فتعود التذكرة نفسها لنفس الموظف.' : 'If they write within the time below and have not rated: the problem is probably not solved, so the same ticket returns to the same agent.' }}</span>
            <select v-if="form.reopenHours > 0" v-model.number="form.reopenHours" class="sel mt-3" @click.stop>
              <option v-for="h in reopenOptions" :key="h" :value="h">{{ hoursLabel(h) }}</option>
            </select>
          </label>
          <label class="choice" :class="{ on: form.reopenHours === 0 }">
            <input type="radio" class="sr-only" :checked="form.reopenHours === 0" @change="rememberAndSet(0)" />
            <span class="flex items-center gap-2 font-bold text-sm text-slate-800"><i class="fas fa-plus text-[#FF6600]"></i>{{ isAr ? 'افتح تذكرة جديدة دائماً' : 'Always open a new ticket' }}</span>
            <span class="block text-xs text-slate-500 mt-1.5 leading-relaxed">{{ isAr ? 'كل رسالة بعد الإغلاق تبدأ تذكرة جديدة برقم جديد، وتُوزَّع من جديد على الفريق.' : 'Any message after a close starts a new ticket with a new number, routed to the team again.' }}</span>
          </label>
        </div>
        <p class="note"><i class="fas fa-circle-info"></i>{{ isAr
          ? 'إذا قيّم العميل الخدمة نعتبر المشكلة منتهية، فرسالته التالية تفتح تذكرة جديدة. وفي أي وقت يستطيع الموظف أن يعيد فتح التذكرة أو يفتح جديدة يدوياً من المحادثات المباشرة.'
          : 'Once the customer rates the service the problem counts as finished, so their next message opens a new ticket. Agents can always reopen or open a new ticket by hand in Live Chat.' }}</p>
      </section>

      <!-- 3. Auto-close -->
      <section class="card">
        <h2 class="card-title"><span class="num">3</span>{{ isAr ? 'الإغلاق التلقائي' : 'Auto-close' }}</h2>
        <label class="row">
          <span class="flex-1">
            <span class="row-title">{{ isAr ? 'أغلق التذكرة إذا لم يرد العميل' : 'Close the ticket when the customer stops replying' }}</span>
            <span class="row-desc">{{ isAr
              ? 'تُغلق فقط إذا كان آخر رد من فريقك وسكت العميل بعده. إذا كان العميل آخر من كتب فهو ينتظرك، فلا تُغلق. الملاحظات الداخلية لا تُحسب رداً.'
              : 'Only when your team answered last and the customer went quiet. If the customer wrote last they are waiting for you, so it stays open. Team notes do not count as an answer.' }}</span>
          </span>
          <Switch v-model="form.autoCloseEnabled" />
        </label>
        <div v-if="form.autoCloseEnabled" class="mt-3 flex items-center gap-3 text-sm text-slate-700">
          {{ isAr ? 'بعد' : 'After' }}
          <select v-model.number="form.autoCloseHours" class="sel w-auto">
            <option v-for="h in autoCloseOptions" :key="h" :value="h">{{ hoursLabel(h) }}</option>
          </select>
          {{ isAr ? 'من صمت العميل' : 'of customer silence' }}
        </div>
      </section>

      <!-- 4. Rating -->
      <section class="card">
        <h2 class="card-title"><span class="num">4</span>{{ isAr ? 'تقييم الخدمة' : 'Service rating' }}</h2>
        <label class="row">
          <span class="flex-1">
            <span class="row-title">{{ isAr ? 'اطلب من العميل تقييم الخدمة عند إغلاق التذكرة' : 'Ask the customer to rate the service when a ticket closes' }}</span>
            <span class="row-desc">{{ isAr
              ? 'يستطيع الموظف إلغاءه لتذكرة معيّنة من نافذة الإغلاق. لا يُرسل إذا مرّ أكثر من 24 ساعة على آخر رسالة من العميل (سياسة Meta).'
              : 'Agents can skip it for one ticket in the close window. It is not sent more than 24h after the customer\'s last message (Meta policy).' }}</span>
          </span>
          <Switch v-model="form.ratingEnabled" />
        </label>

        <template v-if="form.ratingEnabled">
          <div class="grid sm:grid-cols-3 gap-3 mt-4">
            <label v-for="t in ratingTypes" :key="t.key" class="choice" :class="{ on: form.ratingType === t.key }">
              <input type="radio" class="sr-only" :value="t.key" v-model="form.ratingType" />
              <span class="flex items-center gap-2 font-bold text-sm text-slate-800">{{ t.title }}<span v-if="t.recommended" class="badge">{{ isAr ? 'موصى به' : 'Recommended' }}</span></span>
              <span class="block text-xs text-slate-500 mt-1 leading-relaxed">{{ t.desc }}</span>
            </label>
          </div>

          <div class="grid md:grid-cols-[1fr_260px] gap-4 mt-4">
            <div>
              <label class="text-sm font-bold text-slate-700" for="rating-text">{{ isAr ? 'نص الرسالة' : 'Message text' }}</label>
              <textarea id="rating-text" v-model="form.ratingMessageText" rows="4" maxlength="1000" class="ta mt-1.5"></textarea>
              <div class="text-[11px] text-slate-400 text-end" dir="ltr">{{ form.ratingMessageText.length }} / 1000</div>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-400 mb-1.5">{{ isAr ? 'ماذا يرى العميل' : 'What the customer sees' }}</div>
              <div class="phone">
                <div class="bubble" dir="auto">{{ form.ratingMessageText || '…' }}<template v-if="form.ratingType === 'TEXT'">{{ isAr ? '\n\nللتقييم، يرجى الرد برقم من 1 إلى 5 (مثال: 5).' : '\n\nTo rate, reply with a number from 1 to 5.' }}</template></div>
                <template v-if="form.ratingType === 'BUTTONS_3'">
                  <div v-for="b in ['1 ⭐', '3 ⭐', '5 ⭐']" :key="b" class="wa-btn">{{ b }}</div>
                </template>
                <div v-else-if="form.ratingType === 'LIST_5_STARS'" class="wa-btn"><i class="fas fa-list-ul"></i> تقييم الخدمة ⭐</div>
              </div>
            </div>
          </div>
        </template>
      </section>

      <div class="savebar">
        <span class="text-sm" :class="dirty ? 'text-amber-700' : 'text-slate-400'">
          <i class="fas" :class="dirty ? 'fa-circle-exclamation' : 'fa-check'"></i>
          {{ dirty ? (isAr ? 'لديك تغييرات غير محفوظة' : 'You have unsaved changes') : (isAr ? 'كل التغييرات محفوظة' : 'All changes saved') }}
        </span>
        <button type="button" class="save" :disabled="!dirty || saving" @click="save">
          <i class="fas" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>{{ isAr ? 'حفظ الإعدادات' : 'Save settings' }}
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
import { ticketErrorText } from '../utils/tickets'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

// Small on/off switch used by every setting on this page
const Switch = (props, { emit }) => h('button', {
  type: 'button',
  dir: 'ltr',
  role: 'switch',
  'aria-checked': String(!!props.modelValue),
  class: ['switch', { on: props.modelValue }],
  onClick: (e) => { e.preventDefault(); emit('update:modelValue', !props.modelValue) }
}, [h('span', { class: 'knob' })])
Switch.props = ['modelValue']
Switch.emits = ['update:modelValue']

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const form = ref(null)
let saved = ''
const lastReopenHours = ref(24)

const snapshot = () => JSON.stringify(form.value)
const dirty = computed(() => !!form.value && snapshot() !== saved)

const reopenOptions = [12, 24, 48, 72, 168]
const autoCloseOptions = [12, 24, 48, 72, 168]
const hoursLabel = (hours) => {
  if (hours === 168) return isAr.value ? 'أسبوع' : '1 week'
  if (hours % 24 === 0 && hours >= 48) return isAr.value ? `${hours / 24} أيام` : `${hours / 24} days`
  return isAr.value ? `${hours} ساعة` : `${hours} hours`
}
const rememberAndSet = (value) => {
  if (form.value.reopenHours > 0) lastReopenHours.value = form.value.reopenHours
  form.value.reopenHours = value
}

const lifeSteps = computed(() => {
  const reopen = form.value?.reopenHours > 0
    ? (isAr.value ? `إذا كتب خلال ${hoursLabel(form.value.reopenHours)} دون تقييم تُعاد فتح نفس التذكرة، وبعدها تُفتح تذكرة جديدة.` : `Within ${hoursLabel(form.value.reopenHours)} and without a rating the same ticket reopens; after that a new one opens.`)
    : (isAr.value ? 'تُفتح له تذكرة جديدة.' : 'A new ticket opens.')
  return [
    { icon: 'fas fa-comment', color: '#3b82f6', title: isAr.value ? 'العميل يراسلك' : 'The customer writes', text: isAr.value ? 'تُفتح تذكرة برقم مثل \u2066#TK-0012\u2069 وتذهب لفريق الرقم.' : 'A ticket like #TK-0012 opens and goes to the number\'s team.' },
    { icon: 'fas fa-user-check', color: '#f97316', title: isAr.value ? 'موظف يتولاها' : 'An agent takes it', text: isAr.value ? 'بالتوزيع التلقائي، أو بالإسناد، أو أول من يرد عليها.' : 'By routing, by assignment, or whoever replies first.' },
    { icon: 'fas fa-circle-check', color: '#10b981', title: isAr.value ? 'تُغلق' : 'It closes', text: isAr.value ? 'يدوياً مع التصنيف والحل، أو تلقائياً، ويُطلب من العميل التقييم.' : 'By hand with a category and resolution, or automatically; the customer is asked to rate.' },
    { icon: 'fas fa-redo', color: '#8b5cf6', title: isAr.value ? 'العميل يرجع' : 'The customer comes back', text: reopen }
  ]
})

const ratingTypes = computed(() => [
  { key: 'LIST_5_STARS', recommended: true, title: isAr.value ? 'قائمة 5 نجوم' : '5-star list', desc: isAr.value ? 'قائمة من 1 إلى 5 نجوم مع وصف لكل خيار.' : 'A list from 1 to 5 stars with a description for each.' },
  { key: 'BUTTONS_3', title: isAr.value ? '3 أزرار' : '3 buttons', desc: isAr.value ? 'أسرع للعميل: 1 أو 3 أو 5 نجوم (واتساب يسمح بـ 3 أزرار فقط).' : 'Fastest: 1, 3 or 5 stars (WhatsApp allows 3 buttons).' },
  { key: 'TEXT', title: isAr.value ? 'رسالة نصية' : 'Plain text', desc: isAr.value ? 'يرد العميل برقم من 1 إلى 5.' : 'The customer replies with a number from 1 to 5.' }
])

const toForm = (data) => ({
  autoCreateTickets: data.autoCreateTickets,
  reopenHours: data.reopenHours,
  autoCloseEnabled: data.autoCloseEnabled,
  autoCloseHours: data.autoCloseHours,
  ratingEnabled: data.ratingEnabled,
  ratingType: data.ratingType,
  ratingMessageText: data.ratingMessageText,
  channels: (data.channels || []).map(c => ({ ...c }))
})

const apply = (data) => {
  form.value = toForm(data)
  if (form.value.reopenHours > 0) lastReopenHours.value = form.value.reopenHours
  // Values that are not in the lists (set elsewhere) still show up in the selects
  if (!reopenOptions.includes(form.value.reopenHours) && form.value.reopenHours > 0) reopenOptions.push(form.value.reopenHours)
  if (!autoCloseOptions.includes(form.value.autoCloseHours)) autoCloseOptions.push(form.value.autoCloseHours)
  saved = snapshot()
}

const save = async () => {
  saving.value = true
  try {
    const { channels, ...settings } = form.value
    const res = await axios.put('/api/v1/tickets/settings', {
      ...settings,
      channels: channels.map(c => ({ id: c.id, autoCreateTickets: c.autoCreateTickets }))
    })
    apply(res.data.data)
    Swal.fire({ icon: 'success', title: isAr.value ? 'حُفظت إعدادات التذاكر' : 'Ticket settings saved', toast: true, position: 'top-end', showConfirmButton: false, timer: 2200 })
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر الحفظ' : 'Could not save', text: ticketErrorText(err, isAr.value), confirmButtonColor: '#FF6600' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res = await axios.get('/api/v1/tickets/settings')
    apply(res.data.data)
  } catch (err) {
    loadError.value = ticketErrorText(err, isAr.value) || (isAr.value ? 'تعذّر تحميل الإعدادات' : 'Could not load the settings')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.life { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.life li { display: flex; gap: 10px; align-items: flex-start; }
.life-icon { width: 32px; height: 32px; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); padding: 20px; margin-bottom: 16px; }
.card-title { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #1e293b; font-size: 15px; margin-bottom: 14px; }
.num { width: 24px; height: 24px; border-radius: 8px; background: #fff7ed; color: #ea580c; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
.row { display: flex; gap: 16px; align-items: flex-start; cursor: pointer; }
.row-title { display: block; font-weight: 700; font-size: 14px; color: #1e293b; }
.row-desc { display: block; font-size: 12.5px; color: #64748b; margin-top: 3px; line-height: 1.65; }
.choice { display: block; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
.choice:hover { border-color: #cbd5e1; }
.choice.on { border-color: #FF6600; background: #fffaf5; }
.badge { font-size: 10.5px; font-weight: 700; color: #047857; background: #ecfdf5; padding: 2px 8px; border-radius: 999px; }
.sel { width: 100%; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; background: white; outline: none; }
.sel.w-auto { width: auto; }
.sel:focus, .ta:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.12); }
.ta { width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 13px; outline: none; resize: vertical; }
.note { display: flex; gap: 8px; margin-top: 12px; font-size: 12px; color: #475569; background: #f8fafc; border-radius: 10px; padding: 10px 12px; line-height: 1.65; }
.note i { color: #3b82f6; margin-top: 3px; }
.phone { background: #efeae2; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.bubble { background: white; border-radius: 10px; padding: 8px 10px; font-size: 12.5px; white-space: pre-line; color: #111827; box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06); }
.wa-btn { background: white; border-radius: 10px; padding: 7px 10px; font-size: 12.5px; color: #0a7cff; font-weight: 600; text-align: center; box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06); }
:deep(.switch) { position: relative; width: 44px; height: 24px; border-radius: 12px; border: none; background: #cbd5e1; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
:deep(.switch.on) { background: #10b981; }
:deep(.switch .knob) { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); }
:deep(.switch.on .knob) { left: 23px; }
.savebar { position: sticky; bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
.save { display: inline-flex; align-items: center; gap: 8px; padding: 9px 20px; border-radius: 12px; border: none; background: #FF6600; color: white; font-weight: 700; font-size: 14px; cursor: pointer; }
.save:disabled { opacity: 0.5; cursor: not-allowed; }
@media (max-width: 760px) { .life { grid-template-columns: 1fr 1fr; } }
</style>
