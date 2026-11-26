// Connecting a TikTok account: the business clicks "Connect TikTok", approves our app on TikTok's own page
// and comes back to the dashboard with a one-time code; that code becomes the channel's tokens. The access
// token lasts one day and is renewed with the refresh token (one year) right before it is needed.
// The channel is listed, billed and disconnected like Instagram and Messenger (social/social.service.js).
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');
const api = require('./tiktok.api');

const STATE_TTL_S = 15 * 60;
const RENEW_BEFORE_MS = 10 * 60 * 1000;
const httpError = (status, message, code) => Object.assign(new Error(message), { status, code });

// Which Wakeel account started each connect (the state TikTok echoes back), kept 15 minutes
const memory = new Map();
async function keepState(state, tenantId) {
  const { redisClient } = require('../../config/redis');
  if (redisClient.status === 'ready') return redisClient.set(`tiktok:connect:${state}`, tenantId, 'EX', STATE_TTL_S);
  memory.set(state, { tenantId, until: Date.now() + STATE_TTL_S * 1000 });
}
async function takeState(state) {
  const { redisClient } = require('../../config/redis');
  if (redisClient.status === 'ready') {
    const key = `tiktok:connect:${state}`;
    const tenantId = await redisClient.get(key);
    if (tenantId) await redisClient.del(key);
    return tenantId;
  }
  const hit = memory.get(state);
  memory.delete(state);
  return hit && hit.until > Date.now() ? hit.tenantId : null;
}

class TikTokService {
  async config() {
    const price = await require('../channels/channel.billing').priceNow('TIKTOK');
    return { enabled: api.configured(), price, redirectUrl: api.redirectUrl(), webhookUrl: api.webhookUrl() };
  }

  /** Step 1: the TikTok page where the business approves our app */
  async connectUrl(tenantId) {
    if (!api.configured()) throw httpError(503, 'TikTok is not set up on this server yet', 'NOT_CONFIGURED');
    const state = crypto.randomBytes(16).toString('hex');
    await keepState(state, tenantId);
    return { url: api.authorizeUrl(state) };
  }

  /** Step 2: back from TikTok with ?code=…&state=… → the TikTok channel of this account */
  async finishConnect(tenantId, { code, state } = {}) {
    if (!code || !state) throw httpError(400, 'Missing the TikTok authorization code');
    const owner = await takeState(String(state));
    if (!owner || owner !== tenantId) throw httpError(400, 'This TikTok authorization expired or was started from another account. Connect again.', 'SESSION_EXPIRED');

    let t;
    try {
      t = await api.exchangeCode(String(code));
    } catch (err) {
      logger.error(`[TikTok] Authorization failed: ${api.errorText(err)}`);
      throw httpError(400, `TikTok did not accept the authorization: ${api.errorText(err)}`);
    }
    if (!t.openId || !t.accessToken) throw httpError(400, 'TikTok did not return the account');

    let p = {};
    try {
      p = await api.profile(t.accessToken, t.openId);
    } catch (err) {
      logger.warn(`[TikTok] Could not read the profile of ${t.openId}: ${api.errorText(err)}`);
    }
    // Messages of every authorized account reach our webhook once the app is subscribed (idempotent)
    let webhook = true;
    try {
      await api.subscribeWebhook();
    } catch (err) {
      webhook = false;
      logger.error(`[TikTok] Webhook subscription failed: ${api.errorText(err)}`);
    }

    const socialService = require('../social/social.service');
    const name = p.username ? `@${p.username}` : p.displayName || 'TikTok';
    const channel = await socialService._upsert(tenantId, 'TIKTOK', t.openId, {
      name,
      token: t.accessToken,
      settings: { username: p.username, displayName: p.displayName, picture: p.picture, scope: t.scope },
      extra: { refreshToken: t.refreshToken, tokenExpiresAt: t.expiresAt }
    });
    return { id: channel.id, kind: 'TIKTOK', name: channel.name, picture: p.picture || null, webhook };
  }

  /**
   * A valid access token for the channel, renewed (and saved) when it is about to expire. Two sends at the
   * same moment renew it once: the second one reads the token the first one saved.
   */
  async accessTokenOf(channel) {
    const fresh = (c) => c.metaAccessToken && c.tokenExpiresAt && new Date(c.tokenExpiresAt).getTime() - Date.now() > RENEW_BEFORE_MS;
    if (fresh(channel)) return channel.metaAccessToken;
    const { withLock } = require('../../utils/keyLock');
    return withLock(`tiktok:token:${channel.id}`, async () => {
      const current = await prisma.whatsAppChannel.findUnique({ where: { id: channel.id } });
      if (!current) throw httpError(404, 'TikTok channel not found');
      if (fresh(current)) return current.metaAccessToken;
      if (!current.refreshToken) throw httpError(400, 'TikTok is disconnected. Connect the TikTok account again.', 'RECONNECT');
      let t;
      try {
        t = await api.refresh(current.refreshToken);
      } catch (err) {
        logger.error(`[TikTok] Token renewal failed for channel ${channel.id}: ${api.errorText(err)}`);
        throw httpError(400, 'TikTok asks to connect the account again (the authorization expired or was removed).', 'RECONNECT');
      }
      await prisma.whatsAppChannel.update({
        where: { id: channel.id },
        data: { metaAccessToken: t.accessToken, refreshToken: t.refreshToken || current.refreshToken, tokenExpiresAt: t.expiresAt }
      });
      return t.accessToken;
    });
  }
}

module.exports = new TikTokService();
