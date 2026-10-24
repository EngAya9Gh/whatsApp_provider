<template>
  <div class="bar-list">
    <div v-if="items.length === 0" class="empty">{{ emptyText }}</div>
    <div v-for="item in items" :key="item.key" class="bar-row" :title="`${item.label}: ${item.value}`">
      <div class="bar-label">
        <span v-if="item.dot" class="dot" :style="{ background: item.dot }"></span>
        <span class="text">{{ item.label }}</span>
      </div>
      <div class="bar-area">
        <div class="bar-fill" :style="{ width: widthFor(item.value), background: color }"></div>
        <span class="bar-value">{{ item.display ?? item.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ key, label, value, dot?, display? }]
  color: { type: String, default: '#2a78d6' },
  emptyText: { type: String, default: '—' }
})

const max = computed(() => Math.max(0, ...props.items.map(i => i.value)))
// The value label sits at the bar tip, so bars scale within the space left after the longest label
const reserveEm = computed(() => {
  const longest = Math.max(1, ...props.items.map(i => String(i.display ?? i.value).length))
  return (longest * 0.62 + 1).toFixed(2)
})
const widthFor = (value) => {
  if (!max.value || !value) return '0px'
  const ratio = Math.max(value / max.value, 0.01)
  return `calc((100% - ${reserveEm.value}em) * ${ratio.toFixed(4)})`
}
</script>

<style scoped>
/* One shared grid so every bar starts from the same baseline */
.bar-list { display: grid; grid-template-columns: fit-content(40%) 1fr; column-gap: 12px; row-gap: 10px; align-items: center; }
.empty { grid-column: 1 / -1; font-size: 0.8rem; color: #94a3b8; text-align: center; padding: 16px 0; }
.bar-row { display: contents; }
.bar-label { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #334155; min-width: 0; }
.bar-label .text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.bar-area { display: flex; align-items: center; gap: 8px; min-width: 0; }
.bar-fill { height: 14px; flex: none; border-start-end-radius: 4px; border-end-end-radius: 4px; transition: width 0.3s; }
.bar-row:hover .bar-fill { filter: brightness(1.1); }
.bar-value { font-size: 0.78rem; font-weight: 700; color: #0f172a; white-space: nowrap; font-variant-numeric: tabular-nums; }
</style>
