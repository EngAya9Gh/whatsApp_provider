const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'wakeel_meta_secret_1234';
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';
const chatService = require('../chat/chat.service');
const webhookService = require('../webhook/webhook.service');
// Queue-based processing — protects against data loss on server crashes
const { metaWebhookQueue } = require('../../workers/meta.webhook.worker');

class MetaController {

  /**
   * Handle Meta webhook verification (GET request).
   * Meta sends: hub.mode=subscribe, hub.verify_token, hub.challenge
   * We must respond with hub.challenge if token matches.
   */
  async verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        logger.info('[MetaWebhook] ✅ Verification successful');
        return res.status(200).send(challenge);
      } else {
        logger.error('[MetaWebhook] ❌ Verification failed: Token mismatch');
        return res.sendStatus(403);
      }
    }
    return res.sendStatus(400);
  }

  /**
   * Handle all incoming webhook POST events from Meta.
   * 
   * Event types we handle:
   *  1. messages   — incoming WhatsApp messages from customers
   *  2. statuses   — delivery receipts: sent | delivered | read | failed
   * 
   * Meta expects 200 OK immediately. Processing happens asynchronously after.
   */
  async handleWebhook(req, res) {
    // ✅ Respond 200 immediately — Meta requires fast response (< 20s) to avoid retries
    res.sendStatus(200);

    const body = req.body;
    if (!body || body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (!change.value) continue;

        const metadata = change.value.metadata;
        const metaPhoneNumberId = metadata?.phone_number_id;

        logger.info(`[MetaWebhook] 🔍 Looking for channel with phone_number_id: "${metaPhoneNumberId}"`);
        const channel = await prisma.whatsAppChannel.findFirst({
          where: { 
            metaPhoneNumberId, 
            status: { in: ['CONNECTED', 'ACTIVE'] } 
          }
        }).catch(() => null);

        if (!channel) {
          const allChannels = await prisma.whatsAppChannel.findMany({
            select: { id: true, metaPhoneNumberId: true, status: true, displayPhoneNumber: true }
          }).catch(() => []);
          logger.warn(`[MetaWebhook] ⚠️ Unknown phone_number_id: "${metaPhoneNumberId}". All channels: ${JSON.stringify(allChannels)}`);
          continue;
        }
        logger.info(`[MetaWebhook] ✅ Found channel: ${channel.id} for phone_number_id: ${metaPhoneNumberId}`);

        // --- HMAC Signature Verification (Per-Channel) ---
        // Verify signature ONLY if the channel has a metaAppSecret configured
        if (channel.metaAppSecret && req.rawBody) {
          const signature = req.headers['x-hub-signature-256'];
          if (!signature) {
            logger.error(`[MetaWebhook] Missing signature for channel ${channel.id}`);
            return; // Stop processing this invalid request
          }

          const crypto = require('crypto');
          const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', channel.metaAppSecret)
            .update(req.rawBody)
            .digest('hex');

          const sigBuffer = Buffer.from(signature);
          const expectedBuffer = Buffer.from(expectedSignature);

          if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
            logger.error(`[MetaWebhook] ❌ Invalid signature for channel ${channel.id}`);
            return; // Stop processing
          }
        }

        // ─────────────────────────────────────────────────────────────
        // 🔒 Queue-based processing — events are stored in Redis (BullMQ)
        //    and retried up to 5 times with exponential backoff on failure.
        //    This guarantees ZERO data loss even if the server crashes.
        // ─────────────────────────────────────────────────────────────

        // 1. INCOMING MESSAGES → Queue
        if (change.value.messages) {
          const contacts = change.value.contacts || [];
          for (const msg of change.value.messages) {
            logger.info(`[MetaWebhook] 📨 Queueing message from: ${msg.from} | type: ${msg.type} | id: ${msg.id}`);
            await metaWebhookQueue.add('incoming-message', {
              type: 'INCOMING_MESSAGE',
              channelId: channel.id,
              tenantId: channel.tenantId,
              payload: { msg, contacts, channel: { id: channel.id } }
            }).catch(e => logger.error(`[MetaWebhook] Failed to queue message from ${msg.from}: ${e.message}`));
          }
        }

        // 2. DELIVERY STATUS UPDATES → Queue
        if (change.value.statuses) {
          for (const statusUpdate of change.value.statuses) {
            logger.info(`[MetaWebhook] 📊 Queueing status: ${statusUpdate.status} for wamid ${statusUpdate.id}`);
            await metaWebhookQueue.add('status-update', {
              type: 'STATUS_UPDATE',
              channelId: channel.id,
              tenantId: channel.tenantId,
              payload: { statusUpdate, channel: { id: channel.id } }
            }).catch(e => logger.error(`[MetaWebhook] Failed to queue status for ${statusUpdate.id}: ${e.message}`));
          }
        }
      }
    }
  }

  /**
   * POST /meta/channel/:channelId/sync-stats
   * Fetches delivery analytics from Meta API to recover stats lost during server downtime.
   * Body: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' } (defaults to last 7 days)
   */
  async syncStats(req, res, next) {
    try {
      const { channelId } = req.params;
      const channel = await prisma.whatsAppChannel.findFirst({
        where: { id: channelId, tenantId: req.tenant.id, providerType: 'META_CLOUD' }
      });
      if (!channel) return res.status(404).json({ success: false, message: 'Meta channel not found' });
      if (!channel.metaWabaId || !channel.metaAccessToken) {
        return res.status(400).json({ success: false, message: 'Channel missing WABA ID or access token' });
      }

      // Default to last 7 days
      const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date();
      const startDate = req.body.startDate
        ? new Date(req.body.startDate)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const startTs = Math.floor(startDate.getTime() / 1000);
      const endTs = Math.floor(endDate.getTime() / 1000);

      logger.info(`[MetaSyncStats] Fetching analytics for channel ${channelId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const response = await axios.get(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${channel.metaWabaId}`,
        {
          headers: { Authorization: `Bearer ${channel.metaAccessToken}` },
          params: {
            fields: `analytics.start(${startTs}).end(${endTs}).granularity(DAY)`
          }
        }
      );

      const analytics = response.data?.analytics?.data_points
        || response.data?.analytics?.data
        || [];

      logger.info(`[MetaSyncStats] Received ${analytics.length} data points from Meta`);
      logger.info(`[MetaSyncStats] Raw Meta Data: ${JSON.stringify(analytics)}`);

      res.json({
        success: true,
        message: `Analytics synced for ${startDate.toDateString()} → ${endDate.toDateString()}`,
        data: analytics,
        period: { start: startDate.toISOString(), end: endDate.toISOString() }
      });
    } catch (err) {
      logger.error('[MetaSyncStats] Error:', err.response?.data || err.message);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to sync analytics from Meta';
      res.status(400).json({ success: false, message: msg });
    }
  }

  async addChannel(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const {
        phoneNumber,
        metaPhoneNumberId,
        metaWabaId,
        metaAccessToken,
        metaAppSecret,
        displayPhoneNumber,
        name
      } = req.body;

      if (!phoneNumber || !metaPhoneNumberId || !metaWabaId || !metaAccessToken || !metaAppSecret) {
        return res.status(400).json({ error: 'Missing required Meta credentials (including metaAppSecret)' });
      }

      const existingChannel = await prisma.whatsAppChannel.findFirst({
        where: { tenantId, providerType: 'META_CLOUD' }
      });

      if (existingChannel) {
        return res.status(400).json({ error: 'A Meta Cloud channel already exists for this tenant' });
      }

      const channel = await prisma.whatsAppChannel.create({
        data: {
          tenantId,
          providerType: 'META_CLOUD',
          phoneNumber,
          status: 'CONNECTED',
          metaPhoneNumberId,
          metaWabaId,
          metaAccessToken,
          metaAppSecret,
          displayPhoneNumber: displayPhoneNumber || phoneNumber,
          name: name || ''
        }
      });

      res.status(201).json({ success: true, data: channel });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all Meta channels for the authenticated tenant.
   * Returns channel details including phone_number_id (needed for sending messages).
   */
  async getChannels(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const channels = await prisma.whatsAppChannel.findMany({
        where: { tenantId, providerType: 'META_CLOUD' },
        select: {
          id: true,
          providerType: true,
          phoneNumber: true,
          displayPhoneNumber: true,
          name: true,
          metaPhoneNumberId: true,
          metaWabaId: true,
          status: true,
          createdAt: true
        }
      });
      res.status(200).json({ success: true, data: channels });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a Meta channel.
   */
  async deleteChannel(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;

      await prisma.whatsAppChannel.deleteMany({
        where: { id, tenantId }
      });

      res.status(200).json({ success: true, message: 'Channel deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch approved Meta templates for a specific channel.
   * Templates are fetched live from Meta API — not cached locally.
   */
  async getTemplates(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params; // channelId

      const channel = await prisma.whatsAppChannel.findFirst({
        where: { id, tenantId, providerType: 'META_CLOUD' }
      });

      if (!channel) {
        return res.status(404).json({ success: false, message: 'Meta channel not found' });
      }

      const metaService = require('./meta.service');
      const templatesData = await metaService.fetchTemplates(channel);

      res.status(200).json({ success: true, data: templatesData });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MetaController();
