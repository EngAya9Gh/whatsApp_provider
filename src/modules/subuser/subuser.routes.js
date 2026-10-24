const express = require('express');
const router = express.Router();
const subUserController = require('./subuser.controller');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');

const canManage = requirePermission('can_manage_sub_users');

// جميع المسارات تتطلب تسجيل دخول
router.use(authMiddleware);

// الأوونر فقط يستطيع إدارة المستخدمين الفرعيين
router.get('/defaults', subUserController.getDefaults);
router.get('/team', subUserController.getTeam);
router.get('/', canManage, subUserController.list);
router.get('/:id', canManage, subUserController.getById);
router.post('/', canManage, subUserController.create);
router.put('/:id', canManage, subUserController.update);
router.post('/:id/reset-password', canManage, subUserController.resetPassword);
router.delete('/:id', canManage, subUserController.delete);

module.exports = router;
