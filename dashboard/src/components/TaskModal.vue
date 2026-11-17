<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="tm">
      <div class="tm-head">
        <div>
          <h3>{{ isAr ? 'مهمة متابعة' : 'Follow-up task' }}</h3>
          <p v-if="thread">{{ isAr ? 'على محادثة' : 'On the chat with' }} {{ thread.contactName || thread.contactPhone }}</p>
        </div>
        <button type="button" class="tm-x" @click="$emit('close')"><i class="fas fa-times"></i></button>
      </div>

      <!-- Open tasks of this conversation -->
      <div v-if="existing.length" class="tm-existing">
        <div class="tm-label">{{ isAr ? 'مهام مفتوحة على هذه المحادثة' : 'Open tasks on this chat' }}</div>
        <div v-for="t in existing" :key="t.id" class="tm-item">
          <button type="button" class="tm-check" :title="isAr ? 'تم' : 'Done'" @click="complete(t)"><i class="fas fa-check"></i></button>
          <span class="tm-item-title">{{ t.title }}</span>
          <span v-if="t.dueAt" class="tm-due" :class="{ late: new Date(t.dueAt) < new Date() }">{{ dueLabel(t.dueAt) }}</span>
        </div>
      </div>

      <form class="tm-form" @submit.prevent="save">
        <label class="tm-label">{{ isAr ? 'المطلوب' : 'What to do' }}</label>
        <input v-model.trim="form.title" required maxlength="200" class="tm-input" :placeholder="isAr ? 'مثال: الاتصال بالعميل لتأكيد الطلب' : 'e.g. Call to confirm the order'" />
        <div class="tm-quick">
          <button v-for="q in QUICK" :key="q.key" type="button" :class="{ on: quick === q.key }" @click="setQuick(q)">{{ isAr ? q.ar : q.en }}</button>
        </div>
        <div class="tm-grid">
          <div>
            <label class="tm-label">{{ isAr ? 'الموعد' : 'Due' }}</label>
            <input v-model="form.dueAt" type="datetime-local" class="tm-input" dir="ltr" @input="quick = ''" />
          </div>
          <div>
            <label class="tm-label">{{ isAr ? 'المسؤول' : 'Assigned to' }}</label>
            <select v-model="form.assigneeId" class="tm-input">
              <option value="owner">{{ isAr ? 'صاحب الحساب' : 'Account owner' }}</option>
              <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}{{ m.id === me ? (isAr ? ' (أنا)' : ' (me)') : '' }}</option>
            </select>
          </div>
        </div>
        <label class="tm-label">{{ isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)' }}</label>
        <textarea v-model="form.notes" rows="2" maxlength="5000" class="tm-input"></textarea>
        <p v-if="error" class="tm-err">{{ error }}</p>
        <div class="tm-actions">
          <button type="button" class="tm-cancel" @click="$emit('close')">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button type="submit" class="tm-save" :disabled="saving">{{ saving ? '…' : (isAr ? 'حفظ المهمة' : 'Save task') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { toLocalInput, dueLabel as dueText } from '../utils/taskTime'

const props = defineProps({
  thread: { type: Object, default: null }, // { id, contactName, contactPhone }
  isAr: { type: Boolean, default: true }
})
const emit = defineEmits(['close', 'saved'])

const members = ref([])
const me = ref(null)
const existing = ref([])
const saving = ref(false)
const error = ref('')
const quick = ref('tomorrow')
const at = (days, hour) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d }
const QUICK = [
  { key: 'hour', ar: 'بعد ساعة', en: 'In 1 hour', at: () => new Date(Date.now() + 60 * 60e3) },
  { key: 'evening', ar: 'اليوم 5 م', en: 'Today 5 pm', at: () => at(0, 17) },
  { key: 'tomorrow', ar: 'غداً 10 ص', en: 'Tomorrow 10 am', at: () => at(1, 10) },
  { key: 'week', ar: 'بعد أسبوع', en: 'In a week', at: () => at(7, 10) }
]
const form = ref({
  title: props.thread ? (props.isAr ? `متابعة مع ${props.thread.contactName || props.thread.contactPhone}` : `Follow up with ${props.thread.contactName || props.thread.contactPhone}`) : '',
  dueAt: toLocalInput(at(1, 10)),
  assigneeId: 'owner',
  notes: ''
})
const setQuick = (q) => { quick.value = q.key; form.value.dueAt = toLocalInput(q.at()) }
const dueLabel = (d) => dueText(d, props.isAr)

const loadExisting = async () => {
  if (!props.thread?.id) return
  try {
    const res = await axios.get('/api/v1/tasks', { params: { threadId: props.thread.id } })
    existing.value = res.data.data.filter(t => t.status === 'OPEN')
  } catch { existing.value = [] }
}

const complete = async (t) => {
  try {
    await axios.patch(`/api/v1/tasks/${t.id}`, { status: 'DONE' })
    existing.value = existing.value.filter(x => x.id !== t.id)
    emit('saved')
  } catch (err) {
    error.value = err.response?.data?.message || ''
  }
}

const save = async () => {
  saving.value = true
  error.value = ''
  try {
    const res = await axios.post('/api/v1/tasks', {
      title: form.value.title,
      notes: form.value.notes || null,
      dueAt: form.value.dueAt ? new Date(form.value.dueAt).toISOString() : null,
      assigneeId: form.value.assigneeId,
      threadId: props.thread?.id || null
    })
    emit('saved', res.data.data)
    emit('close')
  } catch (err) {
    error.value = err.response?.data?.message || (props.isAr ? 'تعذّر حفظ المهمة' : 'Could not save the task')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loadExisting()
  try {
    const res = await axios.get('/api/v1/tickets/assignees')
    me.value = res.data.data.me
    members.value = (res.data.data.members || []).filter(m => m.isActive !== false)
    if (me.value) form.value.assigneeId = me.value
  } catch { members.value = [] }
})
</script>

<style scoped>
.tm { position: relative; z-index: 10; background: #fff; border-radius: 18px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(15, 23, 42, .25); }
.tm-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
.tm-head h3 { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; }
.tm-head p { margin: 2px 0 0; font-size: .75rem; color: #64748b; }
.tm-x { border: none; background: none; color: #94a3b8; cursor: pointer; font-size: 1rem; }
.tm-existing { padding: 12px 20px 0; }
.tm-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: .85rem; }
.tm-item-title { flex: 1; color: #334155; }
.tm-check { width: 22px; height: 22px; border-radius: 999px; border: 1.5px solid #cbd5e1; background: #fff; color: transparent; cursor: pointer; font-size: 10px; flex-shrink: 0; }
.tm-check:hover { border-color: #16a34a; color: #16a34a; }
.tm-due { font-size: .7rem; color: #64748b; white-space: nowrap; }
.tm-due.late { color: #dc2626; font-weight: 700; }
.tm-form { padding: 14px 20px 18px; display: flex; flex-direction: column; gap: 6px; }
.tm-label { font-size: .75rem; font-weight: 700; color: #475569; margin-top: 6px; display: block; }
.tm-input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: .85rem; outline: none; background: #fff; box-sizing: border-box; }
.tm-input:focus { border-color: #FF6600; }
.tm-quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.tm-quick button { border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; font-size: .72rem; font-weight: 600; border-radius: 999px; padding: 4px 10px; cursor: pointer; }
.tm-quick button.on { background: #fff7ed; border-color: #FF6600; color: #c2410c; }
.tm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tm-err { color: #dc2626; font-size: .8rem; margin: 4px 0 0; }
.tm-actions { display: flex; gap: 10px; margin-top: 10px; }
.tm-cancel, .tm-save { flex: 1; padding: 9px; border-radius: 12px; font-weight: 700; font-size: .85rem; cursor: pointer; }
.tm-cancel { border: 1px solid #e2e8f0; background: #fff; color: #475569; }
.tm-save { border: none; background: #FF6600; color: #fff; }
.tm-save:disabled { opacity: .6; cursor: progress; }
@media (max-width: 480px) { .tm-grid { grid-template-columns: 1fr; } }
</style>
