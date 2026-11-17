<template>
  <div class="tk" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="tk-head">
      <div>
        <h1>{{ isAr ? 'المهام' : 'Tasks' }}</h1>
        <p>{{ isAr ? 'متابعات الفريق: من يتصل بمن ومتى. أضف مهمة من هنا أو من زر «مهمة» داخل المحادثة.' : 'Team follow-ups: who calls whom, and when. Add one here or with the "Task" button inside a chat.' }}</p>
      </div>
      <button type="button" class="tk-new" @click="showModal = true"><i class="fas fa-plus"></i> {{ isAr ? 'مهمة جديدة' : 'New task' }}</button>
    </div>

    <div class="tk-tabs">
      <button v-for="t in TABS" :key="t.key" type="button" :class="{ on: view === t.key }" @click="setView(t.key)">
        {{ isAr ? t.ar : t.en }}<span v-if="t.key === 'mine' && summary.open" class="tk-count" :class="{ late: summary.overdue }">{{ summary.open }}</span>
      </button>
    </div>

    <div v-if="loading" class="tk-empty"><i class="fas fa-spinner fa-spin"></i></div>
    <div v-else-if="tasks.length === 0" class="tk-empty">
      {{ view === 'done' ? (isAr ? 'لا مهام منجزة بعد.' : 'No finished tasks yet.') : (isAr ? 'لا مهام مفتوحة. 🎉' : 'No open tasks. 🎉') }}
    </div>

    <template v-else>
      <section v-for="g in groups" :key="g.key" class="tk-group">
        <h2 :class="g.key">{{ g.label }} <span>{{ g.items.length }}</span></h2>
        <div v-for="t in g.items" :key="t.id" class="tk-row" :class="{ done: t.status === 'DONE' }">
          <button type="button" class="tk-check" :class="{ on: t.status === 'DONE' }" :title="t.status === 'DONE' ? (isAr ? 'إرجاعها مفتوحة' : 'Reopen') : (isAr ? 'تم' : 'Done')" @click="toggleDone(t)">
            <i class="fas fa-check"></i>
          </button>
          <div class="tk-main">
            <div class="tk-title">{{ t.title }}</div>
            <div v-if="t.notes" class="tk-notes">{{ t.notes }}</div>
            <div class="tk-meta">
              <router-link v-if="t.threadId" :to="`/live-chat?thread=${t.threadId}`" class="tk-chat"><i class="fas fa-comment-dots"></i> {{ t.contactName || t.contactPhone }}</router-link>
              <span v-if="t.dueAt && t.status === 'OPEN'" class="tk-due" :class="dueGroup(t.dueAt)"><i class="far fa-clock"></i> {{ dueLabel(t.dueAt, isAr) }}</span>
              <span v-if="t.status === 'DONE' && t.completedAt" class="tk-due"><i class="fas fa-check-double"></i> {{ new Date(t.completedAt).toLocaleString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) }}</span>
            </div>
          </div>
          <select class="tk-assignee" :value="t.assigneeId || 'owner'" :disabled="t.status === 'DONE'" @change="reassign(t, $event.target.value)">
            <option value="owner">{{ isAr ? 'صاحب الحساب' : 'Account owner' }}</option>
            <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
          <button type="button" class="tk-del" :title="isAr ? 'حذف' : 'Delete'" @click="remove(t)"><i class="fas fa-trash"></i></button>
        </div>
      </section>
    </template>

    <TaskModal v-if="showModal" :is-ar="isAr" @close="showModal = false" @saved="load" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Swal from 'sweetalert2'
import TaskModal from '../components/TaskModal.vue'
import { dueGroup, dueLabel } from '../utils/taskTime'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const TABS = [
  { key: 'mine', ar: 'مهامي', en: 'My tasks' },
  { key: 'all', ar: 'كل المهام المفتوحة', en: 'All open' },
  { key: 'done', ar: 'المنجزة', en: 'Done' }
]
const view = ref('mine')
const tasks = ref([])
const members = ref([])
const summary = ref({ open: 0, overdue: 0 })
const loading = ref(true)
const showModal = ref(false)

const GROUPS = [
  { key: 'late', ar: 'متأخرة', en: 'Late' },
  { key: 'today', ar: 'اليوم', en: 'Today' },
  { key: 'tomorrow', ar: 'غداً', en: 'Tomorrow' },
  { key: 'later', ar: 'لاحقاً', en: 'Later' },
  { key: 'none', ar: 'بدون موعد', en: 'No due time' }
]
const groups = computed(() => {
  if (view.value === 'done') return [{ key: 'done', label: isAr.value ? 'المنجزة' : 'Done', items: tasks.value }]
  return GROUPS
    .map(g => ({ key: g.key, label: isAr.value ? g.ar : g.en, items: tasks.value.filter(t => dueGroup(t.dueAt) === g.key) }))
    .filter(g => g.items.length)
})

const loadSummary = async () => {
  try { summary.value = (await axios.get('/api/v1/tasks/summary')).data.data } catch { /* badge only */ }
}
const load = async () => {
  loading.value = true
  try {
    tasks.value = (await axios.get('/api/v1/tasks', { params: { view: view.value } })).data.data
  } catch {
    tasks.value = []
  } finally {
    loading.value = false
  }
  loadSummary()
  window.dispatchEvent(new Event('tasks-updated'))
}
const setView = (key) => { view.value = key; load() }

const toggleDone = async (t) => {
  await axios.patch(`/api/v1/tasks/${t.id}`, { status: t.status === 'DONE' ? 'OPEN' : 'DONE' })
  load()
}
const reassign = async (t, assigneeId) => {
  try {
    await axios.patch(`/api/v1/tasks/${t.id}`, { assigneeId })
    load()
  } catch (err) {
    Swal.fire({ icon: 'error', text: err.response?.data?.message || '', confirmButtonColor: '#FF6600' })
  }
}
const remove = async (t) => {
  const ok = await Swal.fire({
    icon: 'warning', title: isAr.value ? 'حذف المهمة؟' : 'Delete the task?', text: t.title,
    showCancelButton: true, confirmButtonText: isAr.value ? 'حذف' : 'Delete', cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel', confirmButtonColor: '#dc2626'
  })
  if (!ok.isConfirmed) return
  try {
    await axios.delete(`/api/v1/tasks/${t.id}`)
    load()
  } catch (err) {
    Swal.fire({ icon: 'error', text: err.response?.data?.message || '', confirmButtonColor: '#FF6600' })
  }
}

onMounted(async () => {
  load()
  try {
    members.value = ((await axios.get('/api/v1/tickets/assignees')).data.data.members || []).filter(m => m.isActive !== false)
  } catch { members.value = [] }
})
</script>

<style scoped>
.tk { padding: 24px; max-width: 980px; }
.tk-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.tk-head h1 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
.tk-head p { margin: 4px 0 0; font-size: .85rem; color: #64748b; max-width: 620px; }
.tk-new { border: none; background: #FF6600; color: #fff; font-weight: 700; border-radius: 12px; padding: 10px 16px; cursor: pointer; }
.tk-tabs { display: flex; gap: 6px; margin: 18px 0 14px; flex-wrap: wrap; }
.tk-tabs button { border: 1px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; font-size: .85rem; border-radius: 999px; padding: 6px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.tk-tabs button.on { background: #0f172a; border-color: #0f172a; color: #fff; }
.tk-count { background: #FF6600; color: #fff; border-radius: 999px; font-size: .7rem; padding: 0 7px; line-height: 18px; }
.tk-count.late { background: #dc2626; }
.tk-empty { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px; text-align: center; color: #94a3b8; }
.tk-group { margin-bottom: 18px; }
.tk-group h2 { font-size: .8rem; font-weight: 800; color: #475569; margin: 0 0 8px; text-transform: uppercase; }
.tk-group h2 span { color: #94a3b8; font-weight: 600; }
.tk-group h2.late { color: #dc2626; }
.tk-row { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 14px; margin-bottom: 8px; }
.tk-row.done .tk-title { color: #94a3b8; text-decoration: line-through; }
.tk-check { width: 26px; height: 26px; border-radius: 999px; border: 2px solid #cbd5e1; background: #fff; color: transparent; cursor: pointer; flex-shrink: 0; font-size: 11px; }
.tk-check:hover { border-color: #16a34a; color: #16a34a; }
.tk-check.on { background: #16a34a; border-color: #16a34a; color: #fff; }
.tk-main { flex: 1; min-width: 0; }
.tk-title { font-weight: 700; color: #0f172a; font-size: .9rem; }
.tk-notes { font-size: .78rem; color: #64748b; margin-top: 2px; white-space: pre-line; }
.tk-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px; font-size: .75rem; }
.tk-chat { color: #2563eb; text-decoration: none; font-weight: 600; }
.tk-due { color: #64748b; }
.tk-due.late { color: #dc2626; font-weight: 700; }
.tk-due.today { color: #c2410c; font-weight: 700; }
.tk-assignee { border: 1px solid #e2e8f0; border-radius: 10px; padding: 5px 8px; font-size: .78rem; background: #f8fafc; max-width: 160px; }
.tk-del { border: none; background: none; color: #cbd5e1; cursor: pointer; }
.tk-del:hover { color: #dc2626; }
@media (max-width: 640px) { .tk-row { flex-wrap: wrap; } .tk-assignee { max-width: none; flex: 1; } }
</style>
