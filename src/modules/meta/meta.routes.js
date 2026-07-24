const express = require('express');
const crypto = require('crypto');
const metaController = require('./meta.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const META_APP_SECRET = process.env.META_APP_SECRET;
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'wakeel_meta_secret_1234';

// Multer storage for temporary media uploads (used for Meta header examples)
const tmpStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/meta-tmp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `meta-header-${Date.now()}${ext}`);
  }
});
const uploadTmp = multer({ storage: tmpStorage, limits: { fileSize: 16 * 1024 * 1024 } });

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

// ────────────────────────────────────────────────────────────────────────────
// Upload media to Meta servers and get a media handle for use in header examples
router.post('/channel/:channelId/upload-media', uploadTmp.single('file'), async (req, res, next) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const metaService = require('./meta.service');
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: req.params.channelId, tenantId: req.tenant.id, providerType: 'META_CLOUD' }
    });
    if (!channel) return res.status(404).json({ success: false, message: 'Meta channel not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const mediaId = await metaService.uploadMedia(channel, req.file.path, req.file.mimetype);
    // Build a public URL handle — Meta returns a media_id, not a URL.
    // We store the media_id and tell the template to use it.
    res.json({ success: true, mediaId, mimetype: req.file.mimetype, originalName: req.file.originalname });
  } catch (err) { next(err); }
});

// Meta Auto Responder — Channel-specific auto reply rules
// ────────────────────────────────────────────────────────────────────────────
const metaAutoResponderController = require('./meta.autoresponder.controller');

router.get('/channel/:channelId/autoresponders', metaAutoResponderController.getRules.bind(metaAutoResponderController));
router.post('/channel/:channelId/autoresponders', metaAutoResponderController.createRule.bind(metaAutoResponderController));
router.put('/channel/:channelId/autoresponders/:id', metaAutoResponderController.updateRule.bind(metaAutoResponderController));
router.delete('/channel/:channelId/autoresponders/:id', metaAutoResponderController.deleteRule.bind(metaAutoResponderController));
router.patch('/channel/:channelId/autoresponders/:id/active', metaAutoResponderController.toggleActive.bind(metaAutoResponderController));

// ────────────────────────────────────────────────────────────────────────────
// WhatsApp Business Profile — View & Update channel profile info
// ────────────────────────────────────────────────────────────────────────────
const metaProfileController = require('./meta.profile.controller');
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/meta-photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const uploadPhoto = multer({ storage: photoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/channel/:channelId/profile', metaProfileController.getProfile.bind(metaProfileController));
router.put('/channel/:channelId/profile', metaProfileController.updateProfile.bind(metaProfileController));
router.post('/channel/:channelId/profile/photo', uploadPhoto.single('photo'), metaProfileController.uploadPhoto.bind(metaProfileController));

module.exports = router;
