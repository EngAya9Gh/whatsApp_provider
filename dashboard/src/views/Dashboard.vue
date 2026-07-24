<template>
  <div class="dashboard-advanced p-6 md:p-8 font-sans bg-slate-50 min-h-screen" :class="{ 'rtl-mode': isAr }">
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">{{ isAr ? 'واجهة تقارير استهلاك الرسائل' : 'Dashboard Overview' }}</h2>
        <p class="text-slate-500 font-medium text-lg">{{ isAr ? 'توفر لك اللوحة الرئيسية نظرة شاملة على حسابك، ومعلومات تفصيلية تساعدك على متابعة نشاطاتك عبرها بسهولة.' : 'Provides a comprehensive overview of your account and detailed insights into your messaging activity.' }}</p>
      </div>
      
      <div class="flex items-center gap-2">
        <label class="text-sm font-bold text-slate-600">{{ isAr ? 'الفترة:' : 'Period:' }}</label>
        <div class="flex items-center gap-2">
          <select v-model="dateFilter" @change="handleDateFilterChange" class="bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] p-2 outline-none min-w-[150px] shadow-sm font-semibold">
            <option value="THIS_MONTH">{{ isAr ? 'هذا الشهر' : 'This Month' }}</option>
            <option value="LAST_MONTH">{{ isAr ? 'الشهر الماضي' : 'Last Month' }}</option>
            <option value="THIS_YEAR">{{ isAr ? 'هذا العام' : 'This Year' }}</option>
            <option value="CUSTOM">{{ isAr ? 'تخصيص' : 'Custom' }}</option>
          </select>
          <div v-show="dateFilter === 'CUSTOM'" class="min-w-[250px]">
            <input 
              ref="datePickerInput"
              class="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] p-2 outline-none cursor-pointer"
              placeholder="Select Date Range (From - To)"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="w-10 h-10 border-4 border-[#FF6600] border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="space-y-8">
      
      <!-- Top Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Balance Card -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF6600]/10 to-transparent rounded-bl-full -z-0"></div>
          <h3 class="text-slate-500 text-sm font-bold mb-4 z-10 relative flex items-center gap-2">
            <span>💰</span> {{ isAr ? 'الرصيد المتاح' : 'Available Balance' }}
          </h3>
          <div class="text-3xl font-black text-slate-800 z-10 relative">{{ stats?.walletBalance?.toFixed(2) }} <span class="text-base text-slate-400 font-bold">{{ stats?.currency || 'SAR' }}</span></div>
        </div>

        <!-- Remaining Messages -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <h3 class="text-slate-500 text-sm font-bold mb-4 flex items-center gap-2">
            <span>📩</span> {{ isAr ? 'عدد الرسائل المتاحة' : 'Estimated Messages' }}
          </h3>
          <div class="text-3xl font-black text-[#FF6600]">{{ stats?.estimatedRemainingMessages?.toLocaleString() }}</div>
          <p class="text-xs text-slate-400 mt-2">{{ isAr ? '(يعتمد على سعر الرسالة)' : '(Based on base message cost)' }}</p>
        </div>

        <!-- Delivery Rate -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <h3 class="text-slate-500 text-sm font-bold mb-4 flex items-center gap-2">
            <span>📈</span> {{ isAr ? 'نسبة الوصول الناجح' : 'Delivery Rate' }}
          </h3>
          <div class="text-3xl font-black text-emerald-600">{{ stats?.deliveryRate }}%</div>
          <div class="w-full bg-slate-100 rounded-full h-2 mt-3">
            <div class="bg-emerald-500 h-2 rounded-full" :style="`width: ${stats?.deliveryRate}%`"></div>
          </div>
        </div>

        <!-- Plan / WhatsApp Status -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <h3 class="text-slate-500 text-sm font-bold mb-4 flex items-center gap-2">
            <span>🏢</span> {{ isAr ? 'الباقة المستخدمة' : 'Current Plan' }}
          </h3>
          <div class="text-2xl font-black text-[#FF6600] mb-2">{{ tenant?.plan || 'FREE' }}</div>
          <div class="inline-flex px-3 py-1 rounded-full text-xs font-bold" :class="statusClass">
            {{ tenant?.sessionStatus }}
          </div>
        </div>
      </div>

      <!-- Breakdown Section -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="border-b border-slate-100 bg-slate-50/50 p-6 flex justify-between items-center">
          <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
            <span>📊</span> 
            {{ isAr ? 'تفاصيل استهلاك الرسائل' : 'Message Consumption' }} 
            <span class="text-[#FF6600] text-sm">({{ filterLabel }})</span>
          </h3>
          
          <div class="flex gap-2 bg-slate-200 p-1 rounded-lg">
            <button @click="activeProvider = 'META'" :class="activeProvider === 'META' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-300'" class="px-4 py-1.5 rounded-md font-bold text-sm transition-all border-none cursor-pointer">
              Meta Cloud
            </button>
            <button v-if="hasQrFeature" @click="activeProvider = 'QR'" :class="activeProvider === 'QR' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-300'" class="px-4 py-1.5 rounded-md font-bold text-sm transition-all border-none cursor-pointer">
              {{ isAr ? 'النمط العادي (QR)' : 'Standard (QR)' }}
            </button>
          </div>
        </div>
        
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <!-- Marketing -->
            <div class="p-5 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between group hover:border-[#FF6600]/30 transition-colors">
              <div class="text-slate-500 font-bold mb-2">{{ isAr ? 'رسائل التسويق' : 'Marketing Messages' }}</div>
              <div class="text-2xl font-black text-slate-800 group-hover:text-[#FF6600] transition-colors">{{ stats?.categories?.[activeProvider]?.MARKETING || 0 }}</div>
            </div>

            <!-- Utility -->
            <div class="p-5 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between group hover:border-[#FF6600]/30 transition-colors">
              <div class="text-slate-500 font-bold mb-2">{{ isAr ? 'رسائل الإشعارات والخدمات' : 'Utility Messages' }}</div>
              <div class="text-2xl font-black text-slate-800 group-hover:text-[#FF6600] transition-colors">{{ stats?.categories?.[activeProvider]?.UTILITY || 0 }}</div>
            </div>

            <!-- Authentication -->
            <div class="p-5 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between group hover:border-purple-500/30 transition-colors">
              <div class="text-slate-500 font-bold mb-2">{{ isAr ? 'رسائل التوثيق (OTP)' : 'Authentication' }}</div>
              <div class="text-2xl font-black text-slate-800 group-hover:text-purple-600 transition-colors">{{ stats?.categories?.[activeProvider]?.AUTHENTICATION || 0 }}</div>
            </div>

            <!-- Service / Chat -->
            <div class="p-5 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
              <div class="text-slate-500 font-bold mb-2">{{ isAr ? 'رسائل الخدمة (محادثات)' : 'Service Messages' }}</div>
              <div class="text-2xl font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{{ stats?.categories?.[activeProvider]?.SERVICE || 0 }}</div>
            </div>

          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.css'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const tenant = ref(JSON.parse(localStorage.getItem('tenant') || '{}'))
const stats = ref(null)
const loading = ref(true)
const dateFilter = ref('THIS_MONTH')
const customDateRange = ref('') 
const datePickerInput = ref(null)
let fpInstance = null

const hasQrFeature = computed(() => {
  const t = tenant.value
  if (!t || !t.allowedFeatures) return false
  return t.allowedFeatures.includes('BAILEYS_SEND_MESSAGE') || 
         t.allowedFeatures.includes('SEND_MESSAGE') || 
         t.allowedFeatures.includes('BAILEYS_CAMPAIGN') || 
         t.allowedFeatures.includes('BAILEYS_AUTORESPONDER')
})

const activeProvider = ref('META')

const filterLabel = computed(() => {
  if (dateFilter.value === 'THIS_MONTH') return isAr.value ? 'هذا الشهر' : 'This Month'
  if (dateFilter.value === 'LAST_MONTH') return isAr.value ? 'الشهر الماضي' : 'Last Month'
  if (dateFilter.value === 'THIS_YEAR') return isAr.value ? 'هذا العام' : 'This Year'
  if (dateFilter.value === 'CUSTOM') {
    if (customDateRange.value && customDateRange.value.includes(' to ')) {
      const dates = customDateRange.value.split(' to ')
      return `${dates[0]} ➔ ${dates[1]}`
    }
    return isAr.value ? 'فترة مخصصة' : 'Custom Period'
  }
  return ''
})

const statusClass = computed(() => {
  const status = tenant.value?.sessionStatus || 'DISCONNECTED'
  if (status === 'CONNECTED') return 'bg-emerald-100 text-emerald-700'
  if (status === 'DISCONNECTED') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
})

const fetchDashboardStats = async () => {
  try {
    loading.value = true
    const token = localStorage.getItem('token')
    
    // Refresh tenant data to get latest status
    const authRes = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (authRes.data?.data) {
      tenant.value = authRes.data.data
      localStorage.setItem('tenant', JSON.stringify(authRes.data.data))
    }

    // Determine dates
    let startDate = new Date()
    let endDate = new Date()
    
    if (dateFilter.value === 'THIS_MONTH') {
      startDate.setDate(1)
    } else if (dateFilter.value === 'LAST_MONTH') {
      startDate.setMonth(startDate.getMonth() - 1)
      startDate.setDate(1)
      endDate = new Date()
      endDate.setDate(0) // Last day of last month
    } else if (dateFilter.value === 'THIS_YEAR') {
      startDate.setMonth(0)
      startDate.setDate(1)
    } else if (dateFilter.value === 'CUSTOM') {
      if (customDateRange.value && customDateRange.value.includes(' to ')) {
        const dates = customDateRange.value.split(' to ')
        startDate = new Date(dates[0])
        endDate = new Date(dates[1])
        endDate.setHours(23, 59, 59, 999)
      } else {
        // If not fully selected, don't fetch yet or default
        return
      }
    }

    // Get Advanced Stats
    const statsRes = await axios.get('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      }
    })
    stats.value = statsRes.data.data
  } catch (err) {
    console.error('Failed to load dashboard stats:', err)
  } finally {
    loading.value = false
  }
}

const handleDateFilterChange = () => {
  if (dateFilter.value === 'CUSTOM') {
    // Default to this week
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    
    const format = (d) => d.toISOString().split('T')[0]
    customDateRange.value = `${format(start)} to ${format(end)}`
    
    if (fpInstance) {
      fpInstance.setDate([start, end])
    }
  }
  fetchDashboardStats()
}

onMounted(() => {
  if (tenant.value && tenant.value.id) {
    fetchDashboardStats()
  } else {
    loading.value = false
  }

  if (datePickerInput.value) {
    const format = (d) => d.toISOString().split('T')[0]
    fpInstance = flatpickr(datePickerInput.value, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      showMonths: 1,
      onClose: (selectedDates) => {
        if (selectedDates.length === 2) {
          customDateRange.value = `${format(selectedDates[0])} to ${format(selectedDates[1])}`
          fetchDashboardStats()
        }
      }
    })
  }

  // Auto set active tab to Meta if they don't have QR
  if (!hasQrFeature.value) {
    activeProvider.value = 'META'
  }
})
</script>

<style scoped>
.rtl-mode {
  direction: rtl;
}
</style>

<style>
/* Global Flatpickr Theme Overrides for Orange (#FF6600) */
.flatpickr-day.selected,
.flatpickr-day.startRange,
.flatpickr-day.endRange,
.flatpickr-day.selected.inRange,
.flatpickr-day.startRange.inRange,
.flatpickr-day.endRange.inRange,
.flatpickr-day.selected:focus,
.flatpickr-day.startRange:focus,
.flatpickr-day.endRange:focus,
.flatpickr-day.selected:hover,
.flatpickr-day.startRange:hover,
.flatpickr-day.endRange:hover,
.flatpickr-day.selected.prevMonthDay,
.flatpickr-day.startRange.prevMonthDay,
.flatpickr-day.endRange.prevMonthDay,
.flatpickr-day.selected.nextMonthDay,
.flatpickr-day.startRange.nextMonthDay,
.flatpickr-day.endRange.nextMonthDay {
  background: #FF6600 !important;
  border-color: #FF6600 !important;
  color: white !important;
}

.flatpickr-day.inRange,
.flatpickr-day.prevMonthDay.inRange,
.flatpickr-day.nextMonthDay.inRange,
.flatpickr-day.today.inRange,
.flatpickr-day.prevMonthDay.today.inRange,
.flatpickr-day.nextMonthDay.today.inRange,
.flatpickr-day:hover,
.flatpickr-day.prevMonthDay:hover,
.flatpickr-day.nextMonthDay:hover,
.flatpickr-day:focus,
.flatpickr-day.prevMonthDay:focus,
.flatpickr-day.nextMonthDay:focus {
  background: #fff3ed !important;
  border-color: #fff3ed !important;
  color: #FF6600;
}

.flatpickr-months .flatpickr-month {
  background: #FF6600 !important;
}
.flatpickr-current-month .flatpickr-monthDropdown-months {
  background: #FF6600 !important;
}
.flatpickr-weekdays {
  background: #FF6600 !important;
}
span.flatpickr-weekday {
  background: #FF6600 !important;
  color: white !important;
}
.flatpickr-months .flatpickr-prev-month, .flatpickr-months .flatpickr-next-month {
  color: white !important;
  fill: white !important;
}
.flatpickr-current-month input.cur-year {
  color: white !important;
}
</style>
