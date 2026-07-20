const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const messageService = require('../modules/message/message.service');
const fs = require('fs');
const logger = require('../utils/logger');

// Setup Redis Connection
const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
};
const connection = new Redis(redisOptions);

// Initialize Queue
const campaignQueue = new Queue('campaign-queue', { connection });

// Initialize Worker
const campaignWorker = new Worker('campaign-queue', async (job) => {
  const { tenantId, phone, message, templateId, buttons, interactiveType, targetId, channelId } = job.data;
  let { mediaPath, mediaMime } = job.data;
  
  try {
    let finalMessage = message;

    // 1. Fetch template if templateId is provided
    if (templateId) {
      const template = await prisma.messageTemplate.findUnique({
        where: { id: templateId, tenantId }
      });
      if (template) {
        finalMessage = template.content;
        if (!mediaPath && template.mediaPath) {
          job.data.mediaPath = template.mediaPath;
          job.data.mediaMime = template.mediaMime;
          mediaPath = template.mediaPath;
          mediaMime = template.mediaMime;
        }
      }
    }

    // 2. Send based on interactiveType
    if (interactiveType === 'META_TEMPLATE') {
      // For Meta Templates, 'message' contains the templateName, 'templateId' contains languageCode, and 'buttons' contains components JSON
      const templateName = message;
      const languageCode = templateId || 'en';
      const components = buttons ? (typeof buttons === 'string' ? JSON.parse(buttons) : buttons) : [];
      await messageService.sendMetaTemplate(tenantId, phone, templateName, languageCode, components, channelId);
    } else if (interactiveType === 'BUTTONS' && buttons) {
      // Parse buttons JSON
      const parsedButtons = typeof buttons === 'string' ? JSON.parse(buttons) : buttons;
      // Load image if mediaPath exists
      let imageBuffer;
      if (mediaPath && fs.existsSync(mediaPath)) {
        imageBuffer = fs.readFileSync(mediaPath);
      }
      await messageService.sendButtonsMessage(tenantId, phone, finalMessage || '', parsedButtons, imageBuffer, channelId);
    } else if (mediaPath && fs.existsSync(mediaPath)) {
      let type = 'image';
      if (mediaMime && mediaMime.includes('pdf')) type = 'pdf';
      await messageService.sendMediaMessage(tenantId, phone, type, mediaPath, finalMessage || '', mediaMime, 'campaign-media', channelId);
    } else {
      if (!finalMessage) throw new Error('No message content found');
      await messageService.sendCustomMessage(tenantId, phone, finalMessage, channelId);
    }
    
    // Update target status
    await prisma.campaignTarget.update({
      where: { id: targetId },
      data: { status: 'SENT' }
    });

    logger.info(`[Campaign] Sent message to ${phone}`);
    
    // Wait for 5 seconds to simulate delay (Anti-Ban)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    logger.error(`[Campaign] Failed to send to ${phone}`, error);
    await prisma.campaignTarget.update({
      where: { id: targetId },
      data: { status: 'FAILED', error: error.message || 'Unknown error' }
    });
  }
}, { connection, concurrency: 1 }); // Concurrency 1 ensures we process one by one per worker

campaignWorker.on('completed', (job) => {
  logger.debug(`[Campaign] Job ${job.id} has completed!`);
});
campaignWorker.on('failed', (job, err) => {
  logger.error(`[Campaign] Job ${job.id} has failed with ${err.message}`);
});

module.exports = { campaignQueue, campaignWorker };
