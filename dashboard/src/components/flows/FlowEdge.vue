<template>
  <BaseEdge :id="id" :path="path[0]" :marker-end="markerEnd" :style="edgeStyle" :interaction-width="24" />
  <EdgeLabelRenderer>
    <div
      class="edge-tools nodrag nopan"
      :class="{ hot }"
      :style="{ transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)` }"
      @mouseenter="ctx.hoveredEdge.value = id"
      @mouseleave="ctx.hoveredEdge.value = null"
    >
      <button type="button" class="edge-del" :title="ctx.isAr.value ? 'حذف هذا الخط' : 'Remove this line'" @click.stop="ctx.removeEdge(id)">
        <i class="fas fa-xmark"></i>
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup>
// A connection between two steps, with a small × in the middle to remove it
import { computed, inject } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@vue-flow/core'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  id: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: { type: String, default: 'bottom' },
  targetPosition: { type: String, default: 'top' },
  markerEnd: { type: String, default: '' },
  style: { type: Object, default: () => ({}) },
  selected: { type: Boolean, default: false }
})

// Provided by FlowEditor
const ctx = inject('flowCtx')

const path = computed(() => getSmoothStepPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  sourcePosition: props.sourcePosition,
  targetX: props.targetX,
  targetY: props.targetY,
  targetPosition: props.targetPosition,
  borderRadius: 10
}))

const hot = computed(() => props.selected || ctx.hoveredEdge.value === props.id)
const tested = computed(() => ctx.testedEdges.value.has(props.id))
const edgeStyle = computed(() => ({
  ...props.style,
  stroke: hot.value ? '#FF6600' : tested.value ? '#6366f1' : props.style?.stroke,
  strokeWidth: hot.value || tested.value ? 2.5 : props.style?.strokeWidth
}))
</script>

<style scoped>
.edge-tools { position: absolute; pointer-events: all; z-index: 5; }
.edge-del {
  width: 20px; height: 20px; border-radius: 999px;
  border: 1.5px solid #cbd5e1; background: white; color: #94a3b8;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; cursor: pointer; padding: 0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
}
.edge-tools.hot .edge-del,
.edge-del:hover { background: #ef4444; border-color: #ef4444; color: white; transform: scale(1.15); }
</style>
