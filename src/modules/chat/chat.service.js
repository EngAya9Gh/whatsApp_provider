const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const metaService = require('../meta/meta.service');
const channelSender = require('../channels/channel.sender');
const { capabilitiesOf, isWebchat } = require('../channels/channel.kinds');
const { metaErrorInfo, metaErrorText } = require('../meta/meta.errors');
const socketService = require('../../services/socket.service');
const billingService = require('../billing/billing.service');
const logger = require('../../utils/logger');
const { withLock } = require('../../utils/keyLock');
const ChatThread = require('../../models/mongo/ChatThread');
const ChatMessage = require('../../models/mongo/ChatMessage');

// The channel fields the conversation list shows (and uses to tell Meta from QR conversations)
const CHANNEL_FIELDS = { id: true, phoneNumber: true, name: true, displayPhoneNumber: true, providerType: true };
// Messages written by a WhatsApp flow (see ChatMessage.source)
const FLOW_SOURCES = ['FLOW', 'FLOW_AI', 'FLOW_HANDOFF'];
// Campaign messages added to a conversation when the customer replies: at most this many, this recent
const CAMPAIGN_CHAT_DAYS = 30;
const CAMPAIGN_CHAT_MAX = 10;

/**
 * A WhatsApp message (Meta webhook) in the shape every channel hands to receiveMessage():
 * { id, type, content, hasMedia, mediaUrl, mediaMime, interactiveId }
 */
function normalizeWhatsAppMessage(msg, channelId) {
  const out = { id: msg.id, type: 'TEXT', content: '', hasMedia: false, mediaUrl: null, mediaMime: null, interactiveId: null };
  if (msg.type === 'text') {
    out.content = msg.text.body;
  } else if (msg.type === 'image' || msg.type === 'document' || msg.type === 'video' || msg.type === 'audio') {
    out.type = msg.type.toUpperCase();
    out.hasMedia = true;
    out.content = msg[msg.type]?.caption || '';
    out.mediaMime = msg[msg.type]?.mime_type || null;
    const rawMediaId = msg[msg.type]?.id;
    if (rawMediaId) out.mediaUrl = `/api/v1/chat/media/${rawMediaId}?channelId=${channelId}`;
  } else if (msg.type === 'interactive') {
    out.type = 'INTERACTIVE';
    if (msg.interactive.type === 'button_reply') {
      out.content = msg.interactive.button_reply.title;
      out.interactiveId = msg.interactive.button_reply.id;
    } else if (msg.interactive.type === 'list_reply') {
      out.content = msg.interactive.list_reply.title;
      out.interactiveId = msg.interactive.list_reply.id;
    }
  } else if (msg.type === 'button') {
    // A quick-reply button of a template (a campaign's buttons) was tapped
    out.type = 'INTERACTIVE';
    out.content = msg.button?.text || msg.button?.payload || '';
  } else {
    out.content = `[Unsupported message type: ${msg.type}]`;
  }
  return out;
}

/** Name of a conversation after a customer message: the team's own name wins over the WhatsApp profile name */
function inboundName(thread, profileName) {
  if (thread.nameEditedAt && thread.contactName) return thread.contactName;
  return profileName || thread.contactName;
}

class ChatService {
  async getQuickReplies(tenantId) {
    return prisma.quickReply.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createQuickReply(tenantId, shortcut, content) {
    // Ensure shortcut doesn't have slash, we'll add it in UI
    const cleanShortcut = shortcut.replace(/^\//, '').trim();
    return prisma.quickReply.create({
      data: {
        tenantId,
        shortcut: cleanShortcut,
        content
      }
    });
  }

  async deleteQuickReply(tenantId, id) {
    return prisma.quickReply.delete({
      where: { id, tenantId }
    });
  }

  async getThreads(tenantId, page = 1, limit = 50, search = '', channelId = null, filters = {}) {
    const skip = (page - 1) * limit;

    let where = { tenantId };
    if (channelId) {
      where.channelId = channelId;
    }
    if (filters.tagId) {
      where.tagIds = String(filters.tagId);
    }
    if (filters.stageId === 'none') {
      where.stageId = null;
    } else if (filters.stageId) {
      where.stageId = String(filters.stageId);
    }
    if (search) {
      where.$or = [
        { contactPhone: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } }
      ];
    }
    if (filters.access) {
      where = { $and: [where, filters.access] };
    }

    // Fetch from MongoDB
    const threads = await ChatThread.find(where)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ChatThread.countDocuments(where);

    // Fetch channels from MySQL to attach to threads (since Mongo only has channelId)
    const channelIds = [...new Set(threads.map(t => t.channelId))];
    const channels = await prisma.whatsAppChannel.findMany({
      where: { id: { in: channelIds } },
      select: CHANNEL_FIELDS
    });
    
    const channelMap = {};
    channels.forEach(ch => { channelMap[ch.id] = ch; });

    const enrichedThreads = threads.map(t => {
      // Map _id to id for frontend compatibility
      t.id = t._id.toString();
      t.channel = channelMap[t.channelId] || null;
      return t;
    });

    return {
      threads: enrichedThreads,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Records a message that was sent outside Live Chat (the Send Message page, the API) in its conversation,
   * creating the conversation on first contact, so the whole history is in one place and delivery ticks work.
   * Never throws: a failure to record must not turn a delivered message into an error.
   */
  async recordOutbound(tenantId, channelId, phone, { type = 'TEXT', content = '', metaMessageId = null, status = 'SENT' } = {}) {
    try {
      const contactPhone = String(phone || '').replace(/\D/g, '');
      if (!channelId || !contactPhone) return null;
      const now = new Date();

      let thread = await ChatThread.findOne({ tenantId, channelId, contactPhone });
      let isNew = false;
      if (!thread) {
        const contact = await prisma.contact.findFirst({ where: { tenantId, phone: contactPhone }, select: { name: true } }).catch(() => null);
        try {
          thread = await ChatThread.create({ tenantId, channelId, contactPhone, contactName: contact?.name || contactPhone, lastMessageAt: now, unreadCount: 0 });
          isNew = true;
        } catch (e) {
          if (e.code !== 11000) throw e; // created at the same moment by another message
          thread = await ChatThread.findOne({ tenantId, channelId, contactPhone });
        }
      }
      if (!isNew) await ChatThread.updateOne({ _id: thread._id }, { $set: { lastMessageAt: now } });

      const message = await ChatMessage.create({
        threadId: thread._id, direction: 'OUTBOUND', type, content, status, metaMessageId
      });
      const msgData = message.toObject();
      msgData.id = msgData._id.toString();
      socketService.emitToTenant(tenantId, 'new_chat_message', msgData);

      if (isNew) {
        const threadData = thread.toObject();
        threadData.id = threadData._id.toString();
        threadData.channel = await prisma.whatsAppChannel.findUnique({ where: { id: channelId }, select: CHANNEL_FIELDS });
        socketService.emitToTenant(tenantId, 'thread_updated', threadData);
      } else {
        socketService.emitToTenant(tenantId, 'thread_updated', { id: thread._id.toString(), lastMessageAt: now });
      }
      return msgData;
    } catch (error) {
      logger.warn(`[ChatService] Could not record an outbound message in the conversation: ${error.message}`);
      return null;
    }
  }

  /**
   * Campaigns do not open conversations in Live Chat (a campaign to thousands would flood it). When a
   * customer replies, the campaign messages they got in the last CAMPAIGN_CHAT_DAYS days and that are not
   * in their conversation yet are added at the time they were sent, so the team sees what they answer.
   * Never throws: the customer's message matters more.
   */
  async attachCampaignMessages(tenantId, channelId, thread) {
    try {
      const CampaignDelivery = require('../../models/mongo/CampaignDelivery');
      const since = new Date(Date.now() - CAMPAIGN_CHAT_DAYS * 24 * 60 * 60 * 1000);
      const deliveries = await CampaignDelivery.find({
        tenantId, channelId, phone: thread.contactPhone, inChatAt: null, createdAt: { $gte: since }
      }).sort({ createdAt: -1 }).limit(CAMPAIGN_CHAT_MAX).lean();
      if (!deliveries.length) return [];
      deliveries.reverse(); // oldest first

      const known = new Set((await ChatMessage.find({ threadId: thread._id, metaMessageId: { $in: deliveries.map(d => d.wamid) } })
        .select('metaMessageId').lean()).map(m => m.metaMessageId));
      const docs = deliveries.filter(d => !known.has(d.wamid)).map(d => ({
        threadId: thread._id,
        direction: 'OUTBOUND',
        type: 'TEMPLATE',
        content: d.preview || d.campaignName || 'Campaign message',
        status: d.status === 'failed' ? 'FAILED' : String(d.status || 'sent').toUpperCase(),
        metaMessageId: d.wamid,
        isAutomated: true,
        source: 'CAMPAIGN',
        campaignName: d.campaignName || null,
        createdAt: d.createdAt,
        updatedAt: d.createdAt
      }));
      const added = docs.length ? await ChatMessage.insertMany(docs, { ordered: false }) : [];
      await CampaignDelivery.updateMany({ _id: { $in: deliveries.map(d => d._id) } }, { $set: { inChatAt: new Date() } });

      for (const message of added) {
        const msgData = message.toObject();
        msgData.id = msgData._id.toString();
        socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
      }
      return added;
    } catch (error) {
      logger.warn(`[ChatService] Could not add the campaign messages to the conversation: ${error.message}`);
      return [];
    }
  }

  /**
   * Permanently deletes one conversation and all its messages (the contact stays in Contacts, and tickets
   * stay for the reports). If the customer writes again, a fresh conversation is created.
   */
  async deleteThread(tenantId, threadId) {
    const thread = await ChatThread.findOne({ _id: threadId, tenantId });
    if (!thread) throw { status: 404, message: 'Thread not found' };
    const { deletedCount } = await ChatMessage.deleteMany({ threadId: thread._id });
    await ChatThread.deleteOne({ _id: thread._id, tenantId });
    logger.info(`[Chat] Thread ${threadId} deleted for tenant ${tenantId} (${deletedCount} messages)`);
    return { deletedMessages: deletedCount };
  }

  /** One conversation, shaped like the list items (used when opening a shared link) */
  async getThread(tenantId, threadId) {
    const thread = await ChatThread.findOne({ _id: threadId, tenantId }).lean();
    if (!thread) throw { status: 404, message: 'Thread not found' };
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: thread.channelId },
      select: CHANNEL_FIELDS
    });
    return { ...thread, id: thread._id.toString(), channel: channel || null };
  }

  async getMessages(tenantId, threadId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const thread = await ChatThread.findOne({ _id: threadId, tenantId });
    if (!thread) throw new Error('Thread not found');

    const messages = await ChatMessage.find({ threadId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ChatMessage.countDocuments({ threadId });

    // Mark as read when fetching messages
    if (thread.unreadCount > 0) {
      await ChatThread.updateOne({ _id: threadId }, { $set: { unreadCount: 0 } });
      socketService.emitToTenant(tenantId, 'thread_updated', { id: threadId, unreadCount: 0 });
    }

    const formattedMessages = messages.map(m => {
      m.id = m._id.toString();
      return m;
    });

    return {
      messages: formattedMessages.reverse(), // Return chronological order for UI
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async sendMessage(tenantId, threadId, payload) {
    // payload: { content, type, hasMedia, mediaUrl, mediaMime }
    const thread = await ChatThread.findOne({ _id: threadId, tenantId });
    if (!thread) throw new Error('Thread not found');

    // Fetch channel from MySQL
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: thread.channelId }
    });
    if (!channel) throw new Error('Channel not found');
    
    // Check billing
    // Website widget messages are free: no WhatsApp message quota
    const canSend = isWebchat(channel) || await billingService.checkLimit(tenantId);
    if (!canSend) {
      throw new Error('Monthly message limit reached.');
    }

    // Determine type
    const msgType = payload.type || 'text'; // text, image, document, audio, video
    

    // Sync Contact with CRM if not yet synced
    const webhookService = require('../webhook/webhook.service');
    let crmClientId = thread.crmClientId;
    // The CRM knows customers by phone: only channels where the number is the customer's identity
    const customerPhone = capabilitiesOf(channel).hasPhone ? thread.contactPhone : null;
    if (!crmClientId && !thread.crmSyncedAt && customerPhone) {
      try {
        const crmData = await webhookService.syncCrmContact(tenantId, customerPhone, thread.contactName || customerPhone);
        if (crmData) {
          const update = { crmSyncedAt: new Date() };
          if (crmData.client_id) {
            crmClientId = String(crmData.client_id);
            update.crmClientId = crmClientId;
          }
          await ChatThread.updateOne({ _id: thread._id }, { $set: update });
        }
      } catch (e) {
        logger.warn(`[ChatService] Failed to sync contact on outbound message: ${e.message}`);
      }
    }

    const ticketsService = require('../tickets/tickets.service');
    
    // A team member who replies to the customer takes an unassigned ticket (a team note does not).
    // Atomic, so two people replying at once cannot both take it.
    if (payload.senderId && !payload.isInternal) {
      try {
        const activeTicket = await ticketsService.getActiveTicket(tenantId, threadId);
        if (activeTicket && !activeTicket.assignedToId) {
          const { claimed } = await ticketsService.claimTicket(tenantId, activeTicket.id, payload.senderId, 'REPLY');
          if (claimed) logger.info(`[ChatService] Ticket ${activeTicket.id} taken by ${payload.senderId} (first reply)`);
        }
      } catch (err) {
        logger.error('[ChatService] Error auto-assigning ticket: ' + err.message);
      }
    }

    const activeTicket = await ticketsService.getActiveTicket(tenantId, thread._id.toString());

    // A person writing to the customer takes over from a running WhatsApp flow
    if (thread.flowState && !payload.isInternal && !payload.isAutomated) {
      await ChatThread.updateOne({ _id: thread._id }, { $set: { flowState: null } });
      socketService.emitToTenant(tenantId, 'thread_updated', { id: threadId, flowState: null });
    }

    let metaResponse;
    try {
      if (payload.isInternal) {
        // Internal Note: Do not send to Meta, do not increment billing
        metaResponse = null;
      } else {
        if (payload.hasMedia && payload.mediaUrl) {
          metaResponse = await channelSender.sendMedia(
            channel,
            thread.contactPhone,
            msgType,
            payload.mediaUrl,
            payload.content
          );
        } else {
          metaResponse = await channelSender.sendText(
            channel,
            thread.contactPhone,
            payload.content
          );
        }
        if (!isWebchat(channel)) await billingService.incrementUsage(tenantId, 'sent');
      }
      
      // First reply a person wrote on this ticket (first response time in the ticket reports). Taking over
      // from a running flow makes the ticket the team's at that moment.
      if (activeTicket && !payload.isInternal && !payload.isAutomated) {
        if (thread.flowState) await ticketsService.markReady(activeTicket.id);
        // Replying means they opened it (they may have had the chat open before it became the team's)
        if (payload.senderId) await ticketsService.markOpened(activeTicket.id, payload.senderId);
        await ticketsService.markFirstResponse(activeTicket.id);
      }

      const message = await ChatMessage.create({
        threadId: thread._id,
        direction: 'OUTBOUND',
        type: payload.isInternal ? 'INTERNAL_NOTE' : msgType.toUpperCase(),
        content: payload.content || '',
        hasMedia: payload.hasMedia || false,
        mediaUrl: payload.mediaUrl || null,
        mediaMime: payload.mediaMime || null,
        status: payload.isInternal ? 'READ' : 'SENT', // Internal notes are instantly "READ"
        metaMessageId: metaResponse?.messages?.[0]?.id || null,
        ticketId: payload.ticketId || (activeTicket ? activeTicket.id : null),
        isInternal: payload.isInternal || false,
        senderId: payload.senderId || null,
        isAutomated: !!payload.isAutomated,
        source: payload.isAutomated && FLOW_SOURCES.includes(payload.source) ? payload.source : null,
        mentions: payload.isInternal && Array.isArray(payload.mentions)
          ? [...new Set(payload.mentions.map(String))].slice(0, 20)
          : []
      });

      // Colleagues mentioned in a team note get it in team chat, with a link back to this customer
      if (message.mentions.length && payload.senderKey) {
        const teamChatService = require('../team-chat/team-chat.service');
        teamChatService.notifyMentions(tenantId, payload.senderKey, message.mentions, { threadId, text: message.content })
          .catch(err => logger.error('[ChatService] Mention notification failed: ' + err.message));
      }

      await ChatThread.updateOne(
        { _id: thread._id },
        { $set: { lastMessageAt: new Date() } }
      );

      const msgData = message.toObject();
      msgData.id = msgData._id.toString();
      
      socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
      
      return msgData;
    } catch (error) {
      logger.error('Error sending chat message:', error);
      
      const failedMessage = await ChatMessage.create({
        threadId: thread._id,
        direction: 'OUTBOUND',
        type: msgType.toUpperCase(),
        content: payload.content || '',
        hasMedia: payload.hasMedia || false,
        mediaUrl: payload.mediaUrl || null,
        status: 'FAILED',
        ticketId: payload.ticketId || (activeTicket ? activeTicket.id : null)
      });
      
      const failedMsgData = failedMessage.toObject();
      failedMsgData.id = failedMsgData._id.toString();
      socketService.emitToTenant(tenantId, 'new_chat_message', failedMsgData);
      throw error;
    }
  }

  /**
   * One customer message. Messages of the same customer are handled one at a time and in order
   * (the webhook queue runs several jobs at once), and a message Meta delivers twice is handled once.
   */
  async handleIncomingMessage(tenantId, channelId, contactPhone, contactName, msg) {
    return this.receiveMessage(tenantId, channelId, { address: contactPhone, name: contactName, phone: contactPhone }, normalizeWhatsAppMessage(msg, channelId));
  }

  /**
   * One customer message from any channel (WhatsApp, the website widget…), in the common shape of
   * normalizeWhatsAppMessage(). contact: { address (ChatThread.contactPhone), name, phone (null when the
   * channel has none), info (extra details kept on the conversation: phone, email, page…) }.
   * Messages of the same customer are handled one at a time and in order, and a message delivered twice
   * is handled once.
   */
  async receiveMessage(tenantId, channelId, contact, message) {
    return withLock(`inbound:${channelId}:${contact.address}`, async () => {
      if (message?.id && await ChatMessage.exists({ metaMessageId: message.id })) {
        logger.info(`[ChatService] Message ${message.id} was already handled, skipping the duplicate`);
        return { flowHandled: false, duplicate: true };
      }
      return this._receive(tenantId, channelId, contact, message);
    }, { ttlMs: 90000, waitMs: 60000 });
  }

  async _receive(tenantId, channelId, contact, message) {
    const contactPhone = contact.address;
    const contactName = contact.name || null;
    const customerPhone = contact.phone || null;
    let { type = 'TEXT', content = '', hasMedia = false, mediaUrl = null, mediaMime = null } = message;
    const metaMessageId = message.id;
    // Details the channel gives about the customer (website widget: phone, email, page)
    const infoSet = Object.fromEntries(Object.entries(contact.info || {})
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [`contactInfo.${k}`, v]));

    // Upsert Thread in MongoDB
    let thread = await ChatThread.findOne({ tenantId, channelId, contactPhone });
    const isNewThread = !thread;
    // Previous customer message time (before this one) — flows start after a period of silence
    const previousInboundAt = thread ? thread.lastInboundAt || null : null;

    if (thread) {
      thread = await ChatThread.findOneAndUpdate(
        { _id: thread._id },
        {
          $set: { lastMessageAt: new Date(), lastInboundAt: new Date(), contactName: inboundName(thread, contactName), ...infoSet },
          $inc: { unreadCount: 1 }
        },
        { returnDocument: 'after' }
      );
    } else {
      // A customer the business already saved in its contacts keeps that name, not their WhatsApp profile name
      let saved = null;
      if (customerPhone) {
        try {
          saved = await prisma.contact.findFirst({ where: { tenantId, phone: customerPhone }, select: { name: true } });
        } catch (e) { /* the WhatsApp profile name is fine then */ }
      }
      const savedName = saved?.name && saved.name !== customerPhone ? saved.name : null;
      thread = await ChatThread.create({
        tenantId,
        channelId,
        contactPhone,
        contactName: savedName || contactName || customerPhone || contactPhone,
        nameEditedAt: savedName ? new Date() : null,
        ...(Object.keys(infoSet).length && { contactInfo: contact.info }),
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
        unreadCount: 1
      });
    }

    // The campaign messages this customer got (and is likely answering) go in before their reply
    await this.attachCampaignMessages(tenantId, channelId, thread);

    // Put conversations that never had a customer stage into the entry stage (if enabled)
    const chatStageService = require('./chat.stage.service');
    thread = await chatStageService.applyEntryStage(tenantId, thread);

    // 1. Sync Contact with CRM (Background Fire & Forget, but we await to get clientId if fast)
    const webhookService = require('../webhook/webhook.service');
    let crmClientId = thread.crmClientId;
    
    // We only need to sync if we haven't synced this contact yet (e.g. first message ever)
    if (!crmClientId && !thread.crmSyncedAt && customerPhone) {
      const crmData = await webhookService.syncCrmContact(tenantId, customerPhone, contactName || customerPhone);
      if (crmData) {
        const update = { crmSyncedAt: new Date() };
        if (crmData.client_id) {
          crmClientId = String(crmData.client_id);
          update.crmClientId = crmClientId;
        }
        thread = await ChatThread.findOneAndUpdate(
          { _id: thread._id },
          { $set: update },
          { returnDocument: 'after' }
        );
      }
    }

    // Check for Ticket Rating
    const ticketsService = require('../tickets/tickets.service');
    const threadIdStr = thread._id.toString();
    
    let ratingValue = null;
    let targetTicketId = null;
    const interactiveId = message.interactiveId || null;

    if (interactiveId && interactiveId.startsWith('RATE_')) {
      const parts = interactiveId.split('_');
      if (parts.length === 3) {
        targetTicketId = parts[1];
        ratingValue = parseInt(parts[2]);
      }
    } else if (type === 'TEXT' && ['1','2','3','4','5'].includes(content.trim())) {
      const recentClosedTicket = await ticketsService.getRecentClosedUnratedTicket(tenantId, threadIdStr);
      if (recentClosedTicket) {
        targetTicketId = recentClosedTicket.id;
        ratingValue = parseInt(content.trim());
      }
    }

    let ticketId = null;
    const flowEngine = require('../flows/flow.engine');
    const flowInput = { text: content, interactiveId, previousInboundAt };
    let flowWillHandle = false;
    if (ratingValue && targetTicketId) {
      await ticketsService.saveTicketRating(tenantId, targetTicketId, ratingValue);
      content = `[العميل قام بتقييم التذكرة: ${ratingValue} نجوم]`;
      ticketId = targetTicketId;
      
      // Send thank you message tied to the evaluated ticket
      this.sendMessage(tenantId, threadIdStr, {
        content: "شكراً لتقييمك! نحن سعداء بخدمتك.",
        type: 'text',
        ticketId: targetTicketId,
        isAutomated: true
      }).catch(e => console.log('Error sending thank you:', e.message));
    } else {
      // 2. Check/Auto-create Ticket if not a rating (not routed to an agent while a flow is talking)
      flowWillHandle = await flowEngine.wouldHandle(tenantId, channelId, thread, flowInput);
      const activeTicket = await ticketsService.autoCreateTicketIfNeeded(tenantId, channelId, threadIdStr, crmClientId, content, { skipRouting: flowWillHandle });
      ticketId = activeTicket ? activeTicket.id : null;
    }

    // 3. Save Message
    const existingMsg = await ChatMessage.findOne({ metaMessageId });

    if (!existingMsg) {
      const chatMessage = await ChatMessage.create({
        threadId: thread._id,
        direction: 'INBOUND',
        type,
        content,
        hasMedia,
        mediaUrl,
        mediaMime,
        metaMessageId,
        status: 'DELIVERED',
        ticketId: ticketId
      });

      const threadData = thread.toObject();
      threadData.id = threadData._id.toString();
      // A conversation that appears live needs its channel too (the list shows it, and Meta-only tools depend on it)
      if (isNewThread) threadData.channel = await prisma.whatsAppChannel.findUnique({ where: { id: channelId }, select: CHANNEL_FIELDS }).catch(() => null);

      const msgData = chatMessage.toObject();
      msgData.id = msgData._id.toString();

      // Broadcast to frontend
      socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
      socketService.emitToTenant(tenantId, 'thread_updated', threadData);

      // A WhatsApp message quoting a website chat code (W-XXXXXX) links the two conversations
      if (customerPhone && /\bW-[0-9A-F]{6}\b/i.test(content)) {
        require('../webchat/webchat.service').linkFromWhatsApp(tenantId, content, { threadId: thread._id, phone: customerPhone })
          .catch(e => logger.warn('[ChatService] Could not link the website chat: ' + e.message));
      }

      // WhatsApp flow of this channel
      const flowHandled = flowWillHandle ? await flowEngine.handleInbound(tenantId, channelId, thread, flowInput) : false;

      // Outside the channel's working hours → automatic away reply (not for rating replies, not when a flow answered)
      if (!ratingValue && !flowHandled) {
        const hoursService = require('../workforce/hours.service');
        hoursService.sendAwayMessageIfClosed(tenantId, channelId, thread)
          .catch(e => logger.error('[ChatService] Away message failed: ' + e.message));
      }
      return { flowHandled };
    }
    return { flowHandled: false, duplicate: true };
  }

  /** A message with one button that opens a link (flow "Link button" step) */
  async sendLinkButton(tenantId, threadId, { body, buttonText, url, source }) {
    const thread = await ChatThread.findOne({ _id: threadId, tenantId });
    if (!thread) throw { status: 404, message: 'Thread not found' };
    const channel = await prisma.whatsAppChannel.findUnique({ where: { id: thread.channelId } });
    if (!channel) throw { status: 404, message: 'Channel not found' };

    let metaResponse = null;
    let status = 'SENT';
    let failure = null;
    try {
      metaResponse = await channelSender.sendLinkButton(channel, thread.contactPhone, body, buttonText, url);
      if (!isWebchat(channel)) await billingService.incrementUsage(tenantId, 'sent');
    } catch (error) {
      logger.error(`Error sending link button: ${metaErrorText(error)}`);
      status = 'FAILED';
      failure = metaErrorInfo(error);
    }

    const ticketsService = require('../tickets/tickets.service');
    const activeTicket = await ticketsService.getActiveTicket(tenantId, thread._id.toString());
    const message = await ChatMessage.create({
      threadId: thread._id,
      direction: 'OUTBOUND',
      type: 'INTERACTIVE',
      content: `${body}\n🔗 ${buttonText}: ${url}`,
      interactive: { body, link: { text: buttonText, url } },
      status,
      metaMessageId: metaResponse?.messages?.[0]?.id || null,
      ticketId: activeTicket ? activeTicket.id : null,
      isAutomated: true,
      source: FLOW_SOURCES.includes(source) ? source : null
    });
    await ChatThread.updateOne({ _id: thread._id }, { $set: { lastMessageAt: new Date() } });

    const msgData = message.toObject();
    msgData.id = msgData._id.toString();
    socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
    if (status === 'FAILED') throw { status: 400, message: `Meta rejected the link button: ${failure.details || failure.message}`, metaCode: failure.code, metaSubcode: failure.subcode };
    return msgData;
  }

  /**
   * Send an interactive choice message (reply buttons for up to 3 options, a list for more).
   * payload: { body, options: [{ id, title }], buttonLabel, source ('FLOW' when a flow asks) }
   */
  async sendInteractiveMessage(tenantId, threadId, { body, options, buttonLabel, source }) {
    const thread = await ChatThread.findOne({ _id: threadId, tenantId });
    if (!thread) throw { status: 404, message: 'Thread not found' };
    const channel = await prisma.whatsAppChannel.findUnique({ where: { id: thread.channelId } });
    if (!channel) throw { status: 404, message: 'Channel not found' };

    let metaResponse = null;
    let status = 'SENT';
    let failure = null;
    try {
      if (options.length <= 3) {
        metaResponse = await channelSender.sendButtons(channel, thread.contactPhone, body, options.map(o => ({ id: o.id, text: o.title })));
      } else {
        metaResponse = await channelSender.sendList(channel, thread.contactPhone, null, body, buttonLabel, [
          { title: (buttonLabel || 'Options').substring(0, 24), rows: options.map(o => ({ id: o.id, title: o.title })) }
        ]);
      }
      if (!isWebchat(channel)) await billingService.incrementUsage(tenantId, 'sent');
    } catch (error) {
      logger.error(`Error sending interactive message: ${metaErrorText(error)}`);
      status = 'FAILED';
      failure = metaErrorInfo(error);
    }

    const ticketsService = require('../tickets/tickets.service');
    const activeTicket = await ticketsService.getActiveTicket(tenantId, thread._id.toString());
    const message = await ChatMessage.create({
      threadId: thread._id,
      direction: 'OUTBOUND',
      type: 'INTERACTIVE',
      content: [body, ...options.map(o => `• ${o.title}`)].join('\n'),
      interactive: { body, options: options.map(o => ({ id: o.id, title: o.title })) },
      status,
      metaMessageId: metaResponse?.messages?.[0]?.id || null,
      ticketId: activeTicket ? activeTicket.id : null,
      isAutomated: true,
      source: FLOW_SOURCES.includes(source) ? source : null
    });
    await ChatThread.updateOne({ _id: thread._id }, { $set: { lastMessageAt: new Date() } });

    const msgData = message.toObject();
    msgData.id = msgData._id.toString();
    socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
    if (status === 'FAILED') throw { status: 400, message: `Meta rejected the interactive message: ${failure.details || failure.message}`, metaCode: failure.code, metaSubcode: failure.subcode };
    return msgData;
  }

  /**
   * Send an approved Meta template inside a conversation (works outside the 24h window).
   * payload: { templateName, language, bodyParams: [..], buttonParams: [{ index, text }], previewText, senderId }
   * buttonParams fills the {{1}} of a dynamic URL button; index is the button's position among ALL
   * the template's buttons (0-based), text is the value that replaces {{1}}.
   */
  async sendTemplateMessage(tenantId, threadId, payload) {
    const { templateName, language, bodyParams = [], buttonParams = [], previewText } = payload;
    if (!templateName || !language) throw { status: 400, message: 'templateName and language are required' };
    // The image / video / PDF of a media-header template ({ type, id | link, filename })
    const { normalizeHeaderMedia, headerComponent } = require('../meta/meta.templateMedia');
    const headerMedia = normalizeHeaderMedia(payload.headerMedia);
    if (!Array.isArray(bodyParams) || !Array.isArray(buttonParams)) throw { status: 400, message: 'bodyParams and buttonParams must be arrays' };
    for (const b of buttonParams) {
      if (!Number.isInteger(b?.index) || b.index < 0 || b.index > 9 || typeof b.text !== 'string' || !b.text.trim() || b.text.length > 1000) {
        throw { status: 400, message: 'Each button parameter needs a button index (0-9) and a non-empty text value' };
      }
    }

    const thread = await ChatThread.findOne({ _id: threadId, tenantId });
    if (!thread) throw { status: 404, message: 'Thread not found' };

    const channel = await prisma.whatsAppChannel.findUnique({ where: { id: thread.channelId } });
    if (!channel) throw { status: 404, message: 'Channel not found' };
    if (!capabilitiesOf(channel).templates) throw { status: 400, message: 'Templates are a WhatsApp feature; this conversation is on another channel' };

    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const components = [];
    if (headerMedia) components.push(headerComponent(headerMedia));
    if (bodyParams.length > 0) {
      components.push({ type: 'body', parameters: bodyParams.map(text => ({ type: 'text', text: String(text) })) });
    }
    for (const b of buttonParams) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: String(b.index),
        parameters: [{ type: 'text', text: b.text.trim() }]
      });
    }

    const ticketsService = require('../tickets/tickets.service');
    const activeTicket = await ticketsService.getActiveTicket(tenantId, thread._id.toString());

    let metaResponse = null;
    let status = 'SENT';
    let failure = null;
    try {
      metaResponse = await metaService.sendTemplate(channel, thread.contactPhone, templateName, language, components);
      await billingService.incrementUsage(tenantId, 'sent');
    } catch (error) {
      logger.error(`Error sending chat template: ${metaErrorText(error)}`);
      status = 'FAILED';
      failure = metaErrorInfo(error);
    }

    const message = await ChatMessage.create({
      threadId: thread._id,
      direction: 'OUTBOUND',
      type: 'TEMPLATE',
      content: previewText || templateName,
      status,
      senderId: payload.senderId || null,
      metaMessageId: metaResponse?.messages?.[0]?.id || null,
      ticketId: activeTicket ? activeTicket.id : null
    });
    await ChatThread.updateOne({ _id: thread._id }, { $set: { lastMessageAt: new Date() } });

    const msgData = message.toObject();
    msgData.id = msgData._id.toString();
    socketService.emitToTenant(tenantId, 'new_chat_message', msgData);

    if (status === 'FAILED') throw { status: 400, message: `Meta rejected the template: ${failure.details || failure.message}`, metaCode: failure.code, metaSubcode: failure.subcode };
    return msgData;
  }
}

module.exports = new ChatService();
module.exports.inboundName = inboundName;
