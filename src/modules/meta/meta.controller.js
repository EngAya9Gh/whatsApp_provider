const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'wakeel_meta_secret_1234';
const chatService = require('../chat/chat.service');

class MetaController {
  
  async verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        logger.info('Meta Webhook verified successfully');
        return res.status(200).send(challenge);
      } else {
        logger.error('Meta Webhook verification failed: Token mismatch');
        return res.sendStatus(403);
      }
    }
    return res.sendStatus(400);
  }

  async handleWebhook(req, res) {
    // Meta sends 200 OK immediately and handles payload async
    res.sendStatus(200);

    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            // Incoming Message
            const metadata = change.value.metadata;
            const metaPhoneNumberId = metadata.phone_number_id;
            
            // Find which tenant this belongs to
            const channel = await prisma.whatsAppChannel.findFirst({
              where: { metaPhoneNumberId, status: 'CONNECTED' }
            });

            if (!channel) {
              logger.warn(`Received webhook for unknown phone number ID: ${metaPhoneNumberId}`);
              continue;
            }

            const contacts = change.value.contacts || [];

            for (const msg of change.value.messages) {
              const from = msg.from;
              const contactName = contacts.find(c => c.wa_id === from)?.profile?.name || null;
              
              // Process for Live Chat
              try {
                await chatService.handleIncomingMessage(channel.tenantId, channel.id, from, contactName, msg);
              } catch (chatError) {
                logger.error('Error handling live chat message', chatError);
              }
              
              // Handle Interactive Replies (Buttons/Lists)
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
                  // Find the target associated with this phone for any active campaign of this tenant
                  const target = await prisma.campaignTarget.findFirst({
                    where: {
                      phone: { contains: from },
                      campaign: { tenantId: channel.tenantId }
                    },
                    orderBy: { id: 'desc' }
                  });

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
                  });
                  logger.info(`Recorded button interaction: ${buttonText} from ${from}`);
                }
              } else if (msg.type === 'text') {
                incomingText = msg.text.body;
                
                // Track Text replies for Campaigns
                const target = await prisma.campaignTarget.findFirst({
                  where: {
                    phone: { contains: from },
                    campaign: { tenantId: channel.tenantId }
                  },
                  orderBy: { id: 'desc' }
                });

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
                  });
                  logger.info(`Recorded text interaction for Meta campaign from ${from}`);
                }
              }

              // Handle Auto-Responder for Meta (both TEXT and BUTTONS)
              const textForBot = buttonText || null;
              
              if (textForBot) {
                const rules = await prisma.autoResponder.findMany({
                  where: { tenantId: channel.tenantId, isActive: true }
                });

                for (const rule of rules) {
                  const textLower = textForBot.trim().toLowerCase();
                  const keywordLower = rule.keyword.trim().toLowerCase();
                  let isMatch = false;

                  const now = new Date();
                  if (rule.startDate && now < new Date(rule.startDate)) continue;
                  if (rule.endDate && now > new Date(rule.endDate)) continue;

                  if (rule.matchType === 'EXACT' && textLower === keywordLower) isMatch = true;
                  else if (rule.matchType === 'CONTAINS' && textLower.includes(keywordLower)) isMatch = true;

                  if (isMatch) {
                    try {
                      const messageService = require('../message/message.service');
                      
                      if (rule.buttons) {
                        const parsedButtons = typeof rule.buttons === 'string' ? JSON.parse(rule.buttons) : rule.buttons;
                        await messageService.sendButtonsMessage(channel.tenantId, from, rule.response, parsedButtons, null, channel.id);
                      } else if (rule.interactiveType === 'LIST' && rule.listSections) {
                        const parsedSections = typeof rule.listSections === 'string' ? JSON.parse(rule.listSections) : rule.listSections;
                        await messageService.sendListMessage(channel.tenantId, from, 'Options', rule.response, rule.listButtonText || 'Menu', parsedSections, channel.id);
                      } else {
                        await messageService.sendCustomMessage(channel.tenantId, from, rule.response, channel.id);
                      }
                      logger.info(`[AutoResponder] Meta Reply sent to ${from}`);
                      
                      if (!rule.triggerMultiple) break;
                    } catch (e) {
                      logger.error(`[AutoResponder] Meta Failed to send reply to ${from}`, e);
                    }
                  }
                }
              }
            }
          }
          
          if (change.value && change.value.statuses) {
            // Message Delivery Statuses (Sent, Delivered, Read, Failed)
            // Can be implemented later for precise message tracking
          }
        }
      }
    }
  }

  async addChannel(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { phoneNumber, metaPhoneNumberId, metaWabaId, metaAccessToken } = req.body;
      
      const channel = await prisma.whatsAppChannel.create({
        data: {
          tenantId,
          providerType: 'META_CLOUD',
          phoneNumber,
          metaPhoneNumberId,
          metaWabaId,
          metaAccessToken,
          status: 'CONNECTED'
        }
      });
      
      res.status(201).json({ success: true, data: channel });
    } catch (error) {
      next(error);
    }
  }

  async getChannels(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const channels = await prisma.whatsAppChannel.findMany({
        where: { tenantId },
        select: {
          id: true,
          providerType: true,
          phoneNumber: true,
          status: true,
          createdAt: true
        }
      });
      res.status(200).json({ success: true, data: channels });
    } catch (error) {
      next(error);
    }
  }

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
