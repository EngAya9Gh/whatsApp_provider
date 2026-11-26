// TikTok API for Business calls used by TikTok channels (Business Messaging). Docs (v1.3):
//   Authorization  → the business opens our app's "TikTok account holder authorization URL" (copied from
//                    My Apps > App Detail > Basic Information into TIKTOK_AUTH_URL) and comes back to the
//                    redirect URL with ?code=…&state=…
//   Authentication → /tt_user/oauth2/token/ (access token: 1 day, refresh token: 1 year, open_id)
//                    /tt_user/oauth2/refresh_token/
//   Profile        → GET /business/get/ (display_name, username, profile_image)
//   Webhooks       → /business/webhook/update/ with event_type DIRECT_MESSAGE, once per app; events are
//                    signed: "TikTok-Signature: t=<seconds>,s=<hex HMAC-SHA256(app secret, `${t}.${body}`)>"
//   Messages       → /business/message/send/ to a conversation_id
// Every response is { code, message, request_id, data }; code 0 is success even when HTTP says 200.
const crypto = require('crypto');
const axios = require('axios');

const BASE = 'https://business-api.tiktok.com/open_api/v1.3';
const appId = () => process.env.TIKTOK_APP_ID;
const appSecret = () => process.env.TIKTOK_APP_SECRET;
const appUrl = () => String(process.env.APP_URL || '').replace(/\/+$/, '');
/** Must be exactly the "TikTok account holder redirect URL" of the app */
const redirectUrl = () => process.env.TIKTOK_REDIRECT_URL || `${appUrl()}/connect-social`;
const webhookUrl = () => `${appUrl()}/api/v1/tiktok/webhook`;
const configured = () => Boolean(appId() && appSecret() && process.env.TIKTOK_AUTH_URL);

class TikTokError extends Error {
  constructor(message, code) {
    super(message);
    this.tiktokCode = code;
  }
}

/** TikTok answers 200 with a non-zero code when it refuses: turn that into an error */
function unwrap(res) {
  const body = res?.data || {};
  if (body.code !== 0) throw new TikTokError(`${body.message || 'TikTok refused the request'} (code ${body.code})`, body.code);
  return body.data || {};
}
const errorText = (err) => (err instanceof TikTokError ? err.message : err.response?.data?.message || err.message);

/** The authorization page for one connect attempt (state ties the answer to the account that started it) */
function authorizeUrl(state) {
  const url = new URL(process.env.TIKTOK_AUTH_URL);
  url.searchParams.set('state', state);
  // Show the permissions again even when the account authorized our app before (else no code comes back)
  url.searchParams.set('disable_auto_auth', '1');
  return url.toString();
}

/** → { accessToken, refreshToken, openId, expiresAt, refreshExpiresAt, scope } */
const tokens = (d, now = Date.now()) => ({
  accessToken: d.access_token,
  refreshToken: d.refresh_token,
  openId: d.open_id ? String(d.open_id) : null,
  expiresAt: new Date(now + (Number(d.expires_in) || 86400) * 1000),
  refreshExpiresAt: d.refresh_token_expires_in ? new Date(now + Number(d.refresh_token_expires_in) * 1000) : null,
  scope: d.scope || ''
});

async function exchangeCode(code) {
  const res = await axios.post(`${BASE}/tt_user/oauth2/token/`, {
    client_id: appId(), client_secret: appSecret(), grant_type: 'authorization_code', auth_code: code, redirect_uri: redirectUrl()
  }, { timeout: 20000 });
  return tokens(unwrap(res));
}

async function refresh(refreshToken) {
  const res = await axios.post(`${BASE}/tt_user/oauth2/refresh_token/`, {
    client_id: appId(), client_secret: appSecret(), grant_type: 'refresh_token', refresh_token: refreshToken
  }, { timeout: 20000 });
  return tokens(unwrap(res));
}

/** Name and picture of the connected TikTok account */
async function profile(accessToken, businessId) {
  const res = await axios.get(`${BASE}/business/get/`, {
    params: { business_id: businessId, fields: JSON.stringify(['username', 'display_name', 'profile_image']) },
    headers: { 'Access-Token': accessToken },
    timeout: 20000
  });
  const d = unwrap(res);
  return { username: d.username || null, displayName: d.display_name || null, picture: d.profile_image || null };
}

/** Business Messaging webhooks are per app: one call covers every account that authorized it */
async function subscribeWebhook() {
  const res = await axios.post(`${BASE}/business/webhook/update/`, {
    app_id: appId(), secret: appSecret(), event_type: 'DIRECT_MESSAGE', callback_url: webhookUrl()
  }, { timeout: 20000 });
  return unwrap(res);
}

/** message: the message fields of /business/message/send/ (message_type, text, template…) */
async function send(accessToken, businessId, conversationId, message) {
  const res = await axios.post(`${BASE}/business/message/send/`, {
    business_id: businessId, recipient_type: 'CONVERSATION', recipient: conversationId, ...message
  }, { headers: { 'Access-Token': accessToken }, timeout: 20000 });
  return unwrap(res);
}

/**
 * The webhook came from TikTok: its signature is our app secret's HMAC of "<t>.<body>", and it is recent.
 * rawBody is the exact request bytes (the signed text); the parsed body is the fallback.
 */
function validSignature(header, rawBody, body, { now = Date.now(), maxAgeS = 300 } = {}) {
  const secret = appSecret();
  if (!secret || !header) return false;
  const parts = Object.fromEntries(String(header).split(',').map(p => p.trim().split('=')).filter(p => p.length === 2));
  const t = Number(parts.t);
  if (!t || !parts.s || Math.abs(now / 1000 - t) > maxAgeS) return false;
  const signed = `${parts.t}.${rawBody ? rawBody.toString('utf8') : JSON.stringify(body)}`;
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(signed).digest('hex'));
  const got = Buffer.from(String(parts.s));
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
}

module.exports = {
  BASE, configured, redirectUrl, webhookUrl, authorizeUrl, exchangeCode, refresh, profile, subscribeWebhook, send,
  validSignature, errorText, TikTokError
};
