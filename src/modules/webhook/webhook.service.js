const axios = require('axios');
const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WebhookService {
  /**
   * Dispatch an incoming message event to the tenant's webhook
   */
  async dispatchIncomingMessage(tenantId, messagePayload, source = 'META') {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { webhookUrl: true, webhookEvents: true }
      });

      if (!tenant || !tenant.webhookUrl) return;

      // Parse webhook events preference
      let events = tenant.webhookEvents;
      if (typeof events === 'string') {
        try { events = JSON.parse(events); } catch (e) { events = {}; }
      }
      events = events || {};

      const incomingPref = events.incoming || 'ALL'; // 'ALL', 'LIVE_CHAT', 'NONE'
      
      // If the tenant explicitly disabled incoming message webhooks
      if (incomingPref === 'NONE') return;

      // Prepare headers
      const headers = { 'Content-Type': 'application/json' };
      if (events.headers) {
        if (events.headers.key1 && events.headers.value1) {
          headers[events.headers.key1] = events.headers.value1;
        }
      }

      // Fire and forget
      axios.post(tenant.webhookUrl, messagePayload, { headers, timeout: 5000 }).catch(err => {
        logger.warn(`[WebhookService] Failed to send incoming message webhook to ${tenant.webhookUrl}: ${err.message}`);
      });

    } catch (err) {
      logger.error(`[WebhookService] Error dispatching incoming message: ${err.message}`);
    }
  }

  /**
   * Dispatch a delivery status event to the tenant's webhook
   */
  async dispatchDeliveryStatus(tenantId, statusPayload, source = 'META') {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { webhookUrl: true, webhookEvents: true }
      });

      if (!tenant || !tenant.webhookUrl) return;

      let events = tenant.webhookEvents;
      if (typeof events === 'string') {
        try { events = JSON.parse(events); } catch (e) { events = {}; }
      }
      events = events || {};

      // If statuses are disabled
      if (events.statuses === false) return;

      const headers = { 'Content-Type': 'application/json' };
      if (events.headers) {
        if (events.headers.key1 && events.headers.value1) {
          headers[events.headers.key1] = events.headers.value1;
        }
      }

      axios.post(tenant.webhookUrl, statusPayload, { headers, timeout: 5000 }).catch(err => {
        logger.warn(`[WebhookService] Failed to send status webhook to ${tenant.webhookUrl}: ${err.message}`);
      });

    } catch (err) {
      logger.error(`[WebhookService] Error dispatching delivery status: ${err.message}`);
    }
  }
}

module.exports = new WebhookService();
