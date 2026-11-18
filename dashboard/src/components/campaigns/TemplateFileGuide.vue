<template>
  <div class="tfg" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="tfg-head">
      <div>
        <strong>{{ isAr ? 'شكل ملف الإكسل لهذا القالب' : 'Excel layout for this template' }}</strong>
        <p>{{ subtitle }}</p>
      </div>
      <button type="button" class="tfg-dl" :disabled="downloading || !channelId" @click="download">
        <i class="fas" :class="downloading ? 'fa-spinner fa-spin' : 'fa-file-excel'"></i>
        {{ isAr ? 'تحميل ملف جاهز' : 'Download ready file' }}
      </button>
    </div>

    <!-- What the sheet looks like: column letters, the header row and one example row -->
    <div class="tfg-table-wrap">
      <table class="tfg-table">
        <thead>
          <tr><th class="corner"></th><th v-for="c in columns" :key="c.letter">{{ c.letter }}</th></tr>
        </thead>
        <tbody>
          <tr>
            <td class="rn">1</td>
            <td v-for="c in columns" :key="c.letter" class="hdr">
              <span class="tfg-title">{{ c.title }}</span>
              <span v-if="c.context" class="tfg-context">«{{ c.context }}»</span>
            </td>
          </tr>
          <tr>
            <td class="rn">2</td>
            <td v-for="c in columns" :key="c.letter" :class="{ num: c.phone }"><bdi>{{ c.example }}</bdi></td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul class="tfg-notes">
      <li>{{ isAr ? 'العمود A: رقم الجوال مع رمز الدولة. الأرقام المحلية (05…) تتحول تلقائياً.' : 'Column A: the phone number with its country code. Local numbers (05…) are converted for you.' }}</li>
      <li v-if="tpl.variables.length">{{ isAr ? `الأعمدة ${valueRange}: قيمة كل متغير بنفس الترتيب، ولا تُترك فارغة.` : `Columns ${valueRange}: one value per variable, in order, never empty.` }}</li>
      <li>{{ isAr ? 'صف العناوين اختياري، والأرقام المكررة تُرسل مرة واحدة.' : 'A header row is optional; repeated numbers are sent once.' }}</li>
    </ul>
    <p v-if="error" class="tfg-err">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import axios from 'axios'
import { varToken } from '../../utils/metaTemplate'
import { columnLetter, variableContext, apiErrorText } from '../../utils/campaignAudience'

const props = defineProps({
  tpl: { type: Object, required: true }, // normalizeTemplate() result
  channelId: { type: String, default: '' },
  isAr: { type: Boolean, default: true }
})

const downloading = ref(false)
const error = ref('')

const columns = computed(() => [
  { letter: 'A', title: props.isAr ? 'رقم الجوال' : 'Phone', example: '966501234567', phone: true },
  ...props.tpl.variables.map((n, i) => ({
    letter: columnLetter(i + 1),
    title: varToken(n),
    context: variableContext(props.tpl.body, n),
    example: props.tpl.examples?.[i] || (props.isAr ? `قيمة ${varToken(n)}` : `value of ${varToken(n)}`)
  }))
])
const valueRange = computed(() => (props.tpl.variables.length > 1 ? `B–${columnLetter(props.tpl.variables.length)}` : 'B'))
const subtitle = computed(() => {
  const n = props.tpl.variables.length
  if (!n) return props.isAr ? 'القالب بلا متغيرات: يكفي عمود واحد للأرقام.' : 'No variables: one column of phone numbers is enough.'
  return props.isAr ? `${n + 1} أعمدة: الرقم ثم ${n === 1 ? 'قيمة المتغير' : `قيم المتغيرات الـ ${n}`}.` : `${n + 1} columns: the phone, then ${n === 1 ? 'the variable' : `the ${n} variables`}.`
})

const download = async () => {
  downloading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/v1/campaigns/sample-file', {
      params: { channelId: props.channelId, templateName: props.tpl.name, templateLanguage: props.tpl.language },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-${props.tpl.name}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  } catch (err) {
    // A blob error body: read it to show the server's reason
    let parsed = err
    try {
      const text = await err.response?.data?.text?.()
      if (text) parsed = { response: { data: JSON.parse(text) } }
    } catch { /* keep the original error */ }
    error.value = apiErrorText(parsed, props.isAr)
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.tfg { margin-top: 10px; border: 1px solid #fed7aa; background: #fffaf5; border-radius: 14px; padding: 12px 14px; }
.tfg-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.tfg-head strong { font-size: .82rem; color: #9a3412; }
.tfg-head p { margin: 2px 0 0; font-size: .74rem; color: #78716c; }
.tfg-dl { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; border: none; background: #16a34a; color: #fff; font-weight: 700; font-size: .75rem; border-radius: 10px; padding: 7px 12px; cursor: pointer; }
.tfg-dl:hover:not(:disabled) { background: #15803d; }
.tfg-dl:disabled { opacity: .6; cursor: progress; }
.tfg-table-wrap { overflow-x: auto; margin-top: 10px; }
.tfg-table { border-collapse: collapse; font-size: .74rem; min-width: 100%; background: #fff; }
.tfg-table th, .tfg-table td { border: 1px solid #e7e5e4; padding: 5px 8px; text-align: start; vertical-align: top; }
.tfg-table th { background: #f5f5f4; color: #57534e; font-weight: 700; text-align: center; min-width: 90px; }
.tfg-table th.corner, .tfg-table td.rn { background: #f5f5f4; color: #a8a29e; width: 26px; min-width: 26px; text-align: center; }
.tfg-table td.hdr { background: #f0fdf4; font-weight: 700; color: #166534; }
.tfg-title { display: block; }
.tfg-context { display: block; font-weight: 500; color: #78716c; font-size: .68rem; margin-top: 1px; }
.tfg-table td.num { font-family: ui-monospace, monospace; direction: ltr; }
.tfg-notes { margin: 8px 0 0; padding-inline-start: 18px; font-size: .72rem; color: #57534e; line-height: 1.6; }
.tfg-err { margin: 6px 0 0; color: #dc2626; font-size: .75rem; }
</style>
