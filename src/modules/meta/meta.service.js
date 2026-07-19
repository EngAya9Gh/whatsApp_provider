const axios = require('axios');
const logger = require('../../utils/logger');
const fs = require('fs');

class MetaService {
  async sendMessage(channel, phone, messagePayload) {
    if (!channel || channel.providerType !== 'META_CLOUD') {
      throw new Error('Invalid Meta channel configuration');
    }
    
    // Format phone to international without + or spaces
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    
    const url = `https://graph.facebook.com/v19.0/${channel.metaPhoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
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
      return response.data;
    } catch (error) {
      logger.error(`[Meta Service] Error sending to ${formattedPhone}`, error.response?.data || error.message);
      throw error.response?.data || error;
    }
  }

  async sendText(channel, phone, text) {
    return this.sendMessage(channel, phone, {
      type: "text",
      text: { preview_url: false, body: text }
    });
  }

  async sendButtons(channel, phone, text, buttons) {
    const interactiveButtons = buttons.slice(0, 3).map((btn, index) => ({
      type: "reply",
      reply: { id: btn.id || `btn_${index}`, title: btn.text.substring(0, 20) }
    }));

    return this.sendMessage(channel, phone, {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: text || " " },
        action: { buttons: interactiveButtons }
      }
    });
  }

  async sendList(channel, phone, title, body, buttonText, sections) {
    const interactiveSections = sections.map((sec) => ({
      title: sec.title.substring(0, 24),
      rows: sec.rows.map(r => ({
        id: r.rowId || r.id || `row_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
        title: r.title.substring(0, 24),
        description: (r.description || '').substring(0, 72)
      }))
    }));

    return this.sendMessage(channel, phone, {
      type: "interactive",
      interactive: {
        type: "list",
        header: title ? { type: "text", text: title.substring(0, 60) } : undefined,
        body: { text: body || " " },
        action: {
          button: (buttonText || "Options").substring(0, 20),
          sections: interactiveSections
        }
      }
    });
  }
}

module.exports = new MetaService();
