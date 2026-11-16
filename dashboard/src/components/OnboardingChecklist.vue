<template>
  <section v-if="visible" class="ob" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="ob-head">
      <div>
        <h2 class="ob-title">{{ isAr ? 'جهّز حسابك' : 'Set up your account' }}</h2>
        <p class="ob-sub">{{ isAr ? 'خطوات قليلة ليصير الحساب جاهز لاستقبال عملائك والرد عليهم. كل خطوة تتعلّم ✓ لحالها لما تخلصها.' : 'A few steps to get ready for your customers. Each step ticks itself once it is done.' }}</p>
      </div>
      <div class="ob-side">
        <span class="ob-count">{{ doneCount }} / {{ steps.length }}</span>
        <button type="button" class="ob-hide" @click="hide">{{ isAr ? 'إخفاء' : 'Hide' }}</button>
      </div>
    </div>
    <div class="ob-bar"><span :style="{ width: `${Math.round((doneCount / steps.length) * 100)}%` }"></span></div>

    <ol class="ob-steps">
      <li v-for="(s, i) in steps" :key="s.key" class="ob-step" :class="{ done: s.done }">
        <span class="ob-dot"><i v-if="s.done" class="fas fa-check"></i><template v-else>{{ i + 1 }}</template></span>
        <div class="ob-text">
          <div class="ob-name">{{ isAr ? s.ar : s.en }}</div>
          <div class="ob-why">{{ isAr ? s.whyAr : s.whyEn }}</div>
        </div>
        <router-link v-if="!s.done" :to="s.to" class="ob-go">{{ isAr ? 'ابدأ' : 'Start' }}</router-link>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import axios from 'axios'
import { tenantHasMeta } from '../utils/meta-access'

const props = defineProps({ isAr: { type: Boolean, default: true } })

const { proxy } = getCurrentInstance()
const has = (feature) => (typeof proxy.$hasFeature === 'function' ? proxy.$hasFeature(feature) : true)

const STEP_INFO = {
  connect: {
    ar: 'اربط رقم واتساب', en: 'Connect a WhatsApp number',
    whyAr: 'بدونه ما بتوصلك رسائل العملاء.', whyEn: 'Without it no customer messages reach you.',
    to: () => (tenantHasMeta() ? '/connect-meta' : '/connect')
  },
  contacts: {
    ar: 'أضف جهات الاتصال', en: 'Add your contacts',
    whyAr: 'ارفع ملف إكسل بعملائك لتراسلهم وترسل لهم حملات.', whyEn: 'Upload your customers to message them and run campaigns.',
    to: () => '/contacts'
  },
  team: {
    ar: 'أضف موظفاً', en: 'Add a team member',
    whyAr: 'ليرد معك على المحادثات وتتوزع عليه التذاكر.', whyEn: 'So they can answer chats and take tickets.',
    to: () => '/sub-users'
  },
  hours: {
    ar: 'حدّد ساعات العمل ورسالة الغياب', en: 'Set working hours and an away message',
    whyAr: 'يعرف العميل متى ترد عليه بدل ما ينتظر.', whyEn: 'Customers know when to expect an answer.',
    to: () => '/teams'
  },
  aiAgent: {
    ar: 'جهّز الموظف الذكي', en: 'Set up the AI agent',
    whyAr: 'اكتب معلومات نشاطك ليرد على الأسئلة المتكررة.', whyEn: 'Write your business information so it answers common questions.',
    to: () => '/ai-agent', feature: 'META_AUTORESPONDER'
  },
  firstMessage: {
    ar: 'أرسل أول رسالة', en: 'Send your first message',
    whyAr: 'جرّب الإرسال لرقمك أو رد على أول محادثة.', whyEn: 'Message your own number or answer your first chat.',
    to: () => '/live-chat'
  }
}

const data = ref(null)
const hidden = ref(false)

const steps = computed(() => (data.value?.steps || [])
  .filter(s => STEP_INFO[s.key] && (!STEP_INFO[s.key].feature || has(STEP_INFO[s.key].feature)))
  .map(s => ({ ...s, ...STEP_INFO[s.key], to: STEP_INFO[s.key].to() })))
const doneCount = computed(() => steps.value.filter(s => s.done).length)
// Gone once everything is done or the owner hid it
const visible = computed(() => !!data.value && !hidden.value && !data.value.dismissedAt && steps.value.length > 0 && doneCount.value < steps.value.length)

const hide = async () => {
  hidden.value = true
  try { await axios.post('/api/dashboard/onboarding/dismiss') } catch { /* hidden for this visit anyway */ }
}

onMounted(async () => {
  try {
    data.value = (await axios.get('/api/dashboard/onboarding')).data.data
  } catch {
    data.value = null // team members and errors: no checklist
  }
})
</script>

<style scoped>
.ob { background: #fff; border: 1px solid #fed7aa; border-radius: 18px; padding: 18px 20px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(15, 23, 42, .04); }
.ob-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.ob-title { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; }
.ob-sub { font-size: .8rem; color: #64748b; margin: 4px 0 0; max-width: 640px; line-height: 1.6; }
.ob-side { display: flex; align-items: center; gap: 10px; }
.ob-count { font-weight: 800; color: #FF6600; font-size: .95rem; }
.ob-hide { border: 1px solid #e2e8f0; background: #fff; color: #64748b; font-size: .75rem; font-weight: 600; border-radius: 999px; padding: 4px 12px; cursor: pointer; }
.ob-bar { height: 6px; background: #ffedd5; border-radius: 999px; margin: 14px 0 12px; overflow: hidden; }
.ob-bar span { display: block; height: 100%; background: #FF6600; border-radius: 999px; transition: width .3s; }
.ob-steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.ob-step { display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 12px; background: #fcfcfd; }
.ob-step.done { background: #f0fdf4; border-color: #bbf7d0; }
.ob-dot { width: 26px; height: 26px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 800; background: #fff7ed; color: #c2410c; flex-shrink: 0; }
.ob-step.done .ob-dot { background: #16a34a; color: #fff; }
.ob-text { flex: 1; min-width: 0; }
.ob-name { font-size: .85rem; font-weight: 700; color: #0f172a; }
.ob-step.done .ob-name { color: #15803d; }
.ob-why { font-size: .72rem; color: #64748b; line-height: 1.5; }
.ob-go { font-size: .75rem; font-weight: 700; color: #fff; background: #FF6600; border-radius: 999px; padding: 5px 12px; text-decoration: none; white-space: nowrap; }
.ob-go:hover { background: #e65c00; }
</style>
