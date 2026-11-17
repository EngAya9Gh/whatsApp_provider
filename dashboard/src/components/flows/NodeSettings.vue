<template>
  <div class="settings" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="settings-head">
      <button type="button" class="back" @click="$emit('close')" :title="isAr ? 'رجوع' : 'Back'">
        <i class="fas" :class="isAr ? 'fa-arrow-right' : 'fa-arrow-left'"></i>
        <span v-if="backLabel">{{ backLabel }}</span>
      </button>
      <span class="head-icon" :style="{ background: meta.color }"><i :class="meta.icon"></i></span>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-slate-800 text-sm">{{ isAr ? meta.ar : meta.en }}</div>
        <div class="text-xs text-slate-400">{{ isAr ? meta.descAr : meta.descEn }}</div>
      </div>
    </div>

    <div v-if="errors.length" class="errors">
      <div v-for="e in errors" :key="e"><i class="fas fa-circle-exclamation"></i> {{ e }}</div>
    </div>

    <div class="settings-body">
      <div v-if="meta.helpAr" class="help">
        <i class="fas fa-lightbulb"></i>
        <span>{{ isAr ? meta.helpAr : meta.helpEn }}</span>
      </div>

      <!-- Start -->
      <template v-if="node.type === 'trigger'">
        <label class="lbl">{{ isAr ? 'يبدأ السير عندما يراسلك العميل لأول مرة، أو بعد مدة صمت:' : 'Starts on the first message, or after a silence of:' }}</label>
        <div class="flex items-center gap-2">
          <input v-model.number="node.data.inactivityHours" type="number" min="1" max="720" class="inp w-24" />
          <span class="text-sm text-slate-600">{{ isAr ? 'ساعة' : 'hours' }}</span>
        </div>
        <div class="example">
          <div class="font-bold mb-1"><i class="fas fa-clock"></i> {{ isAr ? 'مثال بالمدة الحالية' : 'Example with this period' }}</div>
          <ul>
            <li>{{ isAr ? 'عميل يراسلك لأول مرة ← يبدأ السير فوراً.' : 'A customer writes for the first time → the flow starts right away.' }}</li>
            <li>{{ isAr ? `آخر رسالة منه قبل ${hours} ساعة أو أكثر ← رسالته التالية تبدأ السير من أوله.` : `Their last message was ${hours}h ago or more → their next message starts the flow from the top.` }}</li>
            <li>{{ isAr ? `راسلك قبل أقل من ${hours} ساعة ← لا يبدأ، وتبقى المحادثة مع فريقك.` : `They wrote less than ${hours}h ago → it does not start; the chat stays with your team.` }}</li>
          </ul>
        </div>
        <p class="hint">{{ isAr ? 'لا يبدأ إذا كانت المحادثة مسندة لموظف. وعندما يكتب موظف للعميل يتوقف السير فوراً.' : 'It does not start on conversations assigned to an agent, and stops as soon as a person writes.' }}</p>
        <button type="button" class="test-now" @click="$emit('test')">
          <i class="fas fa-play"></i>
          <span class="text-start">
            <span class="block font-bold">{{ isAr ? 'جرّب السير الآن بدون انتظار' : 'Test the flow now, no waiting' }}</span>
            <span class="block text-[11px] font-normal opacity-80">{{ isAr ? 'محادثة تجريبية هنا تشغّل المسودة فوراً، ولا يصل شيء للعملاء.' : 'A test chat here runs the draft at once; nothing reaches customers.' }}</span>
          </span>
        </button>
      </template>

      <!-- Message -->
      <template v-else-if="node.type === 'message'">
        <label class="lbl">{{ isAr ? 'نص الرسالة' : 'Message text' }}</label>
        <div v-if="node.data.sample" class="sample-note">
          <i class="fas fa-pen"></i>
          {{ isAr ? 'هذا نص مثال من النموذج — اكتب فيه معلوماتك الحقيقية.' : 'This is example text from the template — write your real details.' }}
        </div>
        <textarea v-model="node.data.text" rows="5" maxlength="4096" class="inp" @input="clearSample"></textarea>
        <div class="counter">{{ (node.data.text || '').length }} / 4096</div>
      </template>

      <!-- Link button -->
      <template v-else-if="node.type === 'link'">
        <label class="lbl">{{ isAr ? 'نص الرسالة' : 'Message text' }}</label>
        <textarea v-model="node.data.text" rows="4" maxlength="1024" class="inp" :placeholder="isAr ? 'مثال: تصفح منتجاتنا واطلب مباشرة من متجرنا 👇' : 'e.g. Browse our products and order from our store 👇'"></textarea>
        <div class="counter">{{ (node.data.text || '').length }} / 1024</div>
        <label class="lbl mt-3">{{ isAr ? 'نص الزر' : 'Button text' }}</label>
        <input v-model="node.data.buttonText" maxlength="20" class="inp" :placeholder="isAr ? 'اضغط هنا' : 'Open the store'" />
        <div class="counter">{{ (node.data.buttonText || '').length }} / 20</div>
        <label class="lbl mt-3">{{ isAr ? 'الرابط' : 'Link' }}</label>
        <input v-model.trim="node.data.url" dir="ltr" class="inp" placeholder="https://example.com" />
        <p v-if="node.data.url && !linkOk" class="hint text-red-600">{{ isAr ? 'اكتب الرابط كاملاً يبدأ بـ https://' : 'Write the full link, starting with https://' }}</p>
        <p class="hint">{{ isAr
          ? 'لماذا ليس زراً داخل «سؤال بخيارات»؟ أزرار الأسئلة في واتساب ترجع اختيار العميل فقط ولا تفتح روابط، وزر الرابط نوع رسالة منفصل بزر واحد. لتجمع بينهما: اجعل أحد خيارات السؤال يوصل لهذه الخطوة.'
          : 'Why not a button inside a "Question"? WhatsApp question buttons only send back the choice and cannot open links; a link button is a separate message type with one button. To combine them, connect one of the question\'s options to this step.' }}</p>
      </template>

      <!-- Question -->
      <template v-else-if="node.type === 'question'">
        <label class="lbl">{{ isAr ? 'نص السؤال' : 'Question text' }}</label>
        <textarea v-model="node.data.text" rows="3" maxlength="1024" class="inp"></textarea>

        <div class="flex items-center justify-between mt-4 mb-2">
          <label class="lbl m-0">{{ isAr ? 'الخيارات' : 'Options' }}</label>
          <button v-if="options.length < 10" type="button" class="link" @click="addOption"><i class="fas fa-plus"></i> {{ isAr ? 'إضافة خيار' : 'Add option' }}</button>
        </div>
        <div class="space-y-2">
          <div v-for="(opt, i) in options" :key="opt.id" class="flex items-center gap-2">
            <span class="num">{{ i + 1 }}</span>
            <input v-model="opt.title" :maxlength="titleLimit" class="inp flex-1" :placeholder="isAr ? 'عنوان الخيار' : 'Option title'" />
            <span class="text-[10px] text-slate-400 w-9 text-center" dir="ltr">{{ (opt.title || '').length }}/{{ titleLimit }}</span>
            <button type="button" class="icon-btn" :disabled="options.length <= 1" @click="removeOption(opt.id)" :title="isAr ? 'حذف' : 'Remove'"><i class="fas fa-xmark"></i></button>
          </div>
        </div>
        <p class="hint">
          {{ options.length <= 3
            ? (isAr ? 'تُرسل كأزرار (حتى 3 خيارات، 20 حرفاً للخيار).' : 'Sent as buttons (up to 3 options, 20 characters each).')
            : (isAr ? 'أكثر من 3 خيارات تُرسل كقائمة (حتى 10، 24 حرفاً للخيار).' : 'More than 3 options are sent as a list (up to 10, 24 characters each).') }}
          {{ isAr ? 'إذا كتب العميل شيئاً آخر يذهب لمسار «رد آخر»، وإن لم يكن موصولاً يُعاد السؤال مرة واحدة ثم تُحوّل المحادثة للفريق.' : 'Any other reply follows "Other reply"; if unconnected the question is asked once more, then the chat goes to the team.' }}
        </p>
        <template v-if="options.length > 3">
          <label class="lbl mt-3">{{ isAr ? 'نص زر القائمة' : 'List button text' }}</label>
          <input v-model="node.data.buttonLabel" maxlength="20" class="inp" />
        </template>
      </template>

      <!-- Condition -->
      <template v-else-if="node.type === 'condition'">
        <label class="lbl">{{ isAr ? 'ماذا نفحص؟' : 'What to check' }}</label>
        <select v-model="node.data.check" class="inp" @change="node.data.value = ''">
          <option v-for="c in CONDITION_CHECKS" :key="c.key" :value="c.key">{{ isAr ? c.ar : c.en }}</option>
        </select>
        <template v-if="node.data.check === 'HAS_TAG'">
          <label class="lbl mt-3">{{ isAr ? 'الوسم' : 'Tag' }}</label>
          <select v-model="node.data.value" class="inp">
            <option value="" disabled>{{ isAr ? 'اختر وسماً' : 'Choose a tag' }}</option>
            <option v-for="t in tags" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </template>
        <template v-else-if="node.data.check === 'STAGE_IS'">
          <label class="lbl mt-3">{{ isAr ? 'المرحلة' : 'Stage' }}</label>
          <select v-model="node.data.value" class="inp">
            <option value="" disabled>{{ isAr ? 'اختر مرحلة' : 'Choose a stage' }}</option>
            <option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </template>
        <template v-else-if="node.data.check === 'TEXT_CONTAINS'">
          <label class="lbl mt-3">{{ isAr ? 'الكلمات (افصل بينها بفاصلة)' : 'Words (comma separated)' }}</label>
          <input v-model="node.data.value" class="inp" :placeholder="isAr ? 'سعر, أسعار, price' : 'price, cost'" />
        </template>
        <p class="hint">{{ isAr ? 'وصّل مسار «نعم» ومسار «لا» من الخطوة على اللوحة.' : 'Connect the "Yes" and "No" branches on the canvas.' }}</p>
      </template>

      <!-- Tag -->
      <template v-else-if="node.type === 'tag'">
        <div class="seg">
          <button type="button" :class="{ on: node.data.action !== 'REMOVE' }" @click="node.data.action = 'ADD'">{{ isAr ? 'إضافة' : 'Add' }}</button>
          <button type="button" :class="{ on: node.data.action === 'REMOVE' }" @click="node.data.action = 'REMOVE'">{{ isAr ? 'إزالة' : 'Remove' }}</button>
        </div>
        <label class="lbl mt-3">{{ isAr ? 'الوسم' : 'Tag' }}</label>
        <select v-model="node.data.tagId" class="inp">
          <option value="" disabled>{{ isAr ? 'اختر وسماً' : 'Choose a tag' }}</option>
          <option v-for="t in tags" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <p v-if="!tags.length" class="hint">{{ isAr ? 'لا توجد وسوم بعد — أنشئها من صفحة الوسوم ومراحل العميل.' : 'No tags yet — create them on the Tags & Stages page.' }}</p>
      </template>

      <!-- Stage -->
      <template v-else-if="node.type === 'stage'">
        <label class="lbl">{{ isAr ? 'المرحلة' : 'Stage' }}</label>
        <select v-model="node.data.stageId" class="inp">
          <option value="" disabled>{{ isAr ? 'اختر مرحلة' : 'Choose a stage' }}</option>
          <option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <p v-if="!stages.length" class="hint">{{ isAr ? 'فعّل مراحل العميل أولاً من صفحة الوسوم ومراحل العميل.' : 'Turn on customer stages first on the Tags & Stages page.' }}</p>
      </template>

      <!-- AI agent -->
      <template v-else-if="node.type === 'ai_agent'">
        <p class="text-sm text-slate-700 leading-relaxed">
          {{ isAr
            ? 'من هنا يتولى الموظف الذكي المحادثة: يقرأ رسائل العميل ويرد عليها من معلومات نشاطك، ويبقى يرد حتى يطلب العميل موظفاً، أو لا يجد الجواب، أو يصل للحد الأقصى من الردود.'
            : 'From here the AI agent takes the conversation: it answers from your business info until the customer asks for a person, it cannot find the answer, or it reaches its reply limit.' }}
        </p>
        <p class="hint">{{ isAr ? 'وصّل مسار «عند التحويل لموظف» بخطوة «تحويل لموظف». إن تركته فارغاً تُحوَّل المحادثة لفريق الرقم تلقائياً.' : 'Connect "On hand-off" to a "Hand to a person" step. If left empty, the chat goes to the number\'s team.' }}</p>
        <router-link to="/ai-agent" class="link inline-flex items-center gap-1.5 mt-3 no-underline">
          <i class="fas fa-gear"></i>{{ isAr ? 'معلومات الموظف الذكي وتجربته' : 'AI agent info & test' }}
        </router-link>
      </template>

      <!-- Assign -->
      <template v-else-if="node.type === 'assign'">
        <div class="seg">
          <button type="button" :class="{ on: node.data.mode !== 'AGENT' }" @click="node.data.mode = 'TEAM'">{{ isAr ? 'فريق الرقم' : 'Number team' }}</button>
          <button type="button" :class="{ on: node.data.mode === 'AGENT' }" @click="node.data.mode = 'AGENT'">{{ isAr ? 'موظف محدد' : 'One agent' }}</button>
        </div>
        <template v-if="node.data.mode === 'AGENT'">
          <label class="lbl mt-3">{{ isAr ? 'الموظف' : 'Agent' }}</label>
          <select v-model="node.data.agentId" class="inp">
            <option value="" disabled>{{ isAr ? 'اختر موظفاً' : 'Choose an agent' }}</option>
            <option v-for="a in agents" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </template>
        <p class="hint" v-else>
          {{ teamName
            ? (isAr ? `يُسند لأحد أعضاء فريق «${teamName}» الموجودين في الدوام، حسب طريقة توزيع الفريق.` : `Assigned to an on-shift member of "${teamName}", by the team's routing.`)
            : (isAr ? 'لا يوجد فريق مسؤول عن هذا الرقم — أنشئه من صفحة الفرق والشيفتات، وإلا تبقى المحادثة بدون إسناد.' : 'No team owns this number — create one on Teams & Shifts, otherwise the chat stays unassigned.') }}
        </p>
      </template>

      <!-- End -->
      <template v-else-if="node.type === 'end'">
        <label class="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" v-model="node.data.handoff" class="mt-1 accent-[#FF6600]" />
          <span>
            <strong>{{ isAr ? 'تحويل المحادثة للفريق عند الانتهاء' : 'Hand the chat to the team when ending' }}</strong>
            <span class="block text-xs text-slate-500">{{ isAr ? 'أوقفه إذا كان السير يجيب العميل بالكامل.' : 'Turn off when the flow fully answers the customer.' }}</span>
          </span>
        </label>
      </template>

      <!-- WhatsApp preview -->
      <div v-if="node.type === 'message' || node.type === 'question' || node.type === 'link'" class="preview">
        <div class="preview-label">{{ isAr ? 'معاينة' : 'Preview' }}</div>
        <div class="phone">
          <div class="bubble">{{ node.data.text || '…' }}</div>
          <div v-if="node.type === 'link'" class="wa-btn"><i class="fas fa-arrow-up-right-from-square"></i> {{ node.data.buttonText || '…' }}</div>
          <template v-if="node.type === 'question'">
            <template v-if="options.length <= 3">
              <div v-for="opt in options" :key="opt.id" class="wa-btn">{{ opt.title || '…' }}</div>
            </template>
            <div v-else class="wa-btn"><i class="fas fa-list-ul"></i> {{ node.data.buttonLabel || 'الخيارات' }}</div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="node.type !== 'trigger'" class="settings-foot">
      <button type="button" class="delete" @click="$emit('delete')">
        <i class="fas fa-trash"></i> {{ isAr ? 'حذف الخطوة' : 'Delete step' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FLOW_NODE_TYPES, CONDITION_CHECKS, newOptionId } from '../../data/flowNodes'

const props = defineProps({
  node: { type: Object, required: true },
  isAr: { type: Boolean, default: true },
  tags: { type: Array, default: () => [] },
  stages: { type: Array, default: () => [] },
  agents: { type: Array, default: () => [] },
  teamName: { type: String, default: '' },
  errors: { type: Array, default: () => [] },
  backLabel: { type: String, default: '' }
})
const emit = defineEmits(['close', 'delete', 'option-removed', 'test'])
const hours = computed(() => Number(props.node.data?.inactivityHours) || 24)
const linkOk = computed(() => {
  try {
    const u = new URL(String(props.node.data?.url || ''))
    return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname
  } catch { return false }
})

const meta = computed(() => FLOW_NODE_TYPES[props.node.type] || FLOW_NODE_TYPES.message)
const options = computed(() => props.node.data.options || [])
// Meta limits: button title 20 chars, list row title 24
const titleLimit = computed(() => (options.value.length <= 3 ? 20 : 24))

// Editing a template's example text makes it the owner's own
const clearSample = () => {
  if (props.node.data.sample) delete props.node.data.sample
}

const addOption = () => {
  props.node.data.options = [...options.value, { id: newOptionId(), title: '' }]
}
const removeOption = (optionId) => {
  props.node.data.options = options.value.filter(o => o.id !== optionId)
  emit('option-removed', optionId)
}
</script>

<style scoped>
.settings { display: flex; flex-direction: column; height: 100%; }
.settings-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
.back { height: 30px; min-width: 30px; padding: 0 9px; border-radius: 8px; border: none; background: #f8fafc; color: #64748b; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.back:hover { background: #f1f5f9; color: #0f172a; }
.example { margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: #f5f3ff; border: 1px solid #ddd6fe; color: #4c1d95; font-size: 12px; line-height: 1.7; }
.example ul { margin: 0; padding-inline-start: 16px; list-style: disc; }
.test-now { width: 100%; margin-top: 14px; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid #c7d2fe; background: #eef2ff; color: #3730a3; font-size: 12.5px; cursor: pointer; }
.test-now:hover { background: #e0e7ff; }
.test-now > i { width: 28px; height: 28px; border-radius: 8px; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
.head-icon { width: 32px; height: 32px; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.errors { margin: 12px 16px 0; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; color: #b91c1c; font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
.settings-body { padding: 16px; overflow-y: auto; flex: 1; }
.help { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 14px; padding: 10px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px; line-height: 1.65; color: #475569; }
.help i { color: #f59e0b; margin-top: 3px; }
.sample-note { margin-bottom: 6px; padding: 6px 9px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 11.5px; }
.lbl { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
.inp { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; outline: none; background: white; resize: vertical; }
.inp:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.12); }
.counter { font-size: 10px; color: #94a3b8; text-align: end; margin-top: 2px; }
.hint { font-size: 11.5px; color: #64748b; line-height: 1.6; margin-top: 10px; }
.link { font-size: 12px; font-weight: 700; color: #FF6600; background: none; border: none; cursor: pointer; }
.num { width: 22px; height: 22px; border-radius: 7px; background: #f1f5f9; color: #64748b; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-btn { width: 28px; height: 28px; border-radius: 8px; border: none; background: #fef2f2; color: #ef4444; cursor: pointer; flex-shrink: 0; }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.seg { display: inline-flex; background: #f1f5f9; border-radius: 10px; padding: 3px; }
.seg button { border: none; background: transparent; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer; }
.seg button.on { background: white; color: #0f172a; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
.preview { margin-top: 18px; }
.preview-label { font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; }
.phone { background: #efeae2; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.bubble { background: white; border-radius: 10px; border-top-left-radius: 2px; padding: 8px 10px; font-size: 12.5px; color: #111827; white-space: pre-line; max-width: 92%; box-shadow: 0 1px 1px rgba(0,0,0,0.06); }
[dir="rtl"] .bubble { border-top-left-radius: 10px; border-top-right-radius: 2px; }
.wa-btn { background: white; border-radius: 10px; padding: 7px 10px; font-size: 12.5px; color: #0a7cff; font-weight: 600; width: 92%; text-align: center; box-shadow: 0 1px 1px rgba(0,0,0,0.06); }
[dir="rtl"] .phone { align-items: flex-start; }
.settings-foot { padding: 12px 16px; border-top: 1px solid #f1f5f9; }
.delete { width: 100%; padding: 9px; border-radius: 10px; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; font-weight: 700; font-size: 13px; cursor: pointer; }
.delete:hover { background: #fee2e2; }
</style>
