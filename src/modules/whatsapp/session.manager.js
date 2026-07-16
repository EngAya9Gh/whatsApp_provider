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
