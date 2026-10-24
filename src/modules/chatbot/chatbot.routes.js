const express = require('express');
const chatbotController = require('./chatbot.controller');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');
const requireFeature = require('../../middleware/requireFeature');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/chatbot');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.tenant.id}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

router.use(authMiddleware);
router.use(requireFeature('AUTO_RESPONDER'));

router.get('/', requirePermission('can_view_chatbot'), chatbotController.getRules);
router.post('/', requirePermission('can_manage_chatbot'), upload.single('media'), chatbotController.createRule);
router.put('/:id', requirePermission('can_manage_chatbot'), upload.single('media'), chatbotController.updateRule);
router.delete('/:id', requirePermission('can_manage_chatbot'), chatbotController.deleteRule);
router.patch('/:id/active', requirePermission('can_manage_chatbot'), chatbotController.toggleRuleActive);

module.exports = router;
