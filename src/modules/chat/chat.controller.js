const chatService = require('./chat.service');
const { memberKey } = require('../../middleware/auth.middleware');
const accessService = require('../workforce/access.service');
const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ChatController {
  async getQuickReplies(req, res, next) {
    try {
      const result = await chatService.getQuickReplies(req.tenant.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createQuickReply(req, res, next) {
    try {
      const { shortcut, content } = req.body;
      if (!shortcut || !content) return res.status(400).json({ error: 'Shortcut and content required' });
      const result = await chatService.createQuickReply(req.tenant.id, shortcut, content);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteQuickReply(req, res, next) {
    try {
      await chatService.deleteQuickReply(req.tenant.id, req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
  async getThreads(req, res, next) {
    try {
      const { page, limit, search, channelId, tagId, stageId } = req.query;
      const access = await accessService.getThreadFilter(req);
      const result = await chatService.getThreads(
        req.tenant.id,
        parseInt(page) || 1,
        parseInt(limit) || 50,
        search,
        channelId,
        { tagId, stageId, access }
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteThread(req, res, next) {
    try {
      const result = await chatService.deleteThread(req.tenant.id, req.params.threadId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getThread(req, res, next) {
    try {
      const thread = await chatService.getThread(req.tenant.id, req.params.threadId);
      res.json({ success: true, data: thread });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await chatService.getMessages(
        req.tenant.id,
        req.params.threadId,
        parseInt(page) || 1,
        parseInt(limit) || 50
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async renameThread(req, res, next) {
    try {
      const name = String(req.body?.name || '').replace(/\s+/g, ' ').trim().slice(0, 100);
      if (!name) return res.status(400).json({ error: { message: 'Write a name' } });
      const ChatThread = require('../../models/mongo/ChatThread');

      const thread = await ChatThread.findOneAndUpdate(
        { _id: req.params.threadId, tenantId: req.tenant.id },
        // nameEditedAt: the customer's WhatsApp profile name no longer replaces this one on their next message
        { $set: { contactName: name, nameEditedAt: new Date() } },
        { returnDocument: 'after' }
      ).lean();
      if (!thread) return res.status(404).json({ error: { message: 'Thread not found' } });

      // Same name in Contacts (created there when the number is not saved yet)
      const existingContact = await prisma.contact.findFirst({ where: { tenantId: req.tenant.id, phone: thread.contactPhone } });
      if (existingContact) {
        await prisma.contact.update({ where: { id: existingContact.id }, data: { name } });
      } else {
        await prisma.contact.create({ data: { tenantId: req.tenant.id, phone: thread.contactPhone, name } });
      }

      require('../../services/socket.service').emitToTenant(req.tenant.id, 'thread_updated', { id: String(thread._id), contactName: name });
      res.json({ success: true, contactName: name });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const message = await chatService.sendMessage(
        req.tenant.id,
        req.params.threadId,
        { ...req.body, senderId: req.subUser ? req.subUser.id : null, senderKey: memberKey(req) }
      );
      res.json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }

  async sendTemplate(req, res, next) {
    try {
      const message = await chatService.sendTemplateMessage(req.tenant.id, req.params.threadId, {
        ...req.body,
        senderId: req.subUser ? req.subUser.id : null
      });
      res.json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }

  async uploadMedia(req, res, next) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
      
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const mediaUrl = `${baseUrl}/uploads/chat/${req.file.filename}`;
      
      res.json({
        success: true,
        mediaUrl,
        mimetype: req.file.mimetype,
        originalName: req.file.originalname
      });
    } catch (error) {
      next(error);
    }
  }

  async getMediaProxy(req, res, next) {
    try {
      const { mediaId } = req.params;
      const { channelId } = req.query;
      
      if (!channelId) {
        return res.status(400).json({ success: false, message: 'channelId is required' });
      }

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const channel = await prisma.whatsAppChannel.findUnique({
        where: { id: channelId }
      });
      
      if (!channel || !channel.metaAccessToken) {
        return res.status(404).json({ success: false, message: 'Channel or access token not found' });
      }

      const axios = require('axios');
      // Step 1: Get the media URL from Meta
      const metaRes = await axios.get(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` }
      });

      const mediaUrl = metaRes.data.url;
      const mimeType = metaRes.data.mime_type;

      // Step 2: Stream the binary data
      const streamRes = await axios.get(mediaUrl, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` },
        responseType: 'stream'
      });

      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      streamRes.data.pipe(res);

    } catch (error) {
      logger.error('Proxy Media Error:', error.response?.data || error.message);
      res.status(500).json({ success: false, message: 'Failed to fetch media from Meta' });
    }
  }
}

module.exports = new ChatController();
