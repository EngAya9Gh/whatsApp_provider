<template>
  <div class="p-6 max-w-6xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'الكوبونات والإحالات' : 'Coupons & referrals' }}</h1>
    <p class="text-slate-500 mt-1 text-sm max-w-3xl">
      {{ isAr
        ? 'بدون بوابة دفع: العميل يطبّق الكوبون على فاتورته غير المدفوعة من صفحة الفوترة، فيُضاف سطر خصم وتُعاد حسبة الضريبة. كل عميل يستخدم الكوبون مرة واحدة.'
        : 'No payment gateway: the customer applies a coupon to an unpaid invoice on the Billing page; a discount line is added and the VAT recalculated. Each account uses a coupon once.' }}
    </p>

    <!-- New coupon -->
    <form class="card mt-5" @submit.prevent="create">
      <h2 class="font-bold text-slate-800 mb-3">{{ isAr ? 'كوبون جديد' : 'New coupon' }}</h2>
      <div class="grid md:grid-cols-4 gap-3">
        <label class="f"><span>{{ isAr ? 'الرمز' : 'Code' }}</span><input v-model.trim="form.code" dir="ltr" required maxlength="40" placeholder="RAMADAN25" class="uppercase" /></label>
        <label class="f"><span>{{ isAr ? 'النوع' : 'Type' }}</span>
          <select v-model="form.type"><option value="PERCENT">{{ isAr ? 'نسبة %' : 'Percent %' }}</option><option value="FIXED">{{ isAr ? 'مبلغ ثابت (ريال قبل الضريبة)' : 'Fixed (SAR before VAT)' }}</option></select>
        </label>
        <label class="f"><span>{{ isAr ? 'القيمة' : 'Value' }}</span><input v-model="form.value" type="number" min="0.01" step="0.01" required dir="ltr" /></label>
        <label class="f"><span>{{ isAr ? 'عدد الاستخدامات (فارغ = بلا حد)' : 'Uses (empty = no limit)' }}</span><input v-model="form.maxUses" type="number" min="1" step="1" dir="ltr" /></label>
        <label class="f"><span>{{ isAr ? 'ينتهي في (اختياري)' : 'Expires (optional)' }}</span><input v-model="form.expiresAt" type="date" dir="ltr" /></label>
        <div class="f md:col-span-2"><span>{{ isAr ? 'الباقات (لا شيء = كل الباقات)' : 'Plans (none = every plan)' }}</span>
          <div class="flex flex-wrap gap-2 mt-1">
            <label v-for="p in PLANS" :key="p" class="chip"><input v-model="form.plans" type="checkbox" :value="p" /> {{ p }}</label>
          </div>
        </div>
        <label class="f justify-end"><span class="flex items-center gap-2 mt-5"><input v-model="form.firstInvoiceOnly" type="checkbox" /> {{ isAr ? 'لأول فاتورة فقط' : 'First invoice only' }}</span></label>
        <label class="f md:col-span-3"><span>{{ isAr ? 'ملاحظة (تظهر في سطر الخصم)' : 'Note (shown on the discount line)' }}</span><input v-model="form.note" maxlength="255" /></label>
        <div class="flex items-end"><button class="btn w-full" :disabled="saving">{{ saving ? '…' : (isAr ? 'إنشاء الكوبون' : 'Create coupon') }}</button></div>
      </div>
      <p v-if="msg" class="text-xs mt-2" :class="msgErr ? 'text-red-600' : 'text-green-700'">{{ msg }}</p>
    </form>

    <!-- Coupons -->
    <div class="card mt-5 p-0 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs">
          <tr>
            <th class="th text-start">{{ isAr ? 'الرمز' : 'Code' }}</th>
            <th class="th">{{ isAr ? 'الخصم' : 'Discount' }}</th>
            <th class="th">{{ isAr ? 'استُخدم' : 'Used' }}</th>
            <th class="th">{{ isAr ? 'مجموع الخصم' : 'Total discount' }}</th>
            <th class="th">{{ isAr ? 'ينتهي' : 'Expires' }}</th>
            <th class="th">{{ isAr ? 'الحالة' : 'Status' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="coupons.length === 0"><td colspan="6" class="td text-center text-slate-400 py-6">{{ isAr ? 'لا كوبونات بعد.' : 'No coupons yet.' }}</td></tr>
          <tr v-for="c in coupons" :key="c.id" class="border-t border-slate-100">
            <td class="td"><b dir="ltr">{{ c.code }}</b><div class="text-xs text-slate-400">{{ c.plans?.length ? c.plans.join(', ') : (isAr ? 'كل الباقات' : 'all plans') }}{{ c.firstInvoiceOnly ? (isAr ? ' · أول فاتورة' : ' · first invoice') : '' }}</div></td>
            <td class="td text-center" dir="ltr">{{ c.type === 'PERCENT' ? c.value + '%' : c.value + ' SAR' }}</td>
            <td class="td text-center">{{ c.usedCount }}{{ c.maxUses ? ' / ' + c.maxUses : '' }}</td>
            <td class="td text-center" dir="ltr">{{ c.totalDiscount.toFixed(2) }} SAR</td>
            <td class="td text-center text-xs">{{ c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—' }}</td>
            <td class="td text-center">
              <button class="toggle" :class="c.isActive ? 'on' : 'off'" @click="toggle(c)">{{ c.isActive ? (isAr ? 'فعّال' : 'Active') : (isAr ? 'موقوف' : 'Off') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Referrals -->
    <div class="card mt-8">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 class="font-bold text-slate-800">{{ isAr ? 'الإحالات (ادعُ صديقاً)' : 'Referrals (invite a friend)' }}</h2>
          <p class="text-xs text-slate-500 mt-1 max-w-2xl">{{ isAr
            ? 'لكل عميل رابط دعوة في صفحة الفوترة. لما يسجّل حساب جديد من الرابط وتُعلَّم أول فاتورة له «مدفوعة»، تُضاف المكافأة لمحفظة صاحب الرابط تلقائياً. اترك المكافأة فارغة لإيقاف الإحالات.'
            : 'Each customer has an invite link on the Billing page. When a new account signs up with it and its first invoice is marked paid, the reward is added to the inviter\'s wallet. Leave the reward empty to turn referrals off.' }}</p>
        </div>
        <form class="flex items-end gap-2" @submit.prevent="saveReward">
          <label class="f"><span>{{ isAr ? 'المكافأة (ريال للمحفظة)' : 'Reward (SAR to the wallet)' }}</span><input v-model="reward" type="number" min="0" step="0.01" dir="ltr" :placeholder="isAr ? 'موقوفة' : 'Off'" /></label>
          <button class="btn" :disabled="savingReward">{{ savingReward ? '…' : (isAr ? 'حفظ' : 'Save') }}</button>
        </form>
      </div>
      <table class="w-full text-sm mt-4">
        <thead class="bg-slate-50 text-slate-500 text-xs">
          <tr>
            <th class="th text-start">{{ isAr ? 'صاحب الدعوة' : 'Inviter' }}</th>
            <th class="th text-start">{{ isAr ? 'الحساب الجديد' : 'New account' }}</th>
            <th class="th">{{ isAr ? 'سجّل في' : 'Signed up' }}</th>
            <th class="th">{{ isAr ? 'الحالة' : 'Status' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="referrals.length === 0"><td colspan="4" class="td text-center text-slate-400 py-6">{{ isAr ? 'لا إحالات بعد.' : 'No referrals yet.' }}</td></tr>
          <tr v-for="r in referrals" :key="r.id" class="border-t border-slate-100">
            <td class="td"><router-link :to="`/tenants/${r.referrer.id}`" class="font-semibold hover:text-orange-600">{{ r.referrer.name }}</router-link></td>
            <td class="td"><router-link :to="`/tenants/${r.referred.id}`" class="font-semibold hover:text-orange-600">{{ r.referred.name }}</router-link> <span class="text-xs text-slate-400">{{ r.referred.plan }}</span></td>
            <td class="td text-center text-xs">{{ new Date(r.createdAt).toLocaleDateString() }}</td>
            <td class="td text-center">
              <span v-if="r.status === 'REWARDED'" class="text-green-700 font-semibold text-xs">{{ isAr ? 'كوفئ' : 'Rewarded' }} {{ r.rewardAmount }} SAR</span>
              <span v-else class="text-amber-600 text-xs">{{ isAr ? 'بانتظار أول دفعة' : 'Waiting for first payment' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })

const PLANS = ['FREE', 'STARTER', 'ADVANCED', 'PRO', 'ENTERPRISE']
const blank = () => ({ code: '', type: 'PERCENT', value: '', maxUses: '', expiresAt: '', plans: [], firstInvoiceOnly: false, note: '' })
const form = ref(blank())
const coupons = ref([])
const referrals = ref([])
const reward = ref('')
const saving = ref(false)
const savingReward = ref(false)
const msg = ref('')
const msgErr = ref(false)
const say = (text, err = false) => { msg.value = text; msgErr.value = err }

const load = async () => {
  try {
    const [c, r] = await Promise.all([axios.get('/api/admin/coupons', auth()), axios.get('/api/admin/referrals', auth())])
    coupons.value = c.data.data
    referrals.value = r.data.data.referrals
    reward.value = r.data.data.rewardAmount || ''
  } catch (err) {
    say(err.response?.data?.message || 'Could not load', true)
  }
}

const create = async () => {
  saving.value = true
  try {
    await axios.post('/api/admin/coupons', { ...form.value, expiresAt: form.value.expiresAt ? `${form.value.expiresAt}T23:59:59` : null }, auth())
    say(isAr.value ? 'تم إنشاء الكوبون.' : 'Coupon created.')
    form.value = blank()
    load()
  } catch (err) {
    say(err.response?.data?.message || 'Could not create', true)
  } finally {
    saving.value = false
  }
}

const toggle = async (c) => {
  try {
    await axios.patch(`/api/admin/coupons/${c.id}`, { isActive: !c.isActive }, auth())
    c.isActive = !c.isActive
  } catch (err) {
    say(err.response?.data?.message || 'Could not update', true)
  }
}

const saveReward = async () => {
  savingReward.value = true
  try {
    await axios.put('/api/admin/referral-settings', { rewardAmount: reward.value === '' ? null : reward.value }, auth())
    say(isAr.value ? 'تم حفظ المكافأة.' : 'Reward saved.')
  } catch (err) {
    say(err.response?.data?.message || 'Could not save', true)
  } finally {
    savingReward.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
.card.p-0 { padding: 0; }
.f { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 700; color: #475569; }
.f input:not([type="checkbox"]), .f select { border: 1px solid #e2e8f0; border-radius: 10px; padding: 7px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: white; }
.chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 3px 10px; cursor: pointer; }
.btn { border: none; background: #ea580c; color: white; font-weight: 700; font-size: 13px; border-radius: 10px; padding: 9px 16px; cursor: pointer; }
.btn:disabled { opacity: .6; cursor: progress; }
.th { padding: 10px 12px; font-weight: 700; white-space: nowrap; }
.td { padding: 10px 12px; vertical-align: top; }
.toggle { border: none; border-radius: 999px; padding: 3px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
.toggle.on { background: #dcfce7; color: #15803d; }
.toggle.off { background: #f1f5f9; color: #64748b; }
</style>
