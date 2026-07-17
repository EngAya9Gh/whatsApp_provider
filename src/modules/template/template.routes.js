const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const templateController = require('./template.controller');
const { validate, createTemplateSchema, sendTemplateSchema } = require('./template.validation');
const { apiKeyMiddleware } = require('../../middleware/apiKey.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { otpRateLimiter } = require('../../middleware/rateLimiter.middleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/templates/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// The CRUD routes should use authMiddleware (JWT) since the dashboard uses them
router.get('/', authMiddleware, templateController.getTemplates);
router.post('/', authMiddleware, upload.single('media'), templateController.createTemplate);
router.put('/:id', authMiddleware, upload.single('media'), templateController.updateTemplate);
router.delete('/:id', authMiddleware, templateController.deleteTemplate);

// The send endpoint must use apiKeyMiddleware so API clients can use it
router.post('/send', apiKeyMiddleware, validate(sendTemplateSchema), otpRateLimiter, templateController.sendTemplateMessage);

module.exports = router;
