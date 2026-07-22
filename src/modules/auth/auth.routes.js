const express = require('express');
const authController = require('./auth.controller');
const { validate, registerSchema, loginSchema } = require('./auth.validation');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
