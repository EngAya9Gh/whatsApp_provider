const express = require('express');
const multer = require('multer');
const path = require('path');
const campaignController = require('./campaign.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'image') {
      cb(null, 'uploads/campaigns/');
    } else {
      // For excel files, we don't strictly need to save them, but we must provide a destination if using diskStorage for all.
      // Wait, let's just use memory storage for excel, but multer doesn't allow mixed storage types directly easily.
      // So let's save excel temporarily too.
      cb(null, 'uploads/');
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
router.get('/', campaignController.getCampaigns);
router.get('/:id/stats', campaignController.getCampaignStats);

module.exports = router;
