<template>
  <div class="ar" :dir="isAr ? 'rtl' : 'ltr'">
    <div v-if="loading" class="ar-loading">
      <i class="fas fa-spinner fa-spin"></i>
      {{ source === 'file' ? (isAr ? 'جارٍ فحص الملف مقابل القالب…' : 'Checking the file against the template…') : (isAr ? 'جارٍ تجهيز المجموعة…' : 'Preparing the group…') }}
    </div>

    <div v-else-if="error" class="ar-block"><i class="fas fa-circle-xmark"></i> {{ error }}</div>

    <template v-else-if="preview">
      <div v-if="blocking" class="ar-block"><i class="fas fa-circle-xmark"></i> {{ blocking }}</div>

      <div class="ar-top">
        <div class="ar-ready" :class="{ zero: !report.valid }">
          <span class="ar-ready-n">{{ fmtInt(report.valid) }}</span>
          <span>{{ isAr ? 'رقم جاهز للإرسال' : 'ready to send' }}</span>
        </div>
        <div class="ar-chips">
          <span v-if="report.converted" class="chip info"><i class="fas fa-globe"></i> {{ isAr ? `${fmtInt(report.converted)} رقم محلي أضفنا له` : `${fmtInt(report.converted)} local numbers given` }} <bdi dir="ltr">+{{ preview.country }}</bdi></span>
          <span v-if="report.duplicates" class="chip warn"><i class="fas fa-clone"></i> {{ isAr ? `${fmtInt(report.duplicates)} مكرر يُرسل مرة واحدة` : `${fmtInt(report.duplicates)} repeated, sent once` }}</span>
          <span v-if="report.invalidCount" class="chip bad"><i class="fas fa-phone-slash"></i> {{ isAr ? `${fmtInt(report.invalidCount)} رقم غير صالح` : `${fmtInt(report.invalidCount)} invalid numbers` }}</span>
          <span v-if="report.missingCount" class="chip bad"><i class="fas fa-table-cells"></i> {{ isAr ? `${fmtInt(report.missingCount)} صف قيمه ناقصة` : `${fmtInt(report.missingCount)} rows with missing values` }}</span>
          <span v-if="report.extraColumns" class="chip muted"><i class="fas fa-eye-slash"></i> {{ isAr ? `${report.extraColumns} عمود زائد لا يُرسل` : `${report.extraColumns} extra columns not sent` }}</span>
          <span v-if="report.headerRow" class="chip muted"><i class="fas fa-heading"></i> {{ isAr ? 'صف العناوين لا يُرسل' : 'header row skipped' }}</span>
          <span v-if="report.exampleRows" class="chip muted"><i class="fas fa-flask"></i> {{ isAr ? 'صف المثال لا يُرسل' : 'example row skipped' }}</span>
        </div>
      </div>

      <!-- Rows that will not be sent, with the reason -->
      <details v-if="problems.length" class="ar-details" :open="!report.valid">
        <summary>{{ isAr ? `الصفوف التي لن تُرسل (${fmtInt(report.invalidCount + report.missingCount)}) — بدون تكلفة` : `Rows that will not be sent (${fmtInt(report.invalidCount + report.missingCount)}) — not charged` }}</summary>
        <ul>
          <li v-for="p in problems" :key="p.key"><b>{{ isAr ? `الصف ${p.row}` : `Row ${p.row}` }}</b> <bdi class="val">{{ p.value }}</bdi> — {{ p.text }}</li>
        </ul>
        <p v-if="hiddenCount" class="ar-more">{{ isAr ? `و${fmtInt(hiddenCount)} صفوف أخرى.` : `and ${fmtInt(hiddenCount)} more.` }}</p>
      </details>

      <!-- A value for empty cells, instead of skipping those rows -->
      <div v-if="source === 'file' && missingVariables.length" class="ar-fallbacks">
        <div class="ar-label">{{ isAr ? 'بدل ترك هذه الصفوف: قيمة تُستخدم عندما تكون الخلية فارغة' : 'Instead of skipping those rows: a value for empty cells' }}</div>
        <label v-for="v in missingVariables" :key="v.index" class="ar-fb">
          <span>{{ v.token }} ({{ isAr ? 'العمود' : 'column' }} {{ v.column }})</span>
          <input :value="fallbacks[v.index] || ''" maxlength="200" :placeholder="isAr ? 'مثال: عميلنا العزيز' : 'e.g. Dear customer'" @change="setFallback(v.index, $event.target.value)" />
        </label>
      </div>

      <div class="ar-country">
        <i class="fas fa-flag"></i>
        <span>{{ isAr ? 'الأرقام المحلية (05…) من:' : 'Local numbers (05…) are from:' }}</span>
        <select :value="countryCode || preview.country || 'none'" @change="$emit('update:countryCode', $event.target.value)">
          <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">{{ isAr ? c.ar : c.en }} (&#8206;+{{ c.code }})</option>
          <option value="none">{{ isAr ? 'لا تحوّلها (اعتبرها غير صالحة)' : 'Do not convert (treat as invalid)' }}</option>
        </select>
      </div>

      <div class="ar-cost" :class="{ short: cost.charged && !cost.enough }">
        <div v-if="cost.charged">
          <i class="fas fa-wallet"></i>
          {{ isAr ? 'التكلفة:' : 'Cost:' }}
          <bdi dir="ltr">{{ fmtInt(report.valid) }} × {{ cost.unit }} = <b>{{ cost.total }} {{ cost.currency }}</b></bdi>
          · {{ isAr ? 'رصيدك' : 'balance' }} <bdi dir="ltr">{{ cost.balance }} {{ cost.currency }}</bdi>
          <span v-if="!cost.enough" class="ar-short">{{ isAr ? '— الرصيد لا يكفي، اشحن المحفظة أولاً' : '— not enough, top up the wallet first' }}</span>
        </div>
        <div v-else><i class="fas fa-wallet"></i> {{ isAr ? 'لا تُخصم هذه الحملة من المحفظة.' : 'This campaign is not charged to the wallet.' }}</div>
        <div v-if="report.valid" class="ar-time">
          <i class="fas fa-gauge-high"></i>
          {{ isAr ? `مدة الإرسال: حوالي ${formatDuration(preview.eta.seconds, true)} (${preview.eta.perSecond} رسالة/ثانية على دفعات)` : `Sending takes about ${formatDuration(preview.eta.seconds, false)} (${preview.eta.perSecond} messages/second, in waves)` }}
        </div>
      </div>

      <p v-if="!preview.templateChecked" class="ar-warn">{{ isAr ? 'تعذّر قراءة القالب من ميتا الآن، فلم يُفحص الملف مقابل متغيراته.' : 'Meta could not be asked for the template right now, so the file was not checked against its variables.' }}</p>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { varToken } from '../../utils/metaTemplate'
import { COUNTRIES, reasonText, blockingText, fmtInt, formatDuration } from '../../utils/campaignAudience'

const props = defineProps({
  preview: { type: Object, default: null }, // POST /campaigns/audience-preview result
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  source: { type: String, default: 'file' }, // file | group
  countryCode: { type: String, default: '' },
  fallbacks: { type: Array, default: () => [] },
  isAr: { type: Boolean, default: true }
})
const emit = defineEmits(['update:countryCode', 'update:fallbacks'])

const report = computed(() => props.preview?.report || {})
const cost = computed(() => props.preview?.cost || {})
const blocking = computed(() => blockingText(report.value.blocking, report.value, props.isAr))

const problems = computed(() => {
  const r = report.value
  const rows = [
    ...(r.invalid || []).map(p => ({ key: `i${p.row}`, row: p.row, value: p.value, text: reasonText(p.reason, props.isAr) })),
    ...(r.missing || []).map(p => ({ key: `m${p.row}`, row: p.row, value: '', text: props.isAr ? `العمود ${p.column} فارغ (${varToken(p.variable)})` : `column ${p.column} is empty (${varToken(p.variable)})` }))
  ]
  return rows.sort((a, b) => a.row - b.row)
})
const hiddenCount = computed(() => Math.max(0, (report.value.invalidCount || 0) + (report.value.missingCount || 0) - problems.value.length))

// Variables with empty cells in the file (their position in the template's variable list)
const missingVariables = computed(() => {
  const vars = props.preview?.template?.variables || []
  const seen = new Map()
  for (const m of report.value.missing || []) {
    const index = vars.indexOf(m.variable)
    if (index >= 0 && !seen.has(index)) seen.set(index, { index, token: varToken(m.variable), column: m.column })
  }
  props.fallbacks.forEach((v, index) => {
    if (v && !seen.has(index) && vars[index] !== undefined) seen.set(index, { index, token: varToken(vars[index]), column: String.fromCharCode(66 + index) })
  })
  return [...seen.values()].sort((a, b) => a.index - b.index)
})
const setFallback = (index, value) => {
  const next = [...props.fallbacks]
  next[index] = value.trim()
  emit('update:fallbacks', next)
}
</script>

<style scoped>
.ar { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.ar-loading { font-size: .8rem; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 10px 12px; }
.ar-block { font-size: .8rem; font-weight: 600; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 10px 12px; line-height: 1.6; }
.ar-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ar-ready { display: inline-flex; align-items: baseline; gap: 6px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; border-radius: 12px; padding: 6px 12px; font-size: .78rem; font-weight: 600; }
.ar-ready.zero { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
.ar-ready-n { font-size: 1.15rem; font-weight: 900; }
.ar-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 5px; font-size: .7rem; font-weight: 600; border-radius: 999px; padding: 3px 9px; border: 1px solid; }
.chip.info { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.chip.warn { background: #fffbeb; border-color: #fde68a; color: #b45309; }
.chip.bad { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
.chip.muted { background: #f8fafc; border-color: #e2e8f0; color: #64748b; }
.ar-details { font-size: .75rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px 12px; }
.ar-details summary { cursor: pointer; font-weight: 700; color: #475569; }
.ar-details ul { margin: 6px 0 0; padding-inline-start: 18px; max-height: 150px; overflow-y: auto; color: #334155; line-height: 1.7; }
.ar-details .val { font-family: ui-monospace, monospace; color: #b91c1c; }
.ar-more { margin: 4px 0 0; color: #94a3b8; }
.ar-fallbacks { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.ar-label { font-size: .74rem; font-weight: 700; color: #92400e; }
.ar-fb { display: flex; align-items: center; gap: 8px; font-size: .74rem; color: #78350f; }
.ar-fb span { min-width: 110px; }
.ar-fb input { flex: 1; border: 1px solid #fcd34d; border-radius: 8px; padding: 5px 8px; font-size: .78rem; outline: none; background: #fff; }
.ar-country { display: flex; align-items: center; gap: 8px; font-size: .75rem; color: #475569; flex-wrap: wrap; }
.ar-country select { border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px 8px; font-size: .75rem; background: #fff; }
.ar-cost { font-size: .76rem; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; line-height: 1.6; }
.ar-cost.short { background: #fef2f2; border-color: #fecaca; }
.ar-short { color: #b91c1c; font-weight: 700; }
.ar-time { color: #475569; }
.ar-cost i { color: #94a3b8; margin-inline-end: 4px; }
.ar-warn { margin: 0; font-size: .72rem; color: #b45309; }
</style>
