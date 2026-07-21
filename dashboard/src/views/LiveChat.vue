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
                <span class="unread-badge" v-if="thread.unreadCount > 0">{{ thread.unreadCount }}</span>
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
              <h3>{{ selectedThread.contactName || selectedThread.contactPhone }}</h3>
              <span class="contact-phone">{{ selectedThread.contactPhone }}</span>
            </div>
          </div>
        </div>

        <div class="chat-messages" ref="messagesContainer">
          <div class="loading-state" v-if="loadingMessages">
            <AppLoader />
          </div>
          
          <div 
            v-for="msg in messages" 
            :key="msg.id" 
            :class="['message-bubble', msg.direction === 'OUTBOUND' ? 'outbound' : 'inbound']"
          >
            <div class="message-content">
              <!-- Media Content -->
              <div v-if="msg.hasMedia && msg.mediaUrl" class="message-media">
                <img v-if="msg.type === 'IMAGE'" :src="msg.mediaUrl" alt="Media" @error="handleMediaError" />
                <video v-else-if="msg.type === 'VIDEO'" :src="msg.mediaUrl" controls></video>
                <audio v-else-if="msg.type === 'AUDIO'" :src="msg.mediaUrl" controls></audio>
                <a v-else-if="msg.type === 'DOCUMENT'" :href="msg.mediaUrl" target="_blank" class="document-link">
                  <i class="fas fa-file-alt"></i> View Document
                </a>
                <span v-else class="media-placeholder">[Media: {{ msg.type }}]</span>
              </div>
              
              <!-- Text Content -->
              <p v-if="msg.content">{{ msg.content }}</p>
              
              <div class="message-meta">
                <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
                <span class="message-status" v-if="msg.direction === 'OUTBOUND'">
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
        <div class="chat-input-area">
          <div class="attachment-preview" v-if="attachment">
            <span>{{ attachment.name }}</span>
            <button @click="attachment = null" class="btn-clear"><i class="fas fa-times"></i></button>
          </div>
          
          <form @submit.prevent="sendMessage" class="chat-form">
            <button type="button" class="btn-attach" @click="$refs.fileInput.click()">
              <i class="fas fa-paperclip"></i>
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
              placeholder="Type a message..." 
              class="form-control msg-input"
              :disabled="sending"
            />
            
            <button type="submit" class="btn-send" :disabled="sending || (!newMessage.trim() && !attachment)">
              <i class="fas fa-paper-plane" v-if="!sending"></i>
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
    </div>
  </FeatureLock>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'
import FeatureLock from '../components/FeatureLock.vue'

const socket = ref(null)
const threads = ref([])
const messages = ref([])
const selectedThread = ref(null)
const searchQuery = ref('')
const newMessage = ref('')
const attachment = ref(null)
const fileInput = ref(null)

const loadingThreads = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)
const messagesContainer = ref(null)

const fetchThreads = async () => {
  loadingThreads.value = true
  try {
    const res = await axios.get('/api/v1/chat/threads', {
      params: { search: searchQuery.value, limit: 50 }
    })
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

const selectThread = async (thread) => {
  selectedThread.value = thread
  thread.unreadCount = 0 // Optimistic update
  await fetchMessages(thread.id)
}

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

const uploadFile = async () => {
  if (!attachment.value) return null
  const formData = new FormData()
  formData.append('file', attachment.value)
  
  try {
    // We can use the existing /api/uploads endpoint if it accepts general files
    // Assuming /api/v1/templates/upload handles images, but let's assume we have a generic upload
    const res = await axios.post('/api/v1/templates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data.url
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
      type,
      hasMedia: !!mediaUrl,
      mediaUrl,
      mediaMime: attachment.value?.type
    }

    const res = await axios.post(`/api/v1/chat/threads/${selectedThread.value.id}/messages`, payload)
    
    messages.value.push(res.data.data)
    
    // Update thread summary
    const thread = threads.value.find(t => t.id === selectedThread.value.id)
    if (thread) {
      thread.lastMessageAt = res.data.data.createdAt
      // Re-sort threads
      threads.value.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    }

    newMessage.value = ''
    attachment.value = null
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

const handleMediaError = (e) => {
  e.target.style.display = 'none'
}

onMounted(() => {
  fetchThreads()

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
      
      // Re-sort
      threads.value.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    } else if (updatedThread.id && updatedThread.lastMessageAt) {
      // New thread
      threads.value.unshift(updatedThread)
    }
  })
})

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
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
  background: var(--primary-color);
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
  padding: 15px 25px;
  background: white;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.chat-header-info h3 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
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
  color: #666;
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
  background: var(--primary-color);
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
</style>
