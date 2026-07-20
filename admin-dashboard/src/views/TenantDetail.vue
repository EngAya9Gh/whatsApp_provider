<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
      <div>
        <router-link to="/tenants" class="inline-flex items-center gap-2 text-slate-500 hover:text-orange-500 font-semibold text-sm mb-4 transition-colors">
          &larr; Back to Tenants
        </router-link>
        <div v-if="tenant" class="flex items-center gap-4">
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight m-0">{{ tenant.name }}</h1>
          <span :class="tenant.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'" class="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border">
            {{ tenant.isActive ? 'Active Account' : 'Disabled Account' }}
          </span>
        </div>
      </div>
      
      <div class="flex items-center gap-3" v-if="tenant">
        <button @click="openInvoiceModal" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed border-none">
          Generate Receipt
        </button>
        <button @click="toggleStatus" :class="tenant.isActive ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-700 hover:text-white'" class="px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors cursor-pointer">
          {{ tenant.isActive ? 'Disable Account' : 'Enable Account' }}
        </button>
      </div>
    </div>

    <!-- State Messages -->
    <div v-if="loading" class="text-center py-12 text-slate-400 font-medium text-lg">Loading tenant details...</div>
    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg font-medium border border-red-100">{{ error }}</div>
    
    <!-- Main Content -->
    <div v-else-if="tenant" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Left Column -->
      <div class="lg:col-span-5 flex flex-col gap-6">
        
        <!-- Account Info Panel -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 class="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">Account Information</h3>
          <div class="flex flex-col gap-5">
            <div>
              <span class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</span>
              <span class="text-base font-medium text-slate-800">{{ tenant.email }}</span>
            </div>
            <div>
              <span class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Joined</span>
              <span class="text-base font-medium text-slate-800">{{ new Date(tenant.createdAt).toLocaleString() }}</span>
            </div>
            <div>
              <span class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">WhatsApp Status</span>
              <span :class="tenant.sessionStatus?.toLowerCase() === 'connected' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold">
                {{ tenant.sessionStatus || 'DISCONNECTED' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Subscription Panel -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 class="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">Subscription Plan</h3>
          <div class="flex flex-col gap-6">
            <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div class="text-xs font-bold text-slate-500 uppercase mb-3">Current Plan</div>
              <div class="inline-block px-4 py-1.5 rounded-full text-sm font-bold bg-blue-50 text-blue-600 mb-4 uppercase tracking-wide">
                {{ tenant.plan }}
              </div>
              <div class="text-sm font-medium text-slate-600">
                Limit: <span class="font-bold text-slate-800">{{ tenant.monthlyLimit }}</span> messages
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Change Plan</label>
              <div class="flex gap-3">
                <select v-model="selectedPlan" class="flex-1 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2.5 outline-none transition-all">
                  <option v-for="p in dbPlans" :key="p.planCode" :value="p.planCode">
                    {{ p.planCode }} ({{ p.limit === 0 || p.limit > 100000 ? 'Unlimited/Custom' : p.limit.toLocaleString() }})
                  </option>
                </select>
                <button @click="updatePlan" :disabled="isUpdatingPlan || selectedPlan === tenant.plan" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Settings Panel -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 class="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">Custom Settings</h3>
          <div class="flex flex-col gap-5">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Monthly Message Limit</label>
              <input type="number" v-model="settingsForm.monthlyLimit" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2.5 outline-none transition-all" />
            </div>
            
            <div class="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <input type="checkbox" v-model="settingsForm.metaEnabled" id="metaToggle" class="w-5 h-5 text-orange-500 bg-white border-slate-300 rounded focus:ring-orange-500 focus:ring-2 accent-orange-500 cursor-pointer" />
              <label for="metaToggle" class="font-semibold text-slate-700 text-sm cursor-pointer select-none">Enable Meta Cloud Features</label>
            </div>
            
            <div>
              <button @click="updateSettings" :disabled="isUpdatingSettings" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
                {{ isUpdatingSettings ? 'Saving...' : 'Save Settings' }}
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column -->
      <div class="lg:col-span-7 flex flex-col gap-6">
        
        <!-- Invoices Panel -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 overflow-hidden">
          <h3 class="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">Invoices</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left text-slate-600 border-collapse">
              <thead class="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th scope="col" class="px-4 py-3 rounded-l-lg font-bold">Date</th>
                  <th scope="col" class="px-4 py-3 font-bold">Amount</th>
                  <th scope="col" class="px-4 py-3 font-bold">Cycle</th>
                  <th scope="col" class="px-4 py-3 font-bold">Status</th>
                  <th scope="col" class="px-4 py-3 rounded-r-lg font-bold">Link</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in tenant.invoices" :key="inv.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td class="px-4 py-3 whitespace-nowrap">{{ new Date(inv.createdAt).toLocaleDateString() }}</td>
                  <td class="px-4 py-3 font-medium text-slate-800">{{ inv.amount }}</td>
                  <td class="px-4 py-3">{{ inv.billingCycle }}</td>
                  <td class="px-4 py-3">
                    <select v-model="inv.status" @change="updateInvoiceStatus(inv.id, inv.status)" :class="{'text-amber-600': inv.status === 'PENDING', 'text-green-600': inv.status === 'PAID', 'text-red-600': inv.status === 'CANCELLED'}" class="bg-white border border-slate-200 text-xs rounded-md focus:ring-1 focus:ring-slate-300 block w-full p-1.5 outline-none font-bold">
                      <option value="PENDING" class="text-amber-600">PENDING</option>
                      <option value="PAID" class="text-green-600">PAID</option>
                      <option value="CANCELLED" class="text-red-600">CANCELLED</option>
                    </select>
                  </td>
                  <td class="px-4 py-3">
                    <a :href="getInvoiceUrl(inv.id)" target="_blank" class="font-semibold text-orange-500 hover:text-orange-600 no-underline">View</a>
                  </td>
                </tr>
                <tr v-if="!tenant.invoices?.length">
                  <td colspan="5" class="px-4 py-8 text-center text-slate-400 font-medium">No invoices generated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Usage Panel -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 overflow-hidden">
          <h3 class="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">Recent Usage <span class="text-sm font-normal text-slate-400 ml-2">(Last 6 Months)</span></h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left text-slate-600 border-collapse">
              <thead class="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th scope="col" class="px-4 py-3 rounded-l-lg font-bold">Month</th>
                  <th scope="col" class="px-4 py-3 font-bold">Sent</th>
                  <th scope="col" class="px-4 py-3 rounded-r-lg font-bold">Failed</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="usage in tenant.usageRecords" :key="usage.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td class="px-4 py-3 font-medium text-slate-800">{{ new Date(usage.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }}</td>
                  <td class="px-4 py-3 font-bold text-green-600">{{ usage.messagesSent }}</td>
                  <td class="px-4 py-3 font-bold text-red-600">{{ usage.messagesFailed }}</td>
                </tr>
                <tr v-if="!tenant.usageRecords.length">
                  <td colspan="3" class="px-4 py-8 text-center text-slate-400 font-medium">No usage records found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- API Keys Panel -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 overflow-hidden">
          <h3 class="text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100">API Keys</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left text-slate-600 border-collapse">
              <thead class="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th scope="col" class="px-4 py-3 rounded-l-lg font-bold">Label</th>
                  <th scope="col" class="px-4 py-3 font-bold">Prefix</th>
                  <th scope="col" class="px-4 py-3 rounded-r-lg font-bold">Last Used</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="key in tenant.apiKeys" :key="key.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td class="px-4 py-3 font-medium text-slate-800">{{ key.label || 'Default' }}</td>
                  <td class="px-4 py-3"><code class="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">sk_{{ key.keyPrefix }}...</code></td>
                  <td class="px-4 py-3">{{ key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never' }}</td>
                </tr>
                <tr v-if="!tenant.apiKeys.length">
                  <td colspan="3" class="px-4 py-8 text-center text-slate-400 font-medium">No API keys generated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- Invoice Modal -->
    <div v-if="showInvoiceModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
        <h3 class="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight mt-0">Generate Receipt</h3>
        
        <div class="mb-5">
          <label class="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
          <input v-model="invoiceAmount" type="text" placeholder="e.g., $50.00 or 500 EGP" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-3 outline-none transition-all" />
        </div>
        
        <div class="mb-5">
          <label class="block text-sm font-semibold text-slate-700 mb-2">Item / Package</label>
          <select v-model="selectedPackage" @change="onPackageChange" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-3 outline-none transition-all mb-3">
            <option value="Subscription - FREE Plan">FREE Plan</option>
            <option value="Subscription - STARTER Plan">STARTER Plan</option>
            <option value="Subscription - PRO Plan">PRO Plan</option>
            <option value="Subscription - ENTERPRISE Plan">ENTERPRISE Plan</option>
            <option value="Custom">Custom (Enter manually)</option>
          </select>
          <input v-if="selectedPackage === 'Custom'" v-model="invoiceDescription" type="text" placeholder="Enter custom description..." class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-3 outline-none transition-all" />
        </div>
        
        <div class="mb-8">
          <label class="block text-sm font-semibold text-slate-700 mb-2">Billing Cycle</label>
          <select v-model="billingCycle" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-3 outline-none transition-all">
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
            <option value="One-time">One-time / Custom</option>
          </select>
        </div>
        
        <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button @click="showInvoiceModal = false" class="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border-none cursor-pointer">Cancel</button>
          <button @click="createInvoice" :disabled="isCreatingInvoice" class="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50">
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
const error = ref(null)
const selectedPlan = ref('')
const isUpdatingPlan = ref(false)
const isUpdatingSettings = ref(false)

const dbPlans = ref([])

const settingsForm = ref({
  monthlyLimit: 0,
  metaEnabled: false
})

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
    
    // Also fetch available plans from DB
    const plansRes = await axios.get('/api/plans', {
      headers: { Authorization: `Bearer ${token}` }
    })
    dbPlans.value = plansRes.data.data

    tenant.value = res.data.data
    selectedPlan.value = tenant.value.plan
    settingsForm.value.monthlyLimit = tenant.value.monthlyLimit
    settingsForm.value.metaEnabled = tenant.value.metaEnabled
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

const updateSettings = async () => {
  isUpdatingSettings.value = true
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.put(`/api/admin/tenants/${tenant.value.id}/settings`, {
      monthlyLimit: settingsForm.value.monthlyLimit,
      metaEnabled: settingsForm.value.metaEnabled
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    tenant.value.monthlyLimit = res.data.data.monthlyLimit
    tenant.value.metaEnabled = res.data.data.metaEnabled
    alert('Settings updated successfully')
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to update settings')
  } finally {
    isUpdatingSettings.value = false
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


