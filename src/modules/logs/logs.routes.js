const express = require('express');
const logsController = require('./logs.controller');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(requirePermission('can_view_logs'));

router.get('/', logsController.getLogs);

module.exports = router;
