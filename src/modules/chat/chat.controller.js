const chatService = require('./chat.service');
const logger = require('../../utils/logger');

class ChatController {
  async getThreads(req, res, next) {
    try {
      const { page, limit, search, channelId } = req.query;
      const result = await chatService.getThreads(
        req.tenant.id,
        parseInt(page) || 1,
        parseInt(limit) || 50,
        search,
        channelId
      );
      res.json({ success: true, data: result });
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

  async sendMessage(req, res, next) {
    try {
      const message = await chatService.sendMessage(
        req.tenant.id,
        req.params.threadId,
        req.body
      );
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
