<template>
  <div
    class="fnode"
    :class="{ selected, invalid: errors.length > 0, loose: isLoose, live: isLive, visited: isVisited && !isLive }"
    :dir="ctx.isAr.value ? 'rtl' : 'ltr'"
    :style="{ '--accent': meta.color }"
  >
    <!-- Quick actions (hover or selected) -->
    <div v-if="type !== 'trigger'" class="fnode-tools nodrag nopan">
      <button type="button" :title="ctx.isAr.value ? 'نسخ الخطوة' : 'Duplicate'" @click.stop="ctx.duplicateNode(id)"><i class="far fa-copy"></i></button>
      <button type="button" class="danger" :title="ctx.isAr.value ? 'حذف الخطوة' : 'Delete step'" @click.stop="ctx.deleteNode(id)"><i class="fas fa-trash"></i></button>
    </div>

    <div v-if="isLive" class="fnode-badge live-badge"><i class="fas fa-hourglass-half"></i> {{ ctx.isAr.value ? 'التجربة واقفة هنا' : 'Test is waiting here' }}</div>
    <div v-else-if="isLoose" class="fnode-badge loose-badge" :title="ctx.isAr.value ? 'لا يوجد خط يوصل لهذه الخطوة من البداية، فلن يصلها أي عميل' : 'No line leads here from the start, so no customer will reach it'">
      <i class="fas fa-link-slash"></i> {{ ctx.isAr.value ? 'غير موصولة' : 'Not connected' }}
    </div>

    <Handle v-if="type !== 'trigger'" id="in" type="target" :position="Position.Top" class="fhandle" />

    <div class="fnode-head">
      <span class="fnode-icon"><i :class="meta.icon"></i></span>
      <span class="fnode-title">{{ ctx.isAr.value ? meta.ar : meta.en }}</span>
      <i v-if="errors.length" class="fas fa-circle-exclamation fnode-error" :title="errors.join('\n')"></i>
    </div>

    <div class="fnode-body">
      <template v-if="type === 'trigger'">
        {{ ctx.isAr.value
          ? `أول رسالة من العميل، أو بعد ${data.inactivityHours || 24} ساعة من آخر رسالة له`
          : `First message, or after ${data.inactivityHours || 24}h of silence` }}
      </template>
      <template v-else-if="type === 'message'">
        <span v-if="data.sample" class="sample"><i class="fas fa-pen"></i> {{ ctx.isAr.value ? 'مثال — عدّله' : 'Example — edit it' }}</span>
        <div class="clamp">{{ data.text || placeholder }}</div>
      </template>
      <template v-else-if="type === 'question'">
        <div class="clamp mb">{{ data.text || placeholder }}</div>
      </template>
      <template v-else-if="type === 'link'">
        <div class="clamp">{{ data.text || placeholder }}</div>
        <div class="link-btn" dir="auto"><i class="fas fa-arrow-up-right-from-square"></i> {{ data.buttonText || (ctx.isAr.value ? 'نص الزر' : 'Button text') }}</div>
        <div class="link-url" dir="ltr">{{ linkHost }}</div>
      </template>
      <template v-else-if="type === 'condition'">{{ conditionSummary }}</template>
      <template v-else-if="type === 'tag'">
        {{ data.action === 'REMOVE' ? (ctx.isAr.value ? 'إزالة' : 'Remove') : (ctx.isAr.value ? 'إضافة' : 'Add') }}
        <strong>{{ ctx.tagMap.value[data.tagId]?.name || '—' }}</strong>
      </template>
      <template v-else-if="type === 'stage'">
        {{ ctx.isAr.value ? 'نقل إلى' : 'Move to' }} <strong>{{ ctx.stageMap.value[data.stageId]?.name || '—' }}</strong>
      </template>
      <template v-else-if="type === 'ai_agent'">
        {{ ctx.isAr.value ? 'يجيب العميل من معلومات نشاطك، ويحوّله لموظف عند الحاجة' : 'Answers from your business info; hands off when needed' }}
      </template>
      <template v-else-if="type === 'assign'">
        <template v-if="data.mode === 'AGENT'">{{ ctx.isAr.value ? 'إلى' : 'To' }} <strong>{{ ctx.agentMap.value[data.agentId]?.name || '—' }}</strong></template>
        <template v-else>{{ ctx.isAr.value ? 'إلى فريق هذا الرقم (حسب الدوام والتوزيع)' : "To this number's team (by shift & routing)" }}</template>
      </template>
      <template v-else-if="type === 'end'">
        {{ data.handoff !== false
          ? (ctx.isAr.value ? 'ينتهي ويحوّل المحادثة للفريق' : 'Ends and hands to the team')
          : (ctx.isAr.value ? 'ينتهي بدون تحويل' : 'Ends without hand-off') }}
      </template>
    </div>

    <!-- Branch outputs: a "+" on every free output adds the next step already connected -->
    <div v-if="branches.length" class="fnode-branches">
      <div v-for="b in branches" :key="b.handle" class="branch" :class="b.tone">
        <span v-if="b.num" class="branch-num">{{ b.num }}</span>
        <span class="branch-text">{{ b.label }}</span>
        <Handle :id="b.handle" type="source" :position="sidePosition" class="fhandle" />
        <button
          v-if="!isConnected(b.handle)"
          type="button"
          class="add-out side nodrag nopan"
          :class="ctx.isAr.value ? 'at-left' : 'at-right'"
          :title="freeHint"
          @click.stop="(e) => ctx.openStepMenu({ nodeId: id, handle: b.handle, event: e })"
        ><i class="fas fa-plus"></i></button>
      </div>
    </div>
    <template v-else-if="type !== 'assign' && type !== 'end'">
      <Handle id="out" type="source" :position="Position.Bottom" class="fhandle" />
      <button
        v-if="!isConnected('out')"
        type="button"
        class="add-out bottom nodrag nopan"
        :title="ctx.isAr.value ? 'أضف الخطوة التالية' : 'Add the next step'"
        @click.stop="(e) => ctx.openStepMenu({ nodeId: id, handle: 'out', event: e })"
      ><i class="fas fa-plus"></i></button>
    </template>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { FLOW_NODE_TYPES, CONDITION_CHECKS } from '../../data/flowNodes'

const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Object, default: () => ({}) },
  selected: { type: Boolean, default: false }
})

// Provided by FlowEditor (see the flowCtx object there)
const ctx = inject('flowCtx')

const meta = computed(() => FLOW_NODE_TYPES[props.type] || FLOW_NODE_TYPES.message)
const errors = computed(() => ctx.errorsByNode.value[props.id] || [])
const placeholder = computed(() => (ctx.isAr.value ? 'اكتب النص من لوحة الإعدادات…' : 'Write the text in the settings panel…'))
// Branch handles sit at the end of each row (left in Arabic)
const sidePosition = computed(() => (ctx.isAr.value ? Position.Left : Position.Right))

const isLoose = computed(() => props.type !== 'trigger' && !ctx.reachable.value.has(props.id))
const isLive = computed(() => ctx.liveNodeId.value === props.id)
const isVisited = computed(() => ctx.visitedIds.value.has(props.id))
const isConnected = (handle) => ctx.connectedHandles.value.has(`${props.id}:${handle}`)

const freeHint = computed(() => (ctx.isAr.value
  ? 'غير موصول: إذا وصل العميل هنا ينتهي السير ويحوّل للفريق. اضغط لإضافة خطوة.'
  : 'Not connected: a customer who gets here ends the flow and goes to the team. Click to add a step.'))

const branches = computed(() => {
  const ar = ctx.isAr.value
  if (props.type === 'question') {
    return [
      ...(props.data.options || []).map((opt, i) => ({ handle: `opt-${opt.id}`, num: i + 1, label: opt.title || (ar ? 'خيار' : 'Option') })),
      { handle: 'fallback', label: ar ? 'رد آخر' : 'Other reply', tone: 'muted' }
    ]
  }
  if (props.type === 'condition') {
    return [
      { handle: 'yes', label: ar ? 'نعم' : 'Yes', tone: 'yes' },
      { handle: 'no', label: ar ? 'لا' : 'No', tone: 'no' }
    ]
  }
  if (props.type === 'ai_agent') return [{ handle: 'handoff', label: ar ? 'عند التحويل لموظف' : 'On hand-off', tone: 'muted' }]
  return []
})

const linkHost = computed(() => {
  try { return new URL(props.data.url).hostname || '' } catch { return '' }
})

const conditionSummary = computed(() => {
  const check = CONDITION_CHECKS.find(c => c.key === props.data.check)
  if (!check) return '—'
  const label = ctx.isAr.value ? check.ar : check.en
  if (props.data.check === 'HAS_TAG') return `${label}: ${ctx.tagMap.value[props.data.value]?.name || '—'}`
  if (props.data.check === 'STAGE_IS') return `${label}: ${ctx.stageMap.value[props.data.value]?.name || '—'}`
  if (props.data.check === 'TEXT_CONTAINS') return `${label}: ${props.data.value || '—'}`
  return label
})
</script>

<style scoped>
.fnode {
  width: 250px;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  font-size: 12px;
  color: #334155;
  position: relative;
  transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
}
.fnode.selected { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent); }
.fnode.invalid { border-color: #d03b3b; }
.fnode.loose { border-style: dashed; opacity: 0.8; }
.fnode.loose.selected { opacity: 1; }
.fnode.visited { border-color: #a5b4fc; }
.fnode.live { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25); animation: pulse 1.8s ease-in-out infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 7px rgba(99, 102, 241, 0.12); } }

.fnode-tools {
  position: absolute; top: -32px; inset-inline-end: 0;
  display: flex; gap: 4px; opacity: 0; pointer-events: none; transition: opacity 0.12s;
}
.fnode:hover .fnode-tools, .fnode.selected .fnode-tools { opacity: 1; pointer-events: all; }
.fnode-tools button {
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #64748b;
  font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}
.fnode-tools button:hover { color: #0f172a; border-color: #cbd5e1; }
.fnode-tools button.danger:hover { background: #ef4444; border-color: #ef4444; color: white; }

.fnode-badge {
  position: absolute; top: -11px; inset-inline-start: 10px;
  font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 999px; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 4px;
}
.loose-badge { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
.live-badge { background: #6366f1; color: white; }

.fnode-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-weight: 700;
  color: #0f172a;
}
.fnode-icon {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent) 14%, white);
  color: var(--accent);
  font-size: 11px;
}
.fnode-title { flex: 1; }
.fnode-error { color: #d03b3b; }
.fnode-body { padding: 9px 12px; line-height: 1.55; white-space: pre-line; }
.fnode-body strong { color: #0f172a; }
.sample { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 4px; padding: 1px 7px; border-radius: 999px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 10.5px; font-weight: 700; white-space: nowrap; }
.sample i { font-size: 9px; }
.link-btn { margin-top: 6px; padding: 5px 8px; border-radius: 8px; background: #ecfeff; color: #0e7490; font-weight: 700; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.link-btn i { font-size: 10px; }
.link-url { margin-top: 3px; font-size: 10.5px; color: #94a3b8; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.mb { margin-bottom: 2px; }
.fnode-branches { border-top: 1px solid #f1f5f9; padding: 4px 0; }
.branch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-weight: 600;
  color: #0f172a;
}
.branch.muted .branch-text { color: #94a3b8; font-weight: 500; }
.branch.yes .branch-text { color: #006300; }
.branch.no .branch-text { color: #d03b3b; }
.branch-num {
  width: 18px; height: 18px; border-radius: 6px;
  background: #f1f5f9; color: #64748b;
  font-size: 10px; display: flex; align-items: center; justify-content: center;
}
.branch-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fhandle { width: 12px; height: 12px; background: white; border: 2px solid var(--accent); }
.fhandle:hover { background: var(--accent); }

/* "+" next to a free output */
.add-out {
  position: absolute; width: 20px; height: 20px; border-radius: 999px; padding: 0;
  border: 1.5px dashed color-mix(in srgb, var(--accent) 70%, white); background: white; color: var(--accent);
  font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s, transform 0.15s;
}
.add-out:hover { background: var(--accent); color: white; border-style: solid; transform: scale(1.15); }
.add-out.side { top: 50%; margin-top: -10px; }
.add-out.side.at-left { left: -34px; }
.add-out.side.at-right { right: -34px; }
.add-out.bottom { bottom: -36px; left: 50%; margin-left: -10px; }
</style>
