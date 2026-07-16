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
}

module.exports = new WhatsAppService();
