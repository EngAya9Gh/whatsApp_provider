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

  /**
   * Dispatch a client sync event to the CRM when an outgoing message is sent to a new number
   */
  async dispatchClientSync(tenantId, phone, name = 'WhatsApp Lead') {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { webhookUrl: true, webhookEvents: true }
      });

      if (!tenant || !tenant.webhookUrl) return;

      const payload = {
        event: 'client.sync',
        data: {
          phone: phone,
          name: name
        }
      };
      
      let events = tenant.webhookEvents;
      if (typeof events === 'string') {
        try { events = JSON.parse(events); } catch (e) { events = {}; }
      }
      events = events || {};

      const headers = { 'Content-Type': 'application/json' };
      if (events.headers) {
        if (events.headers.key1 && events.headers.value1) {
          headers[events.headers.key1] = events.headers.value1;
        }
      }

      logger.info(`[WebhookService] Sending client sync to ${tenant.webhookUrl} with headers: ${JSON.stringify(headers)}`);

      axios.post(tenant.webhookUrl, payload, { headers, timeout: 5000 }).catch(err => {
        logger.warn(`[WebhookService] Failed to send client sync webhook to ${tenant.webhookUrl}: ${err.message}`);
      });
    } catch (err) {
      logger.error(`[WebhookService] Error dispatching client sync: ${err.message}`);
    }
  }
  /**
   * Sync a contact with the CRM (Find or Create)
   */
  async syncCrmContact(tenantId, phone, name = 'WhatsApp Lead') {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { crmBaseUrl: true, crmApiToken: true }
      });

      if (!tenant || !tenant.crmBaseUrl) return null;

      const payload = { phone, name };
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tenant.crmApiToken || ''}`
      };

      const url = `${tenant.crmBaseUrl.replace(/\/$/, '')}/api/v1/integrations/provider/sync-contact`;

      const response = await axios.post(url, payload, { headers, timeout: 5000 });
      return response.data; // { is_new: boolean, client_id: number }

    } catch (err) {
      logger.error(`[WebhookService] Error syncing contact with CRM: ${err.message}`);
      return null;
    }
  }

  /**
   * Sync a ticket state with the CRM
   * data: { phone, name, thread_id, category_name, status }
   */
  async syncCrmTicket(tenantId, data) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { crmBaseUrl: true, crmApiToken: true }
      });

      if (!tenant || !tenant.crmBaseUrl) return null;

      const payload = {
        event: "ticket.sync",
        data: {
          phone: data.phone,
          name: data.name || "عميل",
          thread_id: data.thread_id,
          category_name: data.category_name || "عام",
          status: data.status // 'open', 'resolved', 'closed'
        }
      };

      const headers = { 
        'Content-Type': 'application/json',
        'X-Webhook-Key': tenant.crmApiToken || ''
      };

      const url = `${tenant.crmBaseUrl.replace(/\/$/, '')}/api/v1/integrations/provider/webhook/whatsapp/${tenantId}`;

      const response = await axios.post(url, payload, { headers, timeout: 5000 });
      return response.data; // Expecting CRM to return ticket data

    } catch (err) {
      logger.error(`[WebhookService] Error syncing CRM ticket: ${err.response?.data?.message || err.message}`);
      return null;
    }
  }
}

module.exports = new WebhookService();
