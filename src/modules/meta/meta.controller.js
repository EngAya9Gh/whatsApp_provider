const logger = require('../../utils/logger');
const axios = require('axios');
const prisma = require('../../config/prisma');
const metrics = require('../../services/metrics');

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'wakeel_meta_secret_1234';
// Secret of the platform's own Meta app (signs webhooks of Embedded Signup channels)
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';
const chatService = require('../chat/chat.service');
const webhookService = require('../webhook/webhook.service');
// Queue-based processing — protects against data loss on server crashes
const { metaWebhookQueue } = require('../../workers/meta.webhook.worker');
const { COEX_FIELDS } = require('./meta.coexistence');
const { AGENT_FIELDS } = require('./meta.agent.inbox');
const crypto = require('crypto');

/**
 * Checks Meta's x-hub-signature-256 header against the raw body. Channels added manually carry the secret
 * of the customer's own Meta app; channels connected through Embedded Signup belong to the platform's app
 * (META_APP_SECRET). Unverifiable → rejected.
 */
function hasValidSignature(req, channel) {
  const appSecret = channel.metaAppSecret || META_APP_SECRET;
  if (!appSecret || !req.rawBody) {
    logger.error(`[MetaWebhook] ❌ Rejected webhook for channel ${channel.id}: no app secret to verify it (set META_APP_SECRET)`);
    return false;
  }
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    logger.error(`[MetaWebhook] Missing signature for channel ${channel.id}`);
    return false;
  }
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex'));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    logger.error(`[MetaWebhook] ❌ Invalid signature for channel ${channel.id}`);
    return false;
  }
  return true;
}

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
   * Instagram (object "instagram", entry.id = Instagram account) and Messenger (object "page", entry.id =
   * Facebook Page) messages of connected channels. They are signed with the platform app's secret.
   */
  async _handleSocial(req, body) {
    if (!hasValidSignature(req, { id: `${body.object} webhook` })) return;
    const providerType = body.object === 'instagram' ? 'INSTAGRAM' : 'MESSENGER';
    for (const entry of body.entry || []) {
      if (!entry?.messaging?.length) continue;
      const channel = await prisma.whatsAppChannel.findFirst({
        where: { providerType, externalId: String(entry.id), status: 'CONNECTED' },
        select: { id: true, tenantId: true }
      }).catch(() => null);
      if (!channel) {
        logger.warn(`[MetaWebhook] ⚠️ ${providerType} message for an unknown account ${entry.id}`);
        continue;
      }
      await metaWebhookQueue.add('social-event', {
        type: 'SOCIAL_EVENT', channelId: channel.id, tenantId: channel.tenantId, payload: { object: body.object, entry }
      }).catch(e => logger.error(`[MetaWebhook] Failed to queue ${providerType} event: ${e.message}`));
    }
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
    const receivedAt = Date.now();
    try {
      await this._routeWebhook(req, receivedAt);
    } finally {
      metrics.record('webhook.handle', Date.now() - receivedAt);
    }
  }

  /** Finds the channel of each event in the webhook body and queues it; receivedAt travels with the job */
  async _routeWebhook(req, receivedAt) {
    const body = req.body;
    // Instagram and Messenger channels (Messenger Platform) come on the same webhook
    if (body && (body.object === 'page' || body.object === 'instagram')) return this._handleSocial(req, body);
    if (!body || body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (!change.value) continue;
        const field = change.field || 'messages';

        // account_update carries no phone number: find our numbers by their WhatsApp account
        if (field === 'account_update') {
          const wabaId = change.value.waba_info?.waba_id || entry.id;
          const channel = await prisma.whatsAppChannel.findFirst({ where: { metaWabaId: String(wabaId), providerType: 'META_CLOUD' } }).catch(() => null);
          if (!channel) continue;
          if (!hasValidSignature(req, channel)) return;
          logger.info(`[MetaWebhook] 🏷️ account_update ${change.value.event} for WABA ${wabaId}`);
          await metaWebhookQueue.add('account-update', {
            type: 'ACCOUNT_UPDATE', channelId: channel.id, tenantId: channel.tenantId,
            payload: { wabaId: String(wabaId), value: change.value }
          }).catch(e => logger.error(`[MetaWebhook] Failed to queue account_update: ${e.message}`));
          continue;
        }

        const metadata = change.value.metadata;
        // messaging_handovers names the number as recipient, the other fields in metadata
        const metaPhoneNumberId = metadata?.phone_number_id || change.value.recipient?.phone_number_id;

        logger.info(`[MetaWebhook] 🔍 Looking for channel with phone_number_id: "${metaPhoneNumberId}"`);
        const channel = await prisma.whatsAppChannel.findFirst({
          where: { 
            metaPhoneNumberId, 
            status: { in: ['CONNECTED', 'ACTIVE'] } 
          }
        }).catch(() => null);

        if (!channel) {
          logger.warn(`[MetaWebhook] ⚠️ Unknown phone_number_id: "${metaPhoneNumberId}"`);
          continue;
        }
        logger.info(`[MetaWebhook] ✅ Found channel: ${channel.id} for phone_number_id: ${metaPhoneNumberId}`);

        // --- HMAC Signature Verification (Per-Channel) --- an unverifiable request stops here
        if (!hasValidSignature(req, channel)) return;

        // ─────────────────────────────────────────────────────────────
        // 🔒 Queue-based processing — events are stored in Redis (BullMQ)
        //    and retried up to 5 times with exponential backoff on failure.
        //    This guarantees ZERO data loss even if the server crashes.
        // ─────────────────────────────────────────────────────────────

        // Coexistence numbers (also on the WhatsApp Business app): app-sent messages, old chats, app contacts
        if (COEX_FIELDS.includes(field)) {
          logger.info(`[MetaWebhook] 📱 Queueing ${field} for channel ${channel.id}`);
          await metaWebhookQueue.add('coex-event', {
            type: 'COEX_EVENT', channelId: channel.id, tenantId: channel.tenantId,
            payload: { field, value: change.value }
          }).catch(e => logger.error(`[MetaWebhook] Failed to queue ${field}: ${e.message}`));
          continue;
        }
        // Meta Business Agent: read-only copies of the conversations it answers, and its handovers to the team
        if (AGENT_FIELDS.includes(field)) {
          logger.info(`[MetaWebhook] 🤖 Queueing ${field} for channel ${channel.id}`);
          await metaWebhookQueue.add('meta-ai-event', {
            type: 'META_AI_EVENT', channelId: channel.id, tenantId: channel.tenantId,
            payload: { field, value: change.value }
          }).catch(e => logger.error(`[MetaWebhook] Failed to queue ${field}: ${e.message}`));
          continue;
        }
        // Only the "messages" field carries customer messages and delivery statuses. (Old media from a
        // history sync also arrives as value.messages, under the "history" field handled above.)
        if (field !== 'messages') continue;

        // 1. INCOMING MESSAGES → Queue
        if (change.value.messages) {
          const contacts = change.value.contacts || [];
          for (const msg of change.value.messages) {
            logger.info(`[MetaWebhook] 📨 Queueing message from: ${msg.from} | type: ${msg.type} | id: ${msg.id}`);
            await metaWebhookQueue.add('incoming-message', {
              type: 'INCOMING_MESSAGE',
              channelId: channel.id,
              tenantId: channel.tenantId,
              receivedAt,
              payload: { msg, contacts, channel: { id: channel.id } }
            }, msg.id ? { jobId: `in-${String(msg.id).replace(/:/g, '_')}` } : undefined).catch(e => logger.error(`[MetaWebhook] Failed to queue message from ${msg.from}: ${e.message}`));
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
              receivedAt,
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

      logger.info(`[MetaSyncStats] Fetching analytics for channel ${channelId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const { fetchWabaAnalytics } = require('./meta.analytics');
      const analytics = await fetchWabaAnalytics(channel, startDate, endDate);
      logger.info(`[MetaSyncStats] Meta reports ${analytics.sent} sent / ${analytics.delivered} delivered`);

      res.json({
        success: true,
        message: `Analytics synced for ${startDate.toDateString()} → ${endDate.toDateString()}`,
        data: analytics.daily,
        totals: { sent: analytics.sent, delivered: analytics.delivered },
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
          autoCreateTickets: true,
          isCoexistence: true,
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
