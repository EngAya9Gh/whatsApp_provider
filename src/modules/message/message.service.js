const whatsappService = require('../whatsapp/whatsapp.service');
const metaService = require('../meta/meta.service');
const billingService = require('../billing/billing.service');
const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

class MessageService {
  async _getChannel(channelId) {
    if (!channelId) return null;
    return await prisma.whatsAppChannel.findUnique({ where: { id: channelId } });
  }

  async sendCustomMessage(tenantId, phone, message, channelId = null) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached. Please upgrade your plan.' };

    const channel = await this._getChannel(channelId);
    try {
      let metaMessageId = null;
      if (channel && channel.providerType === 'META_CLOUD') {
        const metaRes = await metaService.sendText(channel, phone, message);
        // Meta returns: { messages: [{ id: "wamid.xxx" }] }
        metaMessageId = metaRes?.messages?.[0]?.id || null;
      } else {
        await whatsappService.sendTextMessage(tenantId, phone, message);
      }

      await prisma.messageLog.create({
        data: { tenantId, channelId, phone, messageType: 'CUSTOM', status: 'SENT', metaMessageId, deliveryStatus: metaMessageId ? 'sent' : null }
      });
      await billingService.incrementUsage(tenantId, 'sent');
      return { success: true, message: 'Message sent successfully' };
    } catch (error) {
      await prisma.messageLog.create({
        data: { tenantId, channelId, phone, messageType: 'CUSTOM', status: 'FAILED', errorMessage: error.message || 'Sending failed' }
      });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendMetaTemplate(tenantId, phone, templateName, languageCode, components, channelId) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    if (!channel || channel.providerType !== 'META_CLOUD') {
      throw { status: 400, message: 'Invalid Meta Cloud channel' };
    }

    try {
      const metaRes = await metaService.sendTemplate(channel, phone, templateName, languageCode, components);
      // Meta returns: { messages: [{ id: "wamid.xxx" }] }
      const metaMessageId = metaRes?.messages?.[0]?.id || null;

      await prisma.messageLog.create({
        data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'SENT', metaMessageId, deliveryStatus: 'sent' }
      });
      await billingService.incrementUsage(tenantId, 'sent');
      return { success: true, message: 'Template sent successfully', metaMessageId };
    } catch (error) {
      await prisma.messageLog.create({
        data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'FAILED', errorMessage: error.message || 'Sending failed' }
      });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendMediaMessage(tenantId, phone, type, url, caption, mimetype, fileName, channelId = null) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    try {
      if (channel && channel.providerType === 'META_CLOUD') {
        // TODO: Implement Meta Media
        throw new Error('Media sending via Meta Cloud is not yet implemented');
      } else {
        await whatsappService.sendMediaMessage(tenantId, phone, type, url, caption, mimetype, fileName);
      }
      
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'CUSTOM', status: 'SENT' } });
      await billingService.incrementUsage(tenantId, 'sent');
      return { success: true, message: 'Media message sent successfully' };
    } catch (error) {
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'CUSTOM', status: 'FAILED', errorMessage: error.message || 'Failed' } });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendButtonsMessage(tenantId, phone, text, buttons, imageBuffer, channelId = null) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    try {
      if (channel && channel.providerType === 'META_CLOUD') {
        await metaService.sendButtons(channel, phone, text, buttons);
      } else {
        await whatsappService.sendButtons(tenantId, phone, text, buttons, imageBuffer);
      }
      
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'SENT' } });
      await billingService.incrementUsage(tenantId, 'sent');
      return { success: true, message: 'Interactive message sent successfully' };
    } catch (error) {
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'FAILED', errorMessage: error.message || 'Failed' } });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendListMessage(tenantId, phone, title, body, buttonText, sections, channelId = null) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    try {
      if (channel && channel.providerType === 'META_CLOUD') {
        await metaService.sendList(channel, phone, title, body, buttonText, sections);
      } else {
        await whatsappService.sendList(tenantId, phone, title, body, buttonText, sections);
      }

      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'SENT' } });
      await billingService.incrementUsage(tenantId, 'sent');
      return { success: true, message: 'List message sent successfully' };
    } catch (error) {
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'FAILED', errorMessage: error.message || 'Failed' } });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendLocationMessage(tenantId, phone, latitude, longitude, name, address, channelId = null) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    try {
      if (channel && channel.providerType === 'META_CLOUD') {
        throw new Error('Location sending via Meta Cloud is not yet implemented');
      } else {
        await whatsappService.sendLocation(tenantId, phone, latitude, longitude, name, address);
      }
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'SENT' } });
      await billingService.incrementUsage(tenantId, 'sent');
      return { success: true, message: 'Location sent successfully' };
    } catch (error) {
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'FAILED', errorMessage: error.message || 'Failed' } });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }
}

module.exports = new MessageService();
