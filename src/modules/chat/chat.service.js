const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const metaService = require('../meta/meta.service');
const socketService = require('../../services/socket.service');
const billingService = require('../billing/billing.service');
const logger = require('../../utils/logger');
const ChatThread = require('../../models/mongo/ChatThread');
const ChatMessage = require('../../models/mongo/ChatMessage');

class ChatService {
  async getThreads(tenantId, page = 1, limit = 50, search = '', channelId = null) {
    const skip = (page - 1) * limit;
    
    let where = { tenantId };
    if (channelId) {
      where.channelId = channelId;
    }
    if (search) {
      where.$or = [
        { contactPhone: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } }
      ];
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
    
    let metaResponse;
    try {
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
      
      const message = await ChatMessage.create({
        threadId: thread._id,
        direction: 'OUTBOUND',
        type: msgType.toUpperCase(),
        content: payload.content || '',
        hasMedia: payload.hasMedia || false,
        mediaUrl: payload.mediaUrl || null,
        mediaMime: payload.mediaMime || null,
        status: 'SENT',
        metaMessageId: metaResponse?.messages?.[0]?.id || null
      });

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
        status: 'FAILED'
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

    if (thread) {
      thread = await ChatThread.findOneAndUpdate(
        { _id: thread._id },
        { 
          $set: { lastMessageAt: new Date(), contactName: contactName || thread.contactName },
          $inc: { unreadCount: 1 }
        },
        { new: true }
      );
    } else {
      thread = await ChatThread.create({
        tenantId,
        channelId,
        contactPhone,
        contactName: contactName || contactPhone,
        lastMessageAt: new Date(),
        unreadCount: 1
      });
    }

    // Save Message
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
        status: 'DELIVERED'
      });

      const threadData = thread.toObject();
      threadData.id = threadData._id.toString();

      const msgData = chatMessage.toObject();
      msgData.id = msgData._id.toString();

      // Broadcast to frontend
      socketService.emitToTenant(tenantId, 'new_chat_message', msgData);
      socketService.emitToTenant(tenantId, 'thread_updated', threadData);
    }
  }
}

module.exports = new ChatService();
