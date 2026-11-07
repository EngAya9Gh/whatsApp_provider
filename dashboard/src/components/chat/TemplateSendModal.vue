<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col">
      <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h3 class="font-bold text-slate-800">{{ isAr ? 'إرسال قالب' : 'Send a template' }}</h3>
          <p class="text-xs text-slate-500 mt-0.5">{{ isAr ? 'القوالب المعتمدة من Meta فقط' : 'Meta-approved templates only' }}</p>
        </div>
        <button type="button" @click="$emit('close')" class="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"><i class="fas fa-times"></i></button>
      </div>

      <div v-if="loading" class="p-12 text-center text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>

      <div v-else-if="loadError" class="p-8 text-center text-sm text-red-500">{{ loadError }}</div>

      <!-- Step 1: choose -->
      <div v-else-if="!selected" class="p-4 overflow-y-auto">
        <input v-model="search" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600] mb-3" :placeholder="isAr ? 'ابحث باسم القالب...' : 'Search templates...'" />
        <div v-if="filtered.length === 0" class="text-center text-sm text-slate-400 py-8">{{ isAr ? 'لا توجد قوالب معتمدة' : 'No approved templates' }}</div>
        <div class="space-y-2">
          <button
            v-for="tpl in filtered"
            :key="tpl.id || tpl.name + tpl.language"
            type="button"
            :disabled="!tpl.supported"
            @click="choose(tpl)"
            class="w-full text-start border border-slate-200 rounded-xl p-3 bg-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:border-[#FF6600]"
            :title="tpl.supported ? '' : (isAr ? 'يحتوي وسائط أو أزرار نسخ/رمز تحقق أو متغيرات غير مدعومة هنا — أرسله من صفحة الإرسال' : 'Has media or variables not supported here — use the send page')"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="font-bold text-sm text-slate-800" dir="ltr">{{ tpl.name }}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{{ tpl.category }}</span>
              <span class="text-[10px] text-slate-400 ms-auto" dir="ltr">{{ tpl.language }}</span>
            </div>
            <div class="text-xs text-slate-500 line-clamp-2 whitespace-pre-line">{{ tpl.body }}</div>
          </button>
        </div>
      </div>

      <!-- Step 2: fill & send -->
      <form v-else @submit.prevent="send" class="p-6 overflow-y-auto space-y-4">
        <button type="button" @click="selected = null" class="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-transparent border-none cursor-pointer p-0">
          <i class="fas" :class="isAr ? 'fa-arrow-right' : 'fa-arrow-left'"></i> {{ isAr ? 'رجوع للقوالب' : 'Back to templates' }}
        </button>
        <div v-if="selected.variables.length > 0" class="space-y-3">
          <div v-for="(n, i) in selected.variables" :key="n">
            <label class="block text-xs font-semibold text-slate-600 mb-1">{{ isAr ? 'المتغير' : 'Variable' }} <span dir="ltr" v-text="varToken(n)"></span></label>
            <input v-model="values[i]" required class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600]" />
          </div>
        </div>
        <div v-if="selected.buttonVars.length > 0" class="space-y-3">
          <div v-for="(b, i) in selected.buttonVars" :key="b.index">
            <label class="block text-xs font-semibold text-slate-600 mb-1">
              {{ isAr ? 'نهاية رابط الزر' : 'Button link ending' }} «{{ b.text }}»
            </label>
            <div class="flex items-center gap-2" dir="ltr">
              <span class="text-xs text-slate-400 truncate max-w-[55%]">{{ urlPrefix(b.url) }}</span>
              <input v-model="buttonValues[i]" required class="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600]" />
            </div>
          </div>
        </div>
        <div>
          <div class="text-xs font-semibold text-slate-600 mb-1">{{ isAr ? 'معاينة' : 'Preview' }}</div>
          <div class="bg-[#dcf8c6] rounded-xl rounded-tr-none p-3 text-sm text-slate-800 whitespace-pre-line shadow-sm">{{ preview }}</div>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="$emit('close')" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 bg-white cursor-pointer">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button type="submit" :disabled="sending" class="flex-1 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer">
            <i class="fas" :class="sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>{{ isAr ? 'إرسال' : 'Send' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'

const props = defineProps({
  channelId: { type: String, required: true },
  threadId: { type: String, required: true },
  isAr: { type: Boolean, default: true }
})
const emit = defineEmits(['close', 'sent'])

const loading = ref(true)
const loadError = ref('')
const templates = ref([])
const search = ref('')
const selected = ref(null)
const values = ref([])
const buttonValues = ref([])
const sending = ref(false)

const POSITIONAL = /\{\{\s*(\d+)\s*\}\}/g

// A dynamic URL button without its {{1}} placeholder: the fixed part the agent's value is appended to
// (kept out of the template: a literal braces pair inside a Vue interpolation breaks the compile)
const urlPrefix = (url) => url.replace('{{1}}', '')

// Shows a variable as it appears in the template, e.g. {{1}}
const varToken = (n) => `{{${n}}}`
const ANY_VARIABLE = /\{\{[^}]*\}\}/

// Only text templates whose variables are positional body variables can be sent from the chat
const normalize = (tpl) => {
  const components = tpl.components || []
  const body = components.find(c => c.type === 'BODY')?.text || ''
  const header = components.find(c => c.type === 'HEADER')
  const buttons = components.find(c => c.type === 'BUTTONS')?.buttons || []
  const variables = [...new Set([...body.matchAll(POSITIONAL)].map(m => Number(m[1])))].sort((a, b) => a - b)
  const bodyHasNamed = ANY_VARIABLE.test(body.replace(POSITIONAL, ''))
  const headerUnsupported = header && (header.format !== 'TEXT' || ANY_VARIABLE.test(header.text || ''))
  // A URL button may end with a single {{1}} (e.g. https://shop.com/track/{{1}}): the agent fills it in.
  // Any other variable placement, copy-code and OTP buttons cannot be sent from the chat.
  const DYNAMIC_URL = /^[^{}]*\{\{1\}\}$/
  const buttonVars = buttons
    .map((b, index) => ({ b, index }))
    .filter(({ b }) => b.type === 'URL' && DYNAMIC_URL.test(b.url || ''))
    .map(({ b, index }) => ({ index, text: b.text, url: b.url }))
  const buttonsUnsupported = buttons.some(b =>
    (b.type === 'URL' && ANY_VARIABLE.test(b.url || '') && !DYNAMIC_URL.test(b.url || '')) || ['COPY_CODE', 'OTP'].includes(b.type))
  return {
    id: tpl.id,
    name: tpl.name,
    language: tpl.language,
    category: tpl.category,
    body,
    headerText: header?.format === 'TEXT' ? header.text : '',
    variables,
    buttonVars,
    supported: !bodyHasNamed && !headerUnsupported && !buttonsUnsupported
  }
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return templates.value.filter(t => !q || t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q))
})

const preview = computed(() => {
  if (!selected.value) return ''
  const body = selected.value.body.replace(POSITIONAL, (_, n) => {
    const v = values.value[selected.value.variables.indexOf(Number(n))]
    return v || `{{${n}}}`
  })
  const text = selected.value.headerText ? `${selected.value.headerText}\n\n${body}` : body
  const links = selected.value.buttonVars.map((b, i) => `🔗 ${b.text}: ${b.url.replace('{{1}}', buttonValues.value[i] || '{{1}}')}`)
  return links.length ? `${text}\n\n${links.join('\n')}` : text
})

const choose = (tpl) => {
  selected.value = tpl
  values.value = tpl.variables.map(() => '')
  buttonValues.value = tpl.buttonVars.map(() => '')
}

const send = async () => {
  sending.value = true
  try {
    const res = await axios.post(`/api/v1/chat/threads/${props.threadId}/template`, {
      templateName: selected.value.name,
      language: selected.value.language,
      bodyParams: values.value,
      buttonParams: selected.value.buttonVars.map((b, i) => ({ index: b.index, text: buttonValues.value[i] })),
      previewText: preview.value
    })
    emit('sent', res.data.data)
    emit('close')
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: props.isAr ? 'لم يُرسل القالب' : 'Template not sent',
      text: err.response?.data?.error?.message || err.message,
      confirmButtonColor: '#FF6600'
    })
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  try {
    const res = await axios.get(`/api/v1/meta/channel/${props.channelId}/meta-templates`, { params: { status: 'APPROVED' } })
    const list = res.data?.data?.data || []
    templates.value = list.filter(t => t.status === 'APPROVED').map(normalize)
  } catch (err) {
    loadError.value = err.response?.data?.message || (props.isAr ? 'تعذّر تحميل القوالب' : 'Could not load templates')
  } finally {
    loading.value = false
  }
})
</script>
