const express = require('express');
const crypto = require('crypto');
const metaController = require('./meta.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger');

const META_APP_SECRET = process.env.META_APP_SECRET;
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'wakeel_meta_secret_1234';

/**
 * We capture the raw body buffer here so we can verify the HMAC signature
 * asynchronously in the controller after looking up the specific channel's secret.
 */
function captureRawBody(req, res, buf) {
  req.rawBody = buf;
}

/**
 * Check if Meta Cloud API feature is enabled for this tenant.
 */
const requireMetaEnabled = (req, res, next) => {
  const allowed = req.tenant && (
    req.tenant.metaEnabled === true ||
    (req.tenant.customFeatures && req.tenant.customFeatures.META_API === true)
  );
  if (allowed) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Feature requires Meta Cloud to be enabled by Admin'
    });
  }
};

const router = express.Router();

// ────────────────────────────────────────────────────────────────────────────
// Public Webhook Routes — called by Meta servers (not by our dashboard)
// ────────────────────────────────────────────────────────────────────────────

// GET: Meta verification handshake (hub.mode + hub.verify_token + hub.challenge)
router.get('/webhook', metaController.verifyWebhook);

// POST: Incoming events (messages, statuses, etc.)
router.post(
  '/webhook',
  express.json({ verify: captureRawBody }),
  metaController.handleWebhook.bind(metaController)
);

// ────────────────────────────────────────────────────────────────────────────
// Protected Channel Routes — called by our dashboard (requires JWT auth)
// ────────────────────────────────────────────────────────────────────────────
router.use(authMiddleware);
router.use(requireMetaEnabled);

router.post('/channel', metaController.addChannel.bind(metaController));
router.get('/channels', metaController.getChannels.bind(metaController));
router.delete('/channel/:id', metaController.deleteChannel.bind(metaController));
router.get('/channel/:id/templates', metaController.getTemplates.bind(metaController));

// ────────────────────────────────────────────────────────────────────────────
// Meta Template Management — Create / Read / Delete templates via Meta API
// ────────────────────────────────────────────────────────────────────────────
const metaTemplateController = require('./meta.template.controller');

// List all templates for a channel's WABA
router.get('/channel/:channelId/meta-templates', metaTemplateController.listTemplates.bind(metaTemplateController));

// Get a single template by Meta template ID
router.get('/channel/:channelId/meta-templates/:templateId/detail', metaTemplateController.getTemplateDetail.bind(metaTemplateController));

// Create a new template (submitted to Meta for review)
router.post('/channel/:channelId/meta-templates', metaTemplateController.createTemplate.bind(metaTemplateController));

// Update template components
router.put('/channel/:channelId/meta-templates/:templateId', metaTemplateController.updateTemplate.bind(metaTemplateController));

// Delete template by name (Meta uses name, not ID for deletion)
router.delete('/channel/:channelId/meta-templates/:templateName', metaTemplateController.deleteTemplate.bind(metaTemplateController));

module.exports = router;
