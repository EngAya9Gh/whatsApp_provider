<template>
  <div class="tickets-inbox p-6 font-sans" :class="{ 'rtl-mode': isAr }">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>🎫</span> {{ isAr ? 'صندوق التذاكر' : 'Tickets Inbox' }}
        </h2>
        <p class="text-slate-500 font-medium text-lg mt-1">
          {{ isAr ? 'إدارة التذاكر وحل مشاكل العملاء' : 'Manage tickets and resolve customer issues' }}
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center">
      <div class="flex-1 min-w-[200px]">
        <input 
          v-model="filters.search" 
          @input="debounceFetch"
          type="text" 
          :placeholder="isAr ? 'بحث برقم التذكرة أو العنوان أو رقم الهاتف...' : 'Search by ticket number, title, phone...'"
          class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] outline-none"
        />
      </div>
      <div class="w-full md:w-48">
        <select v-model="filters.status" @change="fetchTickets" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] outline-none">
          <option value="">{{ isAr ? 'جميع الحالات' : 'All Statuses' }}</option>
          <option value="OPEN">{{ isAr ? 'مفتوحة' : 'Open' }}</option>
          <option value="PENDING">{{ isAr ? 'قيد الانتظار' : 'Pending' }}</option>
          <option value="RESOLVED">{{ isAr ? 'تم الحل' : 'Resolved' }}</option>
          <option value="CLOSED">{{ isAr ? 'مغلقة' : 'Closed' }}</option>
        </select>
      </div>
    </div>

    <!-- Tickets List -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-10 h-10 border-4 border-slate-200 border-t-[#FF6600] rounded-full animate-spin"></div>
    </div>

    <div v-else-if="tickets.length === 0" class="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div class="text-6xl mb-4">📭</div>
      <h3 class="text-xl font-bold text-slate-800">{{ isAr ? 'لا توجد تذاكر' : 'No tickets found' }}</h3>
      <p class="text-slate-500 mt-2">{{ isAr ? 'لم يتم العثور على أي تذاكر تطابق معايير البحث.' : 'No tickets match your search criteria.' }}</p>
    </div>

    <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
              <th class="p-4" :class="{ 'text-right': isAr }">{{ isAr ? 'رقم التذكرة' : 'Ticket ID' }}</th>
              <th class="p-4" :class="{ 'text-right': isAr }">{{ isAr ? 'العنوان' : 'Subject' }}</th>
              <th class="p-4" :class="{ 'text-right': isAr }">{{ isAr ? 'القناة' : 'Channel' }}</th>
              <th class="p-4" :class="{ 'text-right': isAr }">{{ isAr ? 'الحالة' : 'Status' }}</th>
              <th class="p-4" :class="{ 'text-right': isAr }">{{ isAr ? 'التاريخ' : 'Date' }}</th>
              <th class="p-4 text-center">{{ isAr ? 'إجراءات' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr v-for="ticket in tickets" :key="ticket.id" class="hover:bg-slate-50 transition-colors">
              <td class="p-4 font-mono font-medium text-slate-700">{{ ticket.ticketNumber }}</td>
              <td class="p-4 text-slate-800 font-semibold">{{ ticket.subject || (isAr ? 'محادثة دعم فني' : 'Support Chat') }}</td>
              <td class="p-4 text-slate-600">{{ ticket.channel?.name || ticket.channel?.phoneNumber || 'N/A' }}</td>
              <td class="p-4">
                <span :class="getStatusClass(ticket.status)" class="px-3 py-1 rounded-full text-xs font-bold border">
                  {{ ticket.status }}
                </span>
              </td>
              <td class="p-4 text-slate-500 whitespace-nowrap">{{ formatDate(ticket.createdAt) }}</td>
              <td class="p-4 text-center">
                <button 
                  v-if="ticket.status !== 'CLOSED'"
                  @click="closeTicket(ticket)" 
                  class="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-200"
                >
                  {{ isAr ? 'إغلاق' : 'Close' }}
                </button>
                <span v-else class="text-slate-400 text-xs font-bold">--</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50/50">
        <button 
          @click="changePage(page - 1)" 
          :disabled="page === 1"
          class="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
        >
          {{ isAr ? 'السابق' : 'Previous' }}
        </button>
        <span class="text-sm font-semibold text-slate-700">
          {{ isAr ? 'صفحة' : 'Page' }} {{ page }} {{ isAr ? 'من' : 'of' }} {{ totalPages }}
        </span>
        <button 
          @click="changePage(page + 1)" 
          :disabled="page === totalPages"
          class="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
        >
          {{ isAr ? 'التالي' : 'Next' }}
        </button>
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

const tickets = ref([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)

const filters = ref({
  search: '',
  status: ''
})

let debounceTimer = null
const debounceFetch = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    fetchTickets()
  }, 500)
}

const fetchTickets = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const params = {
      page: page.value,
      limit: 20
    }
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.search) params.search = filters.value.search

    const res = await axios.get('/api/v1/tickets', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data?.success) {
      tickets.value = res.data.data
      totalPages.value = res.data.meta.pages
    }
  } catch (error) {
    console.error('Failed to fetch tickets:', error)
  } finally {
    loading.value = false
  }
}

const closeTicket = async (ticket) => {
  if (!confirm(isAr.value ? 'هل أنت متأكد من إغلاق هذه التذكرة؟' : 'Are you sure you want to close this ticket?')) return
  
  try {
    const token = localStorage.getItem('token')
    await axios.post(`/api/v1/tickets/${ticket.id}/close`, {
      description: isAr.value ? 'تم حل المشكلة' : 'Issue resolved'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    fetchTickets()
  } catch (error) {
    console.error('Failed to close ticket:', error)
    alert(isAr.value ? 'فشل إغلاق التذكرة' : 'Failed to close ticket')
  }
}

const changePage = (newPage) => {
  if (newPage > 0 && newPage <= totalPages.value) {
    page.value = newPage
    fetchTickets()
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat(isAr.value ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

const getStatusClass = (status) => {
  switch(status) {
    case 'OPEN': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    case 'RESOLVED': return 'bg-green-50 text-green-700 border-green-200'
    case 'CLOSED': return 'bg-slate-100 text-slate-600 border-slate-300'
    default: return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

onMounted(() => {
  fetchTickets()
})
</script>

<style scoped>
.rtl-mode {
  direction: rtl;
}
.rtl-mode th {
  text-align: right;
}
</style>
