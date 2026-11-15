<template>
  <div class="p-6 max-w-7xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="flex flex-wrap justify-between items-end gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'التذاكر' : 'Tickets' }}</h1>
        <p class="text-slate-500 mt-1">{{ isAr ? 'كل طلبات العملاء: من يتولاها، تصنيفها، وحالتها.' : 'Every customer request: who has it, its category and its status.' }}</p>
      </div>
      <div class="flex gap-2">
        <button
          v-for="v in views"
          :key="v.key"
          type="button"
          class="px-3.5 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-colors"
          :class="view === v.key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'"
          @click="setView(v.key)"
        >
          <i :class="v.icon" class="me-1.5"></i>{{ v.label }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-5 flex flex-wrap gap-3 items-center">
      <div class="relative flex-1 min-w-[220px]">
        <i class="fas fa-search absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs" :class="isAr ? 'right-3' : 'left-3'"></i>
        <input
          v-model="filters.search"
          @input="debounceFetch"
          type="text"
          :placeholder="isAr ? 'رقم التذكرة، العنوان، اسم العميل أو رقمه…' : 'Ticket number, subject, customer name or phone…'"
          class="w-full py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600] focus:ring-2 focus:ring-[#FF6600]/15"
          :class="isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'"
        />
      </div>
      <select v-model="filters.status" @change="refetch" class="sel">
        <option value="ACTIVE">{{ isAr ? 'المفتوحة' : 'Active' }}</option>
        <option value="CLOSED">{{ isAr ? 'المغلقة' : 'Closed' }}</option>
        <option value="">{{ isAr ? 'كل الحالات' : 'All statuses' }}</option>
      </select>
      <select v-if="view === 'all'" v-model="filters.assignedToId" @change="refetch" class="sel">
        <option value="">{{ isAr ? 'كل الموظفين' : 'Everyone' }}</option>
        <option value="none">{{ isAr ? 'غير مسندة' : 'Unassigned' }}</option>
        <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
      <select v-model="filters.categoryId" @change="refetch" class="sel">
        <option value="">{{ isAr ? 'كل التصنيفات' : 'All categories' }}</option>
        <option value="none">{{ isAr ? 'بدون تصنيف' : 'No category' }}</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <span class="text-xs text-slate-400 ms-auto">{{ isAr ? `${total} تذكرة` : `${total} tickets` }}</span>
    </div>

    <div v-if="loading" class="flex justify-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>

    <div v-else-if="tickets.length === 0" class="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fas fa-ticket text-2xl text-slate-400"></i></div>
      <h3 class="text-lg font-bold text-slate-800">{{ emptyTitle }}</h3>
      <p class="text-slate-500 mt-1 text-sm">{{ isAr ? 'جرّب تغيير الفلاتر أو البحث.' : 'Try other filters or another search.' }}</p>
    </div>

    <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 text-start">
              <th class="th">{{ isAr ? 'التذكرة' : 'Ticket' }}</th>
              <th class="th">{{ isAr ? 'العميل' : 'Customer' }}</th>
              <th class="th">{{ isAr ? 'الحالة' : 'Status' }}</th>
              <th class="th">{{ isAr ? 'المسؤول' : 'Assignee' }}</th>
              <th class="th">{{ isAr ? 'التصنيف' : 'Category' }}</th>
              <th class="th">{{ isAr ? 'آخر تحديث' : 'Updated' }}</th>
              <th class="th text-end">{{ isAr ? 'إجراءات' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="t in tickets" :key="t.id" class="hover:bg-slate-50/70 transition-colors">
              <td class="td">
                <div class="font-mono font-bold text-slate-700" dir="ltr">{{ t.ticketNumber }}</div>
                <div class="text-xs text-slate-500 max-w-[220px] truncate" :title="t.subject" dir="auto">{{ t.subject || (isAr ? 'محادثة واتساب' : 'WhatsApp chat') }}</div>
              </td>
              <td class="td">
                <div class="font-semibold text-slate-800 max-w-[180px] truncate" dir="auto">{{ t.contact?.name || t.contact?.phone || '—' }}</div>
                <div v-if="t.contact?.name && t.contact.name !== t.contact.phone" class="text-xs text-slate-500" dir="ltr">{{ t.contact.phone }}</div>
              </td>
              <td class="td">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap" :class="statusOf(t).cls">{{ isAr ? statusOf(t).ar : statusOf(t).en }}</span>
                <div v-if="t.rating" class="text-xs text-amber-500 mt-1" :title="isAr ? 'تقييم العميل' : 'Customer rating'">{{ '★'.repeat(t.rating) }}<span class="text-slate-200">{{ '★'.repeat(5 - t.rating) }}</span></div>
              </td>
              <td class="td">
                <div v-if="t.assignee" class="flex items-center gap-2">
                  <span class="avatar" :style="{ background: categoryColor(t.assignee.name) }">{{ initials(t.assignee.name) }}</span>
                  <span class="text-slate-700 max-w-[130px] truncate">{{ t.assignee.name }}</span>
                </div>
                <span v-else class="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 border-dashed px-2 py-0.5 rounded-full">{{ isAr ? 'غير مسندة' : 'Unassigned' }}</span>
              </td>
              <td class="td">
                <span v-if="t.category" class="px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap" :style="chipStyle(categoryColor(t.category.name))">{{ t.category.name }}</span>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="td text-slate-500 whitespace-nowrap text-xs">{{ formatDate(t.updatedAt) }}</td>
              <td class="td">
                <div class="flex justify-end gap-1.5">
                  <router-link :to="`/live-chat?thread=${t.threadId}`" class="act" :title="isAr ? 'فتح المحادثة' : 'Open conversation'"><i class="fas fa-comments"></i></router-link>
                  <template v-if="isActiveStatus(t.status)">
                    <button type="button" class="act" :title="isAr ? 'إسناد' : 'Assign'" @click="assignTicket = t"><i class="fas fa-user-plus"></i></button>
                    <button type="button" class="act" :title="isAr ? 'تصنيف' : 'Category'" @click="categoryTicket = t"><i class="fas fa-tag"></i></button>
                    <button type="button" class="act act-ok" :title="isAr ? 'إغلاق' : 'Close'" @click="closeTicket = t"><i class="fas fa-circle-check"></i></button>
                  </template>
                  <button v-else type="button" class="act" :title="isAr ? 'إعادة فتح' : 'Reopen'" @click="reopen(t)"><i class="fas fa-redo"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="flex justify-between items-center p-3 border-t border-slate-100 bg-slate-50/50">
        <button @click="changePage(page - 1)" :disabled="page === 1" class="pg">{{ isAr ? 'السابق' : 'Previous' }}</button>
        <span class="text-sm font-semibold text-slate-600">{{ isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}` }}</span>
        <button @click="changePage(page + 1)" :disabled="page === totalPages" class="pg">{{ isAr ? 'التالي' : 'Next' }}</button>
      </div>
    </div>

    <AssignTicketModal v-if="assignTicket" :ticket="assignTicket" :is-ar="isAr" :subtitle="contactLabel(assignTicket)" @close="assignTicket = null" @assigned="afterChange" />
    <CloseTicketModal
      v-if="closeTicket"
      :ticket="closeTicket"
      :is-ar="isAr"
      :categories="categories"
      :can-manage-categories="canManageCategories"
      :subtitle="contactLabel(closeTicket)"
      @close="closeTicket = null"
      @closed="afterChange"
    />
    <TicketCategoryModal v-if="categoryTicket" :ticket="categoryTicket" :is-ar="isAr" :categories="categories" :can-manage-categories="canManageCategories" @close="categoryTicket = null" @updated="afterChange" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Swal from 'sweetalert2'
import AssignTicketModal from '../components/tickets/AssignTicketModal.vue'
import CloseTicketModal from '../components/tickets/CloseTicketModal.vue'
import TicketCategoryModal from '../components/tickets/TicketCategoryModal.vue'
import { TICKET_STATUS, isActiveStatus, categoryColor, chipStyle, initials, ticketErrorText } from '../utils/tickets'
import { connectSocket } from '../services/realtime'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const storedTenant = (() => {
  try { return JSON.parse(localStorage.getItem('tenant') || '{}') } catch { return {} }
})()
const myId = storedTenant.isSubUser ? storedTenant.subUser?.id : null
const canManageCategories = !storedTenant.isSubUser || !!storedTenant.subUser?.permissions?.can_manage_settings

const tickets = ref([])
const members = ref([])
const categories = ref([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const view = ref(myId ? 'mine' : 'all')
const filters = ref({ search: '', status: 'ACTIVE', assignedToId: '', categoryId: '' })

const assignTicket = ref(null)
const closeTicket = ref(null)
const categoryTicket = ref(null)

const views = computed(() => [
  ...(myId ? [{ key: 'mine', icon: 'fas fa-user', label: isAr.value ? 'تذاكري' : 'Mine' }] : []),
  { key: 'unassigned', icon: 'fas fa-inbox', label: isAr.value ? 'غير المسندة' : 'Unassigned' },
  { key: 'all', icon: 'fas fa-layer-group', label: isAr.value ? 'الكل' : 'All' }
])
const emptyTitle = computed(() => ({
  mine: isAr.value ? 'لا توجد تذاكر مسندة لك' : 'No tickets assigned to you',
  unassigned: isAr.value ? 'لا توجد تذاكر غير مسندة' : 'No unassigned tickets'
}[view.value] || (isAr.value ? 'لا توجد تذاكر' : 'No tickets found')))

const statusOf = (t) => TICKET_STATUS[t.status] || TICKET_STATUS.OPEN
const contactLabel = (t) => [t.contact?.name, t.contact?.phone].filter((v, i, a) => v && a.indexOf(v) === i).join(' · ')

const setView = (key) => {
  view.value = key
  filters.value.assignedToId = ''
  refetch()
}

const fetchTickets = async ({ silent = false } = {}) => {
  if (!silent) loading.value = true
  try {
    const params = { page: page.value, limit: 25 }
    const f = filters.value
    if (f.status) params.status = f.status
    if (f.search) params.search = f.search
    if (f.categoryId) params.categoryId = f.categoryId
    if (view.value === 'mine') params.assignedToId = myId
    else if (view.value === 'unassigned') params.assignedToId = 'none'
    else if (f.assignedToId) params.assignedToId = f.assignedToId

    const res = await axios.get('/api/v1/tickets', { params })
    tickets.value = res.data.data || []
    totalPages.value = res.data.meta?.pages || 1
    total.value = res.data.meta?.total || 0
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر تحميل التذاكر' : 'Could not load tickets', text: ticketErrorText(err, isAr.value), confirmButtonColor: '#FF6600' })
  } finally {
    loading.value = false
  }
}

const refetch = () => {
  page.value = 1
  fetchTickets()
}

let debounceTimer = null
const debounceFetch = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(refetch, 400)
}

const changePage = (p) => {
  if (p > 0 && p <= totalPages.value) {
    page.value = p
    fetchTickets()
  }
}

const afterChange = () => {
  assignTicket.value = null
  closeTicket.value = null
  categoryTicket.value = null
  fetchTickets({ silent: true })
}

const reopen = async (t) => {
  try {
    await axios.post(`/api/v1/tickets/${t.id}/reopen`)
    Swal.fire({ icon: 'success', title: isAr.value ? `أُعيد فتح ${t.ticketNumber}` : `${t.ticketNumber} reopened`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 })
    fetchTickets({ silent: true })
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّرت إعادة الفتح' : 'Could not reopen', text: ticketErrorText(err, isAr.value), confirmButtonColor: '#FF6600' })
  }
}

const formatDate = (iso) => (iso
  ? new Intl.DateTimeFormat(isAr.value ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
  : '')

// Other people's changes show up without reloading the page
let socket = null
let refreshTimer = null
onMounted(async () => {
  fetchTickets()
  const [assignees, cats] = await Promise.all([
    axios.get('/api/v1/tickets/assignees').catch(() => null),
    axios.get('/api/v1/tickets/categories').catch(() => null)
  ])
  members.value = assignees?.data?.data?.members || []
  categories.value = cats?.data?.data || []
  try {
    socket = connectSocket()
    const refresh = () => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => fetchTickets({ silent: true }), 600)
    }
    socket.on('ticket_updated', refresh)
    socket.on('chat_activity', refresh)
  } catch (e) { /* live updates are optional */ }
})
onUnmounted(() => {
  clearTimeout(refreshTimer)
  socket?.disconnect()
})
</script>

<style scoped>
.sel { padding: 8px 10px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 13px; background: white; outline: none; }
.sel:focus { border-color: #FF6600; }
.th { padding: 11px 14px; text-align: start; white-space: nowrap; }
.td { padding: 11px 14px; vertical-align: middle; }
.avatar { width: 26px; height: 26px; border-radius: 999px; color: white; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.act { width: 32px; height: 32px; border-radius: 9px; border: 1px solid #e2e8f0; background: white; color: #64748b; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; font-size: 12.5px; }
.act:hover { border-color: #FF6600; color: #FF6600; }
.act-ok:hover { border-color: #10b981; color: #059669; }
.pg { padding: 7px 14px; background: white; border: 1px solid #cbd5e1; border-radius: 10px; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; }
.pg:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
