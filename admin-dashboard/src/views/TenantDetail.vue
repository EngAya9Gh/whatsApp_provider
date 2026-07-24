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
        <button @click="openPasswordModal" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 border-none cursor-pointer">
          Reset Password
        </button>
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

            <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label class="block text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-2">Custom Feature Overrides</label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="feat in availableFeatures" :key="feat" class="flex flex-col gap-1">
                  <span class="text-xs font-bold text-slate-600">{{ feat }}</span>
                  <select v-model="settingsForm.customFeatures[feat]" class="bg-white border border-slate-300 text-slate-700 text-xs rounded p-1.5 outline-none">
                    <option :value="null">Default (From Plan)</option>
                    <option :value="true">Always Enabled</option>
                    <option :value="false">Always Disabled</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label class="block text-sm font-semibold text-slate-700 mb-2">Tenant Currency</label>
              <select v-model="settingsForm.currency" class="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2 outline-none">
                <option value="SAR">Saudi Riyal (SAR)</option>
                <option value="USD">US Dollar (USD)</option>
              </select>
            </div>
            
            <div>
              <button @click="updateSettings" :disabled="isUpdatingSettings" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
                {{ isUpdatingSettings ? 'Saving...' : 'Save Settings' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Meta Configuration Panel -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200" v-if="settingsForm.metaEnabled || (tenant.channels && tenant.channels.length > 0)">
          <div class="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
            <h3 class="text-lg font-bold text-slate-900 m-0">Meta Channels</h3>
            <button v-if="!showMetaForm" @click="openMetaForm()" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-bold border-none cursor-pointer transition-colors">
              + Add Channel
            </button>
          </div>
          
          <div v-if="!showMetaForm">
            <div v-if="tenant.channels && tenant.channels.length > 0" class="flex flex-col gap-3">
              <div v-for="channel in tenant.channels" :key="channel.id" class="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                <div>
                  <div class="font-bold text-slate-800">{{ channel.displayPhoneNumber }} <span class="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{{ channel.phoneNumber }}</span></div>
                  <div class="text-xs text-slate-500 mt-1">ID: {{ channel.metaPhoneNumberId }} | WABA: {{ channel.metaWabaId }}</div>
                </div>
                <button @click="openMetaForm(channel)" class="text-emerald-600 font-bold text-sm bg-transparent border-none cursor-pointer hover:underline">Edit</button>
              </div>
            </div>
            <div v-else class="text-center py-6 text-slate-500 text-sm">
              No Meta channels configured for this tenant.
            </div>
          </div>

          <div v-if="showMetaForm" class="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Display Phone Number</label>
              <input type="text" v-model="metaForm.displayPhoneNumber" placeholder="e.g. +966 500 000 000" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Actual Phone Number (with Country Code)</label>
              <input type="text" v-model="metaForm.phoneNumber" placeholder="e.g. 966500000000" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Phone Number ID</label>
              <input type="text" v-model="metaForm.metaPhoneNumberId" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">WABA ID</label>
              <input type="text" v-model="metaForm.metaWabaId" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Permanent Access Token</label>
              <input type="password" v-model="metaForm.metaAccessToken" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">App Secret</label>
              <input type="password" v-model="metaForm.metaAppSecret" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2 outline-none" />
            </div>
            
            <div class="flex gap-3 mt-2">
              <button @click="saveMetaConfig" :disabled="isSavingMeta" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50">
                {{ isSavingMeta ? 'Saving...' : 'Save Meta Channel' }}
              </button>
              <button @click="showMetaForm = false" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold border-none cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column -->
      <div class="lg:col-span-7 flex flex-col gap-6">
        
        <!-- Wallet Management Panel -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 overflow-hidden">
          <div class="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-900 m-0">Wallet Management</h3>
            <div class="text-lg font-bold">
              Current Balance: <span class="text-[#FF6600]">{{ tenant.walletBalance || 0 }} {{ tenant.currency || 'SAR' }}</span>
            </div>
          </div>
          <div class="flex items-end gap-3">
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 mb-1">Amount</label>
              <input type="number" step="0.01" v-model="walletForm.amount" placeholder="e.g. 50.00" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2 outline-none" />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 mb-1">Action</label>
              <select v-model="walletForm.action" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2 outline-none">
                <option value="ADD">Add Funds</option>
                <option value="DEDUCT">Deduct Funds</option>
                <option value="SET">Set Balance To</option>
              </select>
            </div>
            <button @click="updateWallet" :disabled="isUpdatingWallet" class="bg-[#FF6600] hover:bg-[#e65c00] text-white px-6 py-2 rounded-lg font-semibold shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50">
              {{ isUpdatingWallet ? 'Updating...' : 'Update' }}
            </button>
          </div>
        </div>

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

    <!-- Invoice Modal (Dynamic Items) -->
    <div v-if="showInvoiceModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl p-8 w-full max-w-4xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <h3 class="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight mt-0">Generate Receipt</h3>
        
        <div v-if="loadingUnbilled" class="text-center py-8 text-slate-500">
          Calculating unbilled usage & applying margins...
        </div>

        <div v-else>
          <div class="mb-5 flex justify-between items-end gap-4">
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 mb-2">Billing Cycle</label>
              <select v-model="billingCycle" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-2.5 outline-none transition-all">
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="One-time">One-time / Custom</option>
              </select>
            </div>
            <button @click="addInvoiceItem" class="px-4 py-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border-none cursor-pointer">
              + Add Manual Item
            </button>
          </div>

          <!-- Items Table -->
          <div class="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-50 text-slate-600">
                <tr>
                  <th class="px-3 py-2">Item Name</th>
                  <th class="px-3 py-2">Description</th>
                  <th class="px-3 py-2 w-24">Qty</th>
                  <th class="px-3 py-2 w-32">Price (Rate)</th>
                  <th class="px-3 py-2 w-24">Total</th>
                  <th class="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in invoiceItems" :key="item.id" class="border-t border-slate-100">
                  <td class="px-3 py-2">
                    <input v-model="item.name" class="w-full border border-slate-200 rounded p-1.5 text-sm" placeholder="Item Name"/>
                  </td>
                  <td class="px-3 py-2">
                    <input v-model="item.description" class="w-full border border-slate-200 rounded p-1.5 text-sm" placeholder="Description"/>
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="item.qty" type="number" min="1" class="w-full border border-slate-200 rounded p-1.5 text-sm" @input="updateItemTotal(item)"/>
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="item.rate" type="number" step="0.0001" class="w-full border border-slate-200 rounded p-1.5 text-sm" @input="updateItemTotal(item)"/>
                  </td>
                  <td class="px-3 py-2 font-mono font-medium text-slate-700">
                    {{ parseFloat(item.total).toFixed(2) }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button @click="removeInvoiceItem(index)" class="text-red-500 hover:text-red-700 font-bold border-none bg-transparent cursor-pointer p-1">×</button>
                  </td>
                </tr>
                <tr v-if="!invoiceItems.length">
                  <td colspan="6" class="px-3 py-4 text-center text-slate-400">No items added.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Summary -->
          <div class="flex justify-end mb-8">
            <div class="w-64 space-y-2 text-sm">
              <div class="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span class="font-mono">{{ invoiceSubtotal.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>VAT ({{ taxRate }}%):</span>
                <span class="font-mono">{{ invoiceTaxAmount.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between font-bold text-lg text-slate-900 border-t border-slate-200 pt-2">
                <span>Total:</span>
                <span class="font-mono">{{ invoiceGrandTotal.toFixed(2) }}</span>
              </div>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button @click="showInvoiceModal = false" class="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border-none cursor-pointer">Cancel</button>
            <button @click="createInvoice" :disabled="isCreatingInvoice || !invoiceItems.length" class="px-6 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50">
              {{ isCreatingInvoice ? 'Creating...' : 'Create Invoice' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div v-if="showPasswordModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
        <h3 class="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight mt-0">Reset Password</h3>
        <p class="text-sm text-slate-500 mb-6">Set a new login password for {{ tenant?.name }}.</p>
        
        <div class="mb-6">
          <label class="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
          <div class="relative">
            <input v-model="newPassword" :type="showPasswordText ? 'text' : 'password'" placeholder="At least 6 characters..." class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block w-full p-3 pr-24 outline-none transition-all" />
            <button @click="generateRandomPassword" type="button" class="absolute right-2 top-2 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded transition-colors border-none cursor-pointer">
              Generate
            </button>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <input type="checkbox" v-model="showPasswordText" id="toggleShowPass" class="cursor-pointer accent-orange-500" />
            <label for="toggleShowPass" class="text-xs text-slate-600 cursor-pointer select-none">Show password</label>
          </div>
        </div>
        
        <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button @click="showPasswordModal = false" class="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border-none cursor-pointer">Cancel</button>
          <button @click="resetPassword" :disabled="isResettingPassword || !newPassword || newPassword.length < 6" class="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50">
            {{ isResettingPassword ? 'Updating...' : 'Save New Password' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const tenant = ref(null)
const loading = ref(true)
const error = ref(null)
const selectedPlan = ref('')
const isUpdatingPlan = ref(false)
const isUpdatingSettings = ref(false)
const isSavingMeta = ref(false)
const showMetaForm = ref(false)

const dbPlans = ref([])

const settingsForm = ref({
  monthlyLimit: 20,
  metaEnabled: false,
  customFeatures: {},
  currency: 'SAR'
})

const metaForm = ref({
  displayPhoneNumber: '',
  phoneNumber: '',
  metaPhoneNumberId: '',
  metaWabaId: '',
  metaAccessToken: '',
  metaAppSecret: ''
})

const walletForm = ref({
  amount: '',
  action: 'ADD'
})
const isUpdatingWallet = ref(false)

const availableFeatures = ['META_CAMPAIGN', 'BAILEYS_CAMPAIGN', 'META_SEND_MESSAGE', 'BAILEYS_SEND_MESSAGE', 'META_AUTORESPONDER', 'BAILEYS_AUTORESPONDER', 'META_TEMPLATES', 'TEMPLATES', 'LIVE_CHAT', 'EXCEL_EXPORT', 'API_ACCESS']

// Removed old invoice state, using dynamic state below

// Password reset state
const showPasswordModal = ref(false)
const newPassword = ref('')
const showPasswordText = ref(false)
const isResettingPassword = ref(false)

const openPasswordModal = () => {
  newPassword.value = ''
  showPasswordText.value = false
  showPasswordModal.value = true
}

const generateRandomPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'
  let pass = ''
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  newPassword.value = pass
  showPasswordText.value = true
}

const resetPassword = async () => {
  if (!newPassword.value || newPassword.value.length < 6) {
    alert('Password must be at least 6 characters.')
    return
  }
  isResettingPassword.value = true
  try {
    const token = localStorage.getItem('admin_token')
    await axios.put(`/api/admin/tenants/${route.params.id}/password`, {
      newPassword: newPassword.value
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    alert('Password updated successfully!')
    showPasswordModal.value = false
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to update password.')
  } finally {
    isResettingPassword.value = false
  }
}


// Dynamic Invoice State
const showInvoiceModal = ref(false)
const billingCycle = ref('Monthly')
const isCreatingInvoice = ref(false)
const loadingUnbilled = ref(false)
const invoiceItems = ref([])
const taxRate = ref(15.0)

const invoiceSubtotal = computed(() => {
  return invoiceItems.value.reduce((sum, item) => sum + parseFloat(item.total || 0), 0)
})

const invoiceTaxAmount = computed(() => {
  return invoiceSubtotal.value * (taxRate.value / 100)
})

const invoiceGrandTotal = computed(() => {
  return invoiceSubtotal.value + invoiceTaxAmount.value
})

const updateItemTotal = (item) => {
  item.total = (parseFloat(item.qty || 0) * parseFloat(item.rate || 0)).toFixed(2)
}

const addInvoiceItem = () => {
  invoiceItems.value.push({
    id: 'man-' + Date.now(),
    name: '',
    description: '',
    qty: 1,
    rate: 0,
    total: '0.00'
  })
}

const removeInvoiceItem = (index) => {
  invoiceItems.value.splice(index, 1)
}

const getInvoiceUrl = (id) => {
  const host = window.location.hostname
  const port = host === 'localhost' || host === '127.0.0.1' ? ':5173' : ''
  const protocol = window.location.protocol
  return `${protocol}//${host}${port}/invoice/${id}`
}

const updateWallet = async () => {
  if (!walletForm.value.amount || walletForm.value.amount <= 0) {
    return alert('Please enter a valid amount');
  }
  
  if (!confirm(`Are you sure you want to ${walletForm.value.action} ${walletForm.value.amount} to this tenant's wallet?`)) return;

  try {
    isUpdatingWallet.value = true
    const token = localStorage.getItem('admin_token')
    await axios.put(`/api/admin/tenants/${route.params.id}/wallet`, {
      amount: walletForm.value.amount,
      action: walletForm.value.action
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // Refresh tenant data to see new balance
    await fetchTenant()
    
    walletForm.value.amount = ''
    walletForm.value.action = 'ADD'
    alert('Wallet updated successfully!')
  } catch (err) {
    console.error('Failed to update wallet:', err)
    alert('Failed to update wallet')
  } finally {
    isUpdatingWallet.value = false
  }
}

// Generate Invoice Logic
const openInvoiceModal = async () => {
  showInvoiceModal.value = true
  loadingUnbilled.value = true
  invoiceItems.value = []
  
  try {
    const token = localStorage.getItem('admin_token')
    
    // Fetch global settings for tax rate
    const settingsRes = await axios.get('/api/admin/settings', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (settingsRes.data?.data?.data?.taxRate !== undefined) {
      taxRate.value = parseFloat(settingsRes.data.data.data.taxRate)
    }

    // Fetch unbilled usage
    const usageRes = await axios.get(`/api/admin/tenants/${route.params.id}/unbilled-usage`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (usageRes.data.success && usageRes.data.data.length > 0) {
      invoiceItems.value = usageRes.data.data
    } else {
      addInvoiceItem() // Add one blank item if no usage
    }
  } catch (err) {
    console.error('Failed to fetch unbilled usage', err)
    addInvoiceItem()
  } finally {
    loadingUnbilled.value = false
  }
}

const createInvoice = async () => {
  if (!invoiceItems.value.length) {
    alert('Please add at least one item.')
    return
  }
  isCreatingInvoice.value = true
  
  try {
    const token = localStorage.getItem('admin_token')
    
    // Generate brief description for backwards compatibility
    const itemNames = invoiceItems.value.map(i => i.name).join(', ')
    const description = billingCycle.value === 'One-time' ? itemNames : `${itemNames} (${billingCycle.value})`
      
    // Create the final payload
    const payload = {
      amount: invoiceGrandTotal.value.toFixed(2),
      description: description,
      billingCycle: billingCycle.value,
      status: 'UNPAID',
      items: invoiceItems.value,
      taxRate: taxRate.value,
      taxAmount: invoiceTaxAmount.value.toFixed(2)
      // buyerDetails & sellerDetails can be filled by backend, but we'll let service handle seller, or we fetch it here.
      // Actually, admin.service.js doesn't auto-fetch sellerDetails in createInvoice. Let's fix that in service.
    }

    const res = await axios.post(`/api/admin/tenants/${route.params.id}/invoices`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const invoiceId = res.data.data.id
    const invoiceUrl = getInvoiceUrl(invoiceId)
    
    // Use proper base URL replacement or routing
    window.open(invoiceUrl, '_blank')
    
    showInvoiceModal.value = false
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
    
    const data = tenant.value
    const populated = {}
    const currentFeatures = data.customFeatures || {}
    availableFeatures.forEach(f => {
      populated[f] = currentFeatures[f] !== undefined ? currentFeatures[f] : null
    })

    settingsForm.value = {
      monthlyLimit: data.monthlyLimit || 20,
      metaEnabled: data.metaEnabled || false,
      customFeatures: data.customFeatures || {},
      currency: data.currency || 'SAR'
    }

    // Sync meta form if channel exists
    if (tenant.value.channels && tenant.value.channels.length > 0) {
      const channel = tenant.value.channels[0]
      metaForm.value = {
        displayPhoneNumber: channel.displayPhoneNumber,
        phoneNumber: channel.phoneNumber,
        metaPhoneNumberId: channel.metaPhoneNumberId,
        metaWabaId: channel.metaWabaId,
        metaAccessToken: channel.metaAccessToken,
        metaAppSecret: channel.metaAppSecret
      }
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load tenant details.'
  } finally {
    loading.value = false
  }
}

const openMetaForm = (channel = null) => {
  if (channel) {
    metaForm.value = { ...channel }
  } else {
    metaForm.value = { phoneNumber: '', displayPhoneNumber: '', metaPhoneNumberId: '', metaWabaId: '', metaAccessToken: '', metaAppSecret: '' }
  }
  showMetaForm.value = true
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
    const res = await axios.put(`/api/admin/tenants/${route.params.id}/settings`, settingsForm.value, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    tenant.value.monthlyLimit = res.data.data.monthlyLimit
    tenant.value.metaEnabled = res.data.data.metaEnabled
    tenant.value.customFeatures = res.data.data.customFeatures
    tenant.value.currency = res.data.data.currency
    alert('Settings updated successfully')
  } catch (err) {
    alert('Failed to update settings')
  } finally {
    isUpdatingSettings.value = false
  }
}

const saveMetaConfig = async () => {
  isSavingMeta.value = true
  try {
    await axios.post(`/api/admin/tenants/${route.params.id}/meta-channel`, metaForm.value, {
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    })
    alert('Meta Channel saved successfully')
    showMetaForm.value = false
    fetchTenant()
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to save Meta Channel')
  } finally {
    isSavingMeta.value = false
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


