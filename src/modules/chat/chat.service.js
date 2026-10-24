const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const metaService = require('../meta/meta.service');
const socketService = require('../../services/socket.service');
const billingService = require('../billing/billing.service');
const logger = require('../../utils/logger');
const ChatThread = require('../../models/mongo/ChatThread');
const ChatMessage = require('../../models/mongo/ChatMessage');

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
      select: { id: true, phoneNumber: true, name: true, displayPhoneNumber: true }
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

  /** One conversation, shaped like the list items (used when opening a shared link) */
  async getThread(tenantId, threadId) {
    const thread = await ChatThread.findOne({ _id: threadId, tenantId }).lean();
    if (!thread) throw { status: 404, message: 'Thread not found' };
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: thread.channelId },
      select: { id: true, phoneNumber: true, name: true, displayPhoneNumber: true }
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
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) {
      throw new Error('Monthly message limit reached.');
    }

    // Determine type
    const msgType = payload.type || 'text'; // text, image, document, audio, video
    

    // Sync Contact with CRM if not yet synced
    const webhookService = require('../webhook/webhook.service');
    let crmClientId = thread.crmClientId;
    if (!crmClientId && !thread.crmSyncedAt) {
      try {
        const crmData = await webhookService.syncCrmContact(tenantId, thread.contactPhone, thread.contactName || thread.contactPhone);
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
    
    // Auto-assign ticket if unassigned and a sub-user replies to the customer (writing a team note is not taking the chat)
    if (payload.senderId && !payload.isInternal) {
      try {
        const activeTicket = await ticketsService.getActiveTicket(tenantId, threadId);
        if (activeTicket && !activeTicket.assignedToId) {

          await prisma.ticket.update({
            where: { id: activeTicket.id },
            data: { assignedToId: payload.senderId }
          });
          logger.info(`[ChatService] Auto-assigned ticket ${activeTicket.id} to user ${payload.senderId}`);
        }
      } catch(err) {
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
          metaResponse = await metaService.sendMedia(
            channel,
            thread.contactPhone,
            msgType,
            payload.mediaUrl,
            payload.content
          );
        } else {
          metaResponse = await metaService.sendText(
            channel,
            thread.contactPhone,
            payload.content
          );
        }
        await billingService.incrementUsage(tenantId, 'sent');
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

  async handleIncomingMessage(tenantId, channelId, contactPhone, contactName, msg) {
    let type = 'TEXT';
    let content = '';
    let hasMedia = false;
    let mediaUrl = null;
    let mediaMime = null;
    let metaMessageId = msg.id;

    if (msg.type === 'text') {
      content = msg.text.body;
    } else if (msg.type === 'image' || msg.type === 'document' || msg.type === 'video' || msg.type === 'audio') {
      type = msg.type.toUpperCase();
      hasMedia = true;
      content = msg[msg.type]?.caption || '';
      const rawMediaId = msg[msg.type]?.id;
      mediaMime = msg[msg.type]?.mime_type;
      
      if (rawMediaId) {
        mediaUrl = `/api/v1/chat/media/${rawMediaId}?channelId=${channelId}`;
      }
    } else if (msg.type === 'interactive') {
      type = 'INTERACTIVE';
      if (msg.interactive.type === 'button_reply') {
        content = msg.interactive.button_reply.title;
      } else if (msg.interactive.type === 'list_reply') {
        content = msg.interactive.list_reply.title;
      }
    } else {
      content = `[Unsupported message type: ${msg.type}]`;
    }

    // Upsert Thread in MongoDB
    let thread = await ChatThread.findOne({ tenantId, channelId, contactPhone });
    // Previous customer message time (before this one) — flows start after a period of silence
    const previousInboundAt = thread ? thread.lastInboundAt || null : null;

    if (thread) {
      thread = await ChatThread.findOneAndUpdate(
        { _id: thread._id },
        {
          $set: { lastMessageAt: new Date(), lastInboundAt: new Date(), contactName: contactName || thread.contactName },
          $inc: { unreadCount: 1 }
        },
        { returnDocument: 'after' }
      );
    } else {
      thread = await ChatThread.create({
        tenantId,
        channelId,
        contactPhone,
        contactName: contactName || contactPhone,
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
        unreadCount: 1
      });
    }

    // Put conversations that never had a customer stage into the entry stage (if enabled)
    const chatStageService = require('./chat.stage.service');
    thread = await chatStageService.applyEntryStage(tenantId, thread);

    // 1. Sync Contact with CRM (Background Fire & Forget, but we await to get clientId if fast)
    const webhookService = require('../webhook/webhook.service');
    let crmClientId = thread.crmClientId;
    
    // We only need to sync if we haven't synced this contact yet (e.g. first message ever)
    if (!crmClientId && !thread.crmSyncedAt) {
      const crmData = await webhookService.syncCrmContact(tenantId, contactPhone, contactName || contactPhone);
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
    // msg.interactive check needs to look at the raw payload since content might be just the text
    let interactiveId = null;
    if (msg.type === 'interactive') {
       if (msg.interactive.type === 'button_reply') interactiveId = msg.interactive.button_reply.id;
       else if (msg.interactive.type === 'list_reply') interactiveId = msg.interactive.list_reply.id;
    }

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

      const msgData = chatMessage.toObject();
      msgData.id = msgData._id.toString();

      // Broadcast to frontend
      socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
      socketService.emitToTenant(tenantId, 'thread_updated', threadData);

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

  /**
   * Send an interactive choice message (reply buttons for up to 3 options, a list for more).
   * payload: { body, options: [{ id, title }], buttonLabel }
   */
  async sendInteractiveMessage(tenantId, threadId, { body, options, buttonLabel }) {
    const thread = await ChatThread.findOne({ _id: threadId, tenantId });
    if (!thread) throw { status: 404, message: 'Thread not found' };
    const channel = await prisma.whatsAppChannel.findUnique({ where: { id: thread.channelId } });
    if (!channel) throw { status: 404, message: 'Channel not found' };

    let metaResponse = null;
    let status = 'SENT';
    try {
      if (options.length <= 3) {
        metaResponse = await metaService.sendButtons(channel, thread.contactPhone, body, options.map(o => ({ id: o.id, text: o.title })));
      } else {
        metaResponse = await metaService.sendList(channel, thread.contactPhone, null, body, buttonLabel, [
          { title: (buttonLabel || 'Options').substring(0, 24), rows: options.map(o => ({ id: o.id, title: o.title })) }
        ]);
      }
      await billingService.incrementUsage(tenantId, 'sent');
    } catch (error) {
      logger.error('Error sending interactive message:', error.response?.data || error.message);
      status = 'FAILED';
    }

    const ticketsService = require('../tickets/tickets.service');
    const activeTicket = await ticketsService.getActiveTicket(tenantId, thread._id.toString());
    const message = await ChatMessage.create({
      threadId: thread._id,
      direction: 'OUTBOUND',
      type: 'INTERACTIVE',
      content: [body, ...options.map(o => `• ${o.title}`)].join('\n'),
      status,
      metaMessageId: metaResponse?.messages?.[0]?.id || null,
      ticketId: activeTicket ? activeTicket.id : null,
      isAutomated: true
    });
    await ChatThread.updateOne({ _id: thread._id }, { $set: { lastMessageAt: new Date() } });

    const msgData = message.toObject();
    msgData.id = msgData._id.toString();
    socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
    if (status === 'FAILED') throw new Error('Meta rejected the interactive message');
    return msgData;
  }

  /**
   * Send an approved Meta template inside a conversation (works outside the 24h window).
   * payload: { templateName, language, bodyParams: [..], previewText, senderId }
   */
  async sendTemplateMessage(tenantId, threadId, payload) {
    const { templateName, language, bodyParams = [], previewText } = payload;
    if (!templateName || !language) throw { status: 400, message: 'templateName and language are required' };

    const thread = await ChatThread.findOne({ _id: threadId, tenantId });
    if (!thread) throw { status: 404, message: 'Thread not found' };

    const channel = await prisma.whatsAppChannel.findUnique({ where: { id: thread.channelId } });
    if (!channel) throw { status: 404, message: 'Channel not found' };

    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const components = bodyParams.length > 0
      ? [{ type: 'body', parameters: bodyParams.map(text => ({ type: 'text', text: String(text) })) }]
      : [];

    const ticketsService = require('../tickets/tickets.service');
    const activeTicket = await ticketsService.getActiveTicket(tenantId, thread._id.toString());

    let metaResponse = null;
    let status = 'SENT';
    try {
      metaResponse = await metaService.sendTemplate(channel, thread.contactPhone, templateName, language, components);
      await billingService.incrementUsage(tenantId, 'sent');
    } catch (error) {
      logger.error('Error sending chat template:', error.response?.data || error.message);
      status = 'FAILED';
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

    if (status === 'FAILED') throw { status: 400, message: 'Meta rejected the template message. Check the template and its variables.' };
    return msgData;
  }
}

module.exports = new ChatService();
