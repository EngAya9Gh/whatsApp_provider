<template>
  <div class="tenant-detail-page">
    <div class="page-header">
      <div class="header-left">
        <router-link to="/tenants" class="back-link">← Back to Tenants</router-link>
        <div v-if="tenant" class="title-row">
          <h1>{{ tenant.name }}</h1>
          <span class="status-badge" :class="tenant.isActive ? 'active' : 'disabled'">
            {{ tenant.isActive ? 'Active Account' : 'Disabled Account' }}
          </span>
        </div>
      </div>
      <div class="header-actions" v-if="tenant">
        <button @click="openInvoiceModal" class="btn-primary" style="margin-right: 1rem; padding: 0.75rem 1.5rem;">
          Generate Receipt
        </button>
        <button @click="toggleStatus" class="btn-toggle" :class="tenant.isActive ? 'btn-danger' : 'btn-success'">
          {{ tenant.isActive ? 'Disable Account' : 'Enable Account' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Loading tenant details...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else-if="tenant" class="content-grid">
      
      <!-- Left Column: Details & Plan -->
      <div class="col-left">
        <div class="panel">
          <h3>Account Information</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="label">Email</span>
              <span class="value">{{ tenant.email }}</span>
            </div>
            <div class="info-item">
              <span class="label">Joined</span>
              <span class="value">{{ new Date(tenant.createdAt).toLocaleString() }}</span>
            </div>
            <div class="info-item">
              <span class="label">WhatsApp Status</span>
              <span class="value session-status" :class="tenant.sessionStatus?.toLowerCase() || 'disconnected'">
                {{ tenant.sessionStatus || 'DISCONNECTED' }}
              </span>
            </div>
          </div>
        </div>

        <div class="panel">
          <h3>Subscription Plan</h3>
          <div class="plan-manager">
            <div class="current-plan">
              <div class="plan-label">Current Plan</div>
              <div class="badge" :class="tenant.plan.toLowerCase()">{{ tenant.plan }}</div>
              <div class="limit-info">Limit: {{ tenant.monthlyLimit }} messages/month</div>
            </div>
            <div class="change-plan">
              <label>Change Plan</label>
              <div class="plan-select-group">
                <select v-model="selectedPlan">
                  <option value="FREE">FREE (100)</option>
                  <option value="STARTER">STARTER (1,000)</option>
                  <option value="PRO">PRO (10,000)</option>
                  <option value="ENTERPRISE">ENTERPRISE (Unlimited)</option>
                </select>
                <button @click="updatePlan" class="btn-primary" :disabled="isUpdatingPlan || selectedPlan === tenant.plan">
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: API Keys & Usage -->
      <div class="col-right">
        <div class="panel">
          <h3>Invoices</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Cycle</th>
                <th>Status</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in tenant.invoices" :key="inv.id">
                <td>{{ new Date(inv.createdAt).toLocaleDateString() }}</td>
                <td>{{ inv.amount }}</td>
                <td>{{ inv.billingCycle }}</td>
                <td>
                  <select v-model="inv.status" @change="updateInvoiceStatus(inv.id, inv.status)" class="status-select" :class="inv.status.toLowerCase()">
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </td>
                <td>
                  <a :href="getInvoiceUrl(inv.id)" target="_blank" style="color: #FF6600; font-weight: 600; text-decoration: none;">View</a>
                </td>
              </tr>
              <tr v-if="!tenant.invoices?.length">
                <td colspan="4" class="empty-state">No invoices generated</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel">
          <h3>Recent Usage (Last 6 Months)</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Sent</th>
                <th>Failed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="usage in tenant.usageRecords" :key="usage.id">
                <td>{{ new Date(usage.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }}</td>
                <td class="success-text">{{ usage.messagesSent }}</td>
                <td class="danger-text">{{ usage.messagesFailed }}</td>
              </tr>
              <tr v-if="!tenant.usageRecords.length">
                <td colspan="3" class="empty-state">No usage records found</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel">
          <h3>API Keys</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Prefix</th>
                <th>Last Used</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in tenant.apiKeys" :key="key.id">
                <td>{{ key.label || 'Default' }}</td>
                <td><code>sk_{{ key.keyPrefix }}...</code></td>
                <td>{{ key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never' }}</td>
              </tr>
              <tr v-if="!tenant.apiKeys.length">
                <td colspan="3" class="empty-state">No API keys generated</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Invoice Modal -->
    <div v-if="showInvoiceModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Generate Payment Receipt</h3>
        <div class="form-group">
          <label>Amount</label>
          <input v-model="invoiceAmount" type="text" placeholder="e.g., $50.00 or 500 EGP" />
        </div>
        <div class="form-group">
          <label>Item / Package</label>
          <select v-model="selectedPackage" @change="onPackageChange" style="width: 100%; padding: 0.85rem; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 1rem; outline: none; margin-bottom: 0.5rem;">
            <option value="Subscription - FREE Plan">FREE Plan</option>
            <option value="Subscription - STARTER Plan">STARTER Plan</option>
            <option value="Subscription - PRO Plan">PRO Plan</option>
            <option value="Subscription - ENTERPRISE Plan">ENTERPRISE Plan</option>
            <option value="Custom">Custom (Enter manually)</option>
          </select>
          <input v-if="selectedPackage === 'Custom'" v-model="invoiceDescription" type="text" placeholder="Enter custom description..." style="margin-top: 0.5rem;" />
        </div>
        <div class="form-group">
          <label>Billing Cycle</label>
          <select v-model="billingCycle" style="width: 100%; padding: 0.85rem; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 1rem; outline: none;">
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
            <option value="One-time">One-time / Custom</option>
          </select>
        </div>
        <div class="modal-actions">
          <button @click="showInvoiceModal = false" class="btn-secondary">Cancel</button>
          <button @click="createInvoice" class="btn-primary" :disabled="isCreatingInvoice" style="padding: 0.85rem 1.5rem;">
            {{ isCreatingInvoice ? 'Creating...' : 'Create Invoice' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const tenant = ref(null)
const loading = ref(true)
const error = ref('')
const selectedPlan = ref('')
const isUpdatingPlan = ref(false)

// Invoice state
const showInvoiceModal = ref(false)
const invoiceAmount = ref('')
const invoiceDescription = ref('')
const selectedPackage = ref('Subscription - STARTER Plan')
const billingCycle = ref('Monthly')
const isCreatingInvoice = ref(false)

const onPackageChange = () => {
  if (selectedPackage.value !== 'Custom') {
    invoiceDescription.value = selectedPackage.value
  } else {
    invoiceDescription.value = ''
  }
}

const getInvoiceUrl = (id) => {
  const baseUrl = window.location.origin.replace('5174', '5173')
  return `${baseUrl}/invoice/${id}`
}

const openInvoiceModal = () => {
  const planDesc = `Subscription - ${tenant.value.plan} Plan`
  
  // Check if it's one of the standard plans
  const standardPlans = ['Subscription - FREE Plan', 'Subscription - STARTER Plan', 'Subscription - PRO Plan', 'Subscription - ENTERPRISE Plan']
  if (standardPlans.includes(planDesc)) {
    selectedPackage.value = planDesc
  } else {
    selectedPackage.value = 'Custom'
  }
  
  invoiceDescription.value = planDesc
  showInvoiceModal.value = true
}

const createInvoice = async () => {
  if (!invoiceAmount.value) {
    alert('Please enter an amount.')
    return
  }
  isCreatingInvoice.value = true
  
  try {
    const token = localStorage.getItem('admin_token')
    
    // Append billing cycle to description if not One-time
    const finalDescription = billingCycle.value === 'One-time' 
      ? invoiceDescription.value 
      : `${invoiceDescription.value} (${billingCycle.value})`
      
    const res = await axios.post(`/api/admin/tenants/${route.params.id}/invoices`, {
      amount: invoiceAmount.value,
      description: finalDescription,
      billingCycle: billingCycle.value
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const invoiceId = res.data.data.id
    const invoiceUrl = getInvoiceUrl(invoiceId)
    
    // Open the generated invoice in a new tab so the admin can see it before sharing
    window.open(invoiceUrl, '_blank')
    
    showInvoiceModal.value = false
    invoiceAmount.value = ''
    await fetchTenant() // Refresh to show the new invoice in the list
    
  } catch (err) {
    console.error('Error creating invoice:', err)
    alert('An error occurred while creating the invoice.')
  } finally {
    isCreatingInvoice.value = false
  }
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    alert('Invoice link copied to clipboard:\n' + text)
  }).catch(() => {
    prompt('Copy this invoice link:', text)
  })
}

const updateInvoiceStatus = async (id, status) => {
  try {
    const token = localStorage.getItem('admin_token')
    await axios.put(`/api/admin/invoices/${id}/status`, { status }, {
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch (err) {
    alert('Failed to update status')
    fetchTenant() // revert
  }
}

const fetchTenant = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.get(`/api/admin/tenants/${route.params.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    tenant.value = res.data.data
    selectedPlan.value = tenant.value.plan
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load tenant details.'
  } finally {
    loading.value = false
  }
}

const updatePlan = async () => {
  isUpdatingPlan.value = true
  try {
    const token = localStorage.getItem('admin_token')
    await axios.put(`/api/admin/tenants/${route.params.id}/plan`, 
      { plan: selectedPlan.value },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    await fetchTenant() // refresh data
    alert('Plan updated successfully!')
  } catch (err) {
    alert('Failed to update plan')
  } finally {
    isUpdatingPlan.value = false
  }
}

const toggleStatus = async () => {
  const action = tenant.value.isActive ? 'disable' : 'enable'
  if (!confirm(`Are you sure you want to ${action} this account?`)) return
  try {
    const token = localStorage.getItem('admin_token')
    await axios.put(`/api/admin/tenants/${route.params.id}/toggle`, 
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
    await fetchTenant()
  } catch (err) {
    alert('Failed to toggle status')
  }
}

onMounted(fetchTenant)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.back-link { display: inline-block; color: #64748B; font-size: 0.9rem; font-weight: 500; margin-bottom: 1rem; transition: color 0.2s; }
.back-link:hover { color: #FF6600; }
.title-row { display: flex; align-items: center; gap: 1rem; }
h1 { font-size: 2rem; font-weight: 800; color: #0F172A; }

.status-badge { padding: 0.35rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
.status-badge.active { background: #D1FAE5; color: #065F46; border: 1px solid #10B981; }
.status-badge.disabled { background: #FEE2E2; color: #991B1B; border: 1px solid #EF4444; }

.btn-toggle { padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 700; font-size: 0.9rem; border: none; cursor: pointer; transition: all 0.2s; }
.btn-danger { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
.btn-danger:hover { background: #DC2626; color: white; }
.btn-success { background: #F0FDF4; color: #166534; border: 1px solid #BBF7D0; }
.btn-success:hover { background: #166534; color: white; }

.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 1024px) { .content-grid { grid-template-columns: 1fr; } }

.panel { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 1.5rem; }
.panel h3 { font-size: 1.1rem; font-weight: 700; color: #0F172A; margin-bottom: 1.5rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 0.75rem; }

.info-list { display: flex; flex-direction: column; gap: 1rem; }
.info-item { display: flex; flex-direction: column; gap: 0.25rem; }
.info-item .label { color: #64748B; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.info-item .value { font-size: 1rem; color: #0F172A; font-weight: 500; }

.session-status { display: inline-block; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 6px; width: max-content; }
.session-status.connected { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
.session-status.disconnected { background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; }

.plan-manager { display: flex; flex-direction: column; gap: 1.5rem; }
.current-plan { background: #F8FAFC; padding: 1.25rem; border-radius: 12px; border: 1px solid #E2E8F0; }
.plan-label { color: #64748B; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; }
.limit-info { margin-top: 0.5rem; font-size: 0.85rem; color: #475569; }

.badge { display: inline-block; padding: 0.35rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 800; }
.badge.free { background: #F8FAFC; color: #64748B; }
.badge.starter { background: #EFF6FF; color: #3B82F6; }
.badge.pro { background: #FFF7ED; color: #FF6600; }
.badge.enterprise { background: #F5F3FF; color: #8B5CF6; }

.change-plan label { display: block; font-weight: 600; color: #334155; margin-bottom: 0.5rem; font-size: 0.9rem; }
.plan-select-group { display: flex; gap: 1rem; }
.plan-select-group select { flex: 1; padding: 0.75rem; border: 1px solid #E2E8F0; border-radius: 8px; font-family: inherit; font-size: 0.9rem; outline: none; }
.plan-select-group select:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.btn-primary { padding: 0 1.5rem; background: #FF6600; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-primary:hover:not(:disabled) { background: #cc5200; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 0.875rem 0.5rem; text-align: left; border-bottom: 1px solid #F1F5F9; font-size: 0.9rem; }
.data-table th { color: #64748B; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
.data-table tr:last-child td { border-bottom: none; }
code { background: #F8FAFC; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; color: #475569; }
.success-text { color: #10B981; font-weight: 600; }
.danger-text { color: #EF4444; font-weight: 600; }

.loading-state, .empty-state { text-align: center; padding: 3rem; color: #64748B; font-weight: 500; }
.error-msg { background: #FEF2F2; color: #DC2626; padding: 1rem; border-radius: 8px; }

/* Modal Styles */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
.modal-content { background: white; padding: 2.5rem; border-radius: 16px; width: 450px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.modal-content h3 { margin-bottom: 1.5rem; color: #0F172A; font-size: 1.4rem; font-weight: 800; }
.form-group { margin-bottom: 1.2rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; color: #475569; }
.form-group input { width: 100%; padding: 0.85rem; border: 1px solid #E2E8F0; border-radius: 10px; outline: none; font-size: 1rem; box-sizing: border-box; }
.form-group input:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
.btn-secondary { padding: 0.85rem 1.5rem; background: #F1F5F9; color: #475569; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-secondary:hover { background: #E2E8F0; color: #0F172A; }

/* Invoice Template Styles */
.invoice-template { width: 650px; padding: 50px; background: white; font-family: 'Inter', system-ui, sans-serif; color: #1E293B; box-sizing: border-box; }
.invoice-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F1F5F9; padding-bottom: 25px; margin-bottom: 35px; }
.invoice-header h2 { margin: 0; color: #0F172A; font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; }
.invoice-body { margin-bottom: 40px; }
.invoice-row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 1.2rem; }
.invoice-row .label { color: #64748B; font-weight: 600; }
.invoice-row .value { font-weight: 700; color: #0F172A; text-align: right; }
.invoice-separator { height: 2px; background: #F1F5F9; margin: 25px 0; }
.total-row { font-size: 1.6rem; margin-top: 20px; }
.total-row .label { color: #0F172A; font-weight: 800; }
.total-row .value { color: #FF6600; font-weight: 900; }
.invoice-footer { text-align: center; color: #94A3B8; font-size: 1.1rem; font-weight: 500; border-top: 2px solid #F1F5F9; padding-top: 25px; }
</style>
