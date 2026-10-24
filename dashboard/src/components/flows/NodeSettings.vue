<template>
  <div class="settings" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="settings-head">
      <button type="button" class="back" @click="$emit('close')" :title="isAr ? 'رجوع' : 'Back'">
        <i class="fas" :class="isAr ? 'fa-arrow-right' : 'fa-arrow-left'"></i>
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
      <!-- Start -->
      <template v-if="node.type === 'trigger'">
        <label class="lbl">{{ isAr ? 'يبدأ السير عندما يراسلك العميل لأول مرة، أو بعد مدة صمت:' : 'Starts on the first message, or after a silence of:' }}</label>
        <div class="flex items-center gap-2">
          <input v-model.number="node.data.inactivityHours" type="number" min="1" max="720" class="inp w-24" />
          <span class="text-sm text-slate-600">{{ isAr ? 'ساعة' : 'hours' }}</span>
        </div>
        <p class="hint">{{ isAr ? 'لا يبدأ إذا كانت المحادثة مسندة لموظف. وعندما يكتب موظف للعميل يتوقف السير فوراً.' : 'It does not start on conversations assigned to an agent, and stops as soon as a person writes.' }}</p>
      </template>

      <!-- Message -->
      <template v-else-if="node.type === 'message'">
        <label class="lbl">{{ isAr ? 'نص الرسالة' : 'Message text' }}</label>
        <textarea v-model="node.data.text" rows="5" maxlength="4096" class="inp"></textarea>
        <div class="counter">{{ (node.data.text || '').length }} / 4096</div>
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
      <div v-if="node.type === 'message' || node.type === 'question'" class="preview">
        <div class="preview-label">{{ isAr ? 'معاينة' : 'Preview' }}</div>
        <div class="phone">
          <div class="bubble">{{ node.data.text || '…' }}</div>
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
  errors: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'delete', 'option-removed'])

const meta = computed(() => FLOW_NODE_TYPES[props.node.type] || FLOW_NODE_TYPES.message)
const options = computed(() => props.node.data.options || [])
// Meta limits: button title 20 chars, list row title 24
const titleLimit = computed(() => (options.value.length <= 3 ? 20 : 24))

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
.back { width: 30px; height: 30px; border-radius: 8px; border: none; background: #f8fafc; color: #64748b; cursor: pointer; }
.head-icon { width: 32px; height: 32px; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.errors { margin: 12px 16px 0; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; color: #b91c1c; font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
.settings-body { padding: 16px; overflow-y: auto; flex: 1; }
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
