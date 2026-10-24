const express = require('express');
const router = express.Router();
const teamChatController = require('./team-chat.controller');
const { authMiddleware, memberKey } = require('../../middleware/auth.middleware');

router.use(authMiddleware);
// Team chat is between people: API keys have no identity here
router.use((req, res, next) => (memberKey(req) ? next() : res.status(403).json({ error: 'Team chat is for team members only' })));

const bind = (method) => teamChatController[method].bind(teamChatController);

router.get('/members', bind('members'));
router.get('/unread', bind('unread'));
router.get('/conversations', bind('list'));
router.post('/conversations/direct', bind('openDirect'));
router.post('/conversations/group', bind('createGroup'));
router.put('/conversations/:id', bind('updateGroup'));
router.post('/conversations/:id/leave', bind('leave'));
router.get('/conversations/:id/messages', bind('messages'));
router.post('/conversations/:id/messages', bind('send'));
router.post('/conversations/:id/read', bind('read'));

module.exports = router;
