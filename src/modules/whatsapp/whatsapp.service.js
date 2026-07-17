const sessionManager = require('./session.manager');
const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

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

      const interactiveButtons = buttons.map((btn, i) => {
        if (btn.type === 'url') {
          return {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: btn.text,
              url: btn.url,
              merchant_url: btn.url
            })
          };
        }
        return {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: btn.text,
            id: btn.id || `btn_${i}`
          })
        };
      });

      const messageContent = {
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({ text: text || ' ' }),
          footer: proto.Message.InteractiveMessage.Footer.create({ text: ' ' }),
          header: proto.Message.InteractiveMessage.Header.create({ title: ' ', subtitle: ' ', hasMediaAttachment: !!imageBuffer }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: interactiveButtons
          })
        })
      };

      if (imageBuffer) {
        // Since uploading inside interactiveMessage without upload function is complex,
        // we'll fallback to a normal message if we can't do it easily,
        // but for now, we just skip media in interactive native flow unless pre-uploaded.
        // As a workaround, we send media first, then buttons.
        await sock.sendMessage(formattedPhone, { image: imageBuffer, caption: text });
        messageContent.interactiveMessage.body.text = "Please choose an option:";
        messageContent.interactiveMessage.header.hasMediaAttachment = false;
      }

      const waMsg = generateWAMessageFromContent(formattedPhone, messageContent, { userJid: sock.user.id });
      const result = await sock.relayMessage(formattedPhone, waMsg.message, { messageId: waMsg.key.id });

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

      const listSections = sections.map((sec) => ({
        title: sec.title,
        rows: sec.rows.map(r => ({
          id: r.rowId || r.id || `row_${Date.now()}_${Math.random()}`,
          title: r.title,
          description: r.description || ''
        }))
      }));

      const messageContent = {
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({ text: body || ' ' }),
          footer: proto.Message.InteractiveMessage.Footer.create({ text: ' ' }),
          header: proto.Message.InteractiveMessage.Header.create({ title: title || ' ', subtitle: ' ', hasMediaAttachment: false }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: buttonText || "Options",
                  sections: listSections
                })
              }
            ]
          })
        })
      };

      const waMsg = generateWAMessageFromContent(formattedPhone, messageContent, { userJid: sock.user.id });
      const result = await sock.relayMessage(formattedPhone, waMsg.message, { messageId: waMsg.key.id });

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
