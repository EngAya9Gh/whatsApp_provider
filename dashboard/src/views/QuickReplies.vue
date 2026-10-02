<template>
  <div class="quick-replies p-6 font-sans" :class="{ 'rtl-mode': isAr }">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>⚡</span> {{ isAr ? 'الردود السريعة' : 'Quick Replies' }}
        </h2>
        <p class="text-slate-500 font-medium text-lg mt-1">
          {{ isAr ? 'إدارة الردود السريعة لاستخدامها في المحادثات باختصار' : 'Manage quick replies for fast responses in live chat' }}
        </p>
      </div>
      <button @click="openModal()" class="bg-[#FF6600] hover:bg-[#e65c00] text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-[#FF6600]/20 flex items-center gap-2">
        <i class="fas fa-plus"></i> {{ isAr ? 'إضافة رد سريع' : 'Add Quick Reply' }}
      </button>
    </div>

    <!-- Quick Replies List -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-10 h-10 border-4 border-slate-200 border-t-[#FF6600] rounded-full animate-spin"></div>
    </div>

    <div v-else-if="quickReplies.length === 0" class="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div class="text-6xl mb-4">⚡</div>
      <h3 class="text-xl font-bold text-slate-800">{{ isAr ? 'لا توجد ردود سريعة' : 'No Quick Replies' }}</h3>
      <p class="text-slate-500 mt-2">{{ isAr ? 'قم بإضافة أول رد سريع لاستخدامه في المحادثات المباشرة' : 'Add your first quick reply to use it in live chat' }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="reply in quickReplies" :key="reply.id" class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group">
        <div class="flex justify-between items-start mb-4">
          <div class="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-mono text-sm font-bold border border-slate-200">
            /{{ reply.shortcut }}
          </div>
          <button @click="deleteReply(reply.id)" class="text-slate-400 hover:text-red-500 transition-colors bg-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm border border-slate-100">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <p class="text-slate-600 text-sm whitespace-pre-wrap">{{ reply.content }}</p>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 class="text-lg font-bold text-slate-800">{{ isAr ? 'رد سريع جديد' : 'New Quick Reply' }}</h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">{{ isAr ? 'الاختصار (Shortcut)' : 'Shortcut' }}</label>
            <div class="relative">
              <span class="absolute left-3 top-3 text-slate-400 font-mono font-bold">/</span>
              <input v-model="form.shortcut" type="text" class="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] outline-none font-mono" :placeholder="isAr ? 'welcome' : 'welcome'" />
            </div>
            <p class="text-xs text-slate-500 mt-1">{{ isAr ? 'بدون مسافات أو رموز معقدة' : 'No spaces or special characters' }}</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">{{ isAr ? 'محتوى الرسالة' : 'Message Content' }}</label>
            <textarea v-model="form.content" rows="4" class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] outline-none resize-none" :placeholder="isAr ? 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟' : 'Hello! How can I help you today?'"></textarea>
          </div>
        </div>
        <div class="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button @click="showModal = false" class="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">
            {{ isAr ? 'إلغاء' : 'Cancel' }}
          </button>
          <button @click="saveReply" :disabled="saving || !form.shortcut || !form.content" class="px-5 py-2.5 bg-[#FF6600] text-white font-bold rounded-xl hover:bg-[#e65c00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
            {{ saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const isAr = computed(() => {
  const lang = localStorage.getItem('lang') || 'ar'
  return lang === 'ar'
})

const loading = ref(true)
const quickReplies = ref([])
const showModal = ref(false)
const saving = ref(false)

const form = ref({
  shortcut: '',
  content: ''
})

const fetchReplies = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/v1/chat/quick-replies')
    quickReplies.value = res.data.data
  } catch (error) {
    console.error('Error fetching quick replies:', error)
  } finally {
    loading.value = false
  }
}

const openModal = () => {
  form.value = { shortcut: '', content: '' }
  showModal.value = true
}

const saveReply = async () => {
  if (!form.value.shortcut || !form.value.content) return
  
  saving.value = true
  try {
    await axios.post('/api/v1/chat/quick-replies', {
      shortcut: form.value.shortcut.replace(/[^a-zA-Z0-9_-]/g, ''),
      content: form.value.content
    })
    showModal.value = false
    await fetchReplies()
  } catch (error) {
    console.error('Error saving quick reply:', error)
    alert(isAr.value ? 'حدث خطأ أثناء الحفظ' : 'Error saving quick reply')
  } finally {
    saving.value = false
  }
}

const deleteReply = async (id) => {
  if (!confirm(isAr.value ? 'هل أنت متأكد من حذف هذا الرد السريع؟' : 'Are you sure you want to delete this quick reply?')) return
  
  try {
    await axios.delete(`/api/v1/chat/quick-replies/${id}`)
    await fetchReplies()
  } catch (error) {
    console.error('Error deleting quick reply:', error)
    alert(isAr.value ? 'حدث خطأ أثناء الحذف' : 'Error deleting quick reply')
  }
}

onMounted(() => {
  fetchReplies()
})
</script>

<style scoped>
.rtl-mode {
  direction: rtl;
  font-family: 'Cairo', sans-serif;
}
.rtl-mode .left-3 {
  left: auto;
  right: 0.75rem;
}
.rtl-mode .pl-8 {
  padding-left: 1rem;
  padding-right: 2rem;
}
</style>
