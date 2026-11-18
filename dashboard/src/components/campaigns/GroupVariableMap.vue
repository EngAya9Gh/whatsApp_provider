<template>
  <div class="gvm" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="gvm-title">{{ isAr ? 'من أين تأتي قيمة كل متغير؟' : 'Where does each variable come from?' }}</div>
    <div v-for="(n, i) in tpl.variables" :key="n" class="gvm-row">
      <div class="gvm-var">
        <b>{{ varToken(n) }}</b>
        <small v-if="variableContext(tpl.body, n)">«{{ variableContext(tpl.body, n) }}»</small>
      </div>
      <select :value="selectValue(rows[i])" class="gvm-input" @change="setSource(i, $event.target.value)">
        <option value="name">{{ isAr ? 'اسم جهة الاتصال' : 'Contact name' }}</option>
        <option value="phone">{{ isAr ? 'رقم الجوال' : 'Phone number' }}</option>
        <option v-for="f in fields" :key="f" :value="`field:${f}`">{{ isAr ? 'حقل:' : 'Field:' }} {{ f }}</option>
        <option value="text">{{ isAr ? 'نص ثابت للجميع' : 'Same text for everyone' }}</option>
      </select>
      <input v-if="rows[i]?.source === 'text'" :value="rows[i].text || ''" class="gvm-input" maxlength="200"
        :placeholder="isAr ? 'النص الذي يصل للجميع' : 'Text everyone gets'" @change="setField(i, 'text', $event.target.value)" />
      <input v-else-if="rows[i]?.source !== 'phone'" :value="rows[i]?.fallback || ''" class="gvm-input" maxlength="200"
        :placeholder="isAr ? 'إن كانت فارغة: عميلنا العزيز' : 'If empty: Dear customer'" @change="setField(i, 'fallback', $event.target.value)" />
    </div>
    <p class="gvm-hint">{{ isAr ? 'جهات الاتصال بلا قيمة ولا بديل لا تُرسل لها (ولا تُحسب عليك). الحقول تأتي من أعمدة ملف استيراد جهات الاتصال.' : 'Contacts with no value and no fallback are skipped (and not charged). Fields come from the columns of the contacts import file.' }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { varToken } from '../../utils/metaTemplate'
import { variableContext } from '../../utils/campaignAudience'

const props = defineProps({
  tpl: { type: Object, required: true },
  fields: { type: Array, default: () => [] },
  modelValue: { type: Array, default: null }, // [{ source, key?, text?, fallback? }] per variable
  isAr: { type: Boolean, default: true }
})
const emit = defineEmits(['update:modelValue'])

const rows = computed(() => props.tpl.variables.map((_, i) => props.modelValue?.[i] || { source: i === 0 ? 'name' : 'text' }))
const selectValue = (m) => (m?.source === 'field' ? `field:${m.key}` : (m?.source || 'text'))

const update = (i, next) => {
  const list = rows.value.map(r => ({ ...r }))
  list[i] = next
  emit('update:modelValue', list)
}
const setSource = (i, value) => {
  const keep = rows.value[i]?.fallback ? { fallback: rows.value[i].fallback } : {}
  if (value.startsWith('field:')) update(i, { source: 'field', key: value.slice(6), ...keep })
  else if (value === 'text') update(i, { source: 'text', text: '' })
  else update(i, { source: value, ...(value === 'name' ? keep : {}) })
}
const setField = (i, field, value) => update(i, { ...rows.value[i], [field]: value.trim() })
</script>

<style scoped>
.gvm { margin-top: 10px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.gvm-title { font-size: .78rem; font-weight: 800; color: #334155; }
.gvm-row { display: grid; grid-template-columns: 120px 1fr 1fr; gap: 8px; align-items: center; }
.gvm-var b { display: block; font-size: .8rem; color: #0f172a; font-family: ui-monospace, monospace; }
.gvm-var small { display: block; font-size: .66rem; color: #94a3b8; line-height: 1.3; }
.gvm-input { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px 9px; font-size: .78rem; background: #fff; outline: none; box-sizing: border-box; }
.gvm-input:focus { border-color: #FF6600; }
.gvm-hint { margin: 0; font-size: .7rem; color: #94a3b8; }
@media (max-width: 560px) { .gvm-row { grid-template-columns: 1fr; } }
</style>
