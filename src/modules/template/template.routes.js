const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const templateController = require('./template.controller');
const { validate, createTemplateSchema, sendTemplateSchema } = require('./template.validation');
const { apiKeyMiddleware } = require('../../middleware/apiKey.middleware');
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/auth.middleware');
const { messageRateLimiter } = require('../../middleware/rateLimiter.middleware');
const requireFeature = require('../../middleware/requireFeature');

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

// The send endpoint must use apiKeyMiddleware so API clients can use it
router.post('/send', apiKeyMiddleware, requirePermission('can_send_message'), validate(sendTemplateSchema), messageRateLimiter, templateController.sendTemplateMessage);

// The CRUD routes should use authMiddleware (JWT) and TEMPLATES feature
router.use(authMiddleware);
router.use(requireFeature('TEMPLATES'));

router.get('/', requireAnyPermission('can_view_templates', 'can_send_message', 'can_view_campaigns'), templateController.getTemplates);
router.post('/', requirePermission('can_create_templates'), upload.single('media'), templateController.createTemplate);
router.put('/:id', requirePermission('can_create_templates'), upload.single('media'), templateController.updateTemplate);
router.delete('/:id', requirePermission('can_create_templates'), templateController.deleteTemplate);

module.exports = router;
