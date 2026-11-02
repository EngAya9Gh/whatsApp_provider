/**
 * express.json() "verify" hook: keeps the exact bytes of Meta webhooks, because their
 * HMAC signature (x-hub-signature-256) is computed over the raw body.
 */
const captureWebhookRawBody = (req, res, buf) => {
  if (req.originalUrl.startsWith('/api/v1/meta/webhook')) req.rawBody = buf;
};

module.exports = { captureWebhookRawBody };
