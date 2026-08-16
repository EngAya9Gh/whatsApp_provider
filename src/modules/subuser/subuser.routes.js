const express = require('express');
const router = express.Router();
const subUserController = require('./subuser.controller');
const { authMiddleware, ownerOnly } = require('../../middleware/auth.middleware');

// جميع المسارات تتطلب تسجيل دخول
router.use(authMiddleware);

// الأوونر فقط يستطيع إدارة المستخدمين الفرعيين
router.get('/defaults', subUserController.getDefaults);
router.get('/', ownerOnly, subUserController.list);
router.get('/:id', ownerOnly, subUserController.getById);
router.post('/', ownerOnly, subUserController.create);
router.put('/:id', ownerOnly, subUserController.update);
router.post('/:id/reset-password', ownerOnly, subUserController.resetPassword);
router.delete('/:id', ownerOnly, subUserController.delete);

module.exports = router;
