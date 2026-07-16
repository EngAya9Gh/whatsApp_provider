const whatsappService = require('../whatsapp/whatsapp.service');
const billingService = require('../billing/billing.service');
const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

class MessageService {
  async sendCustomMessage(tenantId, phone, message) {
    // 0. Check Billing Limit
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) {
      throw { status: 402, message: 'Monthly message limit reached. Please upgrade your plan.' };
    }

    // 1. Send via WhatsApp
    try {
      await whatsappService.sendTextMessage(tenantId, phone, message);
      
      // 2. Log the message success
      await prisma.messageLog.create({
        data: { tenantId, phone, messageType: 'CUSTOM', status: 'SENT' }
      });
      
      // 3. Increment usage
      await billingService.incrementUsage(tenantId, 'sent');
      
      return { success: true, message: 'Message sent successfully' };
    } catch (error) {
      // Log the failure
      await prisma.messageLog.create({
        data: {
          tenantId, phone, messageType: 'CUSTOM', status: 'FAILED',
          errorMessage: error.message || 'WhatsApp sending failed'
        }
      });
      
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async sendMediaMessage(tenantId, phone, type, url, caption, mimetype, fileName) {
    // 0. Check Billing Limit
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) {
      throw { status: 402, message: 'Monthly message limit reached. Please upgrade your plan.' };
    }

    // 1. Send via WhatsApp
    try {
      await whatsappService.sendMediaMessage(tenantId, phone, type, url, caption, mimetype, fileName);
      
      // 2. Log the message success
      await prisma.messageLog.create({
        data: { tenantId, phone, messageType: 'CUSTOM', status: 'SENT' }
      });
      
      // 3. Increment usage
      await billingService.incrementUsage(tenantId, 'sent');
      
      return { success: true, message: 'Media message sent successfully' };
    } catch (error) {
      // Log the failure
      await prisma.messageLog.create({
        data: {
          tenantId, phone, messageType: 'CUSTOM', status: 'FAILED',
          errorMessage: error.message || 'WhatsApp sending failed'
        }
      });
      
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }
}

module.exports = new MessageService();
