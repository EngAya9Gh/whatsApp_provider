const { redisClient } = require('../../config/redis');
const whatsappService = require('../whatsapp/whatsapp.service');
const billingService = require('../billing/billing.service');
const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

class OTPService {
  async sendOTP(tenantId, phone) {
    // 0. Check Billing Limit
    const canSend = await billingService.checkLimit(tenantId);
    if (!canSend) {
      throw { status: 402, message: 'Monthly message limit reached. Please upgrade your plan.' };
    }

    // 1. Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Prepare message
    const message = `رمز التحقق الخاص بك هو: *${code}*\nلا تشارك هذا الرمز مع أحد.`;

    // 3. Save to Redis with 5 minutes TTL (300 seconds)
    const redisKey = `otp:${tenantId}:${phone}`;
    await redisClient.set(redisKey, code, 'EX', 300);

    // 4. Send via WhatsApp
    try {
      await whatsappService.sendTextMessage(tenantId, phone, message);
      
      // 5. Log the message success
      await prisma.messageLog.create({
        data: { tenantId, phone, messageType: 'OTP', status: 'SENT' }
      });
      
      // 6. Increment usage
      await billingService.incrementUsage(tenantId, 'sent');
      
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      // Log the failure
      await prisma.messageLog.create({
        data: {
          tenantId, phone, messageType: 'OTP', status: 'FAILED',
          errorMessage: error.message || 'WhatsApp sending failed'
        }
      });
      
      await billingService.incrementUsage(tenantId, 'failed');
      throw error;
    }
  }

  async verifyOTP(tenantId, phone, code) {
    const redisKey = `otp:${tenantId}:${phone}`;
    const storedCode = await redisClient.get(redisKey);

    if (!storedCode) {
      throw { status: 400, message: 'OTP expired or not found' };
    }

    if (storedCode !== code) {
      throw { status: 400, message: 'Invalid OTP code' };
    }

    // Success! Delete the code to prevent reuse
    await redisClient.del(redisKey);

    return { success: true, message: 'OTP verified successfully' };
  }
}

module.exports = new OTPService();
