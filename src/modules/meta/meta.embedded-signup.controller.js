const axios = require('axios');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');
const { metaErrorText } = require('./meta.errors');
const coexistence = require('./meta.coexistence');

const META_FB_APP_ID = process.env.META_FB_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION || 'v21.0'}`;

/**
 * The business number's two-step verification PIN, set when we register it on Cloud API.
 * META_REGISTRATION_PIN (6 digits) wins; otherwise it is derived from JWT_SECRET and the
 * phone number ID, so it can be recomputed later without being stored.
 */
const registrationPin = (phoneNumberId) => {
  const fixed = process.env.META_REGISTRATION_PIN;
  if (/^\d{6}$/.test(fixed || '')) return fixed;
  // One different PIN per number; META_PIN_SECRET lets you rotate JWT_SECRET without changing PINs
  const secret = process.env.META_PIN_SECRET || process.env.JWT_SECRET || 'wakeel';
  const hmac = crypto.createHmac('sha256', secret).update(String(phoneNumberId)).digest();
  return String(hmac.readUInt32BE(0) % 1000000).padStart(6, '0');
};

/**
 * GET /api/v1/meta/embedded-signup/config
 * The public Embedded Signup values (app ID and configuration ID), read from the server's .env
 * so changing them needs no dashboard rebuild. Never returns the app secret.
 */
exports.getConfig = (req, res) => {
  res.json({
    success: true,
    data: {
      appId: process.env.META_FB_APP_ID || '',
      configId: process.env.META_FB_CONFIG_ID || ''
    }
  });
};

const metaError = (err) => err.response?.data?.error?.message || err.message;

/**
 * POST /api/v1/meta/embedded-signup/exchange
 *
 * Runs Meta's Tech Provider onboarding after the Embedded Signup popup:
 *   1. exchange the one-time code (30s TTL) for the business token
 *   2. save or update the channel
 *   3. subscribe our app to the WABA's webhooks
 *   4. register the number on Cloud API (skipped for Coexistence numbers, which stay on the
 *      WhatsApp Business app)
 * The customer still has to add a payment method in WhatsApp Manager.
 *
 * Body: { code, phone_number_id, waba_id, signup_event? }
 */
exports.exchangeCode = async (req, res, next) => {
  try {
    const { code, waba_id, signup_event, history_months } = req.body;
    let { phone_number_id } = req.body;
    const tenantId = req.tenant.id;
    const isCoexistence = signup_event === coexistence.COEX_EVENT;
    const warnings = [];

    // A Coexistence finish (WhatsApp Business app number) carries only the account ID: the number is looked up below
    if (!code || !waba_id || (!phone_number_id && !isCoexistence)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, phone_number_id, waba_id'
      });
    }

    // Step 1: Exchange code for the business access token
    logger.info('[EmbeddedSignup] Exchanging code for access token...');
    let accessToken;
    try {
      const tokenRes = await axios.get(`${GRAPH}/oauth/access_token`, {
        params: {
          client_id: META_FB_APP_ID,
          client_secret: META_APP_SECRET,
          code
        }
      });
      accessToken = tokenRes.data.access_token;
      logger.info('[EmbeddedSignup] Got access token ✅');
    } catch (err) {
      logger.error('[EmbeddedSignup] Failed to exchange code:', err.response?.data || err.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to exchange code for access token. The code may have expired (30s TTL).',
        detail: err.response?.data
      });
    }

    if (!phone_number_id) {
      try {
        phone_number_id = await coexistence.findAppNumber(waba_id, accessToken);
      } catch (err) {
        logger.error(`[EmbeddedSignup] Could not list the numbers of WABA ${waba_id}: ${metaErrorText(err)}`);
      }
      if (!phone_number_id) {
        return res.status(400).json({
          success: false,
          message: 'Connected to Meta, but the WhatsApp Business app number could not be found in the account. Press "Check connection" in a minute or connect again.'
        });
      }
    }

    // Step 2: Phone number details
    logger.info(`[EmbeddedSignup] Fetching phone number details for ID: ${phone_number_id}`);
    let phoneNumber = phone_number_id; // fallback
    try {
      const phoneRes = await axios.get(`${GRAPH}/${phone_number_id}`, {
        params: {
          fields: 'display_phone_number,verified_name,quality_rating,status',
          access_token: accessToken
        }
      });
      phoneNumber = phoneRes.data.display_phone_number
        ? phoneRes.data.display_phone_number.replace(/\D/g, '') // strip non-digits
        : phone_number_id;
      logger.info(`[EmbeddedSignup] Phone number: ${phoneNumber} ✅`);
    } catch (err) {
      // The new token cannot read the number it was just given: typically a Meta TEST number that belongs to
      // another app. The channel is still saved (the WABA subscription below may work), but say so now
      // instead of letting the first send fail with a cryptic error.
      logger.warn(`[EmbeddedSignup] Could not read phone ${phone_number_id}: ${metaErrorText(err)}`);
      warnings.push(`The selected number could not be read with the new access token (${metaErrorText(err)}). If it is a Meta test number, it may belong to another app.`);
    }

    // Step 3: Save or update the channel. A reconnect (e.g. through a new Meta app) refreshes the
    // token and WABA, then still runs the webhook subscription and registration below.
    const existing = await prisma.whatsAppChannel.findFirst({
      where: { tenantId, metaPhoneNumberId: phone_number_id }
    });

    // Each Coexistence connection opens a new 24h window for the one-time contact / history syncs
    const coexData = isCoexistence
      ? { isCoexistence: true, coexOnboardedAt: new Date(), coexHistoryMonths: coexistence.normalizeHistoryMonths(history_months), coexSync: coexistence.initialCoexSync() }
      : { isCoexistence: false };

    const channel = existing
      ? await prisma.whatsAppChannel.update({
          where: { id: existing.id },
          data: { metaAccessToken: accessToken, metaWabaId: waba_id, status: 'ACTIVE', ...coexData }
        })
      : await prisma.whatsAppChannel.create({
          data: {
            tenantId,
            providerType: 'META_CLOUD',
            phoneNumber,
            metaPhoneNumberId: phone_number_id,
            metaWabaId: waba_id,
            metaAccessToken: accessToken,
            status: 'ACTIVE',
            ...coexData
          }
        });

    logger.info(`[EmbeddedSignup] ✅ Channel ${existing ? 'updated' : 'created'}: ${channel.id} for tenant ${tenantId}`);

    // Step 4: Subscribe the WABA to our app's webhooks
    try {
      await axios.post(`${GRAPH}/${waba_id}/subscribed_apps`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      logger.info(`[EmbeddedSignup] 🔗 Subscribed WABA ${waba_id} to app webhooks`);
    } catch (subErr) {
      logger.error(`[EmbeddedSignup] ⚠️ Failed to subscribe WABA ${waba_id} to webhooks: ${metaError(subErr)}`);
      warnings.push(`Webhook subscription failed: ${metaError(subErr)}`);
    }

    // Step 5: Register the number on Cloud API so it can send messages
    if (!isCoexistence) {
      try {
        await axios.post(`${GRAPH}/${phone_number_id}/register`,
          { messaging_product: 'whatsapp', pin: registrationPin(phone_number_id) },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        logger.info(`[EmbeddedSignup] 📱 Registered ${phone_number_id} on Cloud API`);
      } catch (regErr) {
        // e.g. already registered with a different two-step PIN: reset it in WhatsApp Manager
        logger.error(`[EmbeddedSignup] ⚠️ Failed to register ${phone_number_id}: ${metaError(regErr)}`);
        warnings.push(`Number registration failed: ${metaError(regErr)}`);
      }
    }

    // Step 6 (Coexistence): ask now for the app's contacts and chat history. Meta allows this once, within
    // 24 hours; what it does not accept yet is retried in the background.
    if (isCoexistence) {
      const sync = await coexistence.requestSync(channel.id);
      if (sync.retryable) {
        coexistence.scheduleSyncRetry(channel.id);
        warnings.push('Meta did not accept the contacts / chat history request yet; it is retried automatically in the next minutes.');
      }
    }

    // Never send the token or app secret back to the browser
    const { metaAccessToken: _token, metaAppSecret: _secret, ...safeChannel } = channel;

    return res.status(existing ? 200 : 201).json({
      success: true,
      message: existing
        ? 'Channel already existed — reconnected with a fresh access token.'
        : 'WhatsApp channel connected successfully via Embedded Signup!',
      channel: safeChannel,
      warnings
    });

  } catch (err) {
    logger.error('[EmbeddedSignup] Unexpected error:', err);
    next(err);
  }
};
