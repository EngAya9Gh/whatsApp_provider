const express = require('express');
const multer = require('multer');
const path = require('path');
const campaignController = require('./campaign.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middlewares/requireFeature');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    if (file.fieldname === 'image') {
      const dir = 'uploads/campaigns/';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    } else {
      const dir = 'uploads/';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Require Dashboard Login and feature access (allowing both Baileys and Meta campaigns)
router.use(authMiddleware);
router.use((req, res, next) => {
  // Allow if they have either Baileys Campaign or Meta Campaign feature
  const features = req.tenant.customFeatures || {};
  if (features.BAILEYS_CAMPAIGN || features.META_CAMPAIGN || req.tenant.metaEnabled) {
    next();
  } else {
    return res.status(403).json({ error: 'Feature requires PRO plan or Meta enabled' });
  }
});

router.post('/', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]), campaignController.createCampaign);
router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }]), campaignController.updateCampaign);
router.post('/:id/start', campaignController.startCampaign);
router.post('/:id/retry', campaignController.retryFailed);
router.get('/:id/targets', campaignController.getTargets);
router.get('/:id/stats', campaignController.getCampaignStats);
router.get('/:id/interactions', campaignController.getInteractions);
router.get('/:id/export', campaignController.exportCampaignData);
router.get('/', campaignController.getCampaigns);

module.exports = router;
