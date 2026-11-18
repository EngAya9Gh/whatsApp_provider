<template>
  <div class="p-6 max-w-5xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'سير المحادثة' : 'Chat Flows' }}</h1>
      <p class="text-slate-500 mt-1">{{ isAr ? 'صمّم ما يحدث عندما يراسلك العميل: رسائل، أسئلة بأزرار، الموظف الذكي، ثم تحويل للفريق المناسب. لكل قناة سيرها (كل رقم واتساب وكل ويدجت موقع)، ويمكنك نسخ سير قناة إلى أخرى.' : 'Design what happens when a customer writes: messages, button questions, the AI agent, then hand-off to the right team. Each channel (each WhatsApp number, each website widget) has its own flow; you can copy one channel\'s flow to another.' }}</p>
    </div>

    <div v-if="loading" class="flex justify-center p-12 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
    <div v-else-if="error" class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">{{ error }}</div>
    <div v-else-if="flows.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
      <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fas fa-diagram-project text-2xl text-slate-400"></i></div>
      <h3 class="text-lg font-bold text-slate-800 mb-2">{{ isAr ? 'لا توجد أرقام Meta مربوطة' : 'No Meta numbers connected' }}</h3>
      <router-link to="/connect-meta" class="text-[#FF6600] font-semibold text-sm">{{ isAr ? 'اربط رقماً' : 'Connect a number' }}</router-link>
    </div>

    <div v-else class="grid md:grid-cols-2 gap-4">
      <div v-for="f in flows" :key="f.channel.id" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-bold text-slate-800 truncate"><i :class="channelIcon(f.channel)" class="me-1.5"></i>{{ f.channel.name || (isAr ? 'رقم واتساب' : 'WhatsApp number') }}</div>
            <div class="text-sm text-slate-500" dir="ltr">{{ f.channel.displayPhoneNumber || f.channel.phoneNumber || (isAr ? 'ويدجت الموقع' : 'Website widget') }}</div>
          </div>
          <span class="status" :class="statusOf(f).tone">
            <i :class="statusOf(f).icon"></i>{{ statusOf(f).label }}
          </span>
        </div>
        <div class="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
          <span><i class="fas fa-layer-group me-1 text-slate-400"></i>{{ f.steps }} {{ isAr ? 'خطوة' : 'steps' }}</span>
          <span v-if="f.publishedAt"><i class="fas fa-rocket me-1 text-slate-400"></i>{{ isAr ? 'آخر نشر' : 'Published' }} {{ fmtDate(f.publishedAt) }}</span>
          <span v-if="f.hasDraftChanges" class="text-amber-700"><i class="fas fa-pen-to-square me-1"></i>{{ isAr ? 'تغييرات غير منشورة' : 'Unpublished changes' }}</span>
        </div>
        <router-link :to="`/flows/${f.channel.id}`" class="design-btn">
          <i class="fas fa-diagram-project"></i>{{ f.steps ? (isAr ? 'تعديل السير' : 'Edit flow') : (isAr ? 'تصميم السير' : 'Design flow') }}
        </router-link>
        <!-- Same flow on another channel: start from a copy (e.g. the widget gets the WhatsApp number's flow) -->
        <div v-if="sourcesFor(f).length" class="copy-row">
          <select v-model="copySource[f.channel.id]" class="copy-select">
            <option value="">{{ isAr ? 'أو انسخ سير قناة أخرى…' : 'Or copy another channel\'s flow…' }}</option>
            <option v-for="s in sourcesFor(f)" :key="s.channel.id" :value="s.channel.id">{{ s.channel.name || s.channel.displayPhoneNumber || s.channel.phoneNumber }}</option>
          </select>
          <button type="button" class="copy-btn" :disabled="!copySource[f.channel.id] || copying" @click="copyFlow(f)">{{ isAr ? 'نسخ' : 'Copy' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import axios from 'axios'
import Swal from 'sweetalert2'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const flows = ref([])
const loading = ref(true)
const error = ref('')
const router = useRouter()
const copySource = ref({})
const copying = ref(false)

const channelIcon = (channel) => ({
  WEBCHAT: 'fas fa-globe text-cyan-600',
  INSTAGRAM: 'fab fa-instagram text-pink-600',
  MESSENGER: 'fab fa-facebook-messenger text-blue-600'
})[channel.providerType] || 'fab fa-whatsapp text-emerald-600'

// Channels with a flow worth copying (more than the start step)
const sourcesFor = (f) => flows.value.filter(o => o.channel.id !== f.channel.id && o.steps > 1)

async function copyFlow(f) {
  const sourceId = copySource.value[f.channel.id]
  if (f.steps > 1) {
    const ok = await Swal.fire({
      icon: 'warning',
      title: isAr.value ? 'استبدال السير الحالي؟' : 'Replace the current flow?',
      text: isAr.value ? 'مسودة هذه القناة ستُستبدل بالنسخة. السير المنشور يبقى يعمل حتى تنشر.' : 'This channel\'s draft is replaced by the copy. The published flow keeps running until you publish.',
      showCancelButton: true,
      confirmButtonText: isAr.value ? 'استبدال' : 'Replace',
      cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
    })
    if (!ok.isConfirmed) return
  }
  copying.value = true
  try {
    await axios.post(`/api/v1/flows/${f.channel.id}/copy-from/${sourceId}`)
    await Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, icon: 'success', title: isAr.value ? 'تم النسخ، راجعه ثم انشره' : 'Copied: review it, then publish' })
    router.push(`/flows/${f.channel.id}`)
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'لم يُنسخ' : 'Not copied', text: err.response?.data?.error?.message || err.message })
  } finally {
    copying.value = false
  }
}

const statusOf = (f) => {
  if (f.isActive) return { tone: 'on', icon: 'fas fa-circle', label: isAr.value ? 'مفعّل' : 'On' }
  if (!f.publishedVersion) return { tone: 'draft', icon: 'fas fa-pen', label: isAr.value ? 'مسودة' : 'Draft' }
  return { tone: 'off', icon: 'fas fa-pause', label: isAr.value ? 'متوقف' : 'Off' }
}

const fmtDate = (iso) => new Intl.DateTimeFormat(isAr.value ? 'ar-u-nu-latn-ca-gregory' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date(iso))

onMounted(async () => {
  try {
    const res = await axios.get('/api/v1/flows')
    flows.value = res.data.data || []
  } catch (err) {
    error.value = err.response?.status === 403
      ? (isAr.value ? 'سير الواتساب غير متاح في اشتراكك أو صلاحياتك.' : 'Chat flows are not available on your plan or permissions.')
      : (isAr.value ? 'تعذّر تحميل البيانات.' : 'Could not load data.')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.status i { font-size: 8px; }
.status.on { background: #ecfdf5; color: #047857; }
.status.off { background: #f1f5f9; color: #64748b; }
.status.draft { background: #fffbeb; color: #b45309; }
.copy-row { display: flex; gap: 8px; margin-top: -6px; }
.copy-select { flex: 1; min-width: 0; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13px; background: white; color: #334155; }
.copy-btn { padding: 7px 14px; border-radius: 10px; border: 1px solid #cbd5e1; background: white; font-size: 13px; font-weight: 700; color: #334155; cursor: pointer; }
.copy-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.design-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border-radius: 12px; background: #FF6600; color: white; font-weight: 700; font-size: 14px; }
.design-btn:hover { background: #E65C00; }
</style>
