<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" :dir="isAr ? 'rtl' : 'ltr'" @keydown.esc="$emit('close')">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden" role="dialog" aria-modal="true">
      <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-start gap-3 bg-slate-50/50">
        <div class="min-w-0">
          <h3 class="font-bold text-slate-800">{{ isAr ? 'تصنيف التذكرة' : 'Ticket category' }} <span class="font-mono text-slate-500 text-sm" dir="ltr">{{ ticket.ticketNumber }}</span></h3>
          <p class="text-xs text-slate-500 mt-0.5">{{ isAr ? 'يساعدك في التقارير ومعرفة أكثر ما يسأل عنه العملاء.' : 'Helps your reports show what customers ask about most.' }}</p>
        </div>
        <button type="button" @click="$emit('close')" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer shrink-0" :title="isAr ? 'إغلاق' : 'Close'"><i class="fas fa-times"></i></button>
      </div>
      <div class="p-5">
        <CategoryChips v-model="categoryId" :categories="categories" :is-ar="isAr" :can-manage="canManageCategories" />
      </div>
      <div class="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
        <button type="button" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium bg-white cursor-pointer" @click="$emit('close')">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
        <button
          type="button"
          class="px-5 py-2 rounded-xl bg-[#FF6600] hover:bg-[#E65C00] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
          :disabled="saving || categoryId === (ticket.categoryId || null)"
          @click="save"
        >
          <i class="fas" :class="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i>{{ isAr ? 'حفظ' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import CategoryChips from './CategoryChips.vue'
import { ticketErrorText } from '../../utils/tickets'

const props = defineProps({
  ticket: { type: Object, required: true },
  isAr: { type: Boolean, default: true },
  categories: { type: Array, default: () => [] },
  canManageCategories: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'updated'])

const categoryId = ref(props.ticket.categoryId || null)
const saving = ref(false)

const save = async () => {
  saving.value = true
  try {
    const res = await axios.patch(`/api/v1/tickets/${props.ticket.id}`, { categoryId: categoryId.value })
    emit('updated', res.data.data)
  } catch (err) {
    Swal.fire({ icon: 'error', title: props.isAr ? 'تعذّر الحفظ' : 'Could not save', text: ticketErrorText(err, props.isAr), confirmButtonColor: '#FF6600' })
  } finally {
    saving.value = false
  }
}
</script>
