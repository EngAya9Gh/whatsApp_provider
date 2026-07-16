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
          setTimeout(() => {
            if (fs.existsSync(sessionPath)) {
              try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
            }
          }, 1500);
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
    // Delay deletion slightly to allow Baileys to finish any background writes
    setTimeout(() => {
      if (fs.existsSync(sessionPath)) {
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch (e) {}
      }
    }, 1500);

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
