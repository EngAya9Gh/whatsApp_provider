const express = require('express');
const router = express.Router();
const workforceController = require('./workforce.controller');
const { authMiddleware, requirePermission } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

const canManage = requirePermission('can_manage_sub_users');
const bind = (method) => workforceController[method].bind(workforceController);

// Teams
router.get('/teams', bind('listTeams'));
router.post('/teams', canManage, bind('createTeam'));
router.put('/teams/:id', canManage, bind('updateTeam'));
router.delete('/teams/:id', canManage, bind('deleteTeam'));

// Shifts & schedule
router.get('/shifts', bind('getSchedule'));
router.get('/shifts/on-shift', bind('getOnShift'));
router.post('/shifts', canManage, bind('createShift'));
router.put('/shifts/:id', canManage, bind('updateShift'));
router.delete('/shifts/:id', canManage, bind('deleteShift'));
router.put('/timezone', canManage, bind('setTimezone'));
router.post('/assignments', canManage, bind('assignShift'));
router.delete('/assignments/:id', canManage, bind('deleteAssignment'));

// Working hours per channel
router.get('/hours', bind('listHours'));
router.put('/hours/:channelId', canManage, bind('saveHours'));

module.exports = router;
