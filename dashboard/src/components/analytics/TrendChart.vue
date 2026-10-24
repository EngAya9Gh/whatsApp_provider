<template>
  <div class="trend" ref="root">
    <div class="trend-head">
      <div class="legend" v-if="series.length > 1">
        <span v-for="s in series" :key="s.key" class="legend-item">
          <span class="legend-key" :style="{ background: s.color }"></span>{{ s.label }}
        </span>
      </div>
      <button type="button" class="view-toggle" @click="showTable = !showTable">
        <i class="fas" :class="showTable ? 'fa-chart-line' : 'fa-table'"></i>
        {{ showTable ? (isAr ? 'رسم' : 'Chart') : (isAr ? 'جدول' : 'Table') }}
      </button>
    </div>

    <div v-if="showTable" class="trend-table-wrap">
      <table class="trend-table">
        <thead>
          <tr>
            <th>{{ isAr ? 'اليوم' : 'Day' }}</th>
            <th v-for="s in series" :key="s.key">{{ s.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in [...rows].reverse()" :key="row.date">
            <td>{{ formatDate(row.date) }}</td>
            <td v-for="s in series" :key="s.key">{{ row[s.key] }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="plot"
      tabindex="0"
      :aria-label="ariaLabel"
      @pointermove="onPointer"
      @pointerleave="hoverIndex = null"
      @keydown="onKey"
      @blur="hoverIndex = null"
    >
      <!-- direction: ltr keeps text-anchor predictable; mirroring for Arabic is done in x() -->
      <svg :width="width" :height="height" role="img" :aria-label="ariaLabel" style="direction: ltr">
        <!-- grid + y ticks -->
        <g v-for="tick in ticks" :key="tick">
          <line :x1="plotLeft" :x2="plotRight" :y1="y(tick)" :y2="y(tick)" class="grid" />
          <text :x="isAr ? plotRight + 6 : plotLeft - 6" :y="y(tick) + 4" :text-anchor="isAr ? 'start' : 'end'" class="tick">{{ compact(tick) }}</text>
        </g>
        <!-- x labels -->
        <text v-for="i in xLabelIndexes" :key="'x' + i" :x="x(i)" :y="height - 6" text-anchor="middle" class="tick">{{ formatDate(rows[i].date) }}</text>
        <!-- lines -->
        <path v-for="s in series" :key="s.key" :d="pathFor(s.key)" :stroke="s.color" class="line" />
        <!-- end labels -->
        <g v-for="s in series" :key="'end' + s.key">
          <circle :cx="x(rows.length - 1)" :cy="y(lastValue(s.key))" r="4" :fill="s.color" class="dot" />
          <text v-if="showEndLabels" :x="x(rows.length - 1) + (isAr ? -8 : 8)" :y="y(lastValue(s.key)) + 4" :text-anchor="isAr ? 'end' : 'start'" class="end-label">{{ lastValue(s.key) }}</text>
        </g>
        <!-- crosshair -->
        <g v-if="hoverIndex !== null">
          <line :x1="x(hoverIndex)" :x2="x(hoverIndex)" :y1="plotTop" :y2="plotBottom" class="crosshair" />
          <circle v-for="s in series" :key="'h' + s.key" :cx="x(hoverIndex)" :cy="y(rows[hoverIndex][s.key])" r="4" :fill="s.color" class="dot" />
        </g>
      </svg>

      <div v-if="hoverIndex !== null" class="tooltip" :style="tooltipStyle">
        <div class="tooltip-date">{{ formatDate(rows[hoverIndex].date, true) }}</div>
        <div v-for="s in series" :key="'t' + s.key" class="tooltip-row">
          <span class="tooltip-key" :style="{ background: s.color }"></span>
          <strong>{{ rows[hoverIndex][s.key] }}</strong>
          <span class="tooltip-name">{{ s.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  rows: { type: Array, default: () => [] }, // [{ date: 'YYYY-MM-DD', <seriesKey>: number }]
  series: { type: Array, default: () => [] }, // [{ key, label, color }]
  isAr: { type: Boolean, default: true },
  height: { type: Number, default: 240 },
  ariaLabel: { type: String, default: '' }
})

const root = ref(null)
const width = ref(600)
const hoverIndex = ref(null)
const showTable = ref(false)
let observer = null

const PAD = { top: 16, bottom: 28, axis: 38, end: 40 }
const plotTop = PAD.top
const plotBottom = computed(() => props.height - PAD.bottom)
const plotLeft = computed(() => (props.isAr ? PAD.end : PAD.axis))
const plotRight = computed(() => width.value - (props.isAr ? PAD.axis : PAD.end))

const maxValue = computed(() => {
  const max = Math.max(0, ...props.rows.flatMap(r => props.series.map(s => r[s.key] || 0)))
  if (max <= 4) return 4
  const magnitude = 10 ** Math.floor(Math.log10(max))
  const nice = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(v => v >= max)
  return nice
})
const ticks = computed(() => [0, 1, 2, 3, 4].map(i => (maxValue.value / 4) * i))

// Time flows right-to-left in Arabic
const x = (i) => {
  const n = Math.max(props.rows.length - 1, 1)
  const t = i / n
  return props.isAr ? plotRight.value - t * (plotRight.value - plotLeft.value) : plotLeft.value + t * (plotRight.value - plotLeft.value)
}
const y = (v) => plotBottom.value - ((v || 0) / maxValue.value) * (plotBottom.value - plotTop)

const pathFor = (key) => props.rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ')
const lastValue = (key) => (props.rows.length ? props.rows[props.rows.length - 1][key] || 0 : 0)

// End labels only when they do not collide; otherwise the legend + tooltip carry the values
const showEndLabels = computed(() => {
  const ys = props.series.map(s => y(lastValue(s.key))).sort((a, b) => a - b)
  return ys.every((v, i) => i === 0 || v - ys[i - 1] >= 14)
})

const xLabelIndexes = computed(() => {
  const n = props.rows.length
  if (n === 0) return []
  const count = Math.min(n, Math.max(2, Math.floor((plotRight.value - plotLeft.value) / 90)))
  const step = (n - 1) / Math.max(count - 1, 1)
  return [...new Set(Array.from({ length: count }, (_, k) => Math.round(k * step)))]
})

const compact = (n) => (n >= 1000 ? `${round1(n / 1000)}K` : `${round1(n)}`)
const round1 = (n) => Math.round(n * 10) / 10

const dateFormatter = computed(() => new Intl.DateTimeFormat(props.isAr ? 'ar-u-nu-latn-ca-gregory' : 'en-US', { day: 'numeric', month: 'short' }))
const longFormatter = computed(() => new Intl.DateTimeFormat(props.isAr ? 'ar-u-nu-latn-ca-gregory' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }))
const formatDate = (ymd, long = false) => (long ? longFormatter.value : dateFormatter.value).format(new Date(`${ymd}T12:00:00Z`))

const onPointer = (e) => {
  if (!props.rows.length) return
  const rect = e.currentTarget.getBoundingClientRect()
  const px = e.clientX - rect.left
  let best = 0
  let bestDist = Infinity
  props.rows.forEach((_, i) => {
    const d = Math.abs(x(i) - px)
    if (d < bestDist) { bestDist = d; best = i }
  })
  hoverIndex.value = best
}

const onKey = (e) => {
  if (!props.rows.length) return
  const forward = props.isAr ? 'ArrowLeft' : 'ArrowRight'
  const back = props.isAr ? 'ArrowRight' : 'ArrowLeft'
  const current = hoverIndex.value ?? props.rows.length - 1
  if (e.key === forward) hoverIndex.value = Math.min(current + 1, props.rows.length - 1)
  else if (e.key === back) hoverIndex.value = Math.max(current - 1, 0)
}

const tooltipStyle = computed(() => {
  const left = Math.min(Math.max(x(hoverIndex.value) - 80, 0), width.value - 160)
  return { left: `${left}px`, top: '8px' }
})

onMounted(() => {
  observer = new ResizeObserver(entries => {
    width.value = Math.max(280, Math.floor(entries[0].contentRect.width))
  })
  observer.observe(root.value)
})
onUnmounted(() => observer && observer.disconnect())
</script>

<style scoped>
.trend { position: relative; width: 100%; }
.trend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  min-height: 24px;
}
.legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 0.75rem; color: #475569; }
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
.legend-key { width: 14px; height: 2px; border-radius: 2px; }
.view-toggle {
  margin-inline-start: auto;
  font-size: 0.72rem;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 3px 10px;
  cursor: pointer;
}
.view-toggle:hover { color: #0f172a; }
.plot { position: relative; outline: none; }
.plot:focus-visible { box-shadow: 0 0 0 2px #93c5fd; border-radius: 8px; }
.grid { stroke: #e2e8f0; stroke-width: 1; }
.tick { font-size: 10px; fill: #94a3b8; font-variant-numeric: tabular-nums; }
.line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.dot { stroke: white; stroke-width: 2; }
.end-label { font-size: 11px; font-weight: 700; fill: #334155; }
.crosshair { stroke: #94a3b8; stroke-width: 1; }
.tooltip {
  position: absolute;
  width: 160px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  padding: 8px 10px;
  pointer-events: none;
  font-size: 0.75rem;
  z-index: 5;
}
.tooltip-date { color: #64748b; margin-bottom: 4px; }
.tooltip-row { display: flex; align-items: center; gap: 6px; }
.tooltip-row strong { color: #0f172a; font-size: 0.85rem; }
.tooltip-key { width: 12px; height: 2px; border-radius: 2px; }
.tooltip-name { color: #64748b; }
.trend-table-wrap { max-height: 260px; overflow-y: auto; }
.trend-table { width: 100%; font-size: 0.8rem; border-collapse: collapse; }
.trend-table th { text-align: start; color: #64748b; font-weight: 600; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: white; }
.trend-table td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; font-variant-numeric: tabular-nums; }
</style>
