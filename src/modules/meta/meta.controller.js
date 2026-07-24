const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'wakeel_meta_secret_1234';
const chatService = require('../chat/chat.service');
const webhookService = require('../webhook/webhook.service');

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
    // ✅ Respond 200 immediately — Meta will retry if we don't respond fast enough
    res.sendStatus(200);

    const body = req.body;
    if (!body || body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (!change.value) continue;

        const metadata = change.value.metadata;
        const metaPhoneNumberId = metadata?.phone_number_id;

        // Find the channel this webhook belongs to
        const channel = await prisma.whatsAppChannel.findFirst({
          where: { metaPhoneNumberId, status: 'CONNECTED' }
        }).catch(() => null);

        if (!channel) {
          logger.warn(`[MetaWebhook] Unknown phone_number_id: ${metaPhoneNumberId}`);
          continue;
        }

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
        // 1. INCOMING MESSAGES
        // ─────────────────────────────────────────────────────────────
        if (change.value.messages) {
          const contacts = change.value.contacts || [];

          for (const msg of change.value.messages) {
            const from = msg.from; // sender's WhatsApp phone number
            const contactName = contacts.find(c => c.wa_id === from)?.profile?.name || null;

            // Forward to Live Chat service
            try {
              await chatService.handleIncomingMessage(
                channel.tenantId, channel.id, from, contactName, msg
              );
            } catch (chatError) {
              logger.error('[MetaWebhook] Live chat error', chatError.message);
            }

            // Parse message text/button payload for AutoResponder
            let buttonId = null;
            let buttonText = null;
            let incomingText = null;

            if (msg.type === 'interactive') {
              const interactionType = msg.interactive.type; // button_reply or list_reply

              if (interactionType === 'button_reply') {
                buttonId = msg.interactive.button_reply.id;
                buttonText = msg.interactive.button_reply.title;
              } else if (interactionType === 'list_reply') {
                buttonId = msg.interactive.list_reply.id;
                buttonText = msg.interactive.list_reply.title;
              }

              if (buttonId) {
                const target = await prisma.campaignTarget.findFirst({
                  where: {
                    phone: { contains: from },
                    campaign: { tenantId: channel.tenantId }
                  },
                  orderBy: { id: 'desc' }
                }).catch(() => null);

                await prisma.buttonInteraction.create({
                  data: {
                    tenantId: channel.tenantId,
                    campaignId: target ? target.campaignId : 'UNKNOWN',
                    campaignTargetId: target ? target.id : null,
                    phone: from,
                    buttonId,
                    buttonText,
                    interactionType: 'BUTTON'
                  }
                }).catch(e => logger.error('[MetaWebhook] buttonInteraction create error', e));

                logger.info(`[MetaWebhook] Button interaction: "${buttonText}" from ${from}`);
              }

            } else if (msg.type === 'text') {
              incomingText = msg.text.body;

              // Track text replies for campaigns
              const target = await prisma.campaignTarget.findFirst({
                where: {
                  phone: { contains: from },
                  campaign: { tenantId: channel.tenantId }
                },
                orderBy: { id: 'desc' }
              }).catch(() => null);

              if (target) {
                await prisma.buttonInteraction.create({
                  data: {
                    tenantId: channel.tenantId,
                    campaignId: target.campaignId,
                    campaignTargetId: target.id,
                    phone: from,
                    buttonId: 'TEXT_REPLY',
                    buttonText: incomingText.substring(0, 200),
                    interactionType: 'TEXT'
                  }
                }).catch(e => logger.error('[MetaWebhook] textInteraction create error', e));
              }
            }

            // Auto Responder — match keywords and send replies
            const textForBot = buttonText || incomingText || null;

            if (textForBot) {
              const target = await prisma.campaignTarget.findFirst({
                where: {
                  phone: { contains: from },
                  campaign: { tenantId: channel.tenantId }
                },
                orderBy: { id: 'desc' }
              }).catch(() => null);

              const rules = await prisma.autoResponder.findMany({
                where: {
                  tenantId: channel.tenantId,
                  isActive: true,
                  OR: [
                    { channelId: channel.id },  // rules specific to this Meta channel
                    { channelId: null }          // global rules (no channel filter)
                  ]
                }
              }).catch(() => []);

              // Campaign-specific rules first, then global rules; channel-specific before global
              const applicableRules = rules.filter(rule => {
                if (!rule.campaignId) return true;
                return target && target.campaignId === rule.campaignId;
              }).sort((a, b) => {
                // channel-specific rules before global
                if (a.channelId && !b.channelId) return -1;
                if (!a.channelId && b.channelId) return 1;
                // campaign-specific before global
                if (a.campaignId && !b.campaignId) return -1;
                if (!a.campaignId && b.campaignId) return 1;
                return 0;
              });

              for (const rule of applicableRules) {
                const now = new Date();
                if (rule.startDate && now < new Date(rule.startDate)) continue;
                if (rule.endDate && now > new Date(rule.endDate)) continue;

                const textLower = textForBot.trim().toLowerCase();
                const keywordLower = rule.keyword.trim().toLowerCase();
                let isMatch = false;

                if (rule.matchType === 'EXACT' && textLower === keywordLower) isMatch = true;
                else if (rule.matchType === 'CONTAINS' && textLower.includes(keywordLower)) isMatch = true;
                else if (rule.matchType === 'STARTS_WITH' && textLower.startsWith(keywordLower)) isMatch = true;

                if (isMatch) {
                  try {
                    const metaService = require('./meta.service');
                    const rType = rule.responseType;

                    if (rType === 'META_TEMPLATE' && rule.metaTemplateName) {
                      await metaService.sendTemplateViaApi(channel, from, rule.metaTemplateName, rule.metaTemplateLang || 'ar');
                    } else if ((rType === 'IMAGE' || rType === 'QR_CODE') && rule.mediaUrl) {
                      await metaService.sendImageViaApi(channel, from, rule.mediaUrl, rule.message || '');
                    } else if (rType === 'VIDEO' && rule.mediaUrl) {
                      await metaService.sendVideoViaApi(channel, from, rule.mediaUrl, rule.message || '');
                    } else if (rType === 'DOCUMENT' && rule.mediaUrl) {
                      await metaService.sendDocumentViaApi(channel, from, rule.mediaUrl, 'document', rule.message || '');
                    } else if (rule.message) {
                      // TEXT or fallback
                      await metaService.sendTextViaApi(channel, from, rule.message);
                    }

                    logger.info(`[MetaAutoResponder] Replied to ${from} via ${rType} — Rule: "${rule.keyword}" (Channel: ${channel.id}, Campaign: ${rule.campaignId || 'Global'})`);
                  } catch (e) {
                    logger.error(`[MetaAutoResponder] Failed reply to ${from}`, e.message);
                  }
                  break;
                }
              }
            }

            // --- Dispatch Incoming Message Webhook ---
            try {
              // Create a payload that looks like Meta's
              const payload = {
                object: 'whatsapp_business_account',
                entry: [{
                  id: channel.metaWabaId || 'unknown_waba_id',
                  changes: [{
                    value: {
                      metadata: { phone_number_id: channel.metaPhoneNumberId, display_phone_number: channel.displayPhoneNumber },
                      contacts,
                      messages: [msg]
                    },
                    field: 'messages'
                  }]
                }]
              };
              await webhookService.dispatchIncomingMessage(channel.tenantId, payload, 'META');
            } catch (whError) {
              logger.error('[MetaWebhook] Error dispatching incoming webhook', whError);
            }
          }
        }

        // ─────────────────────────────────────────────────────────────
        // 2. DELIVERY STATUS UPDATES
        // 
        // Per Meta docs (https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples):
        // statuses[].status can be: "sent" | "delivered" | "read" | "failed"
        // statuses[].id      = wamid (Meta message ID)
        // statuses[].errors  = array of error objects when status is "failed"
        // ─────────────────────────────────────────────────────────────
        if (change.value.statuses) {
          for (const statusUpdate of change.value.statuses) {
            const { id: wamid, status, recipient_id, timestamp, errors } = statusUpdate;

            logger.info(`[MetaWebhook] Status: ${status} for wamid ${wamid} (to: ${recipient_id})`);

            try {
              // Update the MessageLog that has this wamid
              const updateData = { deliveryStatus: status };

              // If failed, update status to FAILED and save error
              if (status === 'failed') {
                updateData.status = 'FAILED';
                if (errors && errors.length > 0) {
                  const errDetails = errors.map(e => `[${e.code}] ${e.title}: ${e.message || e.error_data?.details || ''}`).join('; ');
                  updateData.errorMessage = errDetails;
                  logger.error(`[MetaWebhook] Message ${wamid} FAILED: ${errDetails}`);
                }
              }

              // Find and update the log entry by metaMessageId (wamid)
              await prisma.messageLog.updateMany({
                where: { metaMessageId: wamid },
                data: updateData
              });

            } catch (statusError) {
              logger.error(`[MetaWebhook] Status update error for wamid ${wamid}`, statusError.message);
            }

            // --- Dispatch Delivery Status Webhook ---
            try {
              const payload = {
                object: 'whatsapp_business_account',
                entry: [{
                  id: channel.metaWabaId || 'unknown_waba_id',
                  changes: [{
                    value: {
                      metadata: { phone_number_id: channel.metaPhoneNumberId, display_phone_number: channel.displayPhoneNumber },
                      statuses: [statusUpdate]
                    },
                    field: 'messages'
                  }]
                }]
              };
              await webhookService.dispatchDeliveryStatus(channel.tenantId, payload, 'META');
            } catch (whError) {
              logger.error('[MetaWebhook] Error dispatching status webhook', whError);
            }
          }
        }
      }
    }
  }

  /**
   * Add a new Meta Cloud channel for the authenticated tenant.
   * Required body: phoneNumber, metaPhoneNumberId, metaWabaId, metaAccessToken, metaAppSecret
   * Optional body: displayPhoneNumber, name
   */
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
          phoneNumber: true,      // display phone number
          metaPhoneNumberId: true, // Meta's internal phone number ID
          metaWabaId: true,        // WhatsApp Business Account ID
          status: true,
          createdAt: true
          // metaAccessToken is intentionally excluded (sensitive)
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
