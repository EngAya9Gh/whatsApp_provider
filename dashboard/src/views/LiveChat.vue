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
              <img v-if="thread.contactInfo?.avatarUrl" :src="thread.contactInfo.avatarUrl" class="thread-photo" alt="" referrerpolicy="no-referrer" @error="$event.target.style.display = 'none'" />
              <i v-else class="fas fa-user-circle"></i>
            </div>
            <div class="thread-info">
              <div class="thread-top">
                <span class="thread-name"><i v-if="threadKind(thread) !== 'META_CLOUD'" :class="kindInfo(threadKind(thread)).icon" class="web-icon" :style="{ color: kindInfo(threadKind(thread)).color }" :title="kindLabel(threadKind(thread), isAr)"></i>{{ thread.contactName || contactSub(thread) }}</span>
                <span class="thread-time">{{ formatTime(thread.lastMessageAt) }}</span>
              </div>
              <div class="thread-bottom">
                <span class="thread-phone">{{ contactSub(thread) }}</span>
                <button @click.stop="quickAssign(thread)" class="btn-icon small text-slate-400 hover:text-[#FF6600]" title="إسناد المحادثة" style="background:transparent; border:none; padding:2px;">
                  <i class="fas fa-user-plus"></i>
                </button>
                <span class="channel-tag" v-if="channelTag(thread)">{{ channelTag(thread) }}</span>
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
                <i v-if="threadKind(selectedThread) !== 'META_CLOUD'" :class="kindInfo(threadKind(selectedThread)).icon" class="web-icon" :style="{ color: kindInfo(threadKind(selectedThread)).color }" :title="kindLabel(threadKind(selectedThread), isAr)"></i>{{ selectedThread.contactName || contactSub(selectedThread) }}
                <button @click="openRenameModal" class="btn-icon small rename-btn ml-2" title="تعديل الاسم">
                  <i class="fas fa-pen"></i>
                </button>
              </h3>
              <span class="contact-phone">{{ contactSub(selectedThread) }}</span>
              <button v-if="isWebThread(selectedThread) && selectedThread.contactInfo?.whatsappThreadId" type="button" class="wa-jump" @click="openWhatsAppThread(selectedThread.contactInfo.whatsappThreadId)">
                <i class="fab fa-whatsapp"></i> {{ isAr ? 'محادثته على واتساب' : 'Their WhatsApp chat' }}
              </button>
              <a v-if="isWebThread(selectedThread) && selectedThread.contactInfo?.pageUrl" :href="selectedThread.contactInfo.pageUrl" target="_blank" rel="noopener noreferrer" class="web-page" :title="selectedThread.contactInfo.pageUrl">
                <i class="fas fa-link"></i> {{ selectedThread.contactInfo.pageTitle || (isAr ? 'الصفحة التي كتب منها' : 'Page they wrote from') }}
              </a>
            </div>
          </div>
          <div class="chat-header-actions">
            <button v-if="canManageLabels" type="button" class="ticket-btn delete-thread-btn" @click="deleteThread" :title="isAr ? 'حذف المحادثة' : 'Delete conversation'">
              <i class="fas fa-trash"></i>
            </button>
            <button type="button" class="ticket-btn share-btn" @click="showTaskModal = true" :title="isAr ? 'مهمة متابعة على هذه المحادثة' : 'Follow-up task on this chat'">
              <i class="fas fa-list-check"></i>
              <span class="btn-label">{{ isAr ? 'مهمة' : 'Task' }}</span>
            </button>
            <button type="button" class="ticket-btn share-btn" @click="showShareModal = true" :title="isAr ? 'مشاركة مع زميل' : 'Share with a colleague'">
              <i class="fas fa-share"></i>
              <span class="btn-label">{{ isAr ? 'مشاركة' : 'Share' }}</span>
            </button>

            <!-- Active ticket: number, who has it, category, close -->
            <div v-if="activeTicket && isActiveStatus(activeTicket.status)" class="ticket-group">
              <span class="ticket-badge-open" :title="activeTicket.subject || ''">
                <i class="fas fa-ticket-alt"></i>
                <span dir="ltr">{{ activeTicket.ticketNumber || ('#' + activeTicket.id.slice(0, 8)) }}</span>
              </span>
              <button
                type="button"
                @click="promptAssign(activeTicket)"
                class="ticket-btn ticket-btn-assign"
                :class="{ unassigned: !activeTicket.assignedToId }"
                :title="activeTicket.assignedToId ? (isAr ? 'مسندة إلى ' : 'Assigned to ') + (getAssignedUserName(activeTicket.assignedToId) || '') : (isAr ? 'إسناد التذكرة لموظف' : 'Assign to a team member')"
              >
                <span v-if="activeTicket.assignedToId" class="mini-avatar" :style="{ background: categoryColor(getAssignedUserName(activeTicket.assignedToId) || '') }">{{ initials(getAssignedUserName(activeTicket.assignedToId) || '?') }}</span>
                <i v-else class="fas fa-user-plus"></i>
                <span class="btn-label">{{ activeTicket.assignedToId ? (getAssignedUserName(activeTicket.assignedToId) || (isAr ? 'مسندة' : 'Assigned')) : (isAr ? 'إسناد' : 'Assign') }}</span>
              </button>
              <button
                type="button"
                @click="showCategoryModal = true"
                class="ticket-btn ticket-btn-category"
                :style="activeCategory ? chipStyle(categoryColor(activeCategory.name)) : null"
                :title="isAr ? 'تصنيف التذكرة' : 'Ticket category'"
              >
                <i class="fas fa-tag"></i>
                <span class="btn-label">{{ activeCategory ? activeCategory.name : (isAr ? 'تصنيف' : 'Category') }}</span>
              </button>
              <button
                type="button"
                @click="closeActiveTicket"
                class="ticket-btn ticket-btn-close"
                :disabled="creatingTicket"
                :title="isAr ? 'إغلاق التذكرة' : 'Close ticket'"
              >
                <i class="fas fa-circle-check"></i>
                <span class="btn-label">{{ isAr ? 'إغلاق' : 'Close' }}</span>
              </button>
            </div>

            <!-- No active ticket -->
            <template v-else>
              <button
                v-if="hasReopenableTicket"
                type="button"
                @click="reopenActiveTicket"
                class="ticket-btn ticket-btn-reopen"
                :disabled="creatingTicket"
                :title="isAr ? `إعادة فتح ${activeTicket?.ticketNumber || ''}` : `Reopen ${activeTicket?.ticketNumber || ''}`"
              >
                <i class="fas fa-redo"></i>
                <span class="btn-label">{{ isAr ? 'إعادة الفتح' : 'Reopen' }} <span dir="ltr">{{ activeTicket?.ticketNumber || '' }}</span></span>
              </button>
              <button
                type="button"
                @click="createManualTicket"
                class="ticket-btn ticket-btn-new"
                :disabled="creatingTicket"
                :title="isAr ? 'فتح تذكرة جديدة وإسنادها لك' : 'Open a new ticket assigned to you'"
              >
                <i class="fas" :class="creatingTicket ? 'fa-spinner fa-spin' : 'fa-plus'"></i>
                <span class="btn-label">{{ isAr ? (hasReopenableTicket ? 'تذكرة جديدة' : 'فتح تذكرة') : (hasReopenableTicket ? 'New ticket' : 'Open ticket') }}</span>
              </button>
            </template>
          </div>
        </div>

        <div class="chat-labels-bar">
          <span v-if="selectedThread.flowState" class="bot-chip" :title="isAr ? 'أي رسالة تكتبها للعميل توقف السير وتتولى المحادثة' : 'Any message you send stops the flow and takes over'">
            <i class="fas fa-robot"></i> {{ isAr ? 'سير الواتساب يرد على هذه المحادثة' : 'A chat flow is answering' }}
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
                <span>{{ isAr ? 'ملاحظة داخلية' : 'Team note' }} · {{ noteAuthor(msg) }}</span>
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
              <p v-if="msg.content" dir="auto" :class="{ 'internal-note-text': msg.isInternal || msg.type === 'INTERNAL_NOTE' }">{{ msg.content }}</p>
              <div v-if="msg.mentions && msg.mentions.length" class="note-mentions">
                <span v-for="key in msg.mentions" :key="key" class="mention-chip" :class="{ me: key === myMemberKey }">
                  @{{ key === myMemberKey ? (isAr ? 'أنت' : 'you') : memberDisplayName(key) }}
                </span>
              </div>
              
              <div class="message-meta">
                <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
                <!-- Numbers that stay on the WhatsApp Business app: sent from the phone / imported old chat -->
                <span v-if="msg.source === 'BUSINESS_APP'" class="source-badge" :title="isAr ? 'أُرسلت من تطبيق WhatsApp Business على الجوال' : 'Sent from the WhatsApp Business app on the phone'">
                  <i class="fas fa-mobile-screen-button"></i> {{ isAr ? 'من التطبيق' : 'From the app' }}
                </span>
                <span v-else-if="msg.source === 'HISTORY'" class="source-badge" :title="isAr ? 'رسالة قديمة استُوردت من التطبيق' : 'Old message imported from the app'">
                  <i class="fas fa-clock-rotate-left"></i> {{ isAr ? 'مستوردة' : 'Imported' }}
                </span>
                <span v-else-if="msg.source === 'META_AI' && !msg.isInternal" class="source-badge" :title="isAr ? 'رد بوت Meta (Business Agent)' : 'Reply by Meta Business Agent'">
                  🤖 {{ isAr ? 'بوت Meta' : 'Meta bot' }}
                </span>
                <!-- A campaign message, added to the conversation when the customer replied -->
                <span v-else-if="msg.source === 'CAMPAIGN'" class="source-badge" :title="isAr ? 'رسالة حملة أرسلت لهذا العميل، تظهر هنا لأنه رد' : 'A campaign message this customer got; shown because they replied'">
                  <i class="fas fa-bullhorn"></i> {{ isAr ? 'حملة' : 'Campaign' }}<template v-if="msg.campaignName">: {{ msg.campaignName }}</template>
                </span>
                <!-- Who answered: the AI agent step, a flow step, or another automation (not a person) -->
                <span v-else-if="msg.source === 'FLOW_AI' && !msg.isInternal" class="source-badge" :title="isAr ? 'رد الموظف الذكي في سير الواتساب' : 'Reply by the AI agent of the chat flow'">
                  🤖 {{ isAr ? 'الموظف الذكي' : 'AI agent' }}
                </span>
                <span v-else-if="msg.source === 'FLOW' && !msg.isInternal" class="source-badge" :title="isAr ? 'رسالة من سير الواتساب' : 'Message from the chat flow'">
                  <i class="fas fa-bolt"></i> {{ isAr ? 'السير' : 'Flow' }}
                </span>
                <span v-else-if="msg.isAutomated && !msg.isInternal && msg.direction === 'OUTBOUND'" class="source-badge" :title="isAr ? 'رسالة آلية (رد تلقائي، رسالة خارج الدوام…)' : 'Automatic message (auto reply, away message…)'">
                  <i class="fas fa-robot"></i> {{ isAr ? 'آلي' : 'Automatic' }}
                </span>
                <span v-if="msg.type === 'TEMPLATE' && msg.source !== 'CAMPAIGN'" class="template-badge">
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

        <!-- Somebody else on the team has this conversation's ticket -->
        <div v-if="ownedByColleague" class="owner-banner">
          <i class="fas fa-user-lock"></i>
          <span>{{ isAr
            ? `هذه المحادثة عند ${getAssignedUserName(activeTicket.assignedToId) || 'زميل'}. يمكنك القراءة وكتابة ملاحظة داخلية، وإذا رددت على العميل نطلب تأكيدك أولاً.`
            : `${getAssignedUserName(activeTicket.assignedToId) || 'A colleague'} has this conversation. You can read and write team notes; replying to the customer asks you first.` }}</span>
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

          <!-- The number behind this conversation was removed -->
          <div v-if="channelMissing" class="window-banner">
            <i class="fas fa-link-slash"></i>
            <div class="window-banner-text">
              <strong>{{ isAr ? 'رقم هذه المحادثة لم يعد موجوداً' : 'The number of this conversation no longer exists' }}</strong>
              <span>{{ isAr ? 'حُذفت القناة التي أُنشئت عليها هذه المحادثة، لذلك لا يمكن الإرسال منها. يمكنك قراءتها أو حذفها. إذا كتب العميل إلى رقمك الحالي ستظهر محادثة جديدة.' : 'The channel this conversation was created on was removed, so nothing can be sent from it. You can read it or delete it. If the customer writes to your current number, a new conversation appears.' }}</span>
            </div>
          </div>

          <!-- Meta Business Agent is answering this conversation -->
          <div v-if="metaAiActive && !isInternal" class="window-banner ai-banner">
            <span class="ai-banner-icon">🤖</span>
            <div class="window-banner-text">
              <strong>{{ isAr ? 'بوت Meta عم يرد على هالمحادثة' : 'Meta Business Agent is answering this conversation' }}</strong>
              <span>{{ isAr ? 'إذا بعتت رسالة بتاخد المحادثة منه ويوقف يرد عليها. إذا Meta رفضت الإرسال، معناها تطبيق تاني ماسك المحادثة.' : 'If you send a message you take the conversation over and the agent stops answering it. If Meta refuses the send, another app holds the conversation.' }}</span>
            </div>
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

          <!-- AI reply draft: the agent reviews it, then uses it in the composer -->
          <div v-if="replyDraft.open" class="reply-draft" :dir="isAr ? 'rtl' : 'ltr'">
            <div class="reply-draft-head">
              <span><i class="fas fa-wand-magic-sparkles"></i> {{ isAr ? 'رد مقترح' : 'Suggested reply' }}</span>
              <button type="button" class="reply-draft-close" @click="closeReplyDraft" :title="isAr ? 'إغلاق' : 'Close'"><i class="fas fa-xmark"></i></button>
            </div>
            <div v-if="replyDraft.loading" class="reply-draft-loading"><i class="fas fa-spinner fa-spin"></i> {{ isAr ? 'يكتب الذكاء الاصطناعي مسودة من معلومات نشاطك…' : 'Writing a draft from your business info…' }}</div>
            <div v-else-if="replyDraft.error" class="reply-draft-error">{{ replyDraft.error }}</div>
            <template v-else>
              <p class="reply-draft-text" dir="auto">{{ replyDraft.text }}</p>
              <div v-if="replyDraft.missing" class="reply-draft-missing">
                <i class="fas fa-triangle-exclamation"></i>
                <span>{{ isAr ? 'أكمل قبل الإرسال:' : 'Fill in before sending:' }} {{ replyDraft.missing }}</span>
              </div>
              <div v-if="!replyDraft.hasKnowledge" class="reply-draft-missing">
                <i class="fas fa-circle-info"></i>
                <span>{{ isAr ? 'لا توجد معلومات نشاط محفوظة، فالاقتراح عام.' : 'No business info saved, so the draft is generic.' }} <router-link to="/ai-agent" class="underline">{{ isAr ? 'أضفها من صفحة الموظف الذكي' : 'Add it on the AI agent page' }}</router-link></span>
              </div>
            </template>
            <div class="reply-draft-actions">
              <button type="button" class="reply-draft-use" :disabled="replyDraft.loading || !replyDraft.text" @click="useReplyDraft">
                <i class="fas fa-pen"></i> {{ isAr ? 'استخدمه وعدّله' : 'Use and edit' }}
              </button>
              <button
                v-for="t in replyTones"
                :key="t.key"
                type="button"
                class="reply-draft-tone"
                :class="{ on: replyDraft.tone === t.key }"
                :disabled="replyDraft.loading"
                @click="suggestReply(t.key)"
              >{{ t.label }}</button>
            </div>
          </div>

          <div class="attachment-preview" v-if="attachment">
            <span>{{ attachment.name }}</span>
            <button @click="attachment = null" class="btn-clear"><i class="fas fa-times"></i></button>
          </div>

          <!-- @mention popup (team notes) -->
          <div v-if="mentionResults.length" class="mention-popup">
            <div class="mention-popup-title">{{ isAr ? 'أشر إلى زميل — سيصله تنبيه في المحادثات الداخلية' : 'Mention a colleague — they get notified in Team Chat' }}</div>
            <button v-for="m in mentionResults" :key="m.key" type="button" class="mention-option" @mousedown.prevent="insertMention(m)">
              <span class="mention-avatar">{{ (m.name || '?').charAt(0) }}</span>
              <span>{{ m.name }}</span>
            </button>
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
            <button v-if="isMetaThread" type="button" class="btn-attach" @click="showTemplateModal = true" :title="isAr ? 'إرسال قالب' : 'Send template'">
              <i class="fas fa-file-lines"></i>
            </button>
            <button
              v-if="aiConfigured && !isInternal && !channelMissing && !windowExpired"
              type="button"
              class="btn-attach btn-ai-reply"
              :disabled="replyDraft.loading"
              @click="suggestReply()"
              :title="isAr ? 'اقترح رداً بالذكاء الاصطناعي من معلومات نشاطك' : 'Suggest a reply with AI from your business info'"
            >
              <i class="fas" :class="replyDraft.loading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
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
            
            <textarea
              ref="msgInput"
              rows="1"
              v-model="newMessage"
              @input="handleInput"
              @keydown.enter.exact.prevent="sendMessage"
              :placeholder="isRecording ? 'جاري التسجيل...' : (isInternal ? 'اكتب ملاحظة داخلية لفريق العمل (لن يراها العميل)… استخدم @ للإشارة إلى زميل' : (windowExpired ? (isAr ? 'أرسل قالباً، أو فعّل الملاحظة الداخلية 🔒' : 'Send a template, or switch to an internal note 🔒') : 'Type a message...'))"
              class="form-control msg-input"
              :class="{ 'input-internal': isInternal }"
              :disabled="isRecording || channelMissing || (windowExpired && !isInternal)"
            ></textarea>
            
            <button 
              type="submit" 
              class="btn-send" 
              :class="{ 'btn-send-internal': isInternal }"
              :disabled="isRecording || channelMissing || (!newMessage.trim() && !attachment) || (windowExpired && !isInternal)"
              :title="isInternal ? 'حفظ ملاحظة داخلية' : 'إرسال'"
            >
              <i class="fas fa-lock" v-if="isInternal"></i>
              <i class="fas fa-paper-plane" v-else></i>
            </button>
          </form>
        </div>
      </div>
      
      <div class="chat-main empty-state" v-else>
        <div class="empty-icon"><i class="far fa-comments"></i></div>
        <h3>Welcome to Live Chat</h3>
        <p>Select a conversation from the sidebar to start messaging.</p>
      </div>

      <AssignTicketModal
        v-if="assignModalTicket"
        :ticket="assignModalTicket"
        :is-ar="isAr"
        :subtitle="assignModalSubtitle"
        @close="assignModalTicket = null"
        @assigned="onTicketChanged"
      />
      <CloseTicketModal
        v-if="showCloseModal && activeTicket"
        :ticket="activeTicket"
        :is-ar="isAr"
        :categories="ticketCategories"
        :can-manage-categories="canManageLabels"
        :window-open="isMetaThread ? !windowExpired : null"
        :subtitle="threadLabel(selectedThread)"
        @close="showCloseModal = false"
        @closed="onTicketChanged"
      />
      <TicketCategoryModal
        v-if="showCategoryModal && activeTicket"
        :ticket="activeTicket"
        :is-ar="isAr"
        :categories="ticketCategories"
        :can-manage-categories="canManageLabels"
        @close="showCategoryModal = false"
        @updated="onTicketChanged"
      />
      <ShareToTeamModal
        v-if="showShareModal && selectedThread"
        :thread="selectedThread"
        :is-ar="isAr"
        @close="showShareModal = false"
      />
      <TaskModal
        v-if="showTaskModal && selectedThread"
        :thread="selectedThread"
        :is-ar="isAr"
        @close="showTaskModal = false"
        @saved="onTaskSaved"
      />

      <TemplateSendModal
        v-if="showTemplateModal && selectedThread && isMetaThread"
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
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import { connectSocket } from '../services/realtime'
import { aiErrorMessage } from '../utils/aiErrors'
import { useI18n } from 'vue-i18n'
import FeatureLock from '../components/FeatureLock.vue'
import TaskModal from '../components/TaskModal.vue'
import StagePicker from '../components/chat/StagePicker.vue'
import TagPicker from '../components/chat/TagPicker.vue'
import TemplateSendModal from '../components/chat/TemplateSendModal.vue'
import ShareToTeamModal from '../components/chat/ShareToTeamModal.vue'
import AssignTicketModal from '../components/tickets/AssignTicketModal.vue'
import CloseTicketModal from '../components/tickets/CloseTicketModal.vue'
import TicketCategoryModal from '../components/tickets/TicketCategoryModal.vue'
import { isActiveStatus, categoryColor, initials, ticketErrorText } from '../utils/tickets'
import { useRoute, useRouter } from 'vue-router'
import { threadKind, kindInfo, kindLabel } from '../utils/channelKinds'
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'

const socket = ref(null)
const threads = ref([])
const messages = ref([])
const selectedThread = ref(null)
const searchQuery = ref('')
const channels = ref([])
// Which number a conversation came in on: only useful with several numbers and no number filter
const channelTag = (thread) => {
  if (channels.value.length < 2 || selectedChannel.value || !thread.channel) return ''
  return thread.channel.name || thread.channel.displayPhoneNumber || thread.channel.phoneNumber || ''
}
// Website widget conversations: the customer's address is an internal visitor id, so show what they told us
const isWebThread = (thread) => threadKind(thread) === 'WEBCHAT'
// Under the name: the phone on WhatsApp, @username on Instagram, the channel on Messenger, what a visitor told us
const contactSub = (thread) => {
  if (!thread) return ''
  const kind = threadKind(thread)
  if (kind === 'META_CLOUD') return thread.contactPhone || ''
  if (kind === 'INSTAGRAM') return thread.contactInfo?.username ? `@${thread.contactInfo.username}` : kindLabel(kind, isAr.value)
  if (kind === 'MESSENGER') return kindLabel(kind, isAr.value)
  const info = thread.contactInfo || {}
  const parts = [info.phone ? `+${info.phone}` : '', info.email || ''].filter(Boolean)
  return parts.length ? parts.join(' · ') : `${isAr.value ? 'زائر الموقع' : 'Website visitor'}${info.ref ? ` · ${info.ref}` : ''}`
}
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
const mySubUserId = storedTenant.isSubUser ? storedTenant.subUser?.id || null : null
// The open conversation's ticket belongs to another team member (replying asks for confirmation once)
const ownedByColleague = computed(() => !!(mySubUserId && activeTicket.value?.assignedToId &&
  activeTicket.value.assignedToId !== mySubUserId && ['OPEN', 'PENDING'].includes(activeTicket.value.status)))
let replyConfirmedFor = null
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
const showShareModal = ref(false)
// Follow-up task on the open conversation (Tasks page lists them all)
const showTaskModal = ref(false)
const onTaskSaved = () => window.dispatchEvent(new Event('tasks-updated'))
const route = useRoute()
const router = useRouter()

// A website visitor who continued on WhatsApp: jump to that conversation
const openWhatsAppThread = (id) => router.replace({ path: '/live-chat', query: { thread: id } })
watch(() => route.query.thread, (id, before) => { if (id && id !== before) openThreadFromLink() })

// Opening a conversation shared from team chat (/live-chat?thread=<id>)
const openThreadFromLink = async () => {
  const id = route.query.thread
  if (!id) return
  let thread = threads.value.find(t => t.id === id)
  if (!thread) {
    try {
      const res = await axios.get(`/api/v1/chat/threads/${id}`)
      thread = res.data.data
      threads.value.unshift(thread)
    } catch (err) {
      Swal.fire({
        icon: 'info',
        title: err.response?.status === 403
          ? (isAr.value ? 'هذه المحادثة خارج نطاق صلاحياتك' : 'This conversation is outside your access')
          : (isAr.value ? 'المحادثة غير موجودة' : 'Conversation not found'),
        confirmButtonColor: '#FF6600'
      })
      return
    }
  }
  selectThread(thread)
}

const aiConfigured = ref(false)

// ─── AI: suggested reply ──────────────────────────────────────
const replyDraft = ref({ open: false, loading: false, text: '', missing: '', hasKnowledge: true, error: '', tone: 'default', threadId: null })
const replyTones = computed(() => [
  { key: 'default', label: isAr.value ? 'اقتراح آخر' : 'Another one' },
  { key: 'shorter', label: isAr.value ? 'أقصر' : 'Shorter' },
  { key: 'formal', label: isAr.value ? 'أكثر رسمية' : 'More formal' },
  { key: 'friendly', label: isAr.value ? 'أكثر ودّاً' : 'Friendlier' }
])
const closeReplyDraft = () => { replyDraft.value = { ...replyDraft.value, open: false } }

const suggestReply = async (tone = 'default') => {
  const thread = selectedThread.value
  if (!thread) return
  replyDraft.value = { open: true, loading: true, text: '', missing: '', hasKnowledge: true, error: '', tone, threadId: thread.id }
  try {
    const res = await axios.post(`/api/v1/ai/threads/${thread.id}/suggest-reply`, { tone })
    // The agent may have opened another conversation meanwhile
    if (selectedThread.value?.id !== thread.id) return
    replyDraft.value = { ...replyDraft.value, loading: false, ...res.data.data }
  } catch (err) {
    if (selectedThread.value?.id !== thread.id) return
    const raw = err.response?.data?.error?.message
    replyDraft.value = {
      ...replyDraft.value,
      loading: false,
      error: raw === 'The customer has not written anything yet'
        ? (isAr.value ? 'لم يكتب العميل شيئاً بعد.' : 'The customer has not written anything yet.')
        : (aiErrorMessage(err, isAr.value) || (isAr.value ? 'تعذّر اقتراح رد.' : 'Could not suggest a reply.'))
    }
  }
}

const useReplyDraft = () => {
  newMessage.value = replyDraft.value.text
  closeReplyDraft()
  nextTick(() => {
    resizeComposer()
    const el = msgInput.value
    if (!el) return
    el.focus()
    // Select the first [placeholder] so the agent can type over it
    const start = newMessage.value.indexOf('[')
    const end = start >= 0 ? newMessage.value.indexOf(']', start) : -1
    if (start >= 0 && end > start) el.setSelectionRange(start, end + 1)
  })
}

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
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر إنشاء الملخص' : 'Could not summarize', text: aiErrorMessage(err, isAr.value), confirmButtonColor: '#FF6600' })
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

// The 24h customer-service window and templates exist only on Meta's official API, not on QR (Baileys) numbers
const isMetaThread = computed(() => selectedThread.value?.channel?.providerType === 'META_CLOUD')

// The number this conversation was created on has been removed (it can be read, but nothing can be sent)
const channelMissing = computed(() => !!selectedThread.value && selectedThread.value.channel === null)

const deleteThread = async () => {
  const thread = selectedThread.value
  if (!thread) return
  const ok = await Swal.fire({
    icon: 'warning',
    title: isAr.value ? 'حذف هذه المحادثة؟' : 'Delete this conversation?',
    text: isAr.value
      ? 'ستُحذف المحادثة وكل رسائلها نهائياً ولا يمكن التراجع. جهة الاتصال تبقى في «جهات الاتصال» والتذاكر تبقى كما هي.'
      : 'The conversation and all its messages will be deleted permanently. The contact stays in Contacts and tickets are kept.',
    showCancelButton: true,
    confirmButtonText: isAr.value ? 'نعم، احذف' : 'Yes, delete',
    cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel',
    confirmButtonColor: '#DC2626'
  })
  if (!ok.isConfirmed) return
  try {
    await axios.delete(`/api/v1/chat/threads/${thread.id}`)
    threads.value = threads.value.filter(t => t.id !== thread.id)
    selectedThread.value = null
    messages.value = []
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر الحذف' : 'Could not delete', text: err.response?.data?.message || err.message, confirmButtonColor: '#FF6600' })
  }
}

// Meta Business Agent holds this conversation: it answered recently (Meta frees a thread after 24h of
// inactivity) and has not handed it to the team since
const metaAiActive = computed(() => {
  const ai = selectedThread.value?.metaAi
  if (!isMetaThread.value || !ai?.lastAt) return false
  const last = new Date(ai.lastAt).getTime()
  if (nowTick.value - last >= WINDOW_MS) return false
  return !ai.handedOffAt || last > new Date(ai.handedOffAt).getTime()
})

const windowExpired = computed(() => {
  if (!selectedThread.value || !isMetaThread.value || loadingMessages.value) return false
  return !lastInboundTime.value || nowTick.value - lastInboundTime.value >= WINDOW_MS
})

// Shown during the last 3 hours of the window
const windowRemainingLabel = computed(() => {
  if (!isMetaThread.value || !lastInboundTime.value || windowExpired.value) return ''
  const left = WINDOW_MS - (nowTick.value - lastInboundTime.value)
  if (left <= 0 || left > 3 * 60 * 60 * 1000) return ''
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
const assignModalTicket = ref(null)
const assignModalSubtitle = ref('')
const showCloseModal = ref(false)
const showCategoryModal = ref(false)
const activeCategory = computed(() => (activeTicket.value?.categoryId ? ticketCategories.value.find(c => c.id === activeTicket.value.categoryId) || null : null))
const threadLabel = (thread) => {
  if (!thread) return ''
  const sub = contactSub(thread)
  return thread.contactName && thread.contactName !== sub ? `${thread.contactName} · ${sub}` : sub
}

// A modal changed the ticket: show it at once (the socket event also refreshes other screens)
const onTicketChanged = (ticket) => {
  assignModalTicket.value = null
  showCloseModal.value = false
  showCategoryModal.value = false
  if (ticket && selectedThread.value && ticket.threadId === selectedThread.value.id) {
    activeTicket.value = { ...(activeTicket.value || {}), ...ticket }
  }
}
const loadingMessages = ref(false)
const msgInput = ref(null)
const focusInput = () => nextTick(() => msgInput.value?.focus())
const resizeComposer = () => {
  const el = msgInput.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 150)}px`
}
watch(newMessage, () => nextTick(resizeComposer))
let pendingSeq = 0
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
    // Every Live Chat channel: WhatsApp numbers and website widgets
    const res = await axios.get('/api/v1/channels')
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

// ─── Team members (note authors & @mentions) ──────────────────
const chatMembers = ref([])
const myMemberKey = ref('')
const mentionQuery = ref(null)

const fetchChatMembers = async () => {
  try {
    const res = await axios.get('/api/v1/team-chat/members')
    chatMembers.value = res.data.data.members || []
    myMemberKey.value = res.data.data.me
  } catch { chatMembers.value = [] }
}
const memberDisplayName = (key) => chatMembers.value.find(m => m.key === key)?.name || (isAr.value ? 'زميل' : 'colleague')
const noteAuthor = (msg) => {
  if (msg.isAutomated) return isAr.value ? 'النظام' : 'System'
  return memberDisplayName(msg.senderId || 'owner')
}

// "@na" at the end of the note being typed → matching colleagues
const mentionResults = computed(() => {
  if (!isInternal.value || mentionQuery.value === null) return []
  const q = mentionQuery.value.toLowerCase()
  return chatMembers.value.filter(m => m.key !== myMemberKey.value && m.name.toLowerCase().includes(q)).slice(0, 6)
})
const updateMentionQuery = () => {
  const match = isInternal.value ? newMessage.value.match(/(?:^|\s)@([^\s@]*)$/) : null
  mentionQuery.value = match ? match[1] : null
}
const insertMention = (member) => {
  newMessage.value = newMessage.value.replace(/@([^\s@]*)$/, `@${member.name} `)
  mentionQuery.value = null
}
// Colleagues whose "@Name" is still in the note when it is sent
const mentionedKeys = (text) => chatMembers.value
  .filter(m => m.key !== myMemberKey.value && text.includes(`@${m.name}`))
  .map(m => m.key)

const handleInput = () => {
  updateMentionQuery()
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

// silent: background refresh (no spinner, no error popup) — also called as a DOM event handler
const fetchThreads = async (options) => {
  const silent = options?.silent === true
  if (!silent) loadingThreads.value = true
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
    if (!silent) alert('Failed to load conversations.')
  } finally {
    if (!silent) loadingThreads.value = false
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
    const openRes = await axios.get('/api/v1/tickets?threadId=' + threadId + '&status=ACTIVE&limit=1');
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
  closeReplyDraft() // a draft belongs to the conversation it was written for
  activeTicket.value = null // Reset so old thread's ticket isn't shown while loading
  thread.unreadCount = 0 // Optimistic update
  await Promise.all([
    fetchMessages(thread.id),
    fetchActiveTicket(thread.id)
  ])
  loadSuggestion(thread)
  claimOnOpen(thread)
  // Viewing a conversation never opens or reopens a ticket: customer messages do that on the server,
  // and the team uses the buttons in the header
}


/**
 * A team member opening a conversation takes its unassigned ticket (ticket setting "when they open it").
 * The server decides atomically, so when two people open it at the same moment only one gets it.
 * Assigned tickets are reported too: the first opening is the ticket's opening time in the reports.
 */
const claimOnOpen = async (thread) => {
  const ticket = activeTicket.value
  if (!mySubUserId || !ticket || !['OPEN', 'PENDING'].includes(ticket.status)) return
  const lookedFree = !ticket.assignedToId
  try {
    const res = await axios.post('/api/v1/tickets/claim-on-open', { threadId: thread.id })
    const data = res.data.data || {}
    if (selectedThread.value?.id !== thread.id) return
    if (data.ticket) activeTicket.value = { ...activeTicket.value, ...data.ticket }
    const toast = { toast: true, position: 'top-end', showConfirmButton: false, timer: 2600 }
    if (data.claimed) {
      Swal.fire({ ...toast, icon: 'success', title: isAr.value ? `استلمت التذكرة ${data.ticket?.ticketNumber || ''}` : `You took ticket ${data.ticket?.ticketNumber || ''}` })
    } else if (data.reason === 'TAKEN' && lookedFree) {
      Swal.fire({ ...toast, icon: 'info', title: isAr.value ? `استلمها ${data.assignee?.name || 'زميل'} قبلك` : `${data.assignee?.name || 'A colleague'} took it first` })
    }
  } catch (err) {
    console.warn('Could not take the ticket on open', err)
  }
}

// Assign icon in the conversation list
const quickAssign = async (thread) => {
  try {
    const res = await axios.get('/api/v1/tickets?threadId=' + thread.id + '&status=ACTIVE&limit=1')
    let ticket = res.data?.data?.[0] || null
    if (!ticket) {
      const confirm = await Swal.fire({
        title: isAr.value ? 'فتح تذكرة؟' : 'Open a ticket?',
        text: isAr.value ? 'لا توجد تذكرة مفتوحة لهذه المحادثة. افتح واحدة ثم اختر من يتولاها.' : 'This conversation has no open ticket. Open one, then choose who takes it.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#FF6600',
        confirmButtonText: isAr.value ? 'فتح تذكرة' : 'Open ticket',
        cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
      })
      if (!confirm.isConfirmed) return
      ticket = await openTicket(thread, { assignedToId: null })
      if (!ticket) return
    }
    promptAssign(ticket, thread)
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'حدث خطأ' : 'Error', text: ticketErrorText(err, isAr.value), confirmButtonColor: '#FF6600' })
  }
}

const promptAssign = (ticket, thread = selectedThread.value) => {
  assignModalSubtitle.value = threadLabel(thread)
  assignModalTicket.value = ticket
}

const closeActiveTicket = () => {
  if (activeTicket.value) showCloseModal.value = true
}

const reopenActiveTicket = async () => {
  if (!activeTicket.value) return
  creatingTicket.value = true
  try {
    const res = await axios.post('/api/v1/tickets/' + activeTicket.value.id + '/reopen')
    activeTicket.value = res.data.data
    Swal.fire({ icon: 'success', title: isAr.value ? `أُعيد فتح التذكرة ${res.data.data.ticketNumber}` : `Ticket ${res.data.data.ticketNumber} reopened`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 })
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّرت إعادة الفتح' : 'Could not reopen', text: ticketErrorText(err, isAr.value), confirmButtonColor: '#FF6600' })
    if (selectedThread.value) fetchActiveTicket(selectedThread.value.id)
  } finally {
    creatingTicket.value = false
  }
}

/**
 * Opens a ticket for a conversation. By default it goes to the person opening it (the server decides:
 * a team member gets it, the account owner's tickets follow the team's routing).
 */
const openTicket = async (thread, extra = {}) => {
  const lastCustomerMessage = selectedThread.value?.id === thread.id
    ? [...messages.value].reverse().find(m => m.direction === 'INBOUND' && m.content && !m.content.startsWith('['))
    : null
  try {
    const res = await axios.post('/api/v1/tickets', {
      channelId: thread.channelId,
      threadId: thread.id,
      crmClientId: thread.crmClientId,
      subject: lastCustomerMessage?.content?.substring(0, 100) || 'محادثة واتساب',
      ...extra
    })
    return res.data.data
  } catch (err) {
    // Someone (or a customer message) opened one meanwhile: use it
    if (err.response?.status === 409 && err.response.data?.data) return err.response.data.data
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر فتح التذكرة' : 'Could not open the ticket', text: ticketErrorText(err, isAr.value), confirmButtonColor: '#FF6600' })
    return null
  }
}

const createManualTicket = async () => {
  if (!selectedThread.value) return
  creatingTicket.value = true
  try {
    const ticket = await openTicket(selectedThread.value)
    if (!ticket) return
    activeTicket.value = ticket
    const owner = getAssignedUserName(ticket.assignedToId)
    Swal.fire({
      icon: 'success',
      title: isAr.value ? `فُتحت التذكرة ${ticket.ticketNumber}` : `Ticket ${ticket.ticketNumber} opened`,
      text: ticket.assignedToId
        ? (ticket.assignedToId === storedTenant.subUser?.id
          ? (isAr.value ? 'وأُسندت لك.' : 'It is assigned to you.')
          : (isAr.value ? `وأُسندت إلى ${owner || 'أحد أعضاء الفريق'}.` : `Assigned to ${owner || 'a team member'}.`))
        : (isAr.value ? 'وهي غير مسندة بعد، اختر من يتولاها.' : 'Nobody has it yet; choose who takes it.'),
      toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
    })
  } finally {
    creatingTicket.value = false
  }
}

const fetchMessages = async (threadId, { silent = false } = {}) => {
  if (!silent) {
    loadingMessages.value = true
    messages.value = []
  }
  try {
    const res = await axios.get(`/api/v1/chat/threads/${threadId}/messages`, {
      params: { limit: 100 }
    })
    if (selectedThread.value?.id !== threadId) return
    messages.value = res.data.data.messages
    scrollToBottom()
  } catch (error) {
    console.error('Error fetching messages:', error)
    if (!silent) alert('Failed to load messages.')
  } finally {
    if (!silent) loadingMessages.value = false
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
    alert(`${isAr.value ? 'تعذّر حفظ الاسم' : 'Could not save the name'}: ${err.response?.data?.error?.message || err.message}`)
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

const uploadFile = async (file = attachment.value) => {
  if (!file) return null
  const formData = new FormData()
  formData.append('file', file)
  
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

// The message appears at once (with a clock) and is replaced by the saved one when the server answers, so the
// agent can keep typing without waiting for WhatsApp; if sending fails the text goes back into the box.
const sendMessage = async () => {
  const thread = selectedThread.value
  if (!thread) return
  const text = newMessage.value.trim()
  const file = attachment.value
  if (!text && !file) return

  const internal = isInternal.value
  if (!internal && ownedByColleague.value && replyConfirmedFor !== thread.id) {
    const owner = getAssignedUserName(activeTicket.value.assignedToId) || (isAr.value ? 'زميلك' : 'your colleague')
    const answer = await Swal.fire({
      icon: 'question',
      title: isAr.value ? `المحادثة عند ${owner}` : `${owner} has this conversation`,
      text: isAr.value ? 'ردّك سيصل للعميل، والتذكرة تبقى عنده. للتنسيق يمكنك كتابة ملاحظة داخلية بدلاً من ذلك.' : 'Your reply reaches the customer and the ticket stays with them. To coordinate, write a team note instead.',
      showCancelButton: true,
      confirmButtonColor: '#FF6600',
      confirmButtonText: isAr.value ? 'أرسل الرد' : 'Send the reply',
      cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
    })
    if (!answer.isConfirmed) return
    replyConfirmedFor = thread.id
  }
  const mentions = internal ? mentionedKeys(newMessage.value) : []
  let type = 'TEXT'
  if (file) {
    if (file.type.startsWith('image/')) type = 'IMAGE'
    else if (file.type.startsWith('video/')) type = 'VIDEO'
    else if (file.type.startsWith('audio/')) type = 'AUDIO'
    else type = 'DOCUMENT'
  }

  const tempId = `pending-${++pendingSeq}`
  const previewUrl = file ? URL.createObjectURL(file) : undefined
  messages.value.push({
    id: tempId, threadId: thread.id, direction: 'OUTBOUND', type, content: text, hasMedia: !!file,
    mediaUrl: previewUrl, mediaMime: file?.type, status: 'SENDING', isInternal: internal, pending: true,
    createdAt: new Date().toISOString()
  })
  newMessage.value = ''
  attachment.value = null
  showEmojiPicker.value = false
  isInternal.value = false
  if (fileInput.value) fileInput.value.value = ''
  scrollToBottom()
  focusInput()

  try {
    const mediaUrl = file ? await uploadFile(file) : null
    const res = await axios.post(`/api/v1/chat/threads/${thread.id}/messages`, {
      content: text, isInternal: internal, mentions, type, hasMedia: !!mediaUrl, mediaUrl, mediaMime: file?.type
    })
    const sentMsg = res.data.data
    const tempIdx = messages.value.findIndex(m => m.id === tempId)
    const realIdx = messages.value.findIndex(m => m.id === sentMsg.id)
    if (tempIdx !== -1 && realIdx === -1) messages.value.splice(tempIdx, 1, sentMsg)   // swap the temporary one
    else if (tempIdx !== -1) messages.value.splice(tempIdx, 1)                           // the live update already brought it
    // Update thread summary
    const row = threads.value.find(t => t.id === thread.id)
    if (row) {
      row.lastMessageAt = sentMsg.createdAt
      threads.value.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    }
    scrollToBottom()
  } catch (error) {
    console.error('Error sending message:', error)
    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx !== -1) messages.value.splice(idx, 1)
    // nothing is lost: the text (and file) go back where they were, unless the agent already started something new
    if (!newMessage.value) newMessage.value = text
    if (file && !attachment.value) attachment.value = file
    if (internal) isInternal.value = true
    alert(error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to send message.')
    focusInput()
  } finally {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
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
  fetchThreads().then(openThreadFromLink)
  fetchQuickReplies()
  fetchTeamMembers()
  fetchChatMembers()
  fetchTicketCategories()
  fetchLabels()
  fetchAiStatus()
  nowTimer = setInterval(() => { nowTick.value = Date.now() }, 60000)

  // Initialize Socket.io (authenticated; the server picks the rooms)
  socket.value = connectSocket()

  // Restricted agents get content-free pings and reload through the API, which applies their scope
  let activityTimer = null
  socket.value.on('chat_activity', ({ threadId }) => {
    if (selectedThread.value && threadId === selectedThread.value.id) {
      fetchMessages(threadId, { silent: true })
      fetchActiveTicket(threadId)
    }
    clearTimeout(activityTimer)
    activityTimer = setTimeout(() => fetchThreads({ silent: true }), 800)
  })

  socket.value.on('new_chat_message', (msg) => {
    // If the message belongs to the active thread, append it
    if (selectedThread.value && msg.threadId === selectedThread.value.id) {
      // Our own message coming back: it replaces the temporary one shown while it was being sent
      if (msg.direction === 'OUTBOUND') {
        const pendingIdx = messages.value.findIndex(m => m.pending && m.content === msg.content && !!m.isInternal === !!msg.isInternal)
        if (pendingIdx !== -1) {
          messages.value.splice(pendingIdx, 1, msg)
          scrollToBottom()
          return
        }
      }
      // Check if it's not a duplicate
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
      if (updatedThread.metaAi !== undefined) threads.value[idx].metaAi = updatedThread.metaAi
      // Renamed here or by a teammate (a customer's own WhatsApp name never replaces a name the team set)
      if (updatedThread.contactName) {
        threads.value[idx].contactName = updatedThread.contactName
        if (selectedThread.value?.id === threads.value[idx].id) selectedThread.value.contactName = updatedThread.contactName
      }
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
  /* Without this a long link or the header buttons push the chat past the screen edge */
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  container-type: inline-size;
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
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 1rem;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-inline-start: auto;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
}

.chat-header-info h3 {
  overflow-wrap: anywhere;
}

/* Ticket number, owner, category and close, kept together */
.ticket-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.mini-avatar {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  color: white;
  font-size: 9px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-label {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Narrow chat: icons only (each button keeps its tooltip) */
@container (max-width: 760px) {
  .chat-header-actions .btn-label { display: none; }
  .chat-header-actions .ticket-btn { padding: 6px 9px; }
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
  /* Long links and numbers wrap instead of widening the chat */
  overflow-wrap: anywhere;
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

.thread-photo {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
}

.web-icon {
  color: #0891b2;
  font-size: 0.8em;
  margin-inline-end: 6px;
}

.wa-jump {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: 8px;
  font-size: 0.78rem;
  color: #15803d;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  padding: 1px 8px;
  cursor: pointer;
}

.web-page {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: 8px;
  font-size: 0.78rem;
  color: #0891b2;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
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
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 10px;
  padding: 10px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  color: #92400e;
  font-size: 0.8rem;
}

.ai-banner {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.ai-banner-icon {
  font-size: 1.1rem;
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
  min-width: 0;
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

.owner-banner { display: flex; align-items: flex-start; gap: 8px; margin: 0 16px 8px; padding: 8px 12px; border-radius: 10px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; font-size: 12.5px; line-height: 1.6; }
.owner-banner i { margin-top: 3px; }
.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  opacity: 0.8;
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

.note-mentions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.mention-chip {
  font-size: 0.7rem;
  font-weight: 700;
  color: #92400e;
  background: #fef3c7;
  border-radius: 999px;
  padding: 1px 8px;
}

.mention-chip.me {
  background: #FF6600;
  color: white;
}

.mention-popup {
  position: absolute;
  bottom: 100%;
  inset-inline-start: 16px;
  width: 280px;
  margin-bottom: 8px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
  overflow: hidden;
  z-index: 50;
}

.mention-popup-title {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  background: #f8fafc;
  padding: 7px 10px;
  border-bottom: 1px solid #f1f5f9;
}

.mention-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: white;
  font-size: 0.85rem;
  color: #0f172a;
  cursor: pointer;
  text-align: start;
}

.mention-option:hover {
  background: #fff7f2;
}

.mention-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4338ca;
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-thread-btn { color: #DC2626; }
.delete-thread-btn:hover { background: #FEF2F2; }
.share-btn {
  background: #eef2ff !important;
  color: #4338ca !important;
  border: 1px solid #c7d2fe !important;
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
  align-items: flex-end;
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
  border-radius: 22px;
  padding: 11px 18px;
  border: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  /* Multi-line: Enter sends, Shift+Enter adds a line; grows up to ~6 lines */
  resize: none;
  min-height: 44px;
  max-height: 150px;
  line-height: 1.45;
  font-family: inherit;
  overflow-y: auto;
}

.btn-ai-reply { color: #7c3aed !important; }
.btn-ai-reply:hover:not(:disabled) { background: #f5f3ff !important; }

.reply-draft {
  margin: 0 0 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #faf5ff;
  border: 1px solid #ddd6fe;
}
.reply-draft-head { display: flex; align-items: center; justify-content: space-between; font-size: 0.78rem; font-weight: 800; color: #6d28d9; margin-bottom: 6px; }
.reply-draft-head i { margin-inline-end: 4px; }
.reply-draft-close { background: none; border: none; color: #a78bfa; cursor: pointer; padding: 2px 6px; }
.reply-draft-loading, .reply-draft-error { font-size: 0.85rem; color: #6b21a8; padding: 4px 0; }
.reply-draft-error { color: #b91c1c; }
.reply-draft-text { margin: 0; font-size: 0.92rem; line-height: 1.6; color: #1e1b4b; white-space: pre-line; overflow-wrap: anywhere; }
.reply-draft-missing { display: flex; gap: 6px; align-items: flex-start; margin-top: 8px; font-size: 0.78rem; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 6px 10px; }
.reply-draft-missing i { margin-top: 2px; }
.reply-draft-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.reply-draft-use { background: #7c3aed; color: white; border: none; border-radius: 10px; padding: 6px 12px; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
.reply-draft-use:disabled { opacity: 0.5; cursor: not-allowed; }
.reply-draft-tone { background: white; color: #6d28d9; border: 1px solid #ddd6fe; border-radius: 999px; padding: 5px 11px; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
.reply-draft-tone.on { background: #ede9fe; }
.reply-draft-tone:disabled { opacity: 0.5; cursor: not-allowed; }

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
  background: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}
.ticket-btn-close:hover:not(:disabled) {
  background: #d1fae5;
  color: #065f46;
  border-color: #6ee7b7;
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
  background: white;
  color: #334155;
  border-color: #cbd5e1;
}
.ticket-btn-assign.unassigned {
  border-style: dashed;
  border-color: #fb923c;
  color: #c2410c;
  background: #fff7ed;
}
.ticket-btn-category {
  background: white;
  color: #64748b;
  border-color: #e2e8f0;
}
.ticket-btn-category:hover {
  filter: brightness(0.97);
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
