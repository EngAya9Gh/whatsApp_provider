const sessionManager = require('./session.manager');
const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class WhatsAppService {
  async connect(tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw { status: 404, message: 'Tenant not found' };

    await sessionManager.createSession(tenantId);
    return { status: 'CONNECTING' };
  }

  async disconnect(tenantId) {
    await sessionManager.deleteSession(tenantId);
    return { status: 'DISCONNECTED' };
  }

  async getStatus(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { sessionStatus: true, whatsappPhone: true }
    });
    return tenant;
  }

  async sendTextMessage(tenantId, phone, text) {
    const sock = sessionManager.getSession(tenantId);
    if (!sock) {
      throw { status: 400, message: 'WhatsApp session is not connected' };
    }

    // Format phone to WhatsApp JID format (e.g. 966500000000@s.whatsapp.net)
    const formattedPhone = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

    try {
      // Small delay to simulate human typing and prevent bans
      await sock.presenceSubscribe(formattedPhone);
      await sock.sendPresenceUpdate('composing', formattedPhone);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await sock.sendPresenceUpdate('paused', formattedPhone);

      const result = await sock.sendMessage(formattedPhone, { text });
      return result;
    } catch (error) {
      logger.error(`Failed to send message for tenant ${tenantId}`, error);
      throw { status: 500, message: 'Failed to send message via WhatsApp' };
    }
  }

  async sendMediaMessage(tenantId, phone, type, url, caption, mimetype, fileName) {
    const sock = sessionManager.getSession(tenantId);
    if (!sock) {
      throw { status: 400, message: 'WhatsApp session is not connected' };
    }

    const formattedPhone = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

    try {
      await sock.presenceSubscribe(formattedPhone);
      await sock.sendPresenceUpdate('composing', formattedPhone);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await sock.sendPresenceUpdate('paused', formattedPhone);

      let messagePayload = {};
      if (type === 'image') {
        messagePayload = { 
          image: Buffer.isBuffer(url) ? url : { url }, 
          caption: caption || '' 
        };
        if (mimetype) messagePayload.mimetype = mimetype;
      } else if (type === 'pdf') {
        messagePayload = { 
          document: Buffer.isBuffer(url) ? url : { url }, 
          mimetype: mimetype || 'application/pdf', 
          fileName: fileName || 'document.pdf', 
          caption: caption || '' 
        };
      } else {
        throw new Error('Unsupported media type');
      }

      const result = await sock.sendMessage(formattedPhone, messagePayload);
      return result;
    } catch (error) {
      logger.error(`Failed to send media for tenant ${tenantId}: ${error.message || error}`);
      throw { status: 500, message: `Failed to send media via WhatsApp: ${error.message || error}` };
    }
  }
  async sendButtons(tenantId, phone, text, buttons, imageBuffer) {
    const sock = sessionManager.getSession(tenantId);
    if (!sock) throw { status: 400, message: 'WhatsApp session is not connected' };

    const formattedPhone = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

    try {
      await sock.presenceSubscribe(formattedPhone);
      await sock.sendPresenceUpdate('composing', formattedPhone);
      await new Promise(resolve => setTimeout(resolve, 1200));
      await sock.sendPresenceUpdate('paused', formattedPhone);

      // Build buttons array for Baileys
      const baileysButtons = buttons.map((btn, i) => {
        if (btn.type === 'url') {
          return { buttonId: btn.id || `btn_${i}`, buttonText: { displayText: btn.text }, type: 4, nativeFlowInfo: { name: 'open_url', paramsJson: JSON.stringify({ url: btn.url }) } };
        }
        return { buttonId: btn.id || `btn_${i}`, buttonText: { displayText: btn.text }, type: 1 };
      });

      let payload;
      if (imageBuffer) {
        payload = {
          image: imageBuffer,
          caption: text,
          buttons: baileysButtons,
          headerType: 4
        };
      } else {
        payload = {
          text,
          buttons: baileysButtons,
          headerType: 1
        };
      }

      const result = await sock.sendMessage(formattedPhone, payload);
      return result;
    } catch (error) {
      logger.error(`Failed to send buttons message for tenant ${tenantId}: ${error.message}`);
      throw { status: 500, message: `Failed to send buttons message: ${error.message}` };
    }
  }

  async sendList(tenantId, phone, title, body, buttonText, sections) {
    const sock = sessionManager.getSession(tenantId);
    if (!sock) throw { status: 400, message: 'WhatsApp session is not connected' };

    const formattedPhone = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

    try {
      await sock.presenceSubscribe(formattedPhone);
      await sock.sendPresenceUpdate('composing', formattedPhone);
      await new Promise(resolve => setTimeout(resolve, 1200));
      await sock.sendPresenceUpdate('paused', formattedPhone);

      const result = await sock.sendMessage(formattedPhone, {
        text: body,
        title,
        buttonText,
        sections
      });
      return result;
    } catch (error) {
      logger.error(`Failed to send list message for tenant ${tenantId}: ${error.message}`);
      throw { status: 500, message: `Failed to send list message: ${error.message}` };
    }
  }

  async sendLocation(tenantId, phone, latitude, longitude, name, address) {
    const sock = sessionManager.getSession(tenantId);
    if (!sock) throw { status: 400, message: 'WhatsApp session is not connected' };

    const formattedPhone = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

    try {
      await sock.presenceSubscribe(formattedPhone);
      await sock.sendPresenceUpdate('composing', formattedPhone);
      await new Promise(resolve => setTimeout(resolve, 800));
      await sock.sendPresenceUpdate('paused', formattedPhone);

      const result = await sock.sendMessage(formattedPhone, {
        location: {
          degreesLatitude: parseFloat(latitude),
          degreesLongitude: parseFloat(longitude),
          name: name || '',
          address: address || ''
        }
      });
      return result;
    } catch (error) {
      logger.error(`Failed to send location for tenant ${tenantId}: ${error.message}`);
      throw { status: 500, message: `Failed to send location: ${error.message}` };
    }
  }
}

module.exports = new WhatsAppService();
