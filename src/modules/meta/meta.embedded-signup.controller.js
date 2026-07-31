const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');

const META_FB_APP_ID = process.env.META_FB_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * POST /api/v1/meta/embedded-signup/exchange
 *
 * Receives the one-time code from the Embedded Signup popup,
 * exchanges it for a User Access Token via Meta Graph API,
 * then fetches phone number details and saves the channel.
 *
 * Body: { code, phone_number_id, waba_id }
 */
exports.exchangeCode = async (req, res, next) => {
  try {
    const { code, phone_number_id, waba_id } = req.body;
    const tenantId = req.tenant.id;

    if (!code || !phone_number_id || !waba_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, phone_number_id, waba_id'
      });
    }

    // Step 1: Exchange code for User Access Token
    logger.info('[EmbeddedSignup] Exchanging code for access token...');
    let userAccessToken;
    try {
      const tokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
        params: {
          client_id: META_FB_APP_ID,
          client_secret: META_APP_SECRET,
          code: code,
          redirect_uri: '' // empty for server-side exchange
        }
      });
      userAccessToken = tokenRes.data.access_token;
      logger.info('[EmbeddedSignup] Got user access token ✅');
    } catch (err) {
      logger.error('[EmbeddedSignup] Failed to exchange code:', err.response?.data || err.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to exchange code for access token. The code may have expired (30s TTL).',
        detail: err.response?.data
      });
    }

    // Step 2: Get phone number details from Meta
    logger.info(`[EmbeddedSignup] Fetching phone number details for ID: ${phone_number_id}`);
    let phoneNumber = phone_number_id; // fallback
    try {
      const phoneRes = await axios.get(`https://graph.facebook.com/v22.0/${phone_number_id}`, {
        params: {
          fields: 'display_phone_number,verified_name,quality_rating,status',
          access_token: userAccessToken
        }
      });
      phoneNumber = phoneRes.data.display_phone_number
        ? phoneRes.data.display_phone_number.replace(/\D/g, '') // strip non-digits
        : phone_number_id;
      logger.info(`[EmbeddedSignup] Phone number: ${phoneNumber} ✅`);
    } catch (err) {
      logger.warn('[EmbeddedSignup] Could not fetch phone details, using ID as fallback', err.response?.data?.error?.message);
    }

    // Step 3: Check if channel already exists
    const existing = await prisma.whatsAppChannel.findFirst({
      where: {
        tenantId,
        metaPhoneNumberId: phone_number_id
      }
    });

    if (existing) {
      // Update the access token if channel already exists
      await prisma.whatsAppChannel.update({
        where: { id: existing.id },
        data: { metaAccessToken: userAccessToken }
      });
      return res.json({
        success: true,
        message: 'Channel already exists — access token updated.',
        channel: existing
      });
    }

    // Step 4: Save the new channel
    const channel = await prisma.whatsAppChannel.create({
      data: {
        tenantId,
        providerType: 'META_CLOUD',
        phoneNumber,
        metaPhoneNumberId: phone_number_id,
        metaWabaId: waba_id,
        metaAccessToken: userAccessToken,
        status: 'ACTIVE'
      }
    });

    logger.info(`[EmbeddedSignup] ✅ Channel created: ${channel.id} for tenant ${tenantId}`);

    return res.status(201).json({
      success: true,
      message: 'WhatsApp channel connected successfully via Embedded Signup!',
      channel
    });

  } catch (err) {
    logger.error('[EmbeddedSignup] Unexpected error:', err);
    next(err);
  }
};
