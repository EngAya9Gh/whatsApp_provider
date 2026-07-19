const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SESSIONS_DIR = path.join(__dirname, '../../../sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

class SessionManager {
  constructor() {
    this.sessions = new Map(); // tenantId -> sock
    this.io = null; // Socket.io instance for emitting QR codes
  }

  setIo(ioInstance) {
    this.io = ioInstance;
  }

  async createSession(tenantId) {
    if (this.sessions.has(tenantId)) {
      return this.sessions.get(tenantId);
    }

    const sessionPath = path.join(SESSIONS_DIR, tenantId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // Use a quiet logger for Baileys to avoid spam
    const baileysLogger = pino({ level: 'silent' });

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: baileysLogger,
      browser: ['WhatsApp Provider SaaS', 'Chrome', '1.0.0']
    });

    this.sessions.set(tenantId, sock);

    sock.ev.on('creds.update', saveCreds);

    // Listen for incoming messages (button replies, list replies, etc.)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const senderPhone = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';

        // Button Reply
        const btnReply = msg.message?.buttonsResponseMessage;
        if (btnReply) {
          logger.info(`[Button Reply] Tenant ${tenantId} | Phone: ${senderPhone} | Button: ${btnReply.selectedDisplayText}`);
          try {
            // Find matching campaign target
            const target = await prisma.campaignTarget.findFirst({
              where: { phone: senderPhone, campaign: { tenantId } },
              include: { campaign: true },
              orderBy: { campaign: { createdAt: 'desc' } }
            });
            if (target) {
              await prisma.buttonInteraction.create({
                data: {
                  campaignId: target.campaignId,
                  campaignTargetId: target.id,
                  tenantId,
                  phone: senderPhone,
                  buttonId: btnReply.selectedButtonId || '',
                  buttonText: btnReply.selectedDisplayText || '',
                  interactionType: 'BUTTON'
                }
              });
              // Emit to dashboard via Socket.IO
              if (this.io) {
                this.io.to(`tenant_${tenantId}`).emit('button_interaction', {
                  campaignId: target.campaignId,
                  phone: senderPhone,
                  buttonText: btnReply.selectedDisplayText,
                  buttonId: btnReply.selectedButtonId,
                  type: 'BUTTON'
                });
              }
            }
          } catch (err) {
            logger.error(`[Button Reply] Error saving interaction: ${err.message}`);
          }
        }

        // List Reply
        const listReply = msg.message?.listResponseMessage;
        if (listReply) {
          logger.info(`[List Reply] Tenant ${tenantId} | Phone: ${senderPhone} | Item: ${listReply.title}`);
          try {
            const target = await prisma.campaignTarget.findFirst({
              where: { phone: senderPhone, campaign: { tenantId } },
              include: { campaign: true },
              orderBy: { campaign: { createdAt: 'desc' } }
            });
            if (target) {
              await prisma.buttonInteraction.create({
                data: {
                  campaignId: target.campaignId,
                  campaignTargetId: target.id,
                  tenantId,
                  phone: senderPhone,
                  buttonId: listReply.singleSelectReply?.selectedRowId || '',
                  buttonText: listReply.title || '',
                  interactionType: 'LIST'
                }
              });
              if (this.io) {
                this.io.to(`tenant_${tenantId}`).emit('button_interaction', {
                  campaignId: target.campaignId,
                  phone: senderPhone,
                  buttonText: listReply.title,
                  buttonId: listReply.singleSelectReply?.selectedRowId,
                  type: 'LIST'
                });
              }
            }
          } catch (err) {
            logger.error(`[List Reply] Error saving interaction: ${err.message}`);
          }
        }
        
        // Auto Responder (Chatbot) Logic
        try {
          const incomingText = msg.message?.conversation || 
                               msg.message?.extendedTextMessage?.text || 
                               btnReply?.selectedDisplayText || 
                               listReply?.title || '';

          if (incomingText) {
            
            // --- Campaign Text Reply Tracking ---
            try {
              // Find the most recent campaign target for this phone
              const target = await prisma.campaignTarget.findFirst({
                where: { 
                  phone: senderPhone,
                  campaign: { tenantId } 
                },
                include: { campaign: true },
                orderBy: { campaign: { createdAt: 'desc' } }
              });

              if (target && target.campaign) {
                const campaign = target.campaign;
                const now = new Date();
                let isActiveCampaign = true;

                if (campaign.startDate && now < new Date(campaign.startDate)) {
                  isActiveCampaign = false;
                }
                if (campaign.endDate && now > new Date(campaign.endDate)) {
                  isActiveCampaign = false;
                }

                if (isActiveCampaign) {
                  // Ensure we don't log the exact same text reply twice for the same campaign to avoid spam
                  const existingInteraction = await prisma.buttonInteraction.findFirst({
                    where: {
                      campaignId: target.campaignId,
                      phone: senderPhone,
                      buttonText: incomingText,
                      interactionType: 'TEXT_REPLY'
                    }
                  });

                  if (!existingInteraction) {
                    await prisma.buttonInteraction.create({
                      data: {
                        campaignId: target.campaignId,
                        campaignTargetId: target.id,
                        tenantId,
                        phone: senderPhone,
                        buttonId: 'TEXT',
                        buttonText: incomingText,
                        interactionType: 'TEXT_REPLY'
                      }
                    });
                  }
                }
              }
            } catch (trackErr) {
              logger.error(`[Text Reply Tracking] Error: ${trackErr.message}`);
            }
            // --- End Campaign Text Reply Tracking ---

            const rules = await prisma.autoResponder.findMany({
              where: { tenantId, isActive: true }
            });

            for (const rule of rules) {
              const textLower = incomingText.trim().toLowerCase();
              const keywordLower = rule.keyword.trim().toLowerCase();
              let isMatch = false;

              // Validate expiration dates
              const now = new Date();
              if (rule.startDate && now < new Date(rule.startDate)) {
                continue; // Not started yet
              }
              if (rule.endDate && now > new Date(rule.endDate)) {
                continue; // Expired
              }

              if (rule.matchType === 'EXACT' && textLower === keywordLower) {
                isMatch = true;
              } else if (rule.matchType === 'CONTAINS' && textLower.includes(keywordLower)) {
                isMatch = true;
              }

              if (isMatch) {
                logger.info(`[AutoResponder] Matched rule ${rule.id} for ${senderPhone}`);
                
                const payload = {};
                if (rule.responseType === 'TEXT') {
                  payload.text = rule.message || '';
                } else if (rule.responseType === 'IMAGE' || rule.responseType === 'PDF') {
                  const type = rule.responseType === 'IMAGE' ? 'image' : 'document';
                  const fs = require('fs');
                  if (rule.mediaPath && fs.existsSync(rule.mediaPath)) {
                    payload[type] = { url: rule.mediaPath };
                    if (rule.message) payload.caption = rule.message;
                    if (type === 'document') payload.mimetype = rule.mediaMime || 'application/pdf';
                  } else {
                    payload.text = rule.message || 'Media file is missing';
                  }
                } else if (rule.responseType === 'LOCATION') {
                  payload.location = {
                    degreesLatitude: rule.lat || 0,
                    degreesLongitude: rule.lng || 0,
                    name: rule.locationName || '',
                    address: rule.locationAddress || ''
                  };
                }
                
                if (Object.keys(payload).length > 0) {
                  await sock.sendMessage(msg.key.remoteJid, payload);
                }
                break; // Stop after first match
              }
            }
          }
        } catch (err) {
          logger.error(`[AutoResponder] Error: ${err.message}`);
        }
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && this.io) {
        // Emit QR code to the dashboard for this specific tenant
        this.io.to(`tenant_${tenantId}`).emit('qr', { qr });
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error instanceof Boom)
          ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
          : true;

        logger.warn(`Tenant ${tenantId} connection closed. Reconnecting: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          this.sessions.delete(tenantId);
          setTimeout(() => this.createSession(tenantId), 3000);
        } else {
          // Logged out
          logger.info(`Tenant ${tenantId} logged out.`);
          this.sessions.delete(tenantId);
          
          if (fs.existsSync(sessionPath)) {
            const trashPath = `${sessionPath}_trash_${Date.now()}`;
            try {
              fs.renameSync(sessionPath, trashPath);
              setTimeout(() => {
                if (fs.existsSync(trashPath)) {
                  try { fs.rmSync(trashPath, { recursive: true, force: true }); } catch (e) {}
                }
              }, 2000);
            } catch (err) {
              logger.error(`Failed to move session to trash: ${err.message}`);
            }
          }
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { sessionStatus: 'DISCONNECTED', whatsappPhone: null }
          });
          if (this.io) {
            this.io.to(`tenant_${tenantId}`).emit('status', { status: 'DISCONNECTED' });
          }
        }
      } else if (connection === 'open') {
        logger.info(`Tenant ${tenantId} connected successfully!`);
        
        // Extract phone number from the session
        const phone = sock.user.id.split(':')[0];
        
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { sessionStatus: 'CONNECTED', whatsappPhone: phone }
        });

        if (this.io) {
          this.io.to(`tenant_${tenantId}`).emit('status', { status: 'CONNECTED', phone });
        }
      }
    });

    return sock;
  }

  getSession(tenantId) {
    return this.sessions.get(tenantId);
  }

  async deleteSession(tenantId) {
    const sock = this.sessions.get(tenantId);
    if (sock) {
      this.sessions.delete(tenantId);
      try {
        await sock.logout();
      } catch (err) {
        // Ignore logout errors
      }
    }
    
    const sessionPath = path.join(SESSIONS_DIR, tenantId);
    
    // To prevent race conditions if the user immediately reconnects,
    // we rename the folder to a trash folder and delete the trash folder later.
    if (fs.existsSync(sessionPath)) {
      const trashPath = `${sessionPath}_trash_manual_${Date.now()}`;
      try {
        fs.renameSync(sessionPath, trashPath);
        setTimeout(() => {
          if (fs.existsSync(trashPath)) {
            try { fs.rmSync(trashPath, { recursive: true, force: true }); } catch (e) {}
          }
        }, 2000);
      } catch (err) {
        // Fallback to direct deletion if rename fails
        try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
      }
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { sessionStatus: 'DISCONNECTED', whatsappPhone: null }
    });
    
    if (this.io) {
      this.io.to(`tenant_${tenantId}`).emit('status', { status: 'DISCONNECTED' });
    }
  }

  async restoreAllSessions() {
    try {
      const activeTenants = await prisma.tenant.findMany({
        where: { sessionStatus: 'CONNECTED', isActive: true },
        select: { id: true }
      });

      logger.info(`Restoring ${activeTenants.length} active WhatsApp sessions...`);
      for (const tenant of activeTenants) {
        await this.createSession(tenant.id);
      }
    } catch (error) {
      logger.error('Failed to restore sessions', error);
    }
  }
}

// Export as singleton
module.exports = new SessionManager();
