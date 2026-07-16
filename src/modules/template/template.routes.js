const express = require('express');
const templateController = require('./template.controller');
const { validate, createTemplateSchema, sendTemplateSchema } = require('./template.validation');
const { apiKeyMiddleware } = require('../../middleware/apiKey.middleware');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { otpRateLimiter } = require('../../middleware/rateLimiter.middleware');

const router = express.Router();

// The CRUD routes should use authMiddleware (JWT) since the dashboard uses them
router.get('/', authMiddleware, templateController.getTemplates);
router.post('/', authMiddleware, validate(createTemplateSchema), templateController.createTemplate);
router.put('/:id', authMiddleware, validate(createTemplateSchema), templateController.updateTemplate);
router.delete('/:id', authMiddleware, templateController.deleteTemplate);

// The send endpoint must use apiKeyMiddleware so API clients can use it
router.post('/send', apiKeyMiddleware, validate(sendTemplateSchema), otpRateLimiter, templateController.sendTemplateMessage);

module.exports = router;
