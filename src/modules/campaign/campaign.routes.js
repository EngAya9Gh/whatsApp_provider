const express = require('express');
const multer = require('multer');
const path = require('path');
const campaignController = require('./campaign.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

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

// Require Dashboard Login
router.use(authMiddleware);

router.post('/', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]), campaignController.createCampaign);
router.post('/:id/start', campaignController.startCampaign);
router.post('/:id/retry', campaignController.retryFailed);
router.get('/:id/targets', campaignController.getTargets);
router.get('/:id/stats', campaignController.getCampaignStats);
router.get('/:id/interactions', campaignController.getInteractions);
router.get('/', campaignController.getCampaigns);

module.exports = router;
