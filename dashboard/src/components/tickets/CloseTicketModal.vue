<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" :dir="isAr ? 'rtl' : 'ltr'" @keydown.esc="$emit('close')">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]" role="dialog" aria-modal="true">
      <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-start gap-3 bg-slate-50/50">
        <div class="min-w-0">
          <h3 class="font-bold text-slate-800">{{ isAr ? 'إغلاق التذكرة' : 'Close ticket' }} <span class="font-mono text-slate-500 text-sm" dir="ltr">{{ ticket.ticketNumber }}</span></h3>
          <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5 truncate" dir="auto">{{ subtitle }}</p>
        </div>
        <button type="button" @click="$emit('close')" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer shrink-0" :title="isAr ? 'إغلاق' : 'Close'"><i class="fas fa-times"></i></button>
      </div>

      <div class="p-5 space-y-5 overflow-y-auto">
        <section>
          <label class="lbl">{{ isAr ? 'التصنيف' : 'Category' }}</label>
          <CategoryChips v-model="categoryId" :categories="categories" :is-ar="isAr" :can-manage="canManageCategories" />
        </section>

        <section>
          <label class="lbl" for="resolution">{{ isAr ? 'كيف حُلّت؟' : 'How was it resolved?' }} <span class="font-normal text-slate-400">{{ isAr ? '(اختياري، يراه فريقك)' : '(optional, for your team)' }}</span></label>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <button
              v-for="r in reasons"
              :key="r"
              type="button"
              class="reason"
              :class="{ on: description === r }"
              @click="description = description === r ? '' : r"
            >{{ r }}</button>
          </div>
          <textarea
            id="resolution"
            v-model="description"
            rows="3"
            maxlength="2000"
            class="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600] focus:ring-2 focus:ring-[#FF6600]/15 resize-none"
            :placeholder="isAr ? 'مثال: أُرسل رابط الدفع وأكّد العميل الطلب' : 'e.g. Sent the payment link and the customer confirmed'"
          ></textarea>
        </section>

        <label class="rating" :class="{ off: !canRate }">
          <input type="checkbox" v-model="sendRating" :disabled="!canRate" class="mt-0.5 accent-[#FF6600]" />
          <span class="flex-1">
            <span class="block font-semibold text-sm text-slate-800"><i class="fas fa-star text-amber-400 me-1"></i>{{ isAr ? 'اطلب من العميل تقييم الخدمة' : 'Ask the customer to rate the service' }}</span>
            <span class="block text-xs mt-0.5" :class="canRate ? 'text-slate-500' : 'text-amber-700'">
              <template v-if="!ratingEnabled">
                {{ isAr ? 'طلب التقييم متوقف من' : 'Rating requests are off in' }}
                <router-link to="/ticket-settings" class="underline font-semibold">{{ isAr ? 'إعدادات التذاكر' : 'Ticket settings' }}</router-link>.
              </template>
              <template v-else>{{ canRate
                ? (isAr ? 'تصله رسالة تقييم من 1 إلى 5 نجوم على واتساب.' : 'They get a 1–5 star rating message on WhatsApp.')
                : (isAr ? 'غير متاح: مرّ أكثر من 24 ساعة على آخر رسالة من العميل (سياسة Meta).' : 'Not available: more than 24h since the customer last wrote (Meta policy).') }}</template>
            </span>
          </span>
        </label>
      </div>

      <div class="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
        <button type="button" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium bg-white cursor-pointer" @click="$emit('close')">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
        <button
          type="button"
          class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
          :disabled="saving"
          @click="submit"
        >
          <i class="fas" :class="saving ? 'fa-spinner fa-spin' : 'fa-circle-check'"></i>{{ isAr ? 'إغلاق التذكرة' : 'Close ticket' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import CategoryChips from './CategoryChips.vue'
import { ticketErrorText } from '../../utils/tickets'

const props = defineProps({
  ticket: { type: Object, required: true },
  isAr: { type: Boolean, default: true },
  categories: { type: Array, default: () => [] },
  canManageCategories: { type: Boolean, default: false },
  // false when Meta's 24h window with the customer is closed; null when unknown
  windowOpen: { default: null },
  subtitle: { type: String, default: '' }
})
const emit = defineEmits(['close', 'closed'])

// Off in the ticket settings, or Meta's 24h window is closed
const ratingEnabled = ref(true)
const canRate = computed(() => ratingEnabled.value && props.windowOpen !== false)
const categoryId = ref(props.ticket.categoryId || null)
const description = ref('')
const sendRating = ref(canRate.value)
const saving = ref(false)

onMounted(async () => {
  try {
    const res = await axios.get('/api/v1/tickets/settings')
    ratingEnabled.value = res.data.data.ratingEnabled !== false
    if (!ratingEnabled.value) sendRating.value = false
  } catch (e) { /* keep the default */ }
})

const reasons = computed(() => (props.isAr
  ? ['تم حل المشكلة', 'تمت الإجابة على الاستفسار', 'تم البيع أو الحجز', 'العميل لم يرد', 'محادثة غير مهمة أو مكررة']
  : ['Issue solved', 'Question answered', 'Sale or booking done', 'No reply from the customer', 'Spam or duplicate']))

const submit = async () => {
  saving.value = true
  try {
    const res = await axios.post(`/api/v1/tickets/${props.ticket.id}/close`, {
      description: description.value.trim(),
      categoryId: categoryId.value || undefined,
      sendRating: canRate.value && sendRating.value
    })
    const closed = res.data.data
    Swal.fire({
      icon: 'success',
      title: props.isAr ? 'أُغلقت التذكرة' : 'Ticket closed',
      text: closed.ratingRequest === 'SENT'
        ? (props.isAr ? 'وأُرسل للعميل طلب التقييم.' : 'The customer was asked to rate the service.')
        : closed.ratingRequest === 'FAILED' ? (props.isAr ? 'لكن تعذّر إرسال طلب التقييم.' : 'But the rating request could not be sent.') : '',
      toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
    })
    emit('closed', closed)
  } catch (err) {
    Swal.fire({ icon: 'error', title: props.isAr ? 'تعذّر الإغلاق' : 'Could not close', text: ticketErrorText(err, props.isAr), confirmButtonColor: '#FF6600' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.lbl { display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; }
.reason { padding: 4px 10px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; font-size: 12px; cursor: pointer; transition: all 0.15s; }
.reason:hover { border-color: #cbd5e1; background: white; }
.reason.on { background: #ecfdf5; border-color: #6ee7b7; color: #047857; font-weight: 700; }
.rating { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fafbfc; cursor: pointer; }
.rating.off { cursor: not-allowed; background: #fffbeb; border-color: #fde68a; }
</style>
