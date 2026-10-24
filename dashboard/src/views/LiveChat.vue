<template>
  <FeatureLock feature="LIVE_CHAT" requiredPlan="STARTER">
    <div class="live-chat-container">
      <!-- Threads Sidebar -->
      <div class="threads-sidebar">
        <div class="sidebar-header">
          <h2><i class="fas fa-comments"></i> Live Chat (Meta)</h2>
          <div class="search-box">
            <input 
              type="text" 
              v-model="searchQuery" 
              @input="onSearch"
              placeholder="Search phone or name..." 
              class="form-control"
            />
          </div>
          <div class="channel-filter" v-if="channels.length > 0">
            <select v-model="selectedChannel" @change="fetchThreads" class="channel-select">
              <option value="">All Sending Numbers ({{ channels.length }})</option>
              <option v-for="ch in channels" :key="ch.id" :value="ch.id">
                {{ ch.name || ch.phoneNumber }} ({{ ch.displayPhoneNumber || ch.phoneNumber }})
              </option>
            </select>
          </div>
          <div class="label-filters" v-if="stageFilterVisible || tags.length > 0">
            <select v-if="stageFilterVisible" v-model="stageFilter" @change="fetchThreads" class="channel-select">
              <option value="">{{ isAr ? 'كل المراحل' : 'All stages' }}</option>
              <option value="none">{{ isAr ? 'بدون مرحلة' : 'No stage' }}</option>
              <option v-for="stage in stageConfig.stages" :key="stage.id" :value="stage.id">{{ stage.name }}</option>
            </select>
            <select v-if="tags.length > 0" v-model="tagFilter" @change="fetchThreads" class="channel-select">
              <option value="">{{ isAr ? 'كل الوسوم' : 'All tags' }}</option>
              <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
            </select>
          </div>
          <div class="pinned-tags" v-if="pinnedTags.length > 0">
            <button
              v-for="tag in pinnedTags"
              :key="tag.id"
              type="button"
              @click="togglePinnedFilter(tag.id)"
              :class="['pinned-tag-chip', { active: tagFilter === tag.id }]"
              :style="tagFilter === tag.id ? { background: tag.color, borderColor: tag.color, color: 'white' } : chipStyle(tag.color)"
            >
              <i class="fas fa-thumbtack"></i>{{ tag.name }}
            </button>
          </div>
        </div>
        
        <div class="threads-list" v-if="threads.length > 0">
          <div 
            v-for="thread in threads" 
            :key="thread.id" 
            @click="selectThread(thread)"
            :class="['thread-item', { active: selectedThread?.id === thread.id }]"
          >
            <div class="thread-avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="thread-info">
              <div class="thread-top">
                <span class="thread-name">{{ thread.contactName || thread.contactPhone }}</span>
                <span class="thread-time">{{ formatTime(thread.lastMessageAt) }}</span>
              </div>
              <div class="thread-bottom">
                <span class="thread-phone">{{ thread.contactPhone }}</span>
                <button @click.stop="quickAssign(thread)" class="btn-icon small text-slate-400 hover:text-[#FF6600]" title="إسناد المحادثة" style="background:transparent; border:none; padding:2px;">
                  <i class="fas fa-user-plus"></i>
                </button>
                <span class="channel-tag" v-if="thread.channel?.displayPhoneNumber || thread.channel?.phoneNumber">
                  {{ thread.channel.displayPhoneNumber || thread.channel.phoneNumber }}
                </span>
                <span class="unread-badge" v-if="thread.unreadCount > 0">{{ thread.unreadCount }}</span>
              </div>
              <div class="thread-labels" v-if="threadStage(thread) || threadTags(thread).length > 0">
                <span v-if="threadStage(thread)" class="label-chip" :style="chipStyle(threadStage(thread).color)">
                  <span class="label-dot" :style="{ background: threadStage(thread).color }"></span>{{ threadStage(thread).name }}
                </span>
                <span v-for="tag in threadTags(thread).slice(0, 2)" :key="tag.id" class="label-chip" :style="chipStyle(tag.color)">{{ tag.name }}</span>
                <span v-if="threadTags(thread).length > 2" class="label-chip label-more">+{{ threadTags(thread).length - 2 }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="no-threads" v-else-if="!loadingThreads">
          <p>No conversations found.</p>
        </div>
        <div class="loading-state" v-if="loadingThreads">
          <AppLoader />
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="chat-main" v-if="selectedThread">
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="thread-avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            <div>
              <h3>
                {{ selectedThread.contactName || selectedThread.contactPhone }}
                <button @click="openRenameModal" class="btn-icon small rename-btn ml-2" title="تعديل الاسم">
                  <i class="fas fa-pen"></i>
                </button>
              </h3>
              <span class="contact-phone">{{ selectedThread.contactPhone }}</span>
            </div>
          </div>
          <div class="chat-header-actions">
            <!-- Case 1: Active Ticket is OPEN -->
            <template v-if="activeTicket && activeTicket.status === 'OPEN'">
              <span class="ticket-badge-open">
                <i class="fas fa-ticket-alt"></i>
                <span>{{ activeTicket.ticketNumber || ('#' + activeTicket.id.slice(0, 8)) }}</span>
              </span>
              <button 
                type="button" 
                @click="promptAssign(activeTicket)" 
                class="ticket-btn ticket-btn-assign"
                :title="isAr ? 'إسناد التذكرة لموظف' : 'Assign to Team Member'"
              >
                <i class="fas fa-user-tag"></i>
                <span>{{ getAssignedUserName(activeTicket.assignedToId) || (isAr ? 'إسناد' : 'Assign') }}</span>
              </button>
              <button 
                type="button" 
                @click="closeActiveTicket" 
                class="ticket-btn ticket-btn-close" 
                :disabled="creatingTicket"
                title="إغلاق التذكرة الحالية"
              >
                <i class="fas fa-times-circle"></i>
                <span>{{ isAr ? 'إغلاق التذكرة' : 'Close Ticket' }}</span>
              </button>
            </template>

            <!-- Case 2: No ticket is currently open -->
            <template v-else>
              <!-- Option to reopen previous closed ticket -->
              <button 
                v-if="hasReopenableTicket" 
                type="button" 
                @click="reopenActiveTicket" 
                class="ticket-btn ticket-btn-reopen" 
                :disabled="creatingTicket"
                :title="isAr ? 'إعادة فتح التذكرة السابقة' : 'Reopen Previous Ticket'"
              >
                <i class="fas fa-redo"></i>
                <span>{{ isAr ? ('إعادة الفتح ' + (activeTicket?.ticketNumber ? `(${activeTicket.ticketNumber})` : '')) : 'Reopen Ticket' }}</span>
              </button>

              <!-- Option to open a new ticket -->
              <button 
                type="button" 
                @click="createManualTicket" 
                class="ticket-btn ticket-btn-new" 
                :disabled="creatingTicket"
                :title="isAr ? 'فتح تذكرة جديدة' : 'Open Ticket'"
              >
                <i class="fas fa-plus"></i>
                <span>{{ creatingTicket ? (isAr ? 'جاري الفتح...' : 'Opening...') : (hasReopenableTicket ? (isAr ? 'فتح تذكرة جديدة' : 'New Ticket') : (isAr ? 'فتح تذكرة' : 'Open Ticket')) }}</span>
              </button>
            </template>
          </div>
        </div>

        <div class="chat-labels-bar">
          <span v-if="selectedThread.flowState" class="bot-chip" :title="isAr ? 'أي رسالة تكتبها للعميل توقف السير وتتولى المحادثة' : 'Any message you send stops the flow and takes over'">
            <i class="fas fa-robot"></i> {{ isAr ? 'سير الواتساب يرد على هذه المحادثة' : 'A WhatsApp flow is answering' }}
          </span>
          <StagePicker
            v-if="isStageActive(selectedThread)"
            :stages="stageConfig.stages"
            :model-value="selectedThread.stageId || null"
            :is-ar="isAr"
            @change="updateThreadStage"
          />
          <span v-for="tag in threadTags(selectedThread)" :key="tag.id" class="label-chip label-chip-lg" :style="chipStyle(tag.color)">
            {{ tag.name }}
            <button type="button" class="label-remove" @click="removeThreadTag(tag.id)" :title="isAr ? 'إزالة الوسم' : 'Remove tag'">
              <i class="fas fa-xmark"></i>
            </button>
          </span>
          <TagPicker
            :tags="tags"
            :model-value="selectedThread.tagIds || []"
            :is-ar="isAr"
            :can-manage="canManageLabels"
            @change="updateThreadTags"
          />
          <button v-if="aiConfigured" type="button" class="ai-summary-btn" :disabled="loadingSummary" @click="loadSummary(!!aiSummary)">
            <i class="fas" :class="loadingSummary ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
            {{ isAr ? 'ملخص المحادثة' : 'Summarize' }}
          </button>
        </div>

        <!-- AI: suggested customer stage -->
        <div v-if="aiSuggestion && stageMap[aiSuggestion.stageId] && isStageActive(selectedThread)" class="ai-card ai-suggestion">
          <i class="fas fa-wand-magic-sparkles"></i>
          <div class="flex-1 min-w-0">
            <div>
              {{ isAr ? 'يقترح النظام نقل هذا العميل إلى' : 'Suggested: move this customer to' }}
              <span class="label-chip" :style="chipStyle(stageMap[aiSuggestion.stageId].color)">{{ stageMap[aiSuggestion.stageId].name }}</span>
            </div>
            <div v-if="aiSuggestion.reason" class="ai-reason">{{ aiSuggestion.reason }}</div>
          </div>
          <button type="button" class="ai-accept" :disabled="decidingSuggestion" @click="decideSuggestion(true)"><i class="fas fa-check"></i> {{ isAr ? 'قبول' : 'Accept' }}</button>
          <button type="button" class="ai-reject" :disabled="decidingSuggestion" @click="decideSuggestion(false)">{{ isAr ? 'رفض' : 'Dismiss' }}</button>
        </div>

        <!-- AI: conversation summary -->
        <div v-if="aiSummary" class="ai-card ai-summary">
          <i class="fas fa-file-lines"></i>
          <div class="flex-1 min-w-0">
            <div class="ai-summary-title">{{ isAr ? 'ملخص المحادثة' : 'Conversation summary' }}</div>
            <div class="ai-summary-text">{{ aiSummary.text }}</div>
          </div>
          <button type="button" class="ai-close" @click="aiSummary = null" :title="isAr ? 'إغلاق' : 'Close'"><i class="fas fa-xmark"></i></button>
        </div>

        <div class="chat-messages" ref="messagesContainer">
          <div class="loading-state" v-if="loadingMessages">
            <AppLoader />
          </div>
          
          <div 
            v-for="msg in messages" 
            :key="msg.id" 
            :class="[
              'message-bubble', 
              (msg.isInternal || msg.type === 'INTERNAL_NOTE') ? 'internal-note' : (msg.direction === 'OUTBOUND' ? 'outbound' : 'inbound')
            ]"
          >
            <div class="message-content">
              <!-- Internal Note Header -->
              <div v-if="msg.isInternal || msg.type === 'INTERNAL_NOTE'" class="internal-note-header">
                <i class="fas fa-shield-alt"></i>
                <span>ملاحظة داخلية (فريق العمل فقط)</span>
              </div>

              <!-- Media Content -->
              <div v-if="msg.hasMedia && msg.mediaUrl" class="message-media">
                <div v-if="msg.type === 'IMAGE'" class="image-container">
                  <img :src="getMediaUrl(msg.mediaUrl)" alt="Media" @error="handleMediaError" />
                  <a :href="getMediaUrl(msg.mediaUrl)" target="_blank" download class="btn-download-img">
                    <i class="fas fa-download"></i>
                  </a>
                </div>
                <video v-else-if="msg.type === 'VIDEO'" :src="getMediaUrl(msg.mediaUrl)" controls></video>
                <audio v-else-if="msg.type === 'AUDIO'" :src="getMediaUrl(msg.mediaUrl)" controls></audio>
                <a v-else-if="msg.type === 'DOCUMENT'" :href="getMediaUrl(msg.mediaUrl)" target="_blank" class="document-link">
                  <i class="fas fa-file-alt"></i> View Document
                </a>
                <span v-else class="media-placeholder">[Media: {{ msg.type }}]</span>
              </div>
              
              <!-- Text Content -->
              <p v-if="msg.content" :class="{ 'internal-note-text': msg.isInternal || msg.type === 'INTERNAL_NOTE' }">{{ msg.content }}</p>
              
              <div class="message-meta">
                <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
                <span v-if="msg.type === 'TEMPLATE'" class="template-badge">
                  <i class="fas fa-file-lines"></i> {{ isAr ? 'قالب' : 'Template' }}
                </span>
                <span v-if="msg.isInternal || msg.type === 'INTERNAL_NOTE'" class="internal-meta-badge" title="مرئية لفريق العمل فقط ولم ترسل للعميل">
                  <i class="fas fa-lock"></i>
                  <span>خاصة بالفريق</span>
                </span>
                <span class="message-status" v-else-if="msg.direction === 'OUTBOUND'">
                  <i :class="getStatusIcon(msg.status)"></i>
                </span>
              </div>
            </div>
          </div>
          
          <div v-if="messages.length === 0 && !loadingMessages" class="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        </div>

        <!-- Chat Input -->
        <div class="chat-input-area" :class="{ 'internal-mode': isInternal }">
          <!-- Internal Note Active Banner -->
          <div v-if="isInternal" class="internal-mode-banner">
            <div class="banner-content">
              <span class="lock-indicator"><i class="fas fa-lock"></i></span>
              <div class="banner-text">
                <strong>وضع الملاحظة الداخلية نشط</strong>
                <span>هذه الملاحظة ستسجل لفريق العمل فقط ولن تصل إلى العميل على واتساب.</span>
              </div>
            </div>
            <button type="button" class="btn-cancel-internal" @click="isInternal = false" title="إلغاء وضع الملاحظة">
              <i class="fas fa-times"></i>
              <span>إلغاء</span>
            </button>
          </div>

          <!-- Meta 24h customer-service window -->
          <div v-if="windowExpired && !isInternal" class="window-banner">
            <i class="fas fa-triangle-exclamation"></i>
            <div class="window-banner-text">
              <strong>{{ isAr ? 'يلزم إرسال قالب رسالة' : 'A template message is required' }}</strong>
              <span>{{ isAr ? 'مرّت 24 ساعة على آخر رسالة من العميل (سياسة Meta). أرسل قالباً معتمداً، وبعد رده تكتب بحرية لمدة 24 ساعة.' : 'It has been 24h since the customer last wrote (Meta policy). Send an approved template; once they reply you can write freely for 24h.' }}</span>
            </div>
            <button type="button" class="window-banner-btn" @click="showTemplateModal = true">
              <i class="fas fa-file-lines"></i> {{ isAr ? 'إرسال قالب' : 'Send template' }}
            </button>
          </div>
          <div v-else-if="windowRemainingLabel && !isInternal" class="window-hint">
            <i class="far fa-clock"></i> {{ windowRemainingLabel }}
          </div>

          <div class="attachment-preview" v-if="attachment">
            <span>{{ attachment.name }}</span>
            <button @click="attachment = null" class="btn-clear"><i class="fas fa-times"></i></button>
          </div>

          <!-- Quick Replies Popup -->
          <div v-if="showQuickReplies && filteredQuickReplies.length > 0" class="quick-replies-popup absolute bottom-full left-4 bg-white border border-slate-200 shadow-lg rounded-xl mb-2 w-72 max-h-64 overflow-y-auto z-50">
            <div class="p-2 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500">
              الردود السريعة
            </div>
            <div 
              v-for="reply in filteredQuickReplies" 
              :key="reply.id"
              @click="insertQuickReply(reply)"
              class="p-3 hover:bg-[#FF6600]/10 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
            >
              <div class="font-bold text-[#FF6600] text-sm mb-1">/{{ reply.shortcut }}</div>
              <div class="text-xs text-slate-600 truncate">{{ reply.content }}</div>
            </div>
          </div>
          
          <form @submit.prevent="sendMessage" class="chat-form">
            <div class="emoji-wrapper" ref="emojiWrapper">
              <button type="button" class="btn-attach" @click="showEmojiPicker = !showEmojiPicker" title="إدراج رمز تعبيري">
                <i class="far fa-smile"></i>
              </button>
              <div class="emoji-picker-container" v-if="showEmojiPicker">
                <EmojiPicker :native="true" @select="onSelectEmoji" :disable-skin-tones="true" />
              </div>
            </div>
            
            <button type="button" class="btn-attach" @click="$refs.fileInput.click()" title="إرفاق ملف">
              <i class="fas fa-paperclip"></i>
            </button>
            <button 
              type="button" 
              class="btn-attach btn-lock-toggle" 
              @click="isInternal = !isInternal" 
              :class="{'active-lock': isInternal}" 
              :title="isInternal ? 'إلغاء وضع الملاحظة الداخلية' : 'تفعيل وضع الملاحظة الداخلية (لفريق العمل فقط)'"
            >
              <i class="fas fa-lock"></i>
            </button>
            <button type="button" class="btn-attach" @click="showTemplateModal = true" :title="isAr ? 'إرسال قالب' : 'Send template'">
              <i class="fas fa-file-lines"></i>
            </button>
            <button type="button" class="btn-attach" @click="toggleRecording" :class="{'recording': isRecording}" title="تسجيل صوتي">
              <i class="fas fa-microphone" v-if="!isRecording"></i>
              <i class="fas fa-stop-circle text-danger" v-else></i>
            </button>
            <input 
              type="file" 
              ref="fileInput" 
              @change="handleFileUpload" 
              style="display: none" 
              accept="image/*,video/*,audio/*,application/pdf"
            />
            
            <input 
              type="text" 
              v-model="newMessage" 
              @input="handleInput"
              :placeholder="isRecording ? 'جاري التسجيل...' : (isInternal ? 'اكتب ملاحظة داخلية لفريق العمل (لن يراها العميل)...' : (windowExpired ? (isAr ? 'أرسل قالباً، أو فعّل الملاحظة الداخلية 🔒' : 'Send a template, or switch to an internal note 🔒') : 'Type a message...'))"
              class="form-control msg-input"
              :class="{ 'input-internal': isInternal }"
              :disabled="sending || isRecording || (windowExpired && !isInternal)"
            />
            
            <button 
              type="submit" 
              class="btn-send" 
              :class="{ 'btn-send-internal': isInternal }"
              :disabled="sending || isRecording || (!newMessage.trim() && !attachment) || (windowExpired && !isInternal)"
              :title="isInternal ? 'حفظ ملاحظة داخلية' : 'إرسال'"
            >
              <template v-if="!sending">
                <i class="fas fa-lock" v-if="isInternal"></i>
                <i class="fas fa-paper-plane" v-else></i>
              </template>
              <i class="fas fa-spinner fa-spin" v-else></i>
            </button>
          </form>
        </div>
      </div>
      
      <div class="chat-main empty-state" v-else>
        <div class="empty-icon"><i class="far fa-comments"></i></div>
        <h3>Welcome to Live Chat</h3>
        <p>Select a conversation from the sidebar to start messaging.</p>
      </div>

      <TemplateSendModal
        v-if="showTemplateModal && selectedThread"
        :channel-id="selectedThread.channelId"
        :thread-id="selectedThread.id"
        :is-ar="isAr"
        @close="showTemplateModal = false"
        @sent="onTemplateSent"
      />

      <!-- Rename Modal -->
      <div v-if="showRenameModal" class="modal-overlay" @click.self="showRenameModal = false">
        <div class="modal-box small">
          <div class="modal-header">
            <h2>تعديل اسم العميل</h2>
            <button @click="showRenameModal = false" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>الاسم الجديد</label>
              <input v-model="newContactName" type="text" class="form-control" placeholder="أدخل اسم العميل..." @keyup.enter="saveContactName" />
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showRenameModal = false" class="btn-ghost">إلغاء</button>
            <button @click="saveContactName" class="btn-primary" :disabled="savingName">
              {{ savingName ? '...' : 'حفظ' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </FeatureLock>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import { io } from 'socket.io-client'
import { useI18n } from 'vue-i18n'
import FeatureLock from '../components/FeatureLock.vue'
import StagePicker from '../components/chat/StagePicker.vue'
import TagPicker from '../components/chat/TagPicker.vue'
import TemplateSendModal from '../components/chat/TemplateSendModal.vue'
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'

const socket = ref(null)
const threads = ref([])
const messages = ref([])
const selectedThread = ref(null)
const searchQuery = ref('')
const channels = ref([])
const selectedChannel = ref('')
const newMessage = ref('')
const quickReplies = ref([])
const showQuickReplies = ref(false)
const filteredQuickReplies = ref([])
const attachment = ref(null)
const fileInput = ref(null)
const showEmojiPicker = ref(false)
const activeTicket = ref(null)
const isInternal = ref(false)
const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

// ─── Tags & Customer Stages ───────────────────────────────────
const tags = ref([])
const stageConfig = ref({ enabled: false, channelIds: [], stages: [] })
const tagFilter = ref('')
const stageFilter = ref('')

const storedTenant = (() => {
  try {
    return JSON.parse(localStorage.getItem('tenant') || '{}')
  } catch {
    return {}
  }
})()
const canManageLabels = !storedTenant.isSubUser || !!storedTenant.subUser?.permissions?.can_manage_settings
// Agents limited to their team / assigned conversations (chat_scope)
const isScopedViewer = !!storedTenant.isSubUser && ['TEAM', 'ASSIGNED'].includes(storedTenant.subUser?.permissions?.chat_scope)

const pinnedTags = computed(() => tags.value.filter(t => t.isPinned))
const tagMap = computed(() => Object.fromEntries(tags.value.map(t => [t.id, t])))
const stageMap = computed(() => Object.fromEntries(stageConfig.value.stages.map(s => [s.id, s])))
const stageFilterVisible = computed(() => stageConfig.value.enabled && stageConfig.value.stages.length > 0)

const isStageActive = (thread) => {
  const cfg = stageConfig.value
  if (!thread || !cfg.enabled || cfg.stages.length === 0) return false
  return cfg.channelIds.length === 0 || cfg.channelIds.includes(thread.channelId)
}
const threadStage = (thread) => (isStageActive(thread) ? stageMap.value[thread.stageId] || null : null)
const threadTags = (thread) => (thread?.tagIds || []).map(id => tagMap.value[id]).filter(Boolean)

// Light tinted chip with readable text for any tag/stage color
const chipStyle = (color) => ({
  background: `${color}1a`,
  borderColor: `${color}40`,
  color: `color-mix(in srgb, ${color} 70%, #0f172a)`
})

const fetchLabels = async () => {
  try {
    const [tagsRes, stagesRes] = await Promise.all([
      axios.get('/api/v1/chat/tags'),
      axios.get('/api/v1/chat/stages')
    ])
    tags.value = tagsRes.data.data || []
    stageConfig.value = stagesRes.data.data || { enabled: false, channelIds: [], stages: [] }
  } catch (e) {
    console.error('Error fetching tags/stages:', e)
  }
}

const togglePinnedFilter = (tagId) => {
  tagFilter.value = tagFilter.value === tagId ? '' : tagId
  fetchThreads()
}

const labelErrorToast = (err) => {
  Swal.fire({
    icon: 'error',
    title: err.response?.data?.error?.message || (isAr.value ? 'تعذّر الحفظ' : 'Could not save'),
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
  })
}

// ─── AI: summary & stage suggestion ───────────────────────────
const aiConfigured = ref(false)
const aiSuggestion = ref(null)
const aiSummary = ref(null)
const loadingSummary = ref(false)
const decidingSuggestion = ref(false)

const fetchAiStatus = async () => {
  try {
    const res = await axios.get('/api/v1/ai/status')
    aiConfigured.value = !!res.data.data?.configured
  } catch {
    aiConfigured.value = false
  }
}

// Runs in the background when a conversation opens; the server reuses its last answer until new messages arrive
const loadSuggestion = async (thread) => {
  if (!aiConfigured.value || !isStageActive(thread)) return
  try {
    const res = await axios.post(`/api/v1/ai/threads/${thread.id}/stage-suggestion`)
    if (selectedThread.value?.id === thread.id) aiSuggestion.value = res.data.data || null
  } catch (e) {
    console.warn('Stage suggestion unavailable:', e.response?.data?.error?.message || e.message)
  }
}

const loadSummary = async (refresh = false) => {
  const thread = selectedThread.value
  if (!thread) return
  loadingSummary.value = true
  try {
    const res = await axios.post(`/api/v1/ai/threads/${thread.id}/summary`, { refresh })
    if (selectedThread.value?.id === thread.id) {
      aiSummary.value = res.data.data || { text: isAr.value ? 'لا توجد رسائل لتلخيصها.' : 'Nothing to summarize yet.' }
    }
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر إنشاء الملخص' : 'Could not summarize', text: err.response?.data?.error?.message || err.message, confirmButtonColor: '#FF6600' })
  } finally {
    loadingSummary.value = false
  }
}

const decideSuggestion = async (accept) => {
  const thread = selectedThread.value
  if (!thread || !aiSuggestion.value) return
  decidingSuggestion.value = true
  try {
    const res = await axios.post(`/api/v1/ai/threads/${thread.id}/stage-suggestion/${accept ? 'accept' : 'reject'}`)
    if (accept) thread.stageId = res.data.data.stageId
    aiSuggestion.value = null
  } catch (err) {
    aiSuggestion.value = null
    labelErrorToast(err)
  } finally {
    decidingSuggestion.value = false
  }
}

const updateThreadStage = async (stageId) => {
  const thread = selectedThread.value
  if (!thread) return
  const previous = thread.stageId || null
  thread.stageId = stageId
  try {
    await axios.put(`/api/v1/chat/threads/${thread.id}/stage`, { stageId })
  } catch (err) {
    thread.stageId = previous
    labelErrorToast(err)
  }
}

const updateThreadTags = async (tagIds) => {
  const thread = selectedThread.value
  if (!thread) return
  const previous = thread.tagIds || []
  thread.tagIds = tagIds
  try {
    const res = await axios.put(`/api/v1/chat/threads/${thread.id}/tags`, { tagIds })
    thread.tagIds = res.data.data.tagIds
  } catch (err) {
    thread.tagIds = previous
    labelErrorToast(err)
  }
}

const removeThreadTag = (tagId) => {
  updateThreadTags((selectedThread.value?.tagIds || []).filter(id => id !== tagId))
}

// ─── Meta 24h customer-service window ─────────────────────────
const WINDOW_MS = 24 * 60 * 60 * 1000
const showTemplateModal = ref(false)
const nowTick = ref(Date.now())
let nowTimer = null

// Last customer message: stored on the thread, or found in the loaded messages (older threads)
const lastInboundTime = computed(() => {
  const fromThread = selectedThread.value?.lastInboundAt ? new Date(selectedThread.value.lastInboundAt).getTime() : 0
  const fromMessages = messages.value
    .filter(m => m.direction === 'INBOUND')
    .reduce((max, m) => Math.max(max, new Date(m.createdAt).getTime()), 0)
  return Math.max(fromThread, fromMessages)
})

const windowExpired = computed(() => {
  if (!selectedThread.value || loadingMessages.value) return false
  return !lastInboundTime.value || nowTick.value - lastInboundTime.value >= WINDOW_MS
})

// Shown during the last 3 hours of the window
const windowRemainingLabel = computed(() => {
  if (!lastInboundTime.value || windowExpired.value) return ''
  const left = WINDOW_MS - (nowTick.value - lastInboundTime.value)
  if (left > 3 * 60 * 60 * 1000) return ''
  const h = Math.floor(left / 3600000)
  const m = Math.floor((left % 3600000) / 60000)
  return isAr.value ? `تنتهي نافذة المحادثة خلال ${h}س ${m}د` : `Conversation window closes in ${h}h ${m}m`
})

const onTemplateSent = (msg) => {
  if (msg && !messages.value.find(m => m.id === msg.id)) messages.value.push(msg)
  scrollToBottom()
}


const fetchTicketCategories = async () => {
  try {
    const res = await axios.get('/api/v1/tickets/categories');
    ticketCategories.value = res.data.data || [];
  } catch(e) {
    console.error('Error fetching categories:', e);
  }
}

const fetchTeamMembers = async () => {
  try {
    let res = await axios.get('/api/sub-users/team');
    if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      teamMembers.value = res.data.data;
      return;
    }
    // Fallback to main sub-users endpoint
    res = await axios.get('/api/sub-users');
    teamMembers.value = res.data?.data || [];
  } catch(e) {
    try {
      const fallback = await axios.get('/api/sub-users');
      teamMembers.value = fallback.data?.data || [];
    } catch(err) {
      console.error('Error fetching team members:', err);
    }
  }
}

const getAssignedUserName = (assignedToId) => {
  if (!assignedToId) return null;
  const member = teamMembers.value.find(u => u.id === assignedToId);
  return member ? member.name : null;
};


const hasReopenableTicket = computed(() => {
  return !!(activeTicket.value && (activeTicket.value.status === 'CLOSED' || activeTicket.value.status === 'RESOLVED'));
});

const ticketCategories = ref([])
const teamMembers = ref([])
const emojiWrapper = ref(null)

const loadingThreads = ref(false)
const creatingTicket = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)
const messagesContainer = ref(null)

// Rename state
const showRenameModal = ref(false)
const newContactName = ref('')
const savingName = ref(false)

// Audio Recording state
const isRecording = ref(false)
let mediaRecorder = null
let audioChunks = []

const fetchChannels = async () => {
  try {
    const res = await axios.get('/api/v1/meta/channels')
    channels.value = res.data.data || []
  } catch (e) {
    console.error('Error fetching channels:', e)
  }
}

const fetchQuickReplies = async () => {
  try {
    const res = await axios.get('/api/v1/chat/quick-replies')
    quickReplies.value = res.data.data
  } catch (error) {
    console.error('Error fetching quick replies:', error)
  }
}

const handleInput = () => {
  if (newMessage.value.startsWith('/')) {
    const term = newMessage.value.substring(1).toLowerCase();
    filteredQuickReplies.value = quickReplies.value.filter(qr => 
      qr.shortcut.toLowerCase().includes(term) || qr.content.toLowerCase().includes(term)
    );
    showQuickReplies.value = filteredQuickReplies.value.length > 0;
  } else {
    showQuickReplies.value = false;
  }
}

const insertQuickReply = (reply) => {
  newMessage.value = reply.content;
  showQuickReplies.value = false;
}

const fetchThreads = async () => {
  loadingThreads.value = true
  try {
    const params = { search: searchQuery.value, limit: 50 }
    if (selectedChannel.value) {
      params.channelId = selectedChannel.value
    }
    if (tagFilter.value) params.tagId = tagFilter.value
    if (stageFilter.value) params.stageId = stageFilter.value
    const res = await axios.get('/api/v1/chat/threads', { params })
    threads.value = res.data.data.threads
  } catch (error) {
    console.error('Error fetching threads:', error)
    alert('Failed to load conversations.')
  } finally {
    loadingThreads.value = false
  }
}

let searchTimeout = null
const onSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchThreads()
  }, 500)
}

const fetchActiveTicket = async (threadId) => {
  try {
    // 1. Prioritize finding an open ticket first
    const openRes = await axios.get('/api/v1/tickets?threadId=' + threadId + '&status=OPEN&limit=1');
    const openTickets = Array.isArray(openRes.data?.data) ? openRes.data.data : [];
    if (openTickets.length > 0) {
      activeTicket.value = openTickets[0];
      return;
    }
    // 2. Otherwise get the latest ticket (e.g. CLOSED or RESOLVED)
    const res = await axios.get('/api/v1/tickets?threadId=' + threadId + '&limit=1');
    const tickets = Array.isArray(res.data?.data) ? res.data.data : [];
    activeTicket.value = tickets[0] || null;
  } catch(e) {
    console.error('Error fetching active ticket:', e);
  }
}

const selectThread = async (thread) => {
  selectedThread.value = thread
  aiSuggestion.value = null
  aiSummary.value = null
  activeTicket.value = null // Reset so old thread's ticket isn't shown while loading
  thread.unreadCount = 0 // Optimistic update
  await Promise.all([
    fetchMessages(thread.id),
    fetchActiveTicket(thread.id)
  ])
  loadSuggestion(thread)

  // Automatically open ticket if no active ticket is open and there are messages from the client
  if (!activeTicket.value || (activeTicket.value.status !== 'OPEN' && activeTicket.value.status !== 'PENDING')) {
    const clientMessages = (messages.value || []).filter(m => m.direction === 'INBOUND' && !m.content?.startsWith('RATE_'));
    if (clientMessages.length > 0) {
      try {
        creatingTicket.value = true;
        // If there is a recently closed unrated ticket, reopen it; otherwise create a new ticket
        if (activeTicket.value && (activeTicket.value.status === 'CLOSED' || activeTicket.value.status === 'RESOLVED') && !activeTicket.value.rating) {
          const res = await axios.post('/api/v1/tickets/' + activeTicket.value.id + '/reopen');
          if (res.data?.data) activeTicket.value = res.data.data;
        } else {
          const lastMsg = clientMessages[clientMessages.length - 1];
          const res = await axios.post('/api/v1/tickets', {
            channelId: thread.channelId,
            threadId: thread.id,
            crmClientId: thread.crmClientId,
            subject: lastMsg?.content ? lastMsg.content.substring(0, 100) : 'محادثة واتساب'
          });
          if (res.data?.data) activeTicket.value = res.data.data;
        }
      } catch (err) {
        console.error('Error auto-opening ticket on selectThread:', err);
      } finally {
        creatingTicket.value = false;
      }
    }
  }
}


const quickAssign = async (thread) => {
  try {
    // 1. Check if thread has an active ticket
    const res = await axios.get('/api/v1/tickets?threadId=' + thread.id + '&limit=1');
    const rawList = res.data?.data;
    const tickets = Array.isArray(rawList) ? rawList : (rawList?.tickets || []);
    const ticket = tickets[0] || null;
    
    if (!ticket || ticket.status !== 'OPEN') {
      const confirm = await Swal.fire({
        title: isAr.value ? 'فتح تذكرة؟' : 'Open Ticket?',
        text: isAr.value ? 'هذه المحادثة ليس لها تذكرة نشطة حالياً. هل تريد فتح تذكرة جديدة لإسنادها؟' : 'This thread has no active ticket. Do you want to open one to assign it?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#FF6600',
        confirmButtonText: isAr.value ? 'نعم، افتح تذكرة' : 'Yes, Open Ticket'
      });
      if (confirm.isConfirmed) {
        // Since we are not in the chat view necessarily, we call the API
        const createRes = await axios.post('/api/v1/tickets', {
          channelId: thread.channelId,
          threadId: thread.id,
          subject: 'تذكرة جديدة'
        });
        const newTicket = createRes.data.data;
        promptAssign(newTicket);
      }
      return;
    }
    
    promptAssign(ticket);
  } catch (err) {
    console.error(err);
  }
}

const promptAssign = async (ticket) => {
  if (teamMembers.value.length === 0) {
    await fetchTeamMembers();
  }
  if (teamMembers.value.length === 0) {
    Swal.fire({
      icon: 'info',
      title: isAr.value ? 'لا يوجد أعضاء' : 'No Team Members',
      text: isAr.value ? 'الرجاء إضافة موظفين فرعيين أولاً من شاشة (المستخدمون) لتتمكن من الإسناد.' : 'Please add sub-users from the Sub Users screen first to assign tickets.',
      confirmButtonColor: '#FF6600'
    });
    return;
  }

  let onShift = new Set()
  try {
    const res = await axios.get('/api/v1/workforce/shifts/on-shift')
    onShift = new Set(res.data?.data?.userIds || [])
  } catch (e) {
    console.error('Error fetching on-shift members:', e)
  }
  const shiftNote = (id) => (onShift.has(id) ? (isAr.value ? ' 🟢 في الدوام' : ' 🟢 on shift') : '')

  const { value: selectedUserId } = await Swal.fire({
    title: isAr.value ? 'إسناد التذكرة' : 'Assign Ticket',
    html: '<select id="swal-assign" class="swal2-select" style="display:flex; width:100%;">' +
          '<option value="">' + (isAr.value ? 'غير مسندة' : 'Unassigned') + '</option>' +
          teamMembers.value.map(u => '<option value="' + u.id + '" ' + (ticket.assignedToId === u.id ? 'selected' : '') + '>' + u.name + shiftNote(u.id) + '</option>').join('') +
          '</select>',
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonColor: '#FF6600',
    confirmButtonText: isAr.value ? 'إسناد' : 'Assign',
    preConfirm: () => document.getElementById('swal-assign').value
  });
  
  if (selectedUserId !== undefined) {
    try {
      await axios.put('/api/v1/tickets/' + ticket.id + '/assign', { assignedToId: selectedUserId || null });
      Swal.fire({ icon: 'success', title: isAr.value ? 'تم الإسناد!' : 'Assigned!', timer: 1500, showConfirmButton: false });
      if (activeTicket.value && activeTicket.value.id === ticket.id) {
        activeTicket.value.assignedToId = selectedUserId || null;
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    }
  }
}

const closeActiveTicket = async () => {
  if (!activeTicket.value) return;
  
  const { value: formValues } = await Swal.fire({
    title: isAr.value ? 'إغلاق التذكرة' : 'Close Ticket',
    html:
      '<textarea id="swal-desc" class="swal2-textarea" placeholder="' + (isAr.value ? 'وصف أو سبب الإغلاق' : 'Resolution description') + '" style="margin-bottom: 10px;"></textarea>' +
      '<select id="swal-cat" class="swal2-select" style="display: flex; width: 100%;">' +
      '<option value="" disabled selected>' + (isAr.value ? 'تحديث التصنيف (اختياري)' : 'Update Category (Optional)') + '</option>' +
      (ticketCategories.value || []).map(c => '<option value="' + c.id + '" ' + (activeTicket.value.categoryId === c.id ? 'selected' : '') + '>' + c.name + '</option>').join('') +
      '</select>',
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: isAr.value ? 'إغلاق التذكرة' : 'Close Ticket',
    confirmButtonColor: '#FF6600',
    cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel',
    preConfirm: () => {
      return { 
        description: document.getElementById('swal-desc').value,
        categoryId: document.getElementById('swal-cat').value
      }
    }
  });

  if (!formValues) return;
  
  try {
    creatingTicket.value = true;
    const res = await axios.post('/api/v1/tickets/' + activeTicket.value.id + '/close', {
      description: formValues.description || 'تم حل المشكلة',
      categoryId: formValues.categoryId || undefined
    });
    // Immediately set activeTicket to the closed ticket so reopen is ready instantly
    if (res.data?.data) {
      activeTicket.value = res.data.data;
    } else if (selectedThread.value) {
      await fetchActiveTicket(selectedThread.value.id);
    }
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم إغلاق التذكرة بنجاح!' : 'Ticket Closed!', timer: 1500, showConfirmButton: false });
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: err.response?.data?.error || err.message });
  } finally {
    creatingTicket.value = false;
  }
}




const assignThreadTicket = async (thread) => {
  try {
    // Check if open ticket exists
    const res = await axios.get('/api/v1/tickets?threadId=' + thread.id + '&limit=1');
    let ticket = res.data.data[0];
    
    if (!ticket || ticket.status !== 'OPEN') {
      const confirm = await Swal.fire({
        title: isAr.value ? 'فتح تذكرة؟' : 'Open Ticket?',
        text: isAr.value ? 'لا توجد تذكرة مفتوحة لهذه المحادثة. هل تريد فتح تذكرة جديدة لإسنادها؟' : 'No open ticket for this chat. Create one to assign?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: isAr.value ? 'نعم، افتح تذكرة' : 'Yes, open ticket',
        cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
      });
      if (!confirm.isConfirmed) return;
      
      const createRes = await axios.post('/api/v1/tickets', {
        channelId: thread.channelId,
        threadId: thread.id,
        crmClientId: thread.crmClientId,
        subject: 'محادثة واتساب'
      });
      ticket = createRes.data.data;
      if (selectedThread.value && selectedThread.value.id === thread.id) {
        await fetchActiveTicket(thread.id);
      }
    }

    const { value: assignedToId } = await Swal.fire({
      title: isAr.value ? 'إسناد التذكرة' : 'Assign Ticket',
      html:
        '<select id="swal-assign" class="swal2-select" style="display: flex; width: 100%;">' +
        '<option value="">' + (isAr.value ? 'غير مسندة' : 'Unassigned') + '</option>' +
        teamMembers.value.map(u => '<option value="' + u.id + '" ' + (ticket.assignedToId === u.id ? 'selected' : '') + '>' + u.name + '</option>').join('') +
        '</select>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: isAr.value ? 'حفظ' : 'Save',
      cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel',
      preConfirm: () => document.getElementById('swal-assign').value
    });

    if (assignedToId === undefined) return; // cancelled
    
    const finalAssignId = assignedToId === '' ? null : assignedToId;
    await axios.post('/api/v1/tickets/' + ticket.id + '/assign', { assignedToId: finalAssignId });
    
    if (selectedThread.value && selectedThread.value.id === thread.id && activeTicket.value) {
      activeTicket.value.assignedToId = finalAssignId;
    }
    
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم إسناد التذكرة' : 'Assigned', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
  } catch(e) {
    console.error(e);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: e.message });
  }
}

const assignTicket = async (userId) => {
  if (!activeTicket.value) return;
  try {
    await axios.post('/api/v1/tickets/' + activeTicket.value.id + '/assign', { assignedToId: userId });
    activeTicket.value.assignedToId = userId;
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم إسناد التذكرة' : 'Ticket Assigned', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
  } catch(e) {
    console.error(e);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
  }
}

const reopenActiveTicket = async () => {
  if (!activeTicket.value) return;
  try {
    creatingTicket.value = true;
    const res = await axios.post('/api/v1/tickets/' + activeTicket.value.id + '/reopen');
    if (res.data?.data) {
      activeTicket.value = res.data.data;
    } else if (selectedThread.value) {
      await fetchActiveTicket(selectedThread.value.id);
    }
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم إعادة فتح التذكرة!' : 'Ticket Reopened!', timer: 1500, showConfirmButton: false });
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: err.response?.data?.error || err.message });
  } finally {
    creatingTicket.value = false;
  }
}

const createManualTicket = async () => {
  if (!selectedThread.value) return;
  
  try {
    creatingTicket.value = true;
    const res = await axios.post('/api/v1/tickets', {
      channelId: selectedThread.value.channelId,
      threadId: selectedThread.value.id,
      crmClientId: selectedThread.value.crmClientId,
      subject: 'محادثة واتساب'
    });
    if (res.data?.data) {
      activeTicket.value = res.data.data;
    } else if (selectedThread.value) {
      await fetchActiveTicket(selectedThread.value.id);
    }
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم فتح التذكرة بنجاح!' : 'Ticket Opened!', timer: 1500, showConfirmButton: false });
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: err.response?.data?.error || err.message });
  } finally {
    creatingTicket.value = false;
  }
}
;

const fetchMessages = async (threadId) => {
  loadingMessages.value = true
  messages.value = []
  try {
    const res = await axios.get(`/api/v1/chat/threads/${threadId}/messages`, {
      params: { limit: 100 }
    })
    messages.value = res.data.data.messages
    scrollToBottom()
  } catch (error) {
    console.error('Error fetching messages:', error)
    alert('Failed to load messages.')
  } finally {
    loadingMessages.value = false
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const openRenameModal = () => {
  newContactName.value = selectedThread.value?.contactName || ''
  showRenameModal.value = true
}

const saveContactName = async () => {
  if (!newContactName.value.trim() || !selectedThread.value) return
  savingName.value = true
  try {
    const res = await axios.put(`/api/v1/chat/threads/${selectedThread.value.id}/name`, {
      name: newContactName.value.trim()
    })
    
    // Update local state
    selectedThread.value.contactName = res.data.contactName
    const t = threads.value.find(th => th.id === selectedThread.value.id)
    if (t) t.contactName = res.data.contactName
    
    showRenameModal.value = false
  } catch (err) {
    console.error('Rename error:', err)
    alert('حدث خطأ أثناء تعديل الاسم')
  } finally {
    savingName.value = false
  }
}

const onSelectEmoji = (emoji) => {
  newMessage.value += emoji.i
  // Optional: Keep the picker open or close it
  // showEmojiPicker.value = false
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    // Check file size (e.g. max 5MB for MVP)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.')
      return
    }
    attachment.value = file
  }
}

const toggleRecording = async () => {
  if (isRecording.value) {
    // Stop recording
    if (mediaRecorder) {
      mediaRecorder.stop()
    }
    isRecording.value = false
  } else {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new MediaRecorder(stream)
      audioChunks = []
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data)
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' })
        // Create a File object to mimic file upload
        const audioFile = new File([audioBlob], 'voice-message.webm', { type: audioBlob.type })
        attachment.value = audioFile
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      isRecording.value = true
    } catch (err) {
      console.error('Error accessing microphone', err)
      alert('لا يمكن الوصول للمايكروفون. يرجى التأكد من الصلاحيات.')
    }
  }
}

const uploadFile = async () => {
  if (!attachment.value) return null
  const formData = new FormData()
  formData.append('file', attachment.value)
  
  try {
    const baseURL = axios.defaults.baseURL || window.location.origin
    const res = await axios.post('/api/v1/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    // We want the relative URL or absolute URL depending on how the backend returns it.
    // The backend returns mediaUrl as a full URL. We'll pass it directly to sendMessage payload.
    return res.data.mediaUrl
  } catch (err) {
    console.error('Upload error', err)
    throw new Error('Failed to upload file.')
  }
}

const sendMessage = async () => {
  if (!selectedThread.value) return
  if (!newMessage.value.trim() && !attachment.value) return

  sending.value = true
  try {
    let mediaUrl = null
    let type = 'TEXT'
    
    if (attachment.value) {
      mediaUrl = await uploadFile()
      if (attachment.value.type.startsWith('image/')) type = 'IMAGE'
      else if (attachment.value.type.startsWith('video/')) type = 'VIDEO'
      else if (attachment.value.type.startsWith('audio/')) type = 'AUDIO'
      else type = 'DOCUMENT'
    }

    const payload = {
      content: newMessage.value.trim(),
      isInternal: isInternal.value,
      type,
      hasMedia: !!mediaUrl,
      mediaUrl,
      mediaMime: attachment.value?.type
    }

    const res = await axios.post(`/api/v1/chat/threads/${selectedThread.value.id}/messages`, payload)
    const sentMsg = res.data.data
    const exists = messages.value.find(m => m.id === sentMsg.id)
    if (!exists) {
      messages.value.push(sentMsg)
    } else {
      const idx = messages.value.findIndex(m => m.id === sentMsg.id)
      messages.value.splice(idx, 1, sentMsg)
    }
    // Update thread summary
    const thread = threads.value.find(t => t.id === selectedThread.value.id)
    if (thread) {
      thread.lastMessageAt = res.data.data.createdAt
      // Re-sort threads
      threads.value.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    }

    newMessage.value = ''
    attachment.value = null
    showEmojiPicker.value = false
    isInternal.value = false
    if (fileInput.value) fileInput.value.value = ''
    scrollToBottom()
  } catch (error) {
    console.error('Error sending message:', error)
    alert(error.response?.data?.error?.message || 'Failed to send message.')
  } finally {
    sending.value = false
  }
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'SENT': return 'fas fa-check text-muted'
    case 'DELIVERED': return 'fas fa-check-double text-muted'
    case 'READ': return 'fas fa-check-double text-primary'
    case 'FAILED': return 'fas fa-exclamation-circle text-danger'
    default: return 'far fa-clock text-muted'
  }
}

const getMediaUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('/api/v1/chat/media/')) {
    const token = localStorage.getItem('token')
    const separator = url.includes('?') ? '&' : '?'
    const base = axios.defaults.baseURL || window.location.origin
    return `${base}${url}${separator}token=${token}`
  }
  return url
}

const handleMediaError = (e) => {
  e.target.style.display = 'none'
}

const closeEmojiPicker = (e) => {
  if (showEmojiPicker.value && emojiWrapper.value && !emojiWrapper.value.contains(e.target)) {
    showEmojiPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeEmojiPicker)
  fetchChannels()
  fetchThreads()
  fetchQuickReplies()
  fetchTeamMembers()
  fetchTicketCategories()
  fetchLabels()
  fetchAiStatus()
  nowTimer = setInterval(() => { nowTick.value = Date.now() }, 60000)

  // Initialize Socket.io
  const baseURL = axios.defaults.baseURL || window.location.origin
  socket.value = io(baseURL)

  socket.value.on('connect', () => {
    // Join tenant room
    try {
      const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
      if (tenant?.id) {
        socket.value.emit('join-tenant', tenant.id)
      }
    } catch(e) {
      console.error('Error parsing tenant', e)
    }
  })

  socket.value.on('new_chat_message', (msg) => {
    // If the message belongs to the active thread, append it
    if (selectedThread.value && msg.threadId === selectedThread.value.id) {
      // Check if it's not a duplicate (we might have pushed it optimistically, but we wait for response in this case)
      const exists = messages.value.find(m => m.id === msg.id)
      if (!exists) {
        messages.value.push(msg)
        scrollToBottom()
        
        // Mark as read immediately if window is active
        if (msg.direction === 'INBOUND' && !document.hidden) {
          axios.get(`/api/v1/chat/threads/${msg.threadId}/messages`, { params: { limit: 1 } })
        }
      }
    }
  })

  socket.value.on('thread_updated', (updatedThread) => {
    const idx = threads.value.findIndex(t => t.id === updatedThread.id || t.id === updatedThread.threadId)
    if (idx !== -1) {
      if (updatedThread.unreadCount !== undefined) {
         // Don't override unread count to > 0 if it's the active thread
         if (selectedThread.value && selectedThread.value.id === threads.value[idx].id) {
           threads.value[idx].unreadCount = 0
         } else {
           threads.value[idx].unreadCount = updatedThread.unreadCount
         }
      }
      if (updatedThread.lastMessageAt) threads.value[idx].lastMessageAt = updatedThread.lastMessageAt
      if (updatedThread.lastInboundAt) threads.value[idx].lastInboundAt = updatedThread.lastInboundAt
      if (updatedThread.flowState !== undefined) threads.value[idx].flowState = updatedThread.flowState
      if (updatedThread.tagIds !== undefined) threads.value[idx].tagIds = updatedThread.tagIds
      if (updatedThread.stageId !== undefined) threads.value[idx].stageId = updatedThread.stageId
      // Another teammate decided on the AI suggestion
      if (updatedThread.aiSuggestion === null && selectedThread.value?.id === threads.value[idx].id) aiSuggestion.value = null

      // Re-sort
      threads.value.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    } else if (updatedThread.id && updatedThread.lastMessageAt) {
      // New thread — restricted agents reload so the server applies their visibility scope
      if (isScopedViewer) fetchThreads()
      else threads.value.unshift(updatedThread)
    }
  })

  socket.value.on('stages_updated', () => {
    fetchLabels()
  })

  socket.value.on('ticket_updated', (data) => {
    if (selectedThread.value && (data.threadId === selectedThread.value.id || data.threadId === selectedThread.value._id)) {
      fetchActiveTicket(selectedThread.value.id)
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', closeEmojiPicker)
  if (socket.value) {
    socket.value.disconnect()
  }
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  if (nowTimer) clearInterval(nowTimer)
})
</script>

<style scoped>
.live-chat-container {
  display: flex;
  height: calc(100vh - 100px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  overflow: hidden;
  border: 1px solid #eee;
}

/* Sidebar */
.threads-sidebar {
  width: 320px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  background: #fdfdfd;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.sidebar-header h2 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-header h2 i {
  color: var(--primary-color);
}

.search-box input {
  width: 100%;
  border-radius: 20px;
  padding: 10px 15px;
  background: #f0f2f5;
  border: none;
}

.threads-list {
  flex: 1;
  overflow-y: auto;
}

.thread-item {
  display: flex;
  padding: 15px 20px;
  gap: 15px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: all 0.2s;
}

.thread-item:hover {
  background: #f5f7f9;
}

.thread-item.active {
  background: #ebf4ff;
  border-left: 4px solid var(--primary-color);
}

.thread-avatar {
  font-size: 2.5rem;
  color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thread-info {
  flex: 1;
  min-width: 0;
}

.thread-top, .thread-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.thread-name {
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread-time {
  font-size: 0.8rem;
  color: #888;
}

.thread-phone {
  font-size: 0.85rem;
  color: #666;
}

.unread-badge {
  background: #25D366;
  color: white;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
}

.no-threads {
  padding: 30px;
  text-align: center;
  color: #888;
}

/* Main Chat */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.chat-main.empty-state {
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #f8f9fa;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  color: #ddd;
  margin-bottom: 20px;
}

.chat-header {
  padding: 12px 25px;
  background: white;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-inline-start: auto;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.chat-header-info h3 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
}

.rename-btn {
  background: transparent !important;
  border: none !important;
  color: #94a3b8 !important;
}
.rename-btn:hover {
  color: #0f172a !important;
}

.contact-phone {
  font-size: 0.9rem;
  color: #666;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png');
  background-size: contain;
}

.message-bubble {
  max-width: 65%;
  padding: 10px 15px;
  border-radius: 12px;
  position: relative;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  word-wrap: break-word;
}

.message-bubble.inbound {
  background: white;
  align-self: flex-start;
  border-top-left-radius: 0;
}

.message-bubble.outbound {
  background: #dcf8c6;
  align-self: flex-end;
  border-top-right-radius: 0;
}

.message-bubble.internal-note {
  background: #fffbeb !important;
  align-self: flex-end;
  border-radius: 12px;
  border-top-right-radius: 0;
  border: 1.5px solid #fcd34d !important;
  border-right: 5px solid #d97706 !important;
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.12) !important;
  max-width: 75%;
}

.internal-note-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 800;
  color: #b45309;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px dashed #fde68a;
}

.internal-note-header i {
  color: #d97706;
}

.internal-note-text {
  color: #78350f !important;
  font-weight: 500;
}

.internal-meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #b45309;
  background: #fef3c7;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #fde68a;
}

.message-content p {
  margin: 0 0 5px 0;
  line-height: 1.4;
}

.message-media {
  margin-bottom: 10px;
}

.message-media img {
  max-width: 100%;
  border-radius: 8px;
  max-height: 300px;
  object-fit: cover;
}

.message-media video {
  max-width: 100%;
  border-radius: 8px;
}

.document-link {
  display: inline-block;
  padding: 10px;
  background: rgba(0,0,0,0.05);
  border-radius: 8px;
  color: #333;
  text-decoration: none;
}

.message-meta {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: #999;
}

.no-messages {
  text-align: center;
  margin-top: 20px;
  color: #888;
  background: rgba(255,255,255,0.7);
  padding: 10px;
  border-radius: 20px;
  align-self: center;
}

/* Input Area */
.chat-input-area {
  padding: 15px 20px;
  background: #f0f2f5;
  border-top: 1px solid #ddd;
  position: relative;
}

.attachment-preview {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 8px 15px;
  border-radius: 20px;
  margin-bottom: 10px;
  font-size: 0.9rem;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.search-box input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid #ddd;
  font-size: 0.9rem;
}

.channel-filter {
  margin-top: 10px;
}

.channel-select {
  width: 100%;
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 0.8rem;
  background: white;
  color: #334155;
  outline: none;
}

.channel-tag {
  font-size: 0.65rem;
  background: #f1f5f9;
  color: #64748b;
  padding: 2px 6px;
  border-radius: 4px;
}

/* ═══ TAGS & STAGES ═══ */
.label-filters {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.pinned-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.pinned-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s;
}

.pinned-tag-chip i {
  font-size: 0.6rem;
  opacity: 0.7;
}

.thread-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.label-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid;
  white-space: nowrap;
}

.label-chip-lg {
  font-size: 0.75rem;
  padding: 4px 6px 4px 10px;
}

.label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.label-more {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #64748b;
}

.label-remove {
  background: transparent;
  border: none;
  color: inherit;
  opacity: 0.55;
  cursor: pointer;
  padding: 0 2px;
  font-size: 0.7rem;
  line-height: 1;
}

.label-remove:hover {
  opacity: 1;
}

.window-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 10px;
  padding: 10px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  color: #92400e;
  font-size: 0.8rem;
}

.window-banner > i {
  color: #d97706;
  font-size: 1rem;
}

.window-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.window-banner-text span {
  color: #a16207;
  font-size: 0.75rem;
}

.window-banner-btn {
  background: #FF6600;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.window-banner-btn:hover {
  background: #E65C00;
}

.window-hint {
  font-size: 0.72rem;
  color: #b45309;
  margin-bottom: 6px;
}

.template-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  font-weight: 700;
  color: #64748b;
  background: rgba(255, 255, 255, 0.6);
  padding: 1px 6px;
  border-radius: 6px;
}

.bot-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #6d28d9;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  padding: 3px 10px;
  border-radius: 999px;
}

.ai-summary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-inline-start: auto;
  font-size: 0.75rem;
  font-weight: 700;
  color: #4f46e5;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  padding: 5px 10px;
  cursor: pointer;
}

.ai-summary-btn:disabled {
  opacity: 0.6;
}

.ai-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 8px 25px 0;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.ai-card > i {
  margin-top: 3px;
}

.ai-suggestion {
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  color: #3b0764;
  align-items: center;
}

.ai-suggestion > i {
  color: #7c3aed;
  margin-top: 0;
}

.ai-reason {
  font-size: 0.72rem;
  color: #6b21a8;
  opacity: 0.8;
  margin-top: 3px;
}

.ai-accept,
.ai-reject {
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.ai-accept {
  background: #7c3aed;
  color: white;
  border: none;
}

.ai-reject {
  background: white;
  color: #6b21a8;
  border: 1px solid #ddd6fe;
}

.ai-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
}

.ai-summary > i {
  color: #4f46e5;
}

.ai-summary-title {
  font-weight: 700;
  font-size: 0.75rem;
  color: #4f46e5;
  margin-bottom: 2px;
}

.ai-summary-text {
  line-height: 1.6;
  white-space: pre-line;
}

.ai-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.chat-labels-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 25px;
  background: #fcfcfd;
  border-bottom: 1px solid #f1f5f9;
}

/* ═══ MODAL ═══ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.modal-box {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px rgba(0,0,0,0.2);
}
.modal-box.small {
  max-width: 400px;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}
.modal-header h2 {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}
.modal-close {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}
.modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
}
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 2rem 1.5rem;
  border-top: 1px solid #f1f5f9;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FF6600, #E55A00);
  color: white;
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #64748B;
  border: 1px solid #CBD5E1;
  padding: 0.7rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  padding: 0;
}

.chat-form {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-attach {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #4a4a4a;
  cursor: pointer;
  padding: 10px;
  transition: color 0.2s;
}

.btn-attach:hover {
  color: var(--primary-color);
}

.msg-input {
  flex: 1;
  border-radius: 25px;
  padding: 12px 20px;
  border: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.btn-send {
  background: #ff6b00;
  color: white;
  border: none;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  transition: transform 0.2s, opacity 0.2s;
}

.btn-send:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-container {
  position: relative;
  display: inline-block;
}

.btn-download-img {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: rgba(0,0,0,0.6);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 0.8rem;
  transition: background 0.2s;
}

.btn-download-img:hover {
  background: rgba(0,0,0,0.9);
  color: white;
}

.recording i {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

.emoji-wrapper {
  position: relative;
}

.emoji-picker-container {
  position: absolute;
  bottom: 60px;
  left: 0;
  z-index: 1000;
  box-shadow: 0 5px 20px rgba(0,0,0,0.15);
  border-radius: 12px;
}

.message-media audio {
  max-width: 250px;
  height: 40px;
}

.message-media video, .message-media img {
  max-width: 100%;
  border-radius: 8px;
}

/* ═══ INTERNAL NOTE MODE & INPUT STYLES ═══ */
.chat-input-area.internal-mode {
  background: #fffbeb !important;
  border-top: 2px solid #f59e0b !important;
}

.internal-mode-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 8px 14px;
  margin-bottom: 10px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.internal-mode-banner .banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.internal-mode-banner .lock-indicator {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f59e0b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.internal-mode-banner .banner-text {
  display: flex;
  flex-direction: column;
  font-size: 0.78rem;
  line-height: 1.35;
}

.internal-mode-banner .banner-text strong {
  color: #92400e;
  font-weight: 800;
}

.internal-mode-banner .banner-text span {
  color: #b45309;
}

.btn-cancel-internal {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: white;
  border: 1px solid #fcd34d;
  color: #92400e;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-cancel-internal:hover {
  background: #fde68a;
  color: #78350f;
}

.btn-attach.btn-lock-toggle.active-lock {
  background: #fef3c7;
  color: #d97706 !important;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
}

.msg-input.input-internal {
  background: white !important;
  border: 1.5px solid #f59e0b !important;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15) !important;
  color: #78350f !important;
}

.msg-input.input-internal::placeholder {
  color: #b45309 !important;
  opacity: 0.75;
}

.btn-send.btn-send-internal {
  background: #d97706 !important;
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.35) !important;
}

.btn-send.btn-send-internal:hover:not(:disabled) {
  background: #b45309 !important;
  transform: scale(1.05);
}

/* ═══ TICKET ACTION BUTTONS ═══ */
.ticket-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1.5px solid transparent;
  white-space: nowrap;
  font-family: inherit;
}

.ticket-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ticket-btn-close {
  background: #fff1f2;
  color: #e11d48;
  border-color: #fecdd3;
}
.ticket-btn-close:hover:not(:disabled) {
  background: #ffe4e6;
  color: #be123c;
  border-color: #fda4af;
}

.ticket-btn-reopen {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;
}
.ticket-btn-reopen:hover:not(:disabled) {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

.ticket-btn-new {
  background: linear-gradient(135deg, #FF6600, #E55A00);
  color: white;
  border-color: transparent;
  box-shadow: 0 2px 6px rgba(255, 102, 0, 0.25);
}
.ticket-btn-new:hover:not(:disabled) {
  background: linear-gradient(135deg, #f95f00, #d94e00);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(255, 102, 0, 0.35);
}

.ticket-btn-assign {
  background: #f8fafc;
  color: #334155;
  border-color: #cbd5e1;
}
.ticket-btn-assign:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #94a3b8;
}

.ticket-badge-open {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;
}
</style>
