// TikTok channels.
//   Public:    POST /api/v1/tiktok/webhook — TikTok's Business Messaging events, checked by their signature
//   Dashboard: GET /config, POST /connect/start (→ TikTok's page), POST /connect/finish (back with the code)
// Listing and disconnecting are on /api/v1/social like Instagram and Messenger (one page in the dashboard).
const express = require('express');
const logger = require('../../utils/logger');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');
const api = require('./tiktok.api');
const tiktokService = require('./tiktok.service');

const router = express.Router();

router.post('/webhook', async (req, res) => {
  if (!api.validSignature(req.headers['tiktok-signature'], req.rawBody, req.body)) {
    logger.warn(`[TikTok] Webhook with a missing or wrong signature (log id ${req.headers['x-tt-logid'] || '-'})`);
    return res.sendStatus(401);
  }
  res.sendStatus(200);
  if (req.body?.event !== 'im_receive_msg') return;
  const { metaWebhookQueue } = require('../../workers/meta.webhook.worker');
  await metaWebhookQueue.add('tiktok-event', { type: 'TIKTOK_EVENT', payload: req.body })
    .catch(e => logger.error(`[TikTok] Failed to queue a message: ${e.message}`));
});

const handle = (fn) => async (req, res, next) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: { message: error.message, code: error.code } });
    next(error);
  }
};
const dashboard = [authMiddleware, requireFeature('LIVE_CHAT'), requirePermission('can_manage_settings')];

router.get('/config', dashboard, handle(() => tiktokService.config()));
router.post('/connect/start', dashboard, handle(req => tiktokService.connectUrl(req.tenant.id)));
router.post('/connect/finish', dashboard, handle(req => tiktokService.finishConnect(req.tenant.id, { code: req.body?.code, state: req.body?.state })));

module.exports = router;
