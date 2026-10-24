<template>
  <div class="heatmap">
    <div class="heat-grid" :class="{ rtl: isAr }">
      <div></div>
      <div v-for="h in 24" :key="'h' + h" class="hour-label">{{ (h - 1) % 3 === 0 ? hourLabel(h - 1) : '' }}</div>
      <template v-for="(row, day) in matrix" :key="'d' + day">
        <div class="day-label">{{ dayNames[day] }}</div>
        <div
          v-for="(value, hour) in row"
          :key="day + '-' + hour"
          class="cell"
          tabindex="0"
          :style="{ background: colorFor(value) }"
          @pointerenter="hover = { day, hour, value }"
          @pointerleave="hover = null"
          @focus="hover = { day, hour, value }"
          @blur="hover = null"
        ></div>
      </template>
    </div>

    <div class="heat-foot">
      <div class="readout">
        <template v-if="hover">
          <strong>{{ hover.value }}</strong>
          {{ unit }} · {{ dayNames[hover.day] }} · <span dir="ltr">{{ hourLabel(hover.hour) }}–{{ hourLabel((hover.hour + 1) % 24) }}</span>
        </template>
        <template v-else-if="peaks.length">
          {{ isAr ? 'أكثر الأوقات ازدحاماً:' : 'Busiest:' }}
          <span v-for="(p, i) in peaks" :key="i">{{ i ? (isAr ? '، ' : ', ') : ' ' }}{{ dayNames[p.day] }} <span dir="ltr">{{ hourLabel(p.hour) }}</span> ({{ p.value }})</span>
        </template>
        <template v-else>{{ isAr ? 'لا توجد بيانات في هذه الفترة' : 'No data in this period' }}</template>
      </div>
      <div class="scale">
        <span>{{ isAr ? 'أقل' : 'Less' }}</span>
        <span v-for="c in RAMP" :key="c" class="scale-step" :style="{ background: c }"></span>
        <span>{{ isAr ? 'أكثر' : 'More' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  matrix: { type: Array, required: true }, // 7 rows (Sun..Sat) × 24 hours
  isAr: { type: Boolean, default: true },
  unit: { type: String, default: '' }
})

// One-hue blue ramp, light → dark (zero recedes to the surface)
const EMPTY = '#f1f5f9'
const RAMP = ['#b7d3f6', '#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281']

const hover = ref(null)
const max = computed(() => Math.max(0, ...props.matrix.flat()))

const colorFor = (value) => {
  if (!value || !max.value) return EMPTY
  const idx = Math.min(RAMP.length - 1, Math.floor((value / max.value) * RAMP.length - 1e-9))
  return RAMP[Math.max(idx, 0)]
}

const dayNames = computed(() => (props.isAr
  ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']))

const hourLabel = (h) => {
  const suffix = h < 12 ? (props.isAr ? 'ص' : 'am') : (props.isAr ? 'م' : 'pm')
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${suffix}`
}

const peaks = computed(() => props.matrix
  .flatMap((row, day) => row.map((value, hour) => ({ day, hour, value })))
  .filter(c => c.value > 0)
  .sort((a, b) => b.value - a.value)
  .slice(0, 3))
</script>

<style scoped>
.heat-grid {
  display: grid;
  grid-template-columns: 64px repeat(24, minmax(10px, 1fr));
  gap: 2px;
  direction: ltr;
}
.heat-grid.rtl { direction: rtl; }
.hour-label { font-size: 9px; color: #94a3b8; text-align: center; white-space: nowrap; height: 14px; }
.day-label { font-size: 11px; color: #64748b; display: flex; align-items: center; padding-inline-end: 6px; }
.cell { height: 22px; border-radius: 4px; cursor: default; outline: none; transition: transform 0.1s; }
.cell:hover, .cell:focus-visible { transform: scale(1.15); box-shadow: 0 0 0 2px white, 0 0 0 3px #0f172a33; }
.heat-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; font-size: 0.75rem; color: #64748b; }
.readout strong { color: #0f172a; }
.scale { display: inline-flex; align-items: center; gap: 3px; }
.scale-step { width: 14px; height: 10px; border-radius: 3px; }
</style>
