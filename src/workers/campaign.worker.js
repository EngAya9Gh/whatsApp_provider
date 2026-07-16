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
  const { tenantId, phone, message, templateId, mediaPath, mediaMime, targetId } = job.data;
  
  try {
    let finalMessage = message;

    // 1. Fetch template if templateId is provided
    if (templateId) {
      const template = await prisma.messageTemplate.findUnique({
        where: { id: templateId, tenantId }
      });
      if (template) finalMessage = template.content;
    }

    // 2. Send Media or Text
    if (mediaPath && fs.existsSync(mediaPath)) {
      // Pass the file path directly instead of reading it into a Buffer.
      // Baileys handles stream uploads better and avoids "Media upload failed on all hosts" errors.
      let type = 'image';
      if (mediaMime && mediaMime.includes('pdf')) type = 'pdf';
      
      await messageService.sendMediaMessage(tenantId, phone, type, mediaPath, finalMessage || '', mediaMime, 'campaign-media');
    } else {
      if (!finalMessage) throw new Error('No message content found');
      await messageService.sendCustomMessage(tenantId, phone, finalMessage);
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
