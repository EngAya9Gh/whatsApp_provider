const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { metaErrorInfo, metaErrorText } = require('./meta.errors');
const coexistence = require('./meta.coexistence');

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION || 'v21.0'}`;

// A failed check, reduced to what the screen needs (never the token, never raw axios internals)
const failed = (e) => {
  const info = metaErrorInfo(e);
  return { ok: false, error: { code: info.code, subcode: info.subcode, message: info.details || info.message } };
};

/**
 * GET /api/v1/meta/channel/:id/health
 *
 * Answers "why does this channel not work?" with three calls made using the channel's own token:
 *   phone   - can the token read the number it is supposed to send from?
 *   webhook - is OUR app subscribed to the WhatsApp account (otherwise incoming messages never arrive)?
 *   token   - is it valid, when does it expire, and which app issued it? (a token from another app than
 *             the platform's cannot use a number that belongs to the platform's app)
 */
exports.getChannelHealth = async (req, res, next) => {
  try {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id, providerType: 'META_CLOUD' }
    });
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });

    const appId = process.env.META_FB_APP_ID || null;
    const appSecret = process.env.META_APP_SECRET || null;
    const auth = { headers: { Authorization: `Bearer ${channel.metaAccessToken}` }, timeout: 15000 };

    const [phoneR, subsR, tokenR] = await Promise.allSettled([
      channel.metaPhoneNumberId
        ? axios.get(`${GRAPH}/${channel.metaPhoneNumberId}`, { ...auth, params: { fields: 'display_phone_number,verified_name,quality_rating,status' } })
        : Promise.reject({ message: 'Phone Number ID is missing' }),
      channel.metaWabaId
        ? axios.get(`${GRAPH}/${channel.metaWabaId}/subscribed_apps`, auth)
        : Promise.reject({ message: 'WhatsApp Business Account ID is missing' }),
      appId && appSecret
        ? axios.get(`${GRAPH}/debug_token`, { timeout: 15000, params: { input_token: channel.metaAccessToken, access_token: `${appId}|${appSecret}` } })
        : Promise.reject({ message: 'META_FB_APP_ID / META_APP_SECRET are not set on the server' })
    ]);

    const phone = phoneR.status === 'fulfilled' ? { ok: true, data: phoneR.value.data } : failed(phoneR.reason);

    let webhook;
    if (subsR.status === 'fulfilled') {
      const apps = (subsR.value.data?.data || []).map(a => a.whatsapp_business_api_data || {}).map(a => ({ id: a.id, name: a.name }));
      webhook = { ok: true, subscribed: !!appId && apps.some(a => a.id === appId), apps };
    } else {
      webhook = failed(subsR.reason);
    }

    let token;
    if (tokenR.status === 'fulfilled') {
      const d = tokenR.value.data?.data || {};
      token = {
        ok: true,
        isValid: d.is_valid !== false,
        appId: d.app_id || null,
        matchesPlatformApp: appId && d.app_id ? d.app_id === appId : null,
        expiresAt: d.expires_at ? new Date(d.expires_at * 1000).toISOString() : null, // null = does not expire
        error: d.error?.message || null
      };
    } else {
      token = failed(tokenR.reason);
    }

    // Numbers that also stay on the WhatsApp Business app: still on the app? contacts / old chats synced?
    const coex = channel.isCoexistence ? await coexistence.coexHealth(channel) : null;

    res.json({
      success: true,
      data: {
        platformAppId: appId,
        channel: { phoneNumberId: channel.metaPhoneNumberId, wabaId: channel.metaWabaId },
        phone, webhook, token, coex
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/meta/channel/:id/subscribe-webhook
 *
 * Subscribes OUR app to the channel's WhatsApp account so incoming messages and delivery statuses
 * arrive. The Embedded Signup popup does this by itself; a channel added by hand (e.g. a Meta test
 * number saved from the admin dashboard) needs this call once.
 */
exports.subscribeWebhook = async (req, res, next) => {
  try {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id, providerType: 'META_CLOUD' }
    });
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    if (!channel.metaWabaId || !channel.metaAccessToken) {
      return res.status(400).json({ success: false, message: 'The channel has no WhatsApp Business Account ID or access token.' });
    }
    try {
      await axios.post(`${GRAPH}/${channel.metaWabaId}/subscribed_apps`, {}, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` }, timeout: 15000
      });
    } catch (e) {
      const info = metaErrorInfo(e);
      return res.status(400).json({ success: false, message: metaErrorText(e), metaCode: info.code, metaSubcode: info.subcode });
    }
    res.json({ success: true, message: 'Webhook subscription is active.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/meta/channel/:id/coex-sync
 *
 * WhatsApp Business app numbers: asks Meta again for the contacts / chat history that were not accepted
 * right after connecting. Meta allows each request once, within 24 hours of connecting.
 */
exports.retryCoexSync = async (req, res, next) => {
  try {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id, providerType: 'META_CLOUD' }
    });
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    if (!channel.isCoexistence) return res.status(400).json({ success: false, message: 'This number was not connected from the WhatsApp Business app.' });
    const result = await coexistence.requestSync(channel.id);
    if (!result.windowOpen && !result.ok) {
      return res.status(400).json({ success: false, message: 'More than 24 hours passed since connecting. Meta only allows this request again after the number is disconnected in the WhatsApp Business app and connected again.' });
    }
    if (result.retryable) coexistence.scheduleSyncRetry(channel.id);
    res.json({ success: result.ok, data: result.results, message: result.ok ? 'Requested.' : 'Meta did not accept the request yet; it is retried automatically.' });
  } catch (err) {
    next(err);
  }
};
