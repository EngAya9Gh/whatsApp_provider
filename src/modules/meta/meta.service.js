const axios = require('axios');
const logger = require('../../utils/logger');
const fs = require('fs');
const FormData = require('form-data'); // ✅ Node.js compatible form-data package

// ✅ Use env variable for API version — update in .env without code changes
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

class MetaService {
  /**
   * Core send method — all message types go through here.
   * Endpoint: POST /{version}/{phone-number-id}/messages
   * Headers:
   *   Authorization: Bearer {access_token}
   *   Content-Type: application/json
   * Body must include: messaging_product, recipient_type, to, type, + type-specific fields
   */
  async sendMessage(channel, phone, messagePayload) {
    if (!channel || channel.providerType !== 'META_CLOUD') {
      throw new Error('Invalid Meta channel configuration');
    }

    // Strip all non-digit chars (handles +, spaces, dashes)
    const formattedPhone = phone.replace(/[^0-9]/g, '');

    const url = `${GRAPH_API_BASE}/${channel.metaPhoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      ...messagePayload
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${channel.metaAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
      // response.data contains { messages: [{ id: "wamid.xxx" }] }
      return response.data;
    } catch (error) {
      logger.error(`[MetaService] Send error to ${formattedPhone}`, error.response?.data || error.message);
      throw error.response?.data || error;
    }
  }

  /**
   * Upload media to Meta servers and get a media_id.
   * Endpoint: POST /{version}/{phone-number-id}/media
   * Headers:
   *   Authorization: Bearer {access_token}
   *   Content-Type: multipart/form-data (set by form-data)
   * Body (multipart/form-data):
   *   file: <binary>
   *   type: <mimetype>   e.g. "image/jpeg"
   *   messaging_product: "whatsapp"
   * Returns: { id: "media_id" }
   */
  async uploadMedia(channel, filePath, mimetype) {
    try {
      const form = new FormData(); // ✅ Uses form-data package (not Web FormData)
      form.append('file', fs.createReadStream(filePath), { contentType: mimetype });
      form.append('type', mimetype);
      form.append('messaging_product', 'whatsapp');

      const uploadRes = await axios.post(
        `${GRAPH_API_BASE}/${channel.metaPhoneNumberId}/media`,
        form,
        {
          headers: {
            ...form.getHeaders(), // ✅ form-data provides getHeaders() with correct Content-Type + boundary
            'Authorization': `Bearer ${channel.metaAccessToken}`
          }
        }
      );

      logger.info(`[MetaService] Media uploaded successfully, id: ${uploadRes.data.id}`);
      return uploadRes.data.id;
    } catch (error) {
      logger.error('[MetaService] Media upload error', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetch approved templates from WABA (WhatsApp Business Account).
   * Endpoint: GET /{version}/{waba-id}/message_templates
   * Headers:
   *   Authorization: Bearer {access_token}
   * Query params: limit, status, name (optional filters)
   */
  async fetchTemplates(channel) {
    if (!channel || !channel.metaWabaId || channel.providerType !== 'META_CLOUD') {
      throw new Error('Invalid Meta channel configuration for templates');
    }

    try {
      const url = `${GRAPH_API_BASE}/${channel.metaWabaId}/message_templates`;
      const response = await axios.get(url, {
        params: { limit: 100 },
        headers: {
          'Authorization': `Bearer ${channel.metaAccessToken}`
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`[MetaService] fetchTemplates error for WABA ${channel.metaWabaId}`, error.response?.data || error.message);
      throw error.response?.data || error;
    }
  }

  /**
   * Send a Meta-approved template message.
   * components array format (from Meta docs):
   * [
   *   { type: "header", parameters: [{ type: "image", image: { link: "..." } }] },
   *   { type: "body",   parameters: [{ type: "text", text: "value" }] },
   *   { type: "button", sub_type: "quick_reply", index: 0, parameters: [{ type: "payload", payload: "YES" }] }
   * ]
   */
  async sendTemplate(channel, phone, templateName, languageCode, components = []) {
    return this.sendMessage(channel, phone, {
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components
      }
    });
  }

  /**
   * Send plain text message.
   * Body: { type: "text", text: { preview_url: bool, body: "..." } }
   */
  async sendText(channel, phone, text) {
    return this.sendMessage(channel, phone, {
      type: 'text',
      text: { preview_url: false, body: text }
    });
  }

  /**
   * Send interactive button message (max 3 buttons per Meta API limit).
   * Each button title max 20 chars.
   * Body: { type: "interactive", interactive: { type: "button", body, action: { buttons } } }
   */
  async sendButtons(channel, phone, bodyText, buttons, header = null, footer = null) {
    const interactiveButtons = buttons.slice(0, 3).map((btn, index) => ({
      type: 'reply',
      reply: {
        id: btn.id || `btn_${index}`,
        title: btn.text.substring(0, 20) // Meta limit: 20 chars
      }
    }));

    const interactive = {
      type: 'button',
      body: { text: bodyText || ' ' },
      action: { buttons: interactiveButtons }
    };

    if (header) {
      interactive.header = { type: 'text', text: header.substring(0, 60) };
    }
    if (footer) {
      interactive.footer = { text: footer.substring(0, 60) };
    }

    return this.sendMessage(channel, phone, {
      type: 'interactive',
      interactive
    });
  }

  /**
   * Send interactive list message.
   * Sections: [{ title, rows: [{ id, title, description? }] }]
   * Limits: section title 24 chars, row title 24 chars, row description 72 chars, button text 20 chars
   */
  async sendList(channel, phone, title, body, buttonText, sections) {
    const interactiveSections = sections.map(sec => ({
      title: (sec.title || '').substring(0, 24),
      rows: sec.rows.map(r => ({
        id: r.rowId || r.id || `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: r.title.substring(0, 24),
        description: (r.description || '').substring(0, 72)
      }))
    }));

    const interactive = {
      type: 'list',
      body: { text: body || ' ' },
      action: {
        button: (buttonText || 'Options').substring(0, 20),
        sections: interactiveSections
      }
    };

    if (title) {
      interactive.header = { type: 'text', text: title.substring(0, 60) };
    }

    return this.sendMessage(channel, phone, {
      type: 'interactive',
      interactive
    });
  }

  /**
   * Send media message (image, video, audio, document).
   * Per Meta docs: use { link: "..." } for URL or { id: "media_id" } for uploaded media.
   * Document supports optional caption and filename.
   * Audio does NOT support caption.
   */
  async sendMedia(channel, phone, type, mediaUrl, caption, filename = null) {
    const mediaObject = { link: mediaUrl };

    if (caption && type !== 'audio') {
      mediaObject.caption = caption;
    }

    // filename is required for document type per Meta docs
    if (type === 'document' && filename) {
      mediaObject.filename = filename;
    }

    return this.sendMessage(channel, phone, {
      type,
      [type]: mediaObject
    });
  }

  /**
   * Send media using an already-uploaded media_id (preferred over link per Meta docs).
   */
  async sendMediaById(channel, phone, type, mediaId, caption = null, filename = null) {
    const mediaObject = { id: mediaId };

    if (caption && type !== 'audio') {
      mediaObject.caption = caption;
    }

    if (type === 'document' && filename) {
      mediaObject.filename = filename;
    }

    return this.sendMessage(channel, phone, {
      type,
      [type]: mediaObject
    });
  }

  /**
   * Send location message.
   * Body: { type: "location", location: { latitude, longitude, name?, address? } }
   * Per Meta docs: latitude/longitude are required, name and address are optional.
   */
  async sendLocation(channel, phone, latitude, longitude, name = null, address = null) {
    const location = { latitude, longitude };
    if (name) location.name = name;
    if (address) location.address = address;

    return this.sendMessage(channel, phone, {
      type: 'location',
      location
    });
  }

  /**
   * Mark a received message as read.
   * Endpoint: POST /{version}/{phone-number-id}/messages
   * Body: { messaging_product: "whatsapp", status: "read", message_id: "wamid.xxx" }
   */
  async markAsRead(channel, messageId) {
    const url = `${GRAPH_API_BASE}/${channel.metaPhoneNumberId}/messages`;
    try {
      await axios.post(url, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      }, {
        headers: {
          'Authorization': `Bearer ${channel.metaAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      // Non-critical — don't throw
      logger.warn(`[MetaService] markAsRead failed for ${messageId}`, error.response?.data || error.message);
    }
  }
}

module.exports = new MetaService();
