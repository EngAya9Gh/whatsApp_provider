<template>
  <div class="stat-tile">
    <div class="stat-label">
      <i v-if="icon" :class="icon"></i>
      <span>{{ label }}</span>
    </div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-foot">
      <span v-if="delta !== null && delta !== undefined" class="stat-delta" :class="deltaTone">
        <i class="fas" :class="delta > 0 ? 'fa-arrow-trend-up' : delta < 0 ? 'fa-arrow-trend-down' : 'fa-minus'"></i>
        <span dir="ltr">{{ delta > 0 ? '+' : '' }}{{ delta }}%</span>
      </span>
      <span v-if="hint" class="stat-hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: String, default: '' },
  // % change vs the previous period
  delta: { type: Number, default: null },
  // false for metrics where going down is good (e.g. response time)
  upIsGood: { type: Boolean, default: true },
  hint: { type: String, default: '' }
})

const deltaTone = computed(() => {
  if (!props.delta) return 'neutral'
  return (props.delta > 0) === props.upIsGood ? 'good' : 'bad'
})
</script>

<style scoped>
.stat-tile {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.stat-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
}
.stat-label i {
  color: #94a3b8;
  font-size: 0.75rem;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}
.stat-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 18px;
  font-size: 0.72rem;
}
.stat-delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
}
.stat-delta.good { color: #006300; }
.stat-delta.bad { color: #d03b3b; }
.stat-delta.neutral { color: #64748b; }
.stat-hint { color: #94a3b8; }
</style>
