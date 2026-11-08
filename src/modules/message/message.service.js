const whatsappService = require('../whatsapp/whatsapp.service');
const metaService = require('../meta/meta.service');
const { metaErrorText } = require('../meta/meta.errors');
const billingService = require('../billing/billing.service');
const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

class MessageService {
  async _getChannel(channelId) {
    if (!channelId || channelId === 'default' || String(channelId).trim() === '') return null;
    try {
      return await prisma.whatsAppChannel.findUnique({ where: { id: channelId } });
    } catch(e) {
      return null;
    }
  }

  /** Shows a message sent from the Send Message page / API in its Live Chat conversation (Meta channels only) */
  _recordInChat(channel, tenantId, phone, entry) {
    if (channel && channel.providerType === 'META_CLOUD') {
      require('../chat/chat.service').recordOutbound(tenantId, channel.id, phone, entry);
    }
  }

  async sendCustomMessage(tenantId, phone, message, channelId = null, options = {}) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached. Please upgrade your plan.' };

    const channel = await this._getChannel(channelId);
    channelId = channel ? channel.id : null;
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
      if (options.record) this._recordInChat(channel, tenantId, phone, { content: message, metaMessageId });
      return { success: true, message: 'Message sent successfully' };
    } catch (error) {
      await prisma.messageLog.create({
        data: { tenantId, channelId, phone, messageType: 'CUSTOM', status: 'FAILED', errorMessage: error.message || 'Sending failed' }
      });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendMetaTemplate(tenantId, phone, templateName, languageCode, components, channelId, options = {}) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    channelId = channel ? channel.id : null;
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
      if (options.record) this._recordInChat(channel, tenantId, phone, { type: 'TEMPLATE', content: options.previewText || templateName, metaMessageId });
      return { success: true, message: 'Template sent successfully', metaMessageId };
    } catch (error) {
      await prisma.messageLog.create({
        data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'FAILED', errorMessage: metaErrorText(error) || 'Sending failed' }
      });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendMediaMessage(tenantId, phone, type, url, caption, mimetype, fileName, channelId = null) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    channelId = channel ? channel.id : null;
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

  async sendButtonsMessage(tenantId, phone, text, buttons, imageBuffer, channelId = null, options = {}) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    channelId = channel ? channel.id : null;
    let metaMessageId = null;
    try {
      if (channel && channel.providerType === 'META_CLOUD') {
        const metaRes = await metaService.sendButtons(channel, phone, text, buttons);
        metaMessageId = metaRes?.messages?.[0]?.id || null;
      } else {
        await whatsappService.sendButtons(tenantId, phone, text, buttons, imageBuffer);
      }
      
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'SENT' } });
      await billingService.incrementUsage(tenantId, 'sent');
      if (options.record) this._recordInChat(channel, tenantId, phone, { type: 'INTERACTIVE', content: text, metaMessageId });
      return { success: true, message: 'Interactive message sent successfully' };
    } catch (error) {
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'FAILED', errorMessage: error.message || 'Failed' } });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendFlowMessage(tenantId, phone, flowId, flowCta, flowBody, flowFooter, flowScreen = null, channelId = null, options = {}) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    channelId = channel ? channel.id : null;
    let metaMessageId = null;
    try {
      if (channel && channel.providerType === 'META_CLOUD') {
        const metaRes = await metaService.sendFlow(channel, phone, flowId, flowCta, flowBody, flowFooter, flowScreen);
        metaMessageId = metaRes?.messages?.[0]?.id || null;
      } else {
        throw new Error('WhatsApp Flows are only supported on Meta Cloud channels.');
      }
      
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'SENT' } });
      await billingService.incrementUsage(tenantId, 'sent');
      if (options.record) this._recordInChat(channel, tenantId, phone, { type: 'INTERACTIVE', content: flowBody || flowCta || 'WhatsApp Flow', metaMessageId });
      return { success: true, message: 'Flow message sent successfully' };
    } catch (error) {
      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'FAILED', errorMessage: error.message || 'Failed' } });
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendListMessage(tenantId, phone, title, body, buttonText, sections, channelId = null, options = {}) {
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) throw { status: 402, message: 'Monthly message limit reached.' };

    const channel = await this._getChannel(channelId);
    channelId = channel ? channel.id : null;
    let metaMessageId = null;
    try {
      if (channel && channel.providerType === 'META_CLOUD') {
        const metaRes = await metaService.sendList(channel, phone, title, body, buttonText, sections);
        metaMessageId = metaRes?.messages?.[0]?.id || null;
      } else {
        await whatsappService.sendList(tenantId, phone, title, body, buttonText, sections);
      }

      await prisma.messageLog.create({ data: { tenantId, channelId, phone, messageType: 'INTERACTIVE', status: 'SENT' } });
      await billingService.incrementUsage(tenantId, 'sent');
      if (options.record) this._recordInChat(channel, tenantId, phone, { type: 'INTERACTIVE', content: body || title || 'List', metaMessageId });
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
    channelId = channel ? channel.id : null;
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
