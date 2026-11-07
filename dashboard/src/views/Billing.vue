<template>
  <div class="billing-container" :dir="isAr ? 'rtl' : 'ltr'">
    <h2>{{ isAr ? 'الاستهلاك والفواتير' : 'Usage & Billing' }}</h2>

    <!-- Wallet -->
    <div class="plan-card wallet-card" v-if="wallet">
      <div class="wallet-head">
        <div>
          <label>{{ isAr ? 'رصيد المحفظة' : 'Wallet balance' }}</label>
          <div class="wallet-balance"><span dir="ltr">{{ money(wallet.balance) }}</span> <small>{{ wallet.currency }}</small></div>
        </div>
        <div class="wallet-spent">
          <label>{{ isAr ? 'المصروف هذا الشهر' : 'Spent this month' }}</label>
          <div class="wallet-spent-value"><span dir="ltr">{{ money(wallet.spentThisMonth) }}</span> <small>{{ wallet.currency }}</small></div>
        </div>
      </div>
      <p v-if="!wallet.chargesEnabled" class="wallet-note">
        {{ isAr ? 'حملاتك لا تُخصم من المحفظة حالياً.' : 'Your campaigns are not charged to the wallet at the moment.' }}
      </p>

      <div class="wallet-history-head">
        <h4>{{ isAr ? 'سجل المحفظة' : 'Wallet history' }}</h4>
        <select v-model="txType" @change="loadTransactions(true)" class="wallet-filter">
          <option value="">{{ isAr ? 'كل العمليات' : 'All activity' }}</option>
          <option v-for="(label, key) in typeLabels" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <table class="invoices-table wallet-table" v-if="transactions.length > 0">
        <thead>
          <tr>
            <th>{{ isAr ? 'التاريخ' : 'Date' }}</th>
            <th>{{ isAr ? 'العملية' : 'Type' }}</th>
            <th>{{ isAr ? 'التفاصيل' : 'Details' }}</th>
            <th>{{ isAr ? 'المبلغ' : 'Amount' }}</th>
            <th>{{ isAr ? 'الرصيد بعدها' : 'Balance after' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in transactions" :key="tx.id">
            <td class="nowrap">{{ formatDate(tx.createdAt) }}</td>
            <td><span class="tx-type" :class="tx.amount >= 0 ? 'in' : 'out'">{{ typeLabels[tx.type] || tx.type }}</span></td>
            <td>
              <router-link v-if="tx.referenceType === 'CAMPAIGN' && tx.referenceId" :to="`/campaigns/${tx.referenceId}`" class="view-link">{{ tx.description || (isAr ? 'عرض الحملة' : 'View campaign') }}</router-link>
              <span v-else>{{ tx.description || '—' }}</span>
            </td>
            <td class="amount nowrap" :class="tx.amount >= 0 ? 'positive' : 'negative'" dir="ltr">{{ tx.amount >= 0 ? '+' : '−' }}{{ money(Math.abs(tx.amount)) }}</td>
            <td class="nowrap" dir="ltr">{{ money(tx.balanceAfter) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">{{ isAr ? 'لا توجد عمليات بعد.' : 'No wallet activity yet.' }}</div>
      <button v-if="page < pages" class="load-more" :disabled="loadingMore" @click="loadTransactions(false)">
        {{ loadingMore ? '…' : (isAr ? 'عرض المزيد' : 'Load more') }}
      </button>
    </div>

    <div class="plan-card" v-if="usage">
      <h3>{{ isAr ? 'الباقة الحالية:' : 'Current Plan:' }} <span>{{ usage.plan }}</span></h3>
      
      <div class="progress-section">
        <div class="progress-labels">
          <span>{{ isAr ? 'الرسائل المرسلة' : 'Messages Sent' }}</span>
          <span dir="ltr">{{ usage.messagesSent }} / {{ usage.unlimited ? '∞' : usage.monthlyLimit }}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: progressPercentage + '%' }" :class="{ 'warning': progressPercentage > 80, 'danger': progressPercentage >= 100 }"></div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat">
          <label>{{ isAr ? 'رسائل فاشلة' : 'Failed Deliveries' }}</label>
          <div class="value failed">{{ usage.messagesFailed }}</div>
        </div>
        <div class="stat">
          <label>{{ isAr ? 'المتبقي' : 'Remaining' }}</label>
          <div class="value">{{ usage.unlimited ? '∞' : usage.remaining }}</div>
        </div>
      </div>
    </div>

    <div class="plan-card" style="margin-top: 2rem; max-width: 800px;">
      <h3>{{ isAr ? 'فواتيرك' : 'Your Invoices' }}</h3>
      <table class="invoices-table" v-if="invoices.length > 0">
        <thead>
          <tr>
            <th>{{ isAr ? 'التاريخ' : 'Date' }}</th>
            <th>{{ isAr ? 'الوصف' : 'Description' }}</th>
            <th>{{ isAr ? 'الدورة' : 'Cycle' }}</th>
            <th>{{ isAr ? 'المبلغ' : 'Amount' }}</th>
            <th>{{ isAr ? 'الحالة' : 'Status' }}</th>
            <th>{{ isAr ? 'إجراء' : 'Action' }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in invoices" :key="inv.id">
            <td>{{ new Date(inv.createdAt).toLocaleDateString() }}</td>
            <td>{{ inv.description }}</td>
            <td>{{ inv.billingCycle }}</td>
            <td class="amount">{{ inv.amount }}</td>
            <td>
              <span class="status-badge" :class="inv.status.toLowerCase()">{{ inv.status }}</span>
            </td>
            <td>
              <router-link :to="`/invoice/${inv.id}`" class="view-link" target="_blank">{{ isAr ? 'عرض الإيصال' : 'View Receipt' }}</router-link>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        {{ isAr ? 'لا توجد فواتير.' : 'No invoices found.' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const usage = ref(null)
const invoices = ref([])

// ─── Wallet ───────────────────────────────────────────────────
const wallet = ref(null)
const transactions = ref([])
const txType = ref('')
const page = ref(1)
const pages = ref(1)
const loadingMore = ref(false)

const typeLabels = computed(() => ({
  TOP_UP: isAr.value ? 'شحن رصيد' : 'Top-up',
  CAMPAIGN_CHARGE: isAr.value ? 'تكلفة حملة' : 'Campaign charge',
  REFUND: isAr.value ? 'استرجاع' : 'Refund',
  ADMIN_DEDUCTION: isAr.value ? 'خصم من الإدارة' : 'Admin deduction',
  ADMIN_SET: isAr.value ? 'تعديل الرصيد' : 'Balance adjustment'
}))

const moneyFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const money = (n) => moneyFormat.format(Number(n) || 0)
const formatDate = (iso) => new Intl.DateTimeFormat(isAr.value ? 'ar-u-nu-latn-ca-gregory' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

const loadTransactions = async (reset) => {
  const next = reset ? 1 : page.value + 1
  loadingMore.value = true
  try {
    const res = await axios.get('/api/billing/wallet/transactions', { params: { page: next, limit: 20, type: txType.value || undefined } })
    const data = res.data.data
    transactions.value = reset ? data.transactions : [...transactions.value, ...data.transactions]
    page.value = data.pagination.page
    pages.value = data.pagination.pages
  } catch (err) {
    console.error('Failed to load wallet history')
  } finally {
    loadingMore.value = false
  }
}

onMounted(async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/billing/usage', {
      headers: { Authorization: `Bearer ${token}` }
    })
    usage.value = res.data.data
  } catch (err) {
    console.error('Failed to load usage')
  }

  try {
    const walletRes = await axios.get('/api/billing/wallet', {
      headers: { Authorization: `Bearer ${token}` }
    })
    wallet.value = walletRes.data.data
    await loadTransactions(true)
  } catch (err) {
    console.error('Failed to load wallet')
  }

  try {
    const invRes = await axios.get('/api/billing/invoices', {
      headers: { Authorization: `Bearer ${token}` }
    })
    invoices.value = invRes.data.data
  } catch (err) {
    console.error('Failed to load invoices')
  }
})

const progressPercentage = computed(() => {
  if (!usage.value) return 0
  if (usage.value.unlimited || !usage.value.monthlyLimit) return 0
  return Math.min(100, (usage.value.messagesSent / usage.value.monthlyLimit) * 100)
})
</script>

<style scoped>
.plan-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 1.5rem; max-width: 800px; }
h3 { margin-top: 0; color: #1E293B; }
h3 span { color: #3b82f6; }
.progress-section { margin: 2rem 0; }
.progress-labels { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 500; }
.progress-bar-bg { background: #e5e7eb; height: 12px; border-radius: 9999px; overflow: hidden; }
.progress-bar-fill { background: #10b981; height: 100%; transition: width 0.3s ease; }
.progress-bar-fill.warning { background: #f59e0b; }
.progress-bar-fill.danger { background: #ef4444; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid #e5e7eb; padding-top: 1.5rem; }
.stat label { color: #6b7280; font-size: 0.875rem; }
.stat .value { font-size: 1.5rem; font-weight: bold; color: #111827; }
.stat .value.failed { color: #ef4444; }

.invoices-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
.invoices-table th, .invoices-table td { padding: 1rem; text-align: start; border-bottom: 1px solid #e5e7eb; }
.invoices-table th { color: #6b7280; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; }
.invoices-table .amount { font-weight: 700; color: #111827; }
.status-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
.status-badge.pending { background: #fef3c7; color: #d97706; }
.status-badge.paid { background: #d1fae5; color: #059669; }
.view-link { color: #3b82f6; text-decoration: none; font-weight: 600; font-size: 0.875rem; }
.view-link:hover { text-decoration: underline; }
.empty-state { text-align: center; color: #6b7280; padding: 2rem 0; font-style: italic; }

.wallet-card { max-width: 800px; }
.wallet-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1.5rem; flex-wrap: wrap; }
.wallet-head label { color: #6b7280; font-size: 0.875rem; display: block; }
.wallet-balance { font-size: 2.2rem; font-weight: 800; color: #111827; line-height: 1.2; }
.wallet-balance small, .wallet-spent-value small { font-size: 0.9rem; font-weight: 600; color: #6b7280; }
.wallet-spent-value { font-size: 1.4rem; font-weight: 700; color: #374151; }
.wallet-note { margin: 1rem 0 0; font-size: 0.85rem; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 0.6rem 0.9rem; }
.wallet-history-head { display: flex; justify-content: space-between; align-items: center; margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid #e5e7eb; }
.wallet-history-head h4 { margin: 0; color: #1E293B; }
.wallet-filter { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.4rem 0.7rem; font-size: 0.85rem; background: white; }
.wallet-table th, .wallet-table td { padding: 0.75rem 0.6rem; text-align: start; }
.wallet-table .nowrap, .nowrap { white-space: nowrap; }
.wallet-table .amount.positive { color: #047857; }
.wallet-table .amount.negative { color: #b91c1c; }
.tx-type { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
.tx-type.in { background: #d1fae5; color: #059669; }
.tx-type.out { background: #f3f4f6; color: #4b5563; }
.load-more { display: block; margin: 1rem auto 0; background: #f3f4f6; border: none; border-radius: 8px; padding: 0.5rem 1.4rem; font-weight: 600; color: #374151; cursor: pointer; }
.load-more:hover { background: #e5e7eb; }
</style>
