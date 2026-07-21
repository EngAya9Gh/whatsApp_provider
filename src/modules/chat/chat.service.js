const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const metaService = require('../meta/meta.service');
const socketService = require('../../services/socket.service');
const billingService = require('../billing/billing.service');
const logger = require('../../utils/logger');

class ChatService {
  async getThreads(tenantId, page = 1, limit = 50, search = '') {
    const skip = (page - 1) * limit;
    
    let where = { tenantId };
    if (search) {
      where.OR = [
        { contactPhone: { contains: search } },
        { contactName: { contains: search } }
      ];
    }

    const threads = await prisma.chatThread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
      include: {
        channel: { select: { phoneNumber: true } }
      }
    });

    const total = await prisma.chatThread.count({ where });

    return {
      threads,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getMessages(tenantId, threadId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const thread = await prisma.chatThread.findFirst({
      where: { id: threadId, tenantId }
    });
    if (!thread) throw new Error('Thread not found');

    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.chatMessage.count({ where: { threadId } });

    // Mark as read when fetching messages
    if (thread.unreadCount > 0) {
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { unreadCount: 0 }
      });
      socketService.emitToTenant(tenantId, 'thread_updated', { threadId, unreadCount: 0 });
    }

    return {
      messages: messages.reverse(), // Return chronological order for UI
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async sendMessage(tenantId, threadId, payload) {
    // payload: { content, type, hasMedia, mediaUrl, mediaMime }
    const thread = await prisma.chatThread.findFirst({
      where: { id: threadId, tenantId },
      include: { channel: true }
    });

    if (!thread) throw new Error('Thread not found');
    
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
          thread.channel,
          thread.contactPhone,
          msgType,
          payload.mediaUrl,
          payload.content
        );
      } else {
        metaResponse = await metaService.sendText(
          thread.channel,
          thread.contactPhone,
          payload.content
        );
      }

      await billingService.incrementUsage(tenantId, 'sent');
      
      const message = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          direction: 'OUTBOUND',
          type: msgType.toUpperCase(),
          content: payload.content || '',
          hasMedia: payload.hasMedia || false,
          mediaUrl: payload.mediaUrl || null,
          mediaMime: payload.mediaMime || null,
          status: 'SENT',
          metaMessageId: metaResponse?.messages?.[0]?.id || null
        }
      });

      await prisma.chatThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: new Date() }
      });

      socketService.emitToTenant(tenantId, 'new_chat_message', message);
      
      return message;
    } catch (error) {
      logger.error('Error sending chat message:', error);
      
      const failedMessage = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          direction: 'OUTBOUND',
          type: msgType.toUpperCase(),
          content: payload.content || '',
          hasMedia: payload.hasMedia || false,
          mediaUrl: payload.mediaUrl || null,
          status: 'FAILED'
        }
      });
      socketService.emitToTenant(tenantId, 'new_chat_message', failedMessage);
      throw error;
    }
  }

  async handleIncomingMessage(tenantId, channelId, contactPhone, contactName, msg) {
    // Determine message type and content
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
      // We don't have the media URL directly, Meta gives media ID. 
      // We'd need to fetch it via API, but for now we store the ID.
      mediaUrl = msg[msg.type]?.id;
      mediaMime = msg[msg.type]?.mime_type;
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

    // Upsert Thread
    let thread = await prisma.chatThread.findUnique({
      where: {
        tenantId_channelId_contactPhone: {
          tenantId,
          channelId,
          contactPhone
        }
      }
    });

    if (thread) {
      thread = await prisma.chatThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 },
          contactName: contactName || thread.contactName
        }
      });
    } else {
      thread = await prisma.chatThread.create({
        data: {
          tenantId,
          channelId,
          contactPhone,
          contactName: contactName || contactPhone,
          lastMessageAt: new Date(),
          unreadCount: 1
        }
      });
    }

    // Save Message
    // Check if it already exists to prevent duplicate webhooks
    const existingMsg = await prisma.chatMessage.findFirst({
      where: { metaMessageId }
    });

    if (!existingMsg) {
      const chatMessage = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          direction: 'INBOUND',
          type,
          content,
          hasMedia,
          mediaUrl,
          mediaMime,
          metaMessageId,
          status: 'DELIVERED'
        }
      });

      // Broadcast to frontend
      socketService.emitToTenant(tenantId, 'new_chat_message', chatMessage);
      socketService.emitToTenant(tenantId, 'thread_updated', thread);
    }
  }
}

module.exports = new ChatService();


