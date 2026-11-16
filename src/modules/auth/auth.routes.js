const express = require('express');
const authController = require('./auth.controller');
const { validate, registerSchema, loginSchema } = require('./auth.validation');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/sub-login', authController.subLogin);      // تسجيل دخول المستخدمين الفرعيين
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);
// Ends the admin's support session in this account (the token stops working at once)
router.post('/impersonation/end', authMiddleware, async (req, res, next) => {
  try {
    if (req.impersonation) await require('../admin/impersonation.service').end(req.impersonation.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
