const express = require('express');
const logsController = require('./logs.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', logsController.getLogs);

module.exports = router;
