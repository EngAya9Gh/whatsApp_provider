<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight m-0">System Settings</h1>
      <p class="text-slate-500 mt-2">Manage global configurations, seller information, and dynamic pricing for invoices.</p>
    </div>

    <div v-if="loading" class="text-center py-12 text-slate-400 font-medium text-lg">Loading settings...</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- Seller Details -->
      <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 class="text-xl font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
          <span>🏢</span> Seller & Company Details
        </h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
            <input v-model="form.sellerName" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">VAT Number</label>
              <input v-model="form.sellerVatNumber" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">CRN</label>
              <input v-model="form.sellerCrn" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Street Address</label>
            <input v-model="form.sellerStreet" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">District</label>
              <input v-model="form.sellerDistrict" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">City</label>
              <input v-model="form.sellerCity" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Country</label>
              <input v-model="form.sellerCountry" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Building No / Postal Code</label>
              <div class="flex gap-2">
                <input v-model="form.sellerBuildingNo" type="text" placeholder="Building" class="w-1/2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
                <input v-model="form.sellerPostalCode" type="text" placeholder="Postal" class="w-1/2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bank Details -->
      <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 class="text-xl font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
          <span>🏦</span> Bank Information
        </h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Bank Name</label>
            <input v-model="form.bankName" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Bank Address</label>
            <input v-model="form.bankAddress" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Account Name</label>
            <input v-model="form.bankAccountName" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Account Number</label>
            <input v-model="form.bankAccountNumber" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">IBAN Number</label>
              <input v-model="form.bankIban" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">SWIFT / BIC</label>
              <input v-model="form.bankSwift" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all" />
            </div>
          </div>
        </div>
      </div>

      <!-- Pricing & Margins -->
      <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200 lg:col-span-2">
        <h3 class="text-xl font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
          <span>💰</span> Pricing, Tax & Profit Margins
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="col-span-full p-4 border border-amber-200 rounded-lg bg-amber-50/60">
            <label class="block text-sm font-semibold text-slate-800 mb-1">Who pays Meta's message fees? (من يدفع رسوم رسائل Meta؟)</label>
            <select v-model="form.metaFeesPaidBy" class="w-full md:w-1/2 bg-white border border-slate-200 text-slate-900 text-sm rounded-lg block p-2.5 outline-none">
              <option value="CUSTOMER">The customer, with their own card in Meta — wallet takes only the markup (العميل ببطاقته في Meta — المحفظة تخصم الهامش فقط)</option>
              <option value="PLATFORM">We pay Meta (shared credit line) — wallet takes base cost + markup (نحن ندفع لـ Meta — المحفظة تخصم السعر + الهامش)</option>
            </select>
            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
              As a Tech Provider our customers must add their own payment method in Meta, and Meta bills them directly — charging the base cost again from the wallet would make them pay twice.
              Base costs below are Meta's rates in USD; the wallet charges them in the customer's currency. Failed campaign messages are refunded to the wallet automatically in both modes.
              Each tenant can override this on its page.
            </p>
          </div>

          <div class="col-span-full">
            <label class="block text-sm font-semibold text-slate-700 mb-1">Default Tax/VAT Rate (%)</label>
            <input v-model="form.taxRate" type="number" step="0.1" class="w-full md:w-1/4 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2.5 outline-none transition-all font-mono" />
          </div>

          <!-- Utility -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">Utility Messages</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Base Cost ($)</label>
                <input v-model="form.utilityBaseCost" type="number" step="0.0001" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 outline-none font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Markup (%)</label>
                <input v-model="form.utilityMarkupPercent" type="number" step="1" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 outline-none font-mono" />
              </div>
            </div>
          </div>

          <!-- Authentication -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">Authentication Messages</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Base Cost ($)</label>
                <input v-model="form.authenticationBaseCost" type="number" step="0.0001" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 outline-none font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Markup (%)</label>
                <input v-model="form.authenticationMarkupPercent" type="number" step="1" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 outline-none font-mono" />
              </div>
            </div>
          </div>

          <!-- Marketing (Campaigns) -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">Marketing (Campaigns)</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Base Cost ($)</label>
                <input v-model="form.marketingBaseCost" type="number" step="0.0001" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 outline-none font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Markup (%)</label>
                <input v-model="form.marketingMarkupPercent" type="number" step="1" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 outline-none font-mono" />
              </div>
            </div>
          </div>

          <!-- Service -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">Service Messages</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Base Cost ($)</label>
                <input v-model="form.serviceBaseCost" type="number" step="0.0001" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 outline-none font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Markup (%)</label>
                <input v-model="form.serviceMarkupPercent" type="number" step="1" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-2 outline-none font-mono" />
              </div>
            </div>
          </div>
          
          <!-- QR Campaigns -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">QR Messages (Baileys)</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Deduction Cost (SAR)</label>
                <input v-model="form.qrMessagePrice" type="number" step="0.0001" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block p-2 outline-none font-mono" />
              </div>
            </div>
          </div>
          
          <!-- Wallet Deduction Toggle -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">Wallet System</h4>
            <div class="flex items-center gap-3">
              <input type="checkbox" v-model="form.enableWalletDeduction" id="walletToggle" class="w-5 h-5 text-orange-500 bg-white border-slate-300 rounded focus:ring-orange-500 focus:ring-2 accent-orange-500 cursor-pointer" />
              <label for="walletToggle" class="font-semibold text-slate-700 text-sm cursor-pointer select-none">Enable Automatic Wallet Deduction</label>
            </div>
            <p class="text-xs text-slate-500 mt-2">If disabled, campaigns will send without checking or deducting from tenant wallets.</p>
          </div>
          
          <!-- Add-ons on top of the plan limits (Plans page) -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">Add-ons (الإضافات) — SAR per month, before VAT</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Extra team member</label>
                <input v-model="form.addonUserPrice" type="number" step="0.01" min="0" placeholder="Not for sale" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg block p-2 outline-none font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Extra WhatsApp number</label>
                <input v-model="form.addonNumberPrice" type="number" step="0.01" min="0" placeholder="Not for sale" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg block p-2 outline-none font-mono" />
              </div>
            </div>
            <p class="text-xs text-slate-500 mt-2">Empty = not for sale. The first invoice covers the rest of the month (+ VAT); the add-on turns on when it is marked paid. Include active add-ons in the monthly invoice.</p>
          </div>

          <!-- Channels sold per channel: monthly fee from the tenant's one wallet (channels/channel.billing.js) -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">Channel prices (أسعار القنوات) — SAR per month, from the wallet</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Website widget (ويدجت الموقع), per widget</label>
                <input v-model="form.channelPriceWebchat" type="number" step="0.01" min="0" placeholder="Free" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg block p-2 outline-none font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Instagram, per account</label>
                <input v-model="form.channelPriceInstagram" type="number" step="0.01" min="0" placeholder="Free" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg block p-2 outline-none font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Messenger, per page</label>
                <input v-model="form.channelPriceMessenger" type="number" step="0.01" min="0" placeholder="Free" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg block p-2 outline-none font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">TikTok, per account</label>
                <input v-model="form.channelPriceTiktok" type="number" step="0.01" min="0" placeholder="Free" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg block p-2 outline-none font-mono" />
              </div>
            </div>
            <p class="text-xs text-slate-500 mt-2">Empty = free. Charged from the tenant's wallet when the channel is created, then every month (hourly check). A channel the wallet cannot pay for stops, and starts again by itself after a top-up. Nothing is charged to accounts with wallet deduction off. Every charge shows its channel in the tenant's wallet history.</p>
          </div>

          <!-- AI (Gemini) prices, for the AI usage page -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">AI (Gemini) prices — shared key</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Input, $ per 1M tokens</label>
                <input v-model="form.aiInputPricePerMillionUsd" type="number" step="0.0001" min="0" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg block p-2 outline-none font-mono" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Output + thinking, $ per 1M tokens</label>
                <input v-model="form.aiOutputPricePerMillionUsd" type="number" step="0.0001" min="0" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg block p-2 outline-none font-mono" />
              </div>
            </div>
            <p class="text-xs text-slate-500 mt-2">From Google's Gemini price list for the model in use. Only used to estimate the cost on the AI usage page.</p>
          </div>

          <!-- Exchange Rate -->
          <div class="p-4 border border-slate-100 rounded-lg bg-slate-50/50">
            <h4 class="font-bold text-slate-800 mb-3 text-sm">Currency Exchange</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Exchange Rate (USD to SAR)</label>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-slate-500">1 USD =</span>
                  <input v-model="form.exchangeRateUsdToSar" type="number" step="0.01" class="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-2 outline-none font-mono" />
                  <span class="text-sm font-bold text-slate-500">SAR</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
    </div>

    <!-- Actions -->
    <div class="mt-8 flex justify-end gap-4" v-if="!loading">
      <button @click="fetchSettings" class="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors border-none cursor-pointer">
        Discard Changes
      </button>
      <button @click="saveSettings" :disabled="saving" class="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all border-none cursor-pointer disabled:opacity-50">
        {{ saving ? 'Saving...' : 'Save Settings' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(true)
const saving = ref(false)

const form = ref({
  sellerName: '',
  sellerStreet: '',
  sellerDistrict: '',
  sellerCity: '',
  sellerCountry: '',
  sellerBuildingNo: '',
  sellerPostalCode: '',
  sellerVatNumber: '',
  sellerCrn: '',
  bankName: '',
  bankAddress: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankIban: '',
  bankSwift: '',
  taxRate: 15.0,
  utilityBaseCost: 0.0107,
  utilityMarkupPercent: 20,
  marketingBaseCost: 0.0501,
  marketingMarkupPercent: 20,
  authenticationBaseCost: 0.0107,
  authenticationMarkupPercent: 20,
  serviceBaseCost: 0.0150,
  serviceMarkupPercent: 20,
  qrMessagePrice: 0.05,
  exchangeRateUsdToSar: 3.75,
  enableWalletDeduction: true,
  metaFeesPaidBy: 'CUSTOMER',
  aiInputPricePerMillionUsd: '',
  aiOutputPricePerMillionUsd: '',
  addonUserPrice: '',
  addonNumberPrice: '',
  channelPriceWebchat: '',
  channelPriceInstagram: '',
  channelPriceMessenger: '',
  channelPriceTiktok: ''
})

const fetchSettings = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.get('/api/admin/settings', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.data && res.data.data.data) {
      Object.assign(form.value, res.data.data.data)
    }
  } catch (err) {
    alert('Failed to load system settings')
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    const token = localStorage.getItem('admin_token')
    
    // Format numeric values
    const dataToSave = { ...form.value }
    dataToSave.taxRate = parseFloat(dataToSave.taxRate)
    dataToSave.utilityBaseCost = parseFloat(dataToSave.utilityBaseCost)
    dataToSave.utilityMarkupPercent = parseFloat(dataToSave.utilityMarkupPercent)
    dataToSave.marketingBaseCost = parseFloat(dataToSave.marketingBaseCost)
    dataToSave.marketingMarkupPercent = parseFloat(dataToSave.marketingMarkupPercent)
    dataToSave.authenticationBaseCost = parseFloat(dataToSave.authenticationBaseCost)
    dataToSave.authenticationMarkupPercent = parseFloat(dataToSave.authenticationMarkupPercent)
    dataToSave.serviceBaseCost = parseFloat(dataToSave.serviceBaseCost)
    dataToSave.serviceMarkupPercent = parseFloat(dataToSave.serviceMarkupPercent)
    // Empty AI prices stay empty (the AI usage page then shows no cost)
    for (const k of ['aiInputPricePerMillionUsd', 'aiOutputPricePerMillionUsd', 'addonUserPrice', 'addonNumberPrice', 'channelPriceWebchat', 'channelPriceInstagram', 'channelPriceMessenger', 'channelPriceTiktok']) {
      dataToSave[k] = dataToSave[k] === '' || dataToSave[k] === null ? null : parseFloat(dataToSave[k])
    }

    await axios.put('/api/admin/settings', dataToSave, {
      headers: { Authorization: `Bearer ${token}` }
    })
    alert('Settings saved successfully!')
  } catch (err) {
    alert('Failed to save settings')
  } finally {
    saving.value = false
  }
}

onMounted(fetchSettings)
</script>
