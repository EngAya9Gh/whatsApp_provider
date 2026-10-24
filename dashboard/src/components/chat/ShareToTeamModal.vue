<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h3 class="font-bold text-slate-800">{{ isAr ? 'مشاركة المحادثة مع زميل' : 'Share with a colleague' }}</h3>
          <p class="text-xs text-slate-500 mt-0.5" dir="auto">{{ contactLabel }}</p>
        </div>
        <button type="button" @click="$emit('close')" class="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"><i class="fas fa-times"></i></button>
      </div>

      <div class="p-5">
        <div v-if="loading" class="py-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
        <template v-else>
          <input v-model="search" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600] mb-3" :placeholder="isAr ? 'ابحث عن زميل أو مجموعة…' : 'Search colleagues or groups…'" />
          <div class="max-h-60 overflow-y-auto space-y-1 mb-3">
            <button
              v-for="t in targets"
              :key="t.key"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors bg-white"
              :class="selected?.key === t.key ? 'border-[#FF6600] bg-orange-50/60' : 'border-transparent hover:bg-slate-50'"
              @click="selected = t"
            >
              <span class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" :class="t.group ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'">
                <i v-if="t.group" class="fas fa-users"></i>
                <template v-else>{{ (t.name || '?').charAt(0) }}</template>
              </span>
              <span class="flex-1 text-start font-medium text-slate-700">{{ t.name }}</span>
              <i v-if="selected?.key === t.key" class="fas fa-check text-[#FF6600]"></i>
            </button>
            <p v-if="targets.length === 0" class="text-sm text-slate-400 text-center py-4">{{ isAr ? 'لا يوجد زملاء.' : 'No colleagues.' }}</p>
          </div>
          <textarea v-model="note" rows="2" maxlength="1000" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600] resize-none" :placeholder="isAr ? 'ملاحظة (اختياري)، مثال: هذا العميل يسأل عن خصم' : 'Note (optional)'"></textarea>
        </template>
      </div>

      <div class="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
        <button type="button" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium bg-white cursor-pointer" @click="$emit('close')">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
        <button type="button" class="px-5 py-2 rounded-xl bg-[#FF6600] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50" :disabled="!selected || sending" @click="share">
          <i class="fas" :class="sending ? 'fa-spinner fa-spin' : 'fa-share'"></i> {{ isAr ? 'مشاركة' : 'Share' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'

const props = defineProps({
  thread: { type: Object, required: true },
  isAr: { type: Boolean, default: true }
})
const emit = defineEmits(['close'])

const loading = ref(true)
const sending = ref(false)
const search = ref('')
const note = ref('')
const selected = ref(null)
const me = ref('')
const members = ref([])
const groups = ref([])

const contactLabel = computed(() => props.thread.contactName || props.thread.contactPhone)

// Colleagues (a direct conversation is opened on demand) and the groups I am in
const targets = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = [
    ...groups.value.map(g => ({ key: `g:${g.id}`, group: true, conversationId: g.id, name: g.title })),
    ...members.value.filter(m => m.key !== me.value).map(m => ({ key: `m:${m.key}`, group: false, memberKey: m.key, name: m.name }))
  ]
  return list.filter(t => !q || t.name.toLowerCase().includes(q))
})

const errorMessage = (err) => {
  const e = err.response?.data?.error
  return (typeof e === 'string' ? e : e?.message) || err.message
}

const share = async () => {
  sending.value = true
  try {
    let conversationId = selected.value.conversationId
    if (!conversationId) {
      const res = await axios.post('/api/v1/team-chat/conversations/direct', { memberKey: selected.value.memberKey })
      conversationId = res.data.data.id
    }
    await axios.post(`/api/v1/team-chat/conversations/${conversationId}/messages`, { text: note.value, threadId: props.thread.id })
    Swal.fire({ icon: 'success', title: props.isAr ? 'تمت المشاركة' : 'Shared', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 })
    emit('close')
  } catch (err) {
    Swal.fire({ icon: 'error', title: props.isAr ? 'تعذّرت المشاركة' : 'Could not share', text: errorMessage(err), confirmButtonColor: '#FF6600' })
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  try {
    const [membersRes, convRes] = await Promise.all([
      axios.get('/api/v1/team-chat/members'),
      axios.get('/api/v1/team-chat/conversations')
    ])
    me.value = membersRes.data.data.me
    members.value = membersRes.data.data.members
    groups.value = (convRes.data.data || []).filter(c => c.type === 'GROUP')
  } finally {
    loading.value = false
  }
})
</script>
