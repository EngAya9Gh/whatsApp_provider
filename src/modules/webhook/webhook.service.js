const axios = require('axios');
const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WebhookService {
  /**
   * Load tenant webhook config and build unified auth headers.
   * Uses the custom header configured in Developer Tools (key1/value1).
   * Falls back to X-Webhook-Key = crmApiToken if no custom header is set.
   */
  async _getWebhookConfig(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { webhookUrl: true, webhookEvents: true, crmApiToken: true }
    });
    if (!tenant || !tenant.webhookUrl) return null;

    let events = tenant.webhookEvents;
    if (typeof events === 'string') {
      try { events = JSON.parse(events); } catch (e) { events = {}; }
    }
    events = events || {};

    const headers = { 'Content-Type': 'application/json' };
    const h = events.headers || {};
    if (h.key1 && h.value1) {
      headers[h.key1.trim()] = String(h.value1).trim();
    } else if (tenant.crmApiToken) {
      headers['X-Webhook-Key'] = tenant.crmApiToken;
    }

    return { url: tenant.webhookUrl, headers, events };
  }

  /**
   * Dispatch an incoming message event to the tenant's webhook
   */
  async dispatchIncomingMessage(tenantId, messagePayload, source = 'META') {
    try {
      const config = await this._getWebhookConfig(tenantId);
      if (!config) return;

      const incomingPref = config.events.incoming || 'ALL'; // 'ALL', 'LIVE_CHAT', 'NONE'
      
      // If the tenant explicitly disabled incoming message webhooks
      if (incomingPref === 'NONE') return;

      // Fire and forget
      axios.post(config.url, messagePayload, { headers: config.headers, timeout: 5000 }).catch(err => {
        logger.warn(`[WebhookService] Failed to send incoming message webhook to ${config.url}: ${err.message}`);
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
      const config = await this._getWebhookConfig(tenantId);
      if (!config) return;

      // If statuses are disabled
      if (config.events.statuses === false) return;

      axios.post(config.url, statusPayload, { headers: config.headers, timeout: 5000 }).catch(err => {
        logger.warn(`[WebhookService] Failed to send status webhook to ${config.url}: ${err.message}`);
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
      const config = await this._getWebhookConfig(tenantId);
      if (!config) return;

      const payload = {
        event: 'client.sync',
        data: {
          phone: phone,
          name: name
        }
      };

      logger.info(`[WebhookService] Sending client sync to ${config.url} (headers: ${Object.keys(config.headers).join(', ')})`);

      axios.post(config.url, payload, { headers: config.headers, timeout: 5000 }).catch(err => {
        logger.warn(`[WebhookService] Failed to send client sync webhook to ${config.url}: ${err.message}`);
      });
    } catch (err) {
      logger.error(`[WebhookService] Error dispatching client sync: ${err.message}`);
    }
  }
  /**
   * Sync a contact with the CRM (Find or Create)
   */
  async syncCrmContact(tenantId, phone, name = 'WhatsApp Lead') {
    // 1. Smart CRM endpoint (returns client_id) if configured
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { crmBaseUrl: true, crmApiToken: true }
      });

      if (tenant && tenant.crmBaseUrl && tenant.crmApiToken) {
        const SYNC_PATH = '/api/v1/integrations/provider/sync-contact';
        const base = tenant.crmBaseUrl.trim().replace(/\/+$/, '');
        // Accept either the base domain or the full sync-contact URL
        const url = base.includes('/integrations/provider/sync-contact') ? base : `${base}${SYNC_PATH}`;

        const response = await axios.post(url, { phone, name }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${tenant.crmApiToken.trim()}`
          },
          timeout: 5000
        });
        logger.info(`[WebhookService] sync-contact ${phone} → ${url} (HTTP ${response.status})`);
        return response.data || { success: true }; // { is_new, client_id }
      }
    } catch (err) {
      logger.error(`[WebhookService] Error syncing contact with CRM (${err.response?.status || ''}) → ${err.config?.url || ''}: ${err.response?.data?.message || err.message}`);
    }

    // 2. Fallback: client.sync via the generic webhook
    try {
      const config = await this._getWebhookConfig(tenantId);
      if (!config) return null;

      const payload = { event: 'client.sync', data: { phone, name } };
      const response = await axios.post(config.url, payload, { headers: config.headers, timeout: 5000 });
      logger.info(`[WebhookService] client.sync ${phone} → ${config.url} (HTTP ${response.status})`);
      return response.data || { success: true };

    } catch (err) {
      logger.error(`[WebhookService] Error sending client.sync (${err.response?.status || ''}): ${err.response?.data?.message || err.message}`);
      return null;
    }
  }

  /**
   * Sync a ticket state with the CRM
   * data: { phone, name, thread_id, category_name, status }
   */
  async syncCrmTicket(tenantId, data) {
    try {
      const config = await this._getWebhookConfig(tenantId);
      if (!config) {
        logger.warn(`[WebhookService] ticket.sync skipped: no Webhook URL configured for tenant ${tenantId}`);
        return null;
      }

      const payload = {
        event: "ticket.sync",
        data: {
          phone: data.phone,
          name: data.name || "عميل",
          thread_id: data.thread_id,
          ticket_id: data.ticket_id,
          ticket_number: data.ticket_number,
          category_name: data.category_name || "عام",
          status: data.status, // 'open', 'resolved', 'closed'
          subject: data.subject,
          description: data.description,
          summary: data.summary,
          rating: data.rating
        }
      };

      const response = await axios.post(config.url, payload, { headers: config.headers, timeout: 10000 });
      logger.info(`[WebhookService] ticket.sync (${data.status}) thread ${data.thread_id} → ${config.url} (HTTP ${response.status}) body: ${JSON.stringify(response.data)}`);
      return response.data; // Expecting CRM to return ticket data

    } catch (err) {
      logger.error(`[WebhookService] Error syncing CRM ticket (${err.response?.status || ''}) → ${err.config?.url || ''}: ${err.response?.data?.message || err.message}`);
      return null;
    }
  }
}

module.exports = new WebhookService();
