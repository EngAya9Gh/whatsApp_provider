const express = require('express');
const crypto = require('crypto');
const metaController = require('./meta.controller');
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/auth.middleware');

// Who may do what on Meta numbers (owner & API keys always pass)
const canSettings = requirePermission('can_manage_settings');
const canReadTemplates = requireAnyPermission('can_view_templates', 'can_create_templates', 'can_send_message', 'can_view_campaigns', 'can_view_live_chat', 'can_view_chatbot');
const canWriteTemplates = requirePermission('can_create_templates');
const canUploadMedia = requireAnyPermission('can_create_templates', 'can_send_message', 'can_create_campaigns', 'can_manage_chatbot');
const canViewBot = requirePermission('can_view_chatbot');
const canManageBot = requirePermission('can_manage_chatbot');
const canReadMetaFlows = requireAnyPermission('can_view_chatbot', 'can_send_message');
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
  const custom = req.tenant?.customFeatures || {};
  const hasAnyMetaFeature = Object.keys(custom).some(k => k.startsWith('META_') && custom[k] === true);
  const allowed = req.tenant && (
    req.tenant.metaEnabled === true ||
    hasAnyMetaFeature
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

// ────────────────────────────────────────────────────────────────────────────
// Embedded Signup — Only requires JWT auth, no Meta feature flag needed
// ────────────────────────────────────────────────────────────────────────────
const embeddedSignupController = require('./meta.embedded-signup.controller');
router.post('/embedded-signup/exchange', canSettings, embeddedSignupController.exchangeCode);

router.use(requireMetaEnabled);

router.post('/channel', canSettings, metaController.addChannel.bind(metaController));
router.get('/channels', metaController.getChannels.bind(metaController));
router.delete('/channel/:id', canSettings, metaController.deleteChannel.bind(metaController));
router.get('/channel/:id/templates', canReadTemplates, metaController.getTemplates.bind(metaController));

// ────────────────────────────────────────────────────────────────────────────
// Meta Template Management — Create / Read / Delete templates via Meta API
// ────────────────────────────────────────────────────────────────────────────
const metaTemplateController = require('./meta.template.controller');

// List all templates for a channel's WABA
router.get('/channel/:channelId/meta-templates', canReadTemplates, metaTemplateController.listTemplates.bind(metaTemplateController));

// Get a single template by Meta template ID
router.get('/channel/:channelId/meta-templates/:templateId/detail', canReadTemplates, metaTemplateController.getTemplateDetail.bind(metaTemplateController));

// Create a new template (submitted to Meta for review)
router.post('/channel/:channelId/meta-templates', canWriteTemplates, metaTemplateController.createTemplate.bind(metaTemplateController));

// Update template components
router.put('/channel/:channelId/meta-templates/:templateId', canWriteTemplates, metaTemplateController.updateTemplate.bind(metaTemplateController));

// Delete template by name (Meta uses name, not ID for deletion)
router.delete('/channel/:channelId/meta-templates/:templateName', canWriteTemplates, metaTemplateController.deleteTemplate.bind(metaTemplateController));

// ────────────────────────────────────────────────────────────────────────────
// Upload media to Meta servers and get a media handle for use in header examples
router.post('/channel/:channelId/upload-media', canUploadMedia, uploadTmp.single('file'), async (req, res, next) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const metaService = require('./meta.service');
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: req.params.channelId, tenantId: req.tenant.id, providerType: 'META_CLOUD' }
    });
    if (!channel) return res.status(404).json({ success: false, message: 'Meta channel not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const size = req.file.size;
    const mimetype = req.file.mimetype;
    
    // Step 1: Create upload session
    const appId = process.env.META_FB_APP_ID || process.env.META_APP_ID || '1567752178149611';
    const axios = require('axios');
    const fs = require('fs');
    
    const sessionRes = await axios.post(`https://graph.facebook.com/v21.0/${appId}/uploads`, null, {
      params: {
        file_length: size,
        file_type: mimetype,
        access_token: channel.metaAccessToken
      }
    });
    
    const sessionId = sessionRes.data.id;
    
    // Step 2: Upload binary data
    const uploadRes = await axios.post(`https://graph.facebook.com/v21.0/${sessionId}`, fs.readFileSync(req.file.path), {
      headers: {
        'Authorization': `OAuth ${channel.metaAccessToken}`,
        'file_offset': '0',
        'Content-Type': 'application/octet-stream'
      }
    });

    const mediaId = uploadRes.data.h; // The handle!
    
    res.json({ success: true, mediaId, mimetype, originalName: req.file.originalname });
  } catch (err) { 
    console.error('[Upload-Media] Resumable Upload Error:', err.response?.data || err.message);
    next(err); 
  }
});

// Meta Auto Responder — Channel-specific auto reply rules
// ────────────────────────────────────────────────────────────────────────────
const metaAutoResponderController = require('./meta.autoresponder.controller');

router.get('/channel/:channelId/autoresponders', canViewBot, metaAutoResponderController.getRules.bind(metaAutoResponderController));
router.post('/channel/:channelId/autoresponders', canManageBot, metaAutoResponderController.createRule.bind(metaAutoResponderController));
router.put('/channel/:channelId/autoresponders/:id', canManageBot, metaAutoResponderController.updateRule.bind(metaAutoResponderController));
router.delete('/channel/:channelId/autoresponders/:id', canManageBot, metaAutoResponderController.deleteRule.bind(metaAutoResponderController));
router.patch('/channel/:channelId/autoresponders/:id/active', canManageBot, metaAutoResponderController.toggleActive.bind(metaAutoResponderController));

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

router.get('/channel/:channelId/profile', canSettings, metaProfileController.getProfile.bind(metaProfileController));
router.put('/channel/:channelId/profile', canSettings, metaProfileController.updateProfile.bind(metaProfileController));
router.post('/channel/:channelId/profile/photo', canSettings, uploadPhoto.single('photo'), metaProfileController.uploadPhoto.bind(metaProfileController));

// Sync delivery analytics from Meta API (use after server downtime to recover stats)
router.post('/channel/:channelId/sync-stats', metaController.syncStats.bind(metaController));


// ────────────────────────────────────────────────────────────────────────────
// WhatsApp Flows — Create, Manage, Publish Interactive Flows
// ────────────────────────────────────────────────────────────────────────────
const metaFlowController = require('./meta.flow.controller');
const uploadFlowJson = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // Max 10MB JSON

router.get('/channel/:channelId/flows', canReadMetaFlows, metaFlowController.listFlows);
router.post('/channel/:channelId/flows', canManageBot, metaFlowController.createFlow);
router.post('/channel/:channelId/flows/:flowId/assets', canManageBot, uploadFlowJson.single('file'), metaFlowController.uploadFlowJson);
router.post('/channel/:channelId/flows/:flowId/publish', canManageBot, metaFlowController.publishFlow);
router.delete('/channel/:channelId/flows/:flowId', canManageBot, metaFlowController.deleteFlow);

module.exports = router;
