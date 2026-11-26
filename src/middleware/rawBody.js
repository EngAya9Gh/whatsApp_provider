/**
 * express.json() "verify" hook: keeps the exact bytes of Meta and TikTok webhooks, because their
 * HMAC signatures (x-hub-signature-256, TikTok-Signature) are computed over the raw body.
 */
const SIGNED = ['/api/v1/meta/webhook', '/api/v1/tiktok/webhook'];

const captureWebhookRawBody = (req, res, buf) => {
  if (SIGNED.some(path => req.originalUrl.startsWith(path))) req.rawBody = buf;
};

module.exports = { captureWebhookRawBody };
