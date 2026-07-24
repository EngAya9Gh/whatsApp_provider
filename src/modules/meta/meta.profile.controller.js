const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const logger = require('../../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

class MetaProfileController {
  async _getChannel(tenantId, channelId) {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: channelId, tenantId, providerType: 'META_CLOUD' }
    });
    if (!channel) throw { status: 404, message: 'Meta channel not found' };
    return channel;
  }

  /**
   * GET /meta/channel/:channelId/profile
   * Fetches the WhatsApp Business Profile from Meta.
   * Fields: about, address, description, email, profile_picture_url, websites, vertical
   */
  async getProfile(req, res, next) {
    try {
      const channel = await this._getChannel(req.tenant.id, req.params.channelId);
      const url = `${GRAPH_API_BASE}/${channel.metaPhoneNumberId}/whatsapp_business_profile`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` },
        params: { fields: 'about,address,description,email,profile_picture_url,websites,vertical,messaging_product' }
      });
      res.json({ success: true, data: response.data.data?.[0] || response.data });
    } catch (err) {
      logger.error('[MetaProfile] getProfile error', err.response?.data || err.message);
      next(err.response?.data || err);
    }
  }

  /**
   * PUT /meta/channel/:channelId/profile
   * Updates WhatsApp Business Profile fields.
   * Supported: about, address, description, email, websites (array), vertical
   */
  async updateProfile(req, res, next) {
    try {
      const channel = await this._getChannel(req.tenant.id, req.params.channelId);
      const { about, address, description, email, websites, vertical } = req.body;

      const payload = { messaging_product: 'whatsapp' };
      if (about !== undefined) payload.about = about;
      if (address !== undefined) payload.address = address;
      if (description !== undefined) payload.description = description;
      if (email !== undefined) payload.email = email;
      if (websites !== undefined) payload.websites = Array.isArray(websites) ? websites : [websites];
      if (vertical !== undefined) payload.vertical = vertical;

      const url = `${GRAPH_API_BASE}/${channel.metaPhoneNumberId}/whatsapp_business_profile`;
      const response = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}`, 'Content-Type': 'application/json' }
      });
      logger.info(`[MetaProfile] Updated profile for channel ${channel.id}`);
      res.json({ success: true, data: response.data });
    } catch (err) {
      logger.error('[MetaProfile] updateProfile error', err.response?.data || err.message);
      next(err.response?.data || err);
    }
  }

  /**
   * POST /meta/channel/:channelId/profile/photo
   * Upload a profile picture to Meta.
   * Uploads via the Media endpoint then sets it via whatsapp_business_profile.
   */
  async uploadPhoto(req, res, next) {
    try {
      const channel = await this._getChannel(req.tenant.id, req.params.channelId);
      if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });

      // Step 1: Upload media to Meta
      const form = new FormData();
      form.append('file', fs.createReadStream(req.file.path), { contentType: req.file.mimetype });
      form.append('type', req.file.mimetype);
      form.append('messaging_product', 'whatsapp');

      const uploadRes = await axios.post(
        `${GRAPH_API_BASE}/${channel.metaPhoneNumberId}/media`,
        form,
        { headers: { ...form.getHeaders(), Authorization: `Bearer ${channel.metaAccessToken}` } }
      );
      const mediaId = uploadRes.data.id;

      // Step 2: Get the media URL handle
      const mediaInfoRes = await axios.get(`${GRAPH_API_BASE}/${mediaId}`, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` }
      });
      const mediaUrl = mediaInfoRes.data.url;

      // Step 3: Set profile picture URL
      await axios.post(
        `${GRAPH_API_BASE}/${channel.metaPhoneNumberId}/whatsapp_business_profile`,
        { messaging_product: 'whatsapp', profile_picture_url: mediaUrl },
        { headers: { Authorization: `Bearer ${channel.metaAccessToken}`, 'Content-Type': 'application/json' } }
      );

      // Cleanup temp file
      fs.unlink(req.file.path, () => {});

      logger.info(`[MetaProfile] Profile photo updated for channel ${channel.id}`);
      res.json({ success: true, mediaId, message: 'Profile photo updated successfully' });
    } catch (err) {
      logger.error('[MetaProfile] uploadPhoto error', err.response?.data || err.message);
      next(err.response?.data || err);
    }
  }
}

module.exports = new MetaProfileController();
