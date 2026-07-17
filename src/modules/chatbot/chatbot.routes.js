const express = require('express');
const chatbotController = require('./chatbot.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
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

router.get('/', chatbotController.getRules);
router.post('/', upload.single('media'), chatbotController.createRule);
router.put('/:id', upload.single('media'), chatbotController.updateRule);
router.delete('/:id', chatbotController.deleteRule);
router.patch('/:id/active', chatbotController.toggleRuleActive);

module.exports = router;
