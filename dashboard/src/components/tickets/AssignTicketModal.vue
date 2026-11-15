<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" :dir="isAr ? 'rtl' : 'ltr'" @keydown.esc="$emit('close')">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]" role="dialog" aria-modal="true">
      <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-start gap-3 bg-slate-50/50">
        <div class="min-w-0">
          <h3 class="font-bold text-slate-800">{{ isAr ? 'إسناد التذكرة' : 'Assign ticket' }} <span class="font-mono text-slate-500 text-sm" dir="ltr">{{ ticket.ticketNumber }}</span></h3>
          <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5 truncate" dir="auto">{{ subtitle }}</p>
        </div>
        <button type="button" @click="$emit('close')" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer shrink-0" :title="isAr ? 'إغلاق' : 'Close'"><i class="fas fa-times"></i></button>
      </div>

      <div v-if="loading" class="py-12 text-center text-slate-400"><i class="fas fa-spinner fa-spin text-xl"></i></div>
      <div v-else-if="loadError" class="py-10 px-6 text-center text-sm text-red-600">{{ loadError }}</div>
      <template v-else>
        <div class="p-4 pb-2 space-y-3">
          <button
            v-if="me && ticket.assignedToId !== me"
            type="button"
            class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/60 text-[#c2410c] font-bold text-sm cursor-pointer hover:bg-orange-50 transition-colors disabled:opacity-50"
            :disabled="saving"
            @click="assign(me)"
          >
            <i class="fas fa-hand"></i>{{ isAr ? 'أسندها لي' : 'Assign to me' }}
          </button>
          <div class="relative">
            <i class="fas fa-search absolute top-1/2 -translate-y-1/2 text-slate-400 text-xs" :class="isAr ? 'right-3' : 'left-3'"></i>
            <input
              ref="searchInput"
              v-model="search"
              class="w-full py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600] focus:ring-2 focus:ring-[#FF6600]/15"
              :class="isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'"
              :placeholder="isAr ? 'ابحث باسم الموظف…' : 'Search team members…'"
            />
          </div>
        </div>

        <div class="px-4 pb-3 overflow-y-auto flex-1 min-h-0 space-y-1">
          <button
            v-if="!search"
            type="button"
            class="row"
            :class="{ selected: selected === null }"
            @click="selected = null"
          >
            <span class="avatar bg-slate-100 text-slate-400"><i class="fas fa-user-slash text-xs"></i></span>
            <span class="flex-1 min-w-0 text-start">
              <span class="block font-semibold text-slate-700 text-sm">{{ isAr ? 'غير مسندة' : 'Unassigned' }}</span>
              <span class="block text-xs text-slate-400">{{ isAr ? 'تبقى في قائمة الفريق ليستلمها أحد' : 'Stays in the team queue for anyone to pick up' }}</span>
            </span>
            <span v-if="!ticket.assignedToId" class="current">{{ isAr ? 'الحالي' : 'Current' }}</span>
            <i v-if="selected === null" class="fas fa-check text-[#FF6600]"></i>
          </button>

          <button
            v-for="m in visibleMembers"
            :key="m.id"
            type="button"
            class="row"
            :class="{ selected: selected === m.id, disabled: !m.isActive }"
            :disabled="!m.isActive"
            @click="selected = m.id"
          >
            <span class="avatar relative" :style="{ background: avatarColor(m.name) }">
              {{ initials(m.name) }}
              <span class="dot" :class="m.onShift ? 'bg-emerald-500' : 'bg-slate-300'"></span>
            </span>
            <span class="flex-1 min-w-0 text-start">
              <span class="block font-semibold text-slate-800 text-sm truncate">
                {{ m.name }}<span v-if="m.id === me" class="text-slate-400 font-normal"> ({{ isAr ? 'أنت' : 'you' }})</span>
              </span>
              <span class="block text-xs text-slate-500">
                <template v-if="!m.isActive">{{ isAr ? 'حساب معطّل' : 'Deactivated' }}</template>
                <template v-else>
                  <span :class="m.onShift ? 'text-emerald-600' : 'text-slate-400'">{{ m.onShift ? (isAr ? 'في الدوام' : 'On shift') : (isAr ? 'خارج الدوام' : 'Off shift') }}</span>
                  · {{ loadLabel(m.activeTickets) }}
                </template>
              </span>
            </span>
            <span v-if="ticket.assignedToId === m.id" class="current">{{ isAr ? 'الحالي' : 'Current' }}</span>
            <i v-if="selected === m.id" class="fas fa-check text-[#FF6600]"></i>
          </button>

          <p v-if="members.length === 0" class="text-sm text-slate-500 text-center py-6 leading-relaxed">
            {{ isAr ? 'لا يوجد موظفون بعد. أضفهم من صفحة المستخدمين لتتمكن من الإسناد.' : 'No team members yet. Add them on the Users page to assign tickets.' }}
          </p>
          <p v-else-if="visibleMembers.length === 0" class="text-sm text-slate-400 text-center py-6">{{ isAr ? 'لا نتائج' : 'No matches' }}</p>
        </div>
      </template>

      <div class="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <span class="text-xs text-slate-400">{{ isAr ? 'يصل للموظف تنبيه في دردشة الفريق' : 'They get a note in team chat' }}</span>
        <div class="flex gap-2">
          <button type="button" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium bg-white cursor-pointer" @click="$emit('close')">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button
            type="button"
            class="px-5 py-2 rounded-xl bg-[#FF6600] hover:bg-[#E65C00] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            :disabled="loading || saving || unchanged"
            @click="assign(selected)"
          >
            <i class="fas" :class="saving ? 'fa-spinner fa-spin' : 'fa-user-check'"></i>{{ isAr ? 'إسناد' : 'Assign' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import { initials, categoryColor, ticketErrorText } from '../../utils/tickets'

const props = defineProps({
  ticket: { type: Object, required: true },
  isAr: { type: Boolean, default: true },
  subtitle: { type: String, default: '' }
})
const emit = defineEmits(['close', 'assigned'])

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const members = ref([])
const me = ref(null)
const search = ref('')
const selected = ref(props.ticket.assignedToId || null)
const searchInput = ref(null)

const avatarColor = (name) => categoryColor(name)
const unchanged = computed(() => (props.ticket.assignedToId || null) === selected.value)
const loadLabel = (n) => (props.isAr
  ? (n === 0 ? 'لا تذاكر نشطة' : n === 1 ? 'تذكرة نشطة واحدة' : `${n} تذاكر نشطة`)
  : `${n} active ticket${n === 1 ? '' : 's'}`)

// Active people first, on shift first, then the least busy
const visibleMembers = computed(() => {
  const q = search.value.trim().toLowerCase()
  return members.value
    .filter(m => !q || m.name.toLowerCase().includes(q) || String(m.email || '').toLowerCase().includes(q))
    .sort((a, b) => (b.isActive - a.isActive) || (b.onShift - a.onShift) || (a.activeTickets - b.activeTickets) || a.name.localeCompare(b.name))
})

const assign = async (assignedToId) => {
  saving.value = true
  try {
    const res = await axios.post(`/api/v1/tickets/${props.ticket.id}/assign`, { assignedToId })
    const name = members.value.find(m => m.id === assignedToId)?.name
    Swal.fire({
      icon: 'success',
      title: assignedToId
        ? (props.isAr ? (assignedToId === me.value ? 'أصبحت التذكرة لك' : `أُسندت إلى ${name}`) : (assignedToId === me.value ? 'The ticket is yours' : `Assigned to ${name}`))
        : (props.isAr ? 'أصبحت التذكرة غير مسندة' : 'Ticket unassigned'),
      toast: true, position: 'top-end', showConfirmButton: false, timer: 2500
    })
    emit('assigned', res.data.data)
  } catch (err) {
    Swal.fire({ icon: 'error', title: props.isAr ? 'تعذّر الإسناد' : 'Could not assign', text: ticketErrorText(err, props.isAr), confirmButtonColor: '#FF6600' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res = await axios.get('/api/v1/tickets/assignees')
    members.value = res.data.data.members || []
    me.value = res.data.data.me
  } catch (err) {
    loadError.value = ticketErrorText(err, props.isAr) || (props.isAr ? 'تعذّر تحميل الموظفين' : 'Could not load team members')
  } finally {
    loading.value = false
    await nextTick()
    searchInput.value?.focus()
  }
})
</script>

<style scoped>
.row { width: 100%; display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 12px; border: 1.5px solid transparent; background: white; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.row:hover:not(:disabled) { background: #f8fafc; }
.row.selected { border-color: #FF6600; background: #fff7ed; }
.row.disabled { opacity: 0.5; cursor: not-allowed; }
.avatar { width: 36px; height: 36px; border-radius: 999px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 12px; flex-shrink: 0; }
.dot { position: absolute; bottom: -1px; inset-inline-end: -1px; width: 11px; height: 11px; border-radius: 999px; border: 2px solid white; }
.current { font-size: 10.5px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
</style>
