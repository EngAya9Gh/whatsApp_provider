<template>
  <div class="team-chat" :dir="isAr ? 'rtl' : 'ltr'">
    <!-- Conversations -->
    <aside class="list-pane" :class="{ 'hide-mobile': active }">
      <div class="list-head">
        <h2>{{ isAr ? 'المحادثات الداخلية' : 'Team Chat' }}</h2>
        <div class="flex gap-2">
          <button type="button" class="head-btn" @click="openPicker('direct')" :title="isAr ? 'رسالة جديدة' : 'New message'"><i class="fas fa-pen-to-square"></i></button>
          <button type="button" class="head-btn" @click="openPicker('group')" :title="isAr ? 'مجموعة جديدة' : 'New group'"><i class="fas fa-users"></i></button>
        </div>
      </div>
      <input v-model="search" class="search" :placeholder="isAr ? 'بحث…' : 'Search…'" />

      <div v-if="loadingList" class="p-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
      <div v-else-if="filteredConversations.length === 0" class="empty-list">
        <i class="fas fa-comments"></i>
        <p>{{ isAr ? 'لا توجد محادثات بعد. ابدأ محادثة مع زميل.' : 'No conversations yet. Message a colleague.' }}</p>
        <button type="button" class="primary-btn" @click="openPicker('direct')">{{ isAr ? 'رسالة جديدة' : 'New message' }}</button>
      </div>
      <button
        v-for="c in filteredConversations"
        :key="c.id"
        type="button"
        class="conv-item"
        :class="{ active: active?.id === c.id }"
        @click="openConversation(c)"
      >
        <span class="avatar" :class="c.type === 'GROUP' ? 'group' : ''">
          <i v-if="c.type === 'GROUP'" class="fas fa-users"></i>
          <template v-else>{{ initial(c.title) }}</template>
        </span>
        <span class="conv-main">
          <span class="conv-top">
            <span class="conv-title">{{ c.title }}</span>
            <span class="conv-time">{{ c.lastMessage ? shortTime(c.lastMessageAt) : '' }}</span>
          </span>
          <span class="conv-bottom">
            <span class="conv-preview">
              <template v-if="c.lastMessage">{{ c.lastMessage.senderKey === me ? (isAr ? 'أنت: ' : 'You: ') : '' }}{{ c.lastMessage.text }}</template>
              <template v-else>{{ isAr ? 'لا توجد رسائل' : 'No messages' }}</template>
            </span>
            <span v-if="c.unread" class="badge">{{ c.unread }}</span>
          </span>
        </span>
      </button>
    </aside>

    <!-- Messages -->
    <section class="msg-pane" :class="{ 'hide-mobile': !active }">
      <div v-if="!active" class="no-conv">
        <i class="far fa-comments"></i>
        <p>{{ isAr ? 'اختر محادثة أو ابدأ محادثة جديدة مع زميل.' : 'Pick a conversation or start one with a colleague.' }}</p>
      </div>

      <template v-else>
        <header class="msg-head">
          <button type="button" class="back-mobile" @click="active = null"><i class="fas" :class="isAr ? 'fa-arrow-right' : 'fa-arrow-left'"></i></button>
          <span class="avatar" :class="active.type === 'GROUP' ? 'group' : ''">
            <i v-if="active.type === 'GROUP'" class="fas fa-users"></i>
            <template v-else>{{ initial(active.title) }}</template>
          </span>
          <div class="min-w-0 flex-1">
            <div class="font-bold text-slate-800 truncate">{{ active.title }}</div>
            <div class="text-xs text-slate-500 truncate">
              <template v-if="active.type === 'GROUP'">{{ active.members.map(m => m.key === me ? (isAr ? 'أنت' : 'You') : m.name).join('، ') }}</template>
              <template v-else>{{ roleLabel(otherMember(active)?.role) }}</template>
            </div>
          </div>
          <template v-if="active.type === 'GROUP'">
            <button type="button" class="head-btn" @click="openPicker('edit')" :title="isAr ? 'تعديل المجموعة' : 'Edit group'"><i class="fas fa-user-plus"></i></button>
            <button type="button" class="head-btn danger" @click="leaveGroup" :title="isAr ? 'مغادرة' : 'Leave'"><i class="fas fa-right-from-bracket"></i></button>
          </template>
        </header>

        <div ref="scroller" class="messages">
          <div v-if="hasMore" class="text-center my-2">
            <button type="button" class="more-btn" :disabled="loadingMore" @click="loadOlder">{{ isAr ? 'رسائل أقدم' : 'Older messages' }}</button>
          </div>
          <div v-if="loadingMessages" class="text-center text-slate-400 py-8"><i class="fas fa-spinner fa-spin"></i></div>
          <template v-for="(m, i) in messages" :key="m.id">
            <div v-if="showDay(i)" class="day-sep"><span>{{ dayLabel(m.createdAt) }}</span></div>
            <div class="msg-row" :class="m.senderKey === me ? 'mine' : 'theirs'">
              <div class="bubble">
                <div v-if="active.type === 'GROUP' && m.senderKey !== me && senderChanged(i)" class="sender">{{ memberName(m.senderKey) }}</div>
                <router-link v-if="m.threadRef" :to="`/live-chat?thread=${m.threadRef.threadId}`" class="thread-card">
                  <i class="fab fa-whatsapp"></i>
                  <span class="min-w-0">
                    <span class="block font-semibold truncate">{{ m.threadRef.contactName || m.threadRef.contactPhone }}</span>
                    <span class="block text-[11px] opacity-75" dir="ltr">{{ m.threadRef.contactPhone }}</span>
                  </span>
                  <span class="open">{{ isAr ? 'فتح المحادثة' : 'Open chat' }}</span>
                </router-link>
                <div v-if="m.text" class="text">{{ m.text }}</div>
                <div class="time">{{ clock(m.createdAt) }}</div>
              </div>
            </div>
          </template>
          <div v-if="!loadingMessages && messages.length === 0" class="text-center text-sm text-slate-400 py-10">
            {{ isAr ? 'ابدأ المحادثة 👋' : 'Say hello 👋' }}
          </div>
        </div>

        <form class="composer" @submit.prevent="send">
          <textarea
            v-model="draft"
            rows="1"
            maxlength="4000"
            :placeholder="isAr ? 'اكتب رسالة… (Enter للإرسال، Shift+Enter لسطر جديد)' : 'Write a message… (Enter to send, Shift+Enter for a new line)'"
            @keydown.enter.exact.prevent="send"
          ></textarea>
          <button type="submit" class="send-btn" :disabled="sending || !draft.trim()"><i class="fas fa-paper-plane"></i></button>
        </form>
      </template>
    </section>

    <!-- New message / group / edit group -->
    <div v-if="picker" class="modal-wrap">
      <div class="modal-bg" @click="picker = null"></div>
      <div class="modal">
        <div class="modal-head">
          <h3>{{ picker === 'direct' ? (isAr ? 'رسالة جديدة' : 'New message') : picker === 'group' ? (isAr ? 'مجموعة جديدة' : 'New group') : (isAr ? 'تعديل المجموعة' : 'Edit group') }}</h3>
          <button type="button" class="close" @click="picker = null"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <input v-if="picker !== 'direct'" v-model="groupName" maxlength="60" class="inp mb-3" :placeholder="isAr ? 'اسم المجموعة' : 'Group name'" />
          <input v-model="memberSearch" class="inp mb-2" :placeholder="isAr ? 'ابحث عن زميل…' : 'Search colleagues…'" />
          <div class="member-list">
            <template v-for="m in pickableMembers" :key="m.key">
              <button v-if="picker === 'direct'" type="button" class="member" @click="startDirect(m.key)">
                <span class="avatar sm">{{ initial(m.name) }}</span>
                <span class="flex-1 text-start">{{ m.name }}</span>
                <span class="text-xs text-slate-400">{{ roleLabel(m.role) }}</span>
              </button>
              <label v-else class="member">
                <input type="checkbox" :value="m.key" v-model="selectedKeys" class="accent-[#FF6600]" />
                <span class="avatar sm">{{ initial(m.name) }}</span>
                <span class="flex-1 text-start">{{ m.name }}</span>
                <span class="text-xs text-slate-400">{{ roleLabel(m.role) }}</span>
              </label>
            </template>
            <p v-if="pickableMembers.length === 0" class="text-sm text-slate-400 text-center py-4">{{ isAr ? 'لا يوجد زملاء.' : 'No colleagues.' }}</p>
          </div>
        </div>
        <div v-if="picker !== 'direct'" class="modal-foot">
          <button type="button" class="ghost-btn" @click="picker = null">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
          <button type="button" class="primary-btn" :disabled="!groupName.trim() || selectedKeys.length === 0 || savingGroup" @click="saveGroup">
            {{ picker === 'group' ? (isAr ? 'إنشاء' : 'Create') : (isAr ? 'حفظ' : 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Swal from 'sweetalert2'
import { connectSocket } from '../services/realtime'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const route = useRoute()
const router = useRouter()

const me = ref('')
const members = ref([])
const conversations = ref([])
const active = ref(null)
const messages = ref([])
const hasMore = ref(false)
const search = ref('')
const draft = ref('')
const loadingList = ref(true)
const loadingMessages = ref(false)
const loadingMore = ref(false)
const sending = ref(false)
const scroller = ref(null)
let socket = null

const memberMap = computed(() => Object.fromEntries(members.value.map(m => [m.key, m])))
const memberName = (key) => (key === me.value ? (isAr.value ? 'أنت' : 'You') : memberMap.value[key]?.name || '—')
const otherMember = (c) => c.members.find(m => m.key !== me.value)
const initial = (name) => (name || '?').trim().charAt(0).toUpperCase()
const roleLabel = (role) => ({
  OWNER: isAr.value ? 'صاحب الحساب' : 'Owner',
  ADMIN: isAr.value ? 'مسؤول' : 'Admin',
  MANAGER: isAr.value ? 'مدير' : 'Manager',
  AGENT: isAr.value ? 'موظف' : 'Agent'
}[role] || '')

const filteredConversations = computed(() => {
  const q = search.value.trim().toLowerCase()
  return conversations.value.filter(c => !q || c.title.toLowerCase().includes(q))
})

const errorMessage = (err) => {
  const e = err.response?.data?.error
  return (typeof e === 'string' ? e : e?.message) || err.message
}

// ─── Time formatting ──────────────────────────────────────────
const fmtLocale = computed(() => (isAr.value ? 'ar-u-nu-latn' : 'en-US'))
const clock = (d) => new Date(d).toLocaleTimeString(fmtLocale.value, { hour: '2-digit', minute: '2-digit' })
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()
const shortTime = (d) => (sameDay(d, Date.now()) ? clock(d) : new Date(d).toLocaleDateString(fmtLocale.value, { day: 'numeric', month: 'short' }))
const dayLabel = (d) => {
  if (sameDay(d, Date.now())) return isAr.value ? 'اليوم' : 'Today'
  if (sameDay(d, Date.now() - 86400000)) return isAr.value ? 'أمس' : 'Yesterday'
  return new Date(d).toLocaleDateString(fmtLocale.value, { weekday: 'long', day: 'numeric', month: 'long' })
}
const showDay = (i) => i === 0 || !sameDay(messages.value[i - 1].createdAt, messages.value[i].createdAt)
const senderChanged = (i) => i === 0 || messages.value[i - 1].senderKey !== messages.value[i].senderKey || showDay(i)

const scrollDown = () => nextTick(() => { if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight })

// ─── Data ─────────────────────────────────────────────────────
const fetchConversations = async () => {
  const res = await axios.get('/api/v1/team-chat/conversations')
  conversations.value = res.data.data || []
  if (active.value) {
    const fresh = conversations.value.find(c => c.id === active.value.id)
    if (fresh) active.value = { ...fresh, unread: 0 }
    else active.value = null
  }
}

const markRead = async (conversation) => {
  conversation.unread = 0
  try {
    await axios.post(`/api/v1/team-chat/conversations/${conversation.id}/read`)
  } catch { /* the badge refreshes on the next event */ }
}

const openConversation = async (c) => {
  active.value = c
  messages.value = []
  hasMore.value = false
  loadingMessages.value = true
  router.replace({ query: { c: c.id } })
  try {
    const res = await axios.get(`/api/v1/team-chat/conversations/${c.id}/messages`)
    if (active.value?.id !== c.id) return
    messages.value = res.data.data.messages
    hasMore.value = res.data.data.hasMore
    scrollDown()
    markRead(c)
  } catch (err) {
    Swal.fire({ icon: 'error', title: errorMessage(err), confirmButtonColor: '#FF6600' })
  } finally {
    loadingMessages.value = false
  }
}

const loadOlder = async () => {
  if (!active.value || !messages.value.length) return
  loadingMore.value = true
  const box = scroller.value
  const previousHeight = box?.scrollHeight || 0
  try {
    const res = await axios.get(`/api/v1/team-chat/conversations/${active.value.id}/messages`, { params: { before: messages.value[0].id } })
    messages.value = [...res.data.data.messages, ...messages.value]
    hasMore.value = res.data.data.hasMore
    // Keep the reader's place
    await nextTick()
    if (box) box.scrollTop = box.scrollHeight - previousHeight
  } finally {
    loadingMore.value = false
  }
}

const send = async () => {
  const text = draft.value.trim()
  if (!text || !active.value || sending.value) return
  sending.value = true
  try {
    const res = await axios.post(`/api/v1/team-chat/conversations/${active.value.id}/messages`, { text })
    draft.value = ''
    addMessage(res.data.data)
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'لم تُرسل الرسالة' : 'Message not sent', text: errorMessage(err), confirmButtonColor: '#FF6600' })
  } finally {
    sending.value = false
  }
}

const addMessage = (m) => {
  if (active.value?.id === m.conversationId && !messages.value.some(x => x.id === m.id)) {
    messages.value.push(m)
    scrollDown()
  }
  const c = conversations.value.find(x => x.id === m.conversationId)
  if (c) {
    c.lastMessage = { text: m.text || (m.threadRef ? `🔗 ${m.threadRef.contactName || m.threadRef.contactPhone}` : ''), senderKey: m.senderKey }
    c.lastMessageAt = m.createdAt
    conversations.value.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
  }
}

// ─── New message / groups ─────────────────────────────────────
const picker = ref(null) // 'direct' | 'group' | 'edit'
const memberSearch = ref('')
const groupName = ref('')
const selectedKeys = ref([])
const savingGroup = ref(false)

const pickableMembers = computed(() => {
  const q = memberSearch.value.trim().toLowerCase()
  return members.value.filter(m => m.key !== me.value && (!q || m.name.toLowerCase().includes(q)))
})

const openPicker = (kind) => {
  picker.value = kind
  memberSearch.value = ''
  if (kind === 'edit' && active.value) {
    groupName.value = active.value.name
    selectedKeys.value = active.value.members.map(m => m.key).filter(k => k !== me.value)
  } else {
    groupName.value = ''
    selectedKeys.value = []
  }
}

const startDirect = async (key) => {
  try {
    const res = await axios.post('/api/v1/team-chat/conversations/direct', { memberKey: key })
    picker.value = null
    await fetchConversations()
    openConversation(conversations.value.find(c => c.id === res.data.data.id) || res.data.data)
  } catch (err) {
    Swal.fire({ icon: 'error', title: errorMessage(err), confirmButtonColor: '#FF6600' })
  }
}

const saveGroup = async () => {
  savingGroup.value = true
  try {
    const payload = { name: groupName.value, memberKeys: selectedKeys.value }
    const res = picker.value === 'group'
      ? await axios.post('/api/v1/team-chat/conversations/group', payload)
      : await axios.put(`/api/v1/team-chat/conversations/${active.value.id}`, payload)
    picker.value = null
    await fetchConversations()
    const c = conversations.value.find(x => x.id === res.data.data.id)
    if (c) openConversation(c)
  } catch (err) {
    Swal.fire({ icon: 'error', title: errorMessage(err), confirmButtonColor: '#FF6600' })
  } finally {
    savingGroup.value = false
  }
}

const leaveGroup = async () => {
  const answer = await Swal.fire({
    icon: 'warning',
    title: isAr.value ? `مغادرة «${active.value.title}»؟` : `Leave "${active.value.title}"?`,
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: isAr.value ? 'مغادرة' : 'Leave',
    cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
  })
  if (!answer.isConfirmed) return
  await axios.post(`/api/v1/team-chat/conversations/${active.value.id}/leave`)
  active.value = null
  router.replace({ query: {} })
  await fetchConversations()
}

// ─── Realtime ─────────────────────────────────────────────────
const onTeamMessage = (m) => {
  const known = conversations.value.some(c => c.id === m.conversationId)
  if (!known) return fetchConversations()
  addMessage(m)
  if (m.senderKey === me.value) return
  if (active.value?.id === m.conversationId && !document.hidden) {
    markRead(active.value)
  } else {
    const c = conversations.value.find(x => x.id === m.conversationId)
    if (c) c.unread = (c.unread || 0) + 1
  }
}

const onVisible = () => {
  if (!document.hidden && active.value?.unread !== undefined) markRead(active.value)
}

watch(() => route.query.c, (id) => {
  if (id && active.value?.id !== id) {
    const c = conversations.value.find(x => x.id === id)
    if (c) openConversation(c)
  }
})

onMounted(async () => {
  try {
    const [membersRes] = await Promise.all([axios.get('/api/v1/team-chat/members'), fetchConversations()])
    me.value = membersRes.data.data.me
    members.value = membersRes.data.data.members
    const fromLink = route.query.c && conversations.value.find(c => c.id === route.query.c)
    if (fromLink) openConversation(fromLink)
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر تحميل المحادثات' : 'Could not load conversations', text: errorMessage(err), confirmButtonColor: '#FF6600' })
  } finally {
    loadingList.value = false
  }
  socket = connectSocket()
  socket.on('team_message', onTeamMessage)
  socket.on('team_conversation', () => fetchConversations())
  document.addEventListener('visibilitychange', onVisible)
})

onUnmounted(() => {
  socket?.disconnect()
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<style scoped>
.team-chat { display: flex; height: calc(100vh - 100px); background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
.list-pane { width: 320px; flex-shrink: 0; border-inline-end: 1px solid #f1f5f9; display: flex; flex-direction: column; background: #fcfcfd; }
.list-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 10px; }
.list-head h2 { font-size: 1.05rem; font-weight: 700; color: #0f172a; margin: 0; }
.head-btn { width: 34px; height: 34px; border-radius: 10px; border: none; background: #f1f5f9; color: #475569; cursor: pointer; }
.head-btn:hover { background: #e2e8f0; }
.head-btn.danger { color: #dc2626; background: #fef2f2; }
.search { margin: 0 16px 10px; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13px; outline: none; background: white; }
.search:focus { border-color: #FF6600; }
.empty-list { text-align: center; color: #64748b; font-size: 13px; padding: 32px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.empty-list i { font-size: 28px; color: #cbd5e1; }
.conv-item { display: flex; gap: 10px; align-items: center; width: 100%; padding: 10px 16px; background: transparent; border: none; border-bottom: 1px solid #f5f5f5; cursor: pointer; text-align: start; }
.conv-item:hover { background: #f5f7f9; }
.conv-item.active { background: #fff7f2; box-shadow: inset 3px 0 0 #FF6600; }
[dir="rtl"] .conv-item.active { box-shadow: inset -3px 0 0 #FF6600; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #e0e7ff; color: #4338ca; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar.group { background: #ffedd5; color: #c2410c; }
.avatar.sm { width: 30px; height: 30px; font-size: 13px; }
.conv-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.conv-top, .conv-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.conv-title { font-weight: 600; color: #0f172a; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conv-time { font-size: 11px; color: #94a3b8; flex-shrink: 0; }
.conv-preview { font-size: 12.5px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { background: #FF6600; color: white; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 7px; flex-shrink: 0; }
.msg-pane { flex: 1; min-width: 0; display: flex; flex-direction: column; background: #f8fafc; }
.no-conv { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #94a3b8; font-size: 14px; }
.no-conv i { font-size: 48px; color: #e2e8f0; }
.msg-head { display: flex; align-items: center; gap: 10px; padding: 12px 18px; background: white; border-bottom: 1px solid #f1f5f9; }
.back-mobile { display: none; width: 32px; height: 32px; border: none; background: #f1f5f9; border-radius: 10px; color: #475569; }
.messages { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }
.more-btn { font-size: 12px; font-weight: 600; color: #475569; background: white; border: 1px solid #e2e8f0; border-radius: 999px; padding: 4px 12px; cursor: pointer; }
.day-sep { text-align: center; margin: 10px 0 6px; }
.day-sep span { font-size: 11px; color: #64748b; background: #e2e8f0; border-radius: 999px; padding: 2px 10px; }
.msg-row { display: flex; }
.msg-row.mine { justify-content: flex-end; }
.bubble { max-width: min(70%, 520px); padding: 7px 11px 5px; border-radius: 14px; background: white; box-shadow: 0 1px 1px rgba(0,0,0,0.05); }
.msg-row.mine .bubble { background: #ffedd5; }
.sender { font-size: 11.5px; font-weight: 700; color: #4f46e5; margin-bottom: 2px; }
.text { font-size: 13.5px; color: #0f172a; white-space: pre-wrap; word-wrap: break-word; line-height: 1.55; }
.time { font-size: 10.5px; color: #94a3b8; text-align: end; margin-top: 2px; }
.thread-card { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin: 2px 0 4px; border-radius: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d; text-decoration: none; min-width: 220px; }
.thread-card > i { font-size: 20px; color: #16a34a; }
.thread-card .open { margin-inline-start: auto; font-size: 11.5px; font-weight: 700; color: #15803d; white-space: nowrap; }
.composer { display: flex; align-items: flex-end; gap: 8px; padding: 12px 16px; background: white; border-top: 1px solid #f1f5f9; }
.composer textarea { flex: 1; resize: none; max-height: 140px; min-height: 40px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 13.5px; outline: none; font-family: inherit; }
.composer textarea:focus { border-color: #FF6600; }
.send-btn { width: 42px; height: 42px; border-radius: 12px; border: none; background: #FF6600; color: white; cursor: pointer; flex-shrink: 0; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-wrap { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal-bg { position: absolute; inset: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(3px); }
.modal { position: relative; width: 100%; max-width: 420px; background: white; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; }
.modal-head h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
.close { background: none; border: none; color: #94a3b8; cursor: pointer; }
.modal-body { padding: 16px 18px; }
.inp { width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; outline: none; }
.inp:focus { border-color: #FF6600; }
.member-list { max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.member { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; border: none; background: none; cursor: pointer; font-size: 13.5px; color: #0f172a; width: 100%; }
.member:hover { background: #f8fafc; }
.modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid #f1f5f9; }
.primary-btn { background: #FF6600; color: white; border: none; border-radius: 10px; padding: 8px 18px; font-weight: 700; font-size: 13px; cursor: pointer; }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ghost-btn { background: white; color: #475569; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 16px; font-weight: 600; font-size: 13px; cursor: pointer; }
@media (max-width: 768px) {
  .list-pane { width: 100%; }
  .hide-mobile { display: none; }
  .back-mobile { display: inline-flex; align-items: center; justify-content: center; }
}
</style>
