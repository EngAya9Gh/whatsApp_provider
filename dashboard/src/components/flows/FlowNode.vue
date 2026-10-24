<template>
  <div class="fnode" :class="{ selected, invalid: errors.length > 0 }" :dir="ctx.isAr.value ? 'rtl' : 'ltr'" :style="{ '--accent': meta.color }">
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
        <div class="clamp">{{ data.text || placeholder }}</div>
      </template>
      <template v-else-if="type === 'question'">
        <div class="clamp mb">{{ data.text || placeholder }}</div>
      </template>
      <template v-else-if="type === 'condition'">{{ conditionSummary }}</template>
      <template v-else-if="type === 'tag'">
        {{ data.action === 'REMOVE' ? (ctx.isAr.value ? 'إزالة' : 'Remove') : (ctx.isAr.value ? 'إضافة' : 'Add') }}
        <strong>{{ ctx.tagMap.value[data.tagId]?.name || '—' }}</strong>
      </template>
      <template v-else-if="type === 'stage'">
        {{ ctx.isAr.value ? 'نقل إلى' : 'Move to' }} <strong>{{ ctx.stageMap.value[data.stageId]?.name || '—' }}</strong>
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

    <!-- Branch outputs -->
    <div v-if="type === 'question'" class="fnode-branches">
      <div v-for="(opt, i) in data.options || []" :key="opt.id" class="branch">
        <span class="branch-num">{{ i + 1 }}</span>
        <span class="branch-text">{{ opt.title || (ctx.isAr.value ? 'خيار' : 'Option') }}</span>
        <Handle :id="`opt-${opt.id}`" type="source" :position="sidePosition" class="fhandle" />
      </div>
      <div class="branch muted">
        <span class="branch-text">{{ ctx.isAr.value ? 'رد آخر' : 'Other reply' }}</span>
        <Handle id="fallback" type="source" :position="sidePosition" class="fhandle" />
      </div>
    </div>
    <div v-else-if="type === 'condition'" class="fnode-branches">
      <div class="branch yes">
        <span class="branch-text">{{ ctx.isAr.value ? 'نعم' : 'Yes' }}</span>
        <Handle id="yes" type="source" :position="sidePosition" class="fhandle" />
      </div>
      <div class="branch no">
        <span class="branch-text">{{ ctx.isAr.value ? 'لا' : 'No' }}</span>
        <Handle id="no" type="source" :position="sidePosition" class="fhandle" />
      </div>
    </div>
    <Handle v-else-if="type !== 'assign' && type !== 'end'" id="out" type="source" :position="Position.Bottom" class="fhandle" />
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

// Provided by FlowEditor: { isAr, errorsByNode, tagMap, stageMap, agentMap }
const ctx = inject('flowCtx')

const meta = computed(() => FLOW_NODE_TYPES[props.type] || FLOW_NODE_TYPES.message)
const errors = computed(() => ctx.errorsByNode.value[props.id] || [])
const placeholder = computed(() => (ctx.isAr.value ? 'اكتب النص من لوحة الإعدادات…' : 'Write the text in the settings panel…'))
// Branch handles sit at the end of each row (left in Arabic)
const sidePosition = computed(() => (ctx.isAr.value ? Position.Left : Position.Right))

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
  transition: border-color 0.15s, box-shadow 0.15s;
}
.fnode.selected { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent); }
.fnode.invalid { border-color: #d03b3b; }
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
.fhandle { width: 10px; height: 10px; background: white; border: 2px solid var(--accent); }
</style>
