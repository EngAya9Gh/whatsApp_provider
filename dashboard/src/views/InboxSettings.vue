<template>
  <div class="p-6 max-w-5xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'الوسوم ومراحل العميل' : 'Tags & Customer Stages' }}</h1>
      <p class="text-slate-500 mt-1">{{ isAr ? 'نظّم المحادثات بالوسوم، وتابع رحلة كل عميل عبر مراحل واضحة.' : 'Organize conversations with tags and follow each customer journey through clear stages.' }}</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 border-b border-slate-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        @click="activeTab = tab.key"
        class="px-4 py-2.5 -mb-px border-b-2 font-semibold text-sm transition-colors bg-transparent cursor-pointer"
        :class="activeTab === tab.key ? 'border-[#FF6600] text-[#FF6600]' : 'border-transparent text-slate-500 hover:text-slate-700'"
      >
        <i :class="tab.icon" class="me-2"></i>{{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12 text-slate-400">
      <i class="fas fa-spinner fa-spin text-2xl"></i>
    </div>

    <!-- ══ Tags ══ -->
    <section v-else-if="activeTab === 'tags'">
      <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
        <p class="text-sm text-slate-500">
          <i class="fas fa-thumbtack me-1 text-slate-400"></i>
          {{ isAr ? 'الوسوم المثبّتة تظهر كفلاتر سريعة أعلى قائمة المحادثات.' : 'Pinned tags show up as quick filters above the conversation list.' }}
        </p>
        <button type="button" @click="openTagModal()" class="bg-[#FF6600] hover:bg-[#E65C00] text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-orange-500/20 transition-colors border-none cursor-pointer">
          <i class="fas fa-plus me-2"></i>{{ isAr ? 'إضافة وسم' : 'Add Tag' }}
        </button>
      </div>

      <div v-if="tags.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-tag text-2xl text-slate-400"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-2">{{ isAr ? 'لا توجد وسوم بعد' : 'No tags yet' }}</h3>
        <p class="text-slate-500 max-w-md mx-auto text-sm">{{ isAr ? 'أمثلة: VIP، مهم، شكوى، عميل جملة. يمكن للفريق إضافتها لأي محادثة والفلترة بها.' : 'Examples: VIP, Important, Complaint, Wholesale. Your team can add them to any conversation and filter by them.' }}</p>
      </div>

      <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        <div v-for="tag in tags" :key="tag.id" class="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
          <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border" :style="chipStyle(tag.color)">
            <span class="w-2 h-2 rounded-full" :style="{ background: tag.color }"></span>
            {{ tag.name }}
          </span>
          <span v-if="tag.isPinned" class="text-xs text-slate-400">
            <i class="fas fa-thumbtack me-1"></i>{{ isAr ? 'مثبّت' : 'Pinned' }}
          </span>
          <div class="ms-auto flex gap-2">
            <button
              type="button"
              @click="togglePin(tag)"
              class="w-8 h-8 rounded-lg flex items-center justify-center transition-all border-none cursor-pointer"
              :class="tag.isPinned ? 'bg-orange-50 text-[#FF6600] hover:bg-orange-100' : 'bg-slate-50 text-slate-400 hover:text-slate-600'"
              :title="tag.isPinned ? (isAr ? 'إلغاء التثبيت' : 'Unpin') : (isAr ? 'تثبيت كفلتر سريع' : 'Pin as quick filter')"
            >
              <i class="fas fa-thumbtack"></i>
            </button>
            <button type="button" @click="openTagModal(tag)" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-all border-none cursor-pointer" :title="isAr ? 'تعديل' : 'Edit'">
              <i class="fas fa-pen"></i>
            </button>
            <button type="button" @click="deleteTag(tag)" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all border-none cursor-pointer" :title="isAr ? 'حذف' : 'Delete'">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ Customer Stages ══ -->
    <section v-else>
      <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5 flex gap-3 text-sm">
        <i class="fas fa-circle-info mt-0.5 text-blue-500"></i>
        <div class="text-blue-900">
          <strong>{{ isAr ? 'ما الفرق بين المراحل والتذاكر؟' : 'Stages vs. tickets' }}</strong>
          <p class="mt-1 text-blue-900/75 leading-relaxed">
            {{ isAr
              ? 'التذكرة تتبع طلب دعم واحد (مفتوحة أو مغلقة). المرحلة تتبع علاقتك بالعميل نفسه (مثلاً: جديد ← مهتم ← تم الدفع)، وتبقى معه مهما فتح من تذاكر.'
              : 'A ticket tracks one support request (open or closed). A stage tracks your relationship with the customer (e.g. New → Interested → Paid) and stays with them across all their tickets.' }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 class="font-bold text-slate-800">{{ isAr ? 'تفعيل مراحل العميل' : 'Enable customer stages' }}</h3>
          <p class="text-sm text-slate-500 mt-0.5">{{ isAr ? 'عند الإيقاف لا تظهر المراحل في المحادثات، ولا تُحذف بياناتها.' : 'When off, stages are hidden from conversations; nothing is deleted.' }}</p>
        </div>
        <button type="button" dir="ltr" @click="stageForm.enabled = !stageForm.enabled" class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors border-none cursor-pointer" :class="stageForm.enabled ? 'bg-emerald-500' : 'bg-slate-300'">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform" :class="stageForm.enabled ? 'translate-x-6' : 'translate-x-1'"></span>
        </button>
      </div>

      <template v-if="stageForm.enabled">
        <div class="mb-5">
          <h3 class="text-sm font-bold text-slate-700 mb-3">{{ isAr ? 'ابدأ من قالب جاهز' : 'Start from a template' }}</h3>
          <div class="grid sm:grid-cols-3 gap-3">
            <button
              v-for="preset in STAGE_PRESETS"
              :key="preset.key"
              type="button"
              @click="applyPreset(preset)"
              class="text-start bg-white border border-slate-200 rounded-xl p-4 hover:border-[#FF6600] hover:shadow-md transition-all cursor-pointer"
            >
              <i :class="preset.icon" class="text-[#FF6600] text-lg"></i>
              <div class="font-bold text-slate-800 mt-2">{{ isAr ? preset.nameAr : preset.nameEn }}</div>
              <div class="text-xs text-slate-500 mt-1">{{ isAr ? preset.descAr : preset.descEn }}</div>
            </button>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mb-5">
          <div v-for="path in paths" :key="path.group" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div class="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                  <i :class="path.icon" :style="{ color: path.color }"></i>{{ path.title }}
                </h3>
                <p class="text-xs text-slate-500 mt-1">{{ path.desc }}</p>
              </div>
              <button type="button" @click="addStage(path.group)" class="text-sm font-semibold text-[#FF6600] hover:text-[#E65C00] whitespace-nowrap bg-transparent border-none cursor-pointer">
                <i class="fas fa-plus me-1"></i>{{ isAr ? 'إضافة مرحلة' : 'Add stage' }}
              </button>
            </div>

            <div v-if="stagesOf(path.group).length === 0" class="text-sm text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
              {{ isAr ? 'لا توجد مراحل' : 'No stages' }}
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(stage, index) in stagesOf(path.group)"
                :key="stage.key"
                class="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50"
              >
                <label class="relative w-6 h-6 rounded-full cursor-pointer shrink-0 ring-2 ring-white shadow" :style="{ background: stage.color }" :title="isAr ? 'لون المرحلة' : 'Stage color'">
                  <input type="color" v-model="stage.color" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </label>
                <input
                  v-model="stage.name"
                  maxlength="40"
                  class="flex-1 min-w-0 bg-transparent text-sm font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#FF6600]/20 rounded-lg px-2 py-1 border-none"
                  :placeholder="isAr ? 'اسم المرحلة' : 'Stage name'"
                />
                <span v-if="path.group === 'MAIN' && index === 0" class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">
                  {{ isAr ? 'دخول' : 'Entry' }}
                </span>
                <span v-else-if="path.group === 'MAIN' && index === mainCount - 1" class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 whitespace-nowrap">
                  {{ isAr ? 'نجاح' : 'Won' }}
                </span>
                <button type="button" @click="moveStage(stage, -1)" :disabled="index === 0" class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer" :title="isAr ? 'للأعلى' : 'Move up'">
                  <i class="fas fa-arrow-up text-xs"></i>
                </button>
                <button type="button" @click="moveStage(stage, 1)" :disabled="index === stagesOf(path.group).length - 1" class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer" :title="isAr ? 'للأسفل' : 'Move down'">
                  <i class="fas fa-arrow-down text-xs"></i>
                </button>
                <button type="button" @click="removeStage(stage)" class="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 bg-transparent border-none cursor-pointer" :title="isAr ? 'حذف' : 'Delete'">
                  <i class="fas fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <h3 class="font-bold text-slate-800 mb-1">{{ isAr ? 'القنوات' : 'Channels' }}</h3>
          <p class="text-sm text-slate-500 mb-3">{{ isAr ? 'مثلاً: فعّل المراحل على رقم المبيعات فقط، واتركها على رقم الدعم مطفأة.' : 'For example: use stages on your sales number only, not on your support number.' }}</p>
          <div class="inline-flex bg-slate-100 rounded-xl p-1 mb-3">
            <button
              v-for="mode in channelModes"
              :key="mode.key"
              type="button"
              @click="channelMode = mode.key"
              class="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border-none cursor-pointer"
              :class="channelMode === mode.key ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500'"
            >
              {{ mode.label }}
            </button>
          </div>
          <div v-if="channelMode === 'selected'">
            <div v-if="channels.length === 0" class="text-sm text-slate-400">{{ isAr ? 'لا توجد قنوات مربوطة.' : 'No connected channels.' }}</div>
            <div v-else class="grid sm:grid-cols-2 gap-2">
              <label
                v-for="ch in channels"
                :key="ch.id"
                class="flex items-center gap-2 border rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
                :class="stageForm.channelIds.includes(ch.id) ? 'border-[#FF6600] bg-orange-50/60' : 'border-slate-200 hover:border-slate-300'"
              >
                <input type="checkbox" :value="ch.id" v-model="stageForm.channelIds" class="accent-[#FF6600]" />
                <span class="text-sm font-medium text-slate-700">{{ ch.name || ch.phoneNumber }}</span>
                <span class="text-xs text-slate-400 ms-auto" dir="ltr">{{ ch.displayPhoneNumber || ch.phoneNumber }}</span>
              </label>
            </div>
          </div>

          <div class="flex items-center justify-between gap-4 pt-5 mt-5 border-t border-slate-100">
            <div>
              <h3 class="font-bold text-slate-800">{{ isAr ? 'إدخال المحادثات الجديدة للمرحلة الأولى تلقائياً' : 'Put new conversations in the first stage automatically' }}</h3>
              <p class="text-sm text-slate-500 mt-0.5">
                {{ isAr ? 'أي عميل يراسلك ولم تُحدَّد له مرحلة يدخل مرحلة' : 'Any customer who messages you without a stage enters' }}
                <strong v-if="entryStage">«{{ entryStage.name }}»</strong>
              </p>
            </div>
            <button type="button" dir="ltr" @click="stageForm.autoAssignEntry = !stageForm.autoAssignEntry" class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors border-none cursor-pointer" :class="stageForm.autoAssignEntry ? 'bg-emerald-500' : 'bg-slate-300'">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform" :class="stageForm.autoAssignEntry ? 'translate-x-6' : 'translate-x-1'"></span>
            </button>
          </div>
        </div>
      </template>

      <div class="flex justify-end">
        <button type="button" @click="saveStages" :disabled="savingStages" class="bg-[#FF6600] hover:bg-[#E65C00] text-white px-8 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 transition-colors disabled:opacity-50 border-none cursor-pointer">
          <i v-if="savingStages" class="fas fa-spinner fa-spin me-2"></i>{{ isAr ? 'حفظ المراحل' : 'Save stages' }}
        </button>
      </div>
    </section>

    <!-- Tag Modal -->
    <div v-if="showTagModal" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showTagModal = false"></div>
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 class="font-bold text-slate-800">{{ tagForm.id ? (isAr ? 'تعديل الوسم' : 'Edit Tag') : (isAr ? 'وسم جديد' : 'New Tag') }}</h3>
          <button type="button" @click="showTagModal = false" class="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form @submit.prevent="saveTag" class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'الاسم' : 'Name' }} *</label>
            <input v-model="tagForm.name" required maxlength="30" type="text" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] text-sm outline-none transition-all" :placeholder="isAr ? 'مثال: VIP' : 'e.g. VIP'" />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'اللون' : 'Color' }}</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="color in LABEL_COLORS"
                :key="color"
                type="button"
                @click="tagForm.color = color"
                class="w-8 h-8 rounded-full border-none cursor-pointer transition-transform"
                :class="tagForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'"
                :style="{ background: color }"
              ></button>
            </div>
          </div>
          <label class="flex items-center gap-2 mb-5 cursor-pointer text-sm text-slate-700">
            <input type="checkbox" v-model="tagForm.isPinned" class="accent-[#FF6600]" />
            {{ isAr ? 'تثبيت كفلتر سريع في المحادثات' : 'Pin as a quick filter in conversations' }}
          </label>
          <div class="mb-6 flex items-center gap-2 text-sm text-slate-500">
            {{ isAr ? 'معاينة:' : 'Preview:' }}
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border" :style="chipStyle(tagForm.color)">
              <span class="w-2 h-2 rounded-full" :style="{ background: tagForm.color }"></span>
              {{ tagForm.name || (isAr ? 'الوسم' : 'Tag') }}
            </span>
          </div>
          <div class="flex gap-3">
            <button type="button" @click="showTagModal = false" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors bg-white cursor-pointer">
              {{ isAr ? 'إلغاء' : 'Cancel' }}
            </button>
            <button type="submit" :disabled="savingTag" class="flex-1 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer">
              <i v-if="savingTag" class="fas fa-spinner fa-spin"></i>
              <span>{{ isAr ? 'حفظ' : 'Save' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Swal from 'sweetalert2'
import { LABEL_COLORS, STAGE_PRESETS } from '../data/chatLabels'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const route = useRoute()

const activeTab = ref(route.query.tab === 'stages' ? 'stages' : 'tags')
const tabs = computed(() => [
  { key: 'tags', icon: 'fas fa-tag', label: isAr.value ? 'الوسوم' : 'Tags' },
  { key: 'stages', icon: 'fas fa-route', label: isAr.value ? 'مراحل العميل' : 'Customer Stages' }
])

const loading = ref(true)
const channels = ref([])

const errorMessage = (err) => err.response?.data?.error?.message || err.response?.data?.message || err.message

// Light tinted chip with readable text for any tag/stage color
const chipStyle = (color) => ({
  background: `${color}1a`,
  borderColor: `${color}40`,
  color: `color-mix(in srgb, ${color} 70%, #0f172a)`
})

// ─── Tags ─────────────────────────────────────────────────────
const tags = ref([])
const showTagModal = ref(false)
const savingTag = ref(false)
const tagForm = ref({ id: null, name: '', color: LABEL_COLORS[0], isPinned: false })

const fetchTags = async () => {
  const res = await axios.get('/api/v1/chat/tags')
  tags.value = res.data.data || []
}

const openTagModal = (tag = null) => {
  tagForm.value = tag
    ? { id: tag.id, name: tag.name, color: tag.color, isPinned: tag.isPinned }
    : { id: null, name: '', color: LABEL_COLORS[tags.value.length % LABEL_COLORS.length], isPinned: false }
  showTagModal.value = true
}

const saveTag = async () => {
  savingTag.value = true
  try {
    const { id, ...payload } = tagForm.value
    if (id) {
      await axios.put(`/api/v1/chat/tags/${id}`, payload)
    } else {
      await axios.post('/api/v1/chat/tags', payload)
    }
    showTagModal.value = false
    await fetchTags()
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر الحفظ' : 'Could not save', text: errorMessage(err), confirmButtonColor: '#FF6600' })
  } finally {
    savingTag.value = false
  }
}

const togglePin = async (tag) => {
  try {
    await axios.put(`/api/v1/chat/tags/${tag.id}`, { isPinned: !tag.isPinned })
    tag.isPinned = !tag.isPinned
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: errorMessage(err), confirmButtonColor: '#FF6600' })
  }
}

const deleteTag = async (tag) => {
  const confirm = await Swal.fire({
    icon: 'warning',
    title: isAr.value ? `حذف «${tag.name}»؟` : `Delete "${tag.name}"?`,
    text: isAr.value ? 'سيُزال هذا الوسم من كل المحادثات.' : 'This tag will be removed from all conversations.',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: isAr.value ? 'حذف' : 'Delete',
    cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
  })
  if (!confirm.isConfirmed) return
  try {
    await axios.delete(`/api/v1/chat/tags/${tag.id}`)
    tags.value = tags.value.filter(t => t.id !== tag.id)
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: errorMessage(err), confirmButtonColor: '#FF6600' })
  }
}

// ─── Customer Stages ──────────────────────────────────────────
let keySeq = 0
const toLocalStage = (stage) => ({ key: `s${keySeq++}`, id: stage.id || null, name: stage.name, color: stage.color, group: stage.group })

const stageForm = ref({ enabled: false, autoAssignEntry: true, channelIds: [], stages: [] })
const channelMode = ref('all')
const savingStages = ref(false)

const channelModes = computed(() => [
  { key: 'all', label: isAr.value ? 'كل القنوات' : 'All channels' },
  { key: 'selected', label: isAr.value ? 'قنوات محددة' : 'Selected channels' }
])

const paths = computed(() => [
  {
    group: 'MAIN',
    icon: 'fas fa-route',
    color: '#10b981',
    title: isAr.value ? 'المسار الرئيسي' : 'Main path',
    desc: isAr.value ? 'المراحل التي يمر بها العميل حتى النجاح، بالترتيب.' : 'The stages a customer goes through until success, in order.'
  },
  {
    group: 'LOST',
    icon: 'fas fa-code-branch',
    color: '#f97316',
    title: isAr.value ? 'مسار الخسارة' : 'Loss path',
    desc: isAr.value ? 'عندما لا يكمل العميل (اختياري).' : 'When a customer drops off (optional).'
  }
])

const stagesOf = (group) => stageForm.value.stages.filter(s => s.group === group)
const mainCount = computed(() => stagesOf('MAIN').length)
const entryStage = computed(() => stagesOf('MAIN')[0] || null)

const fetchStages = async () => {
  const res = await axios.get('/api/v1/chat/stages')
  const data = res.data.data
  stageForm.value = {
    enabled: data.enabled,
    autoAssignEntry: data.autoAssignEntry,
    channelIds: [...(data.channelIds || [])],
    stages: (data.stages || []).map(toLocalStage)
  }
  channelMode.value = stageForm.value.channelIds.length > 0 ? 'selected' : 'all'
}

const addStage = (group) => {
  const used = stageForm.value.stages.length
  stageForm.value.stages.push(toLocalStage({ name: '', color: LABEL_COLORS[used % LABEL_COLORS.length], group }))
}

const moveStage = (stage, direction) => {
  const list = stageForm.value.stages
  const groupList = list.filter(s => s.group === stage.group)
  const target = groupList[groupList.indexOf(stage) + direction]
  if (!target) return
  const a = list.indexOf(stage)
  const b = list.indexOf(target)
  ;[list[a], list[b]] = [list[b], list[a]]
}

const removeStage = async (stage) => {
  if (stage.id) {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: isAr.value ? `حذف مرحلة «${stage.name}»؟` : `Delete stage "${stage.name}"?`,
      text: isAr.value ? 'بعد الحفظ تصبح المحادثات الموجودة في هذه المرحلة بدون مرحلة.' : 'After saving, conversations in this stage will have no stage.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: isAr.value ? 'حذف' : 'Delete',
      cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
    })
    if (!confirm.isConfirmed) return
  }
  stageForm.value.stages = stageForm.value.stages.filter(s => s !== stage)
}

const applyPreset = async (preset) => {
  if (stageForm.value.stages.some(s => s.id)) {
    const confirm = await Swal.fire({
      icon: 'question',
      title: isAr.value ? 'استبدال المراحل الحالية؟' : 'Replace current stages?',
      text: isAr.value ? 'بعد الحفظ تصبح المحادثات الموجودة في المراحل الحالية بدون مرحلة.' : 'After saving, conversations in the current stages will have no stage.',
      showCancelButton: true,
      confirmButtonColor: '#FF6600',
      confirmButtonText: isAr.value ? 'استبدال' : 'Replace',
      cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
    })
    if (!confirm.isConfirmed) return
  }
  const name = (s) => (isAr.value ? s.ar : s.en)
  stageForm.value.stages = [
    ...preset.main.map(s => toLocalStage({ name: name(s), color: s.color, group: 'MAIN' })),
    ...preset.lost.map(s => toLocalStage({ name: name(s), color: s.color, group: 'LOST' }))
  ]
}

const saveStages = async () => {
  const form = stageForm.value
  if (form.enabled) {
    if (mainCount.value === 0) {
      Swal.fire({ icon: 'info', title: isAr.value ? 'أضف مرحلة واحدة على الأقل في المسار الرئيسي' : 'Add at least one stage to the main path', confirmButtonColor: '#FF6600' })
      return
    }
    if (form.stages.some(s => !s.name.trim())) {
      Swal.fire({ icon: 'info', title: isAr.value ? 'اكتب اسماً لكل مرحلة' : 'Give every stage a name', confirmButtonColor: '#FF6600' })
      return
    }
    if (channelMode.value === 'selected' && form.channelIds.length === 0) {
      Swal.fire({ icon: 'info', title: isAr.value ? 'اختر قناة واحدة على الأقل' : 'Select at least one channel', confirmButtonColor: '#FF6600' })
      return
    }
  }

  savingStages.value = true
  try {
    const payload = {
      enabled: form.enabled,
      autoAssignEntry: form.autoAssignEntry,
      channelIds: channelMode.value === 'selected' ? form.channelIds : [],
      // Main path first, then loss path — order inside each group is the stage order
      stages: [...stagesOf('MAIN'), ...stagesOf('LOST')]
        .filter(s => s.name.trim())
        .map(s => ({ id: s.id, name: s.name.trim(), color: s.color, group: s.group }))
    }
    const res = await axios.put('/api/v1/chat/stages', payload)
    const data = res.data.data
    stageForm.value.stages = (data.stages || []).map(toLocalStage)
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم حفظ المراحل' : 'Stages saved', timer: 1500, showConfirmButton: false })
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر الحفظ' : 'Could not save', text: errorMessage(err), confirmButtonColor: '#FF6600' })
  } finally {
    savingStages.value = false
  }
}

const fetchChannels = async () => {
  try {
    const res = await axios.get('/api/v1/meta/channels')
    channels.value = res.data.data || []
  } catch (err) {
    console.error('Error fetching channels:', err)
  }
}

onMounted(async () => {
  try {
    await Promise.all([fetchTags(), fetchStages(), fetchChannels()])
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر تحميل البيانات' : 'Could not load data', text: errorMessage(err), confirmButtonColor: '#FF6600' })
  } finally {
    loading.value = false
  }
})
</script>
