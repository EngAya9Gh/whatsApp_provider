const express = require('express');
const router = express.Router();
const ticketsController = require('./tickets.controller');
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/auth.middleware');
const accessService = require('../workforce/access.service');

const liveChat = requirePermission('can_view_live_chat');
const settings = requirePermission('can_manage_settings');
const ticketAccess = [liveChat, accessService.ticketGuard()];

router.use(authMiddleware);

// Get all tickets
router.get('/', liveChat, ticketsController.getTickets);

// Categories
router.get('/categories', requireAnyPermission('can_view_live_chat', 'can_manage_settings'), ticketsController.getCategories);
router.post('/categories', settings, ticketsController.createCategory);
router.delete('/categories/:id', settings, ticketsController.deleteCategory);

// Get a single ticket
router.get('/:id', ticketAccess, ticketsController.getTicket);

// Create a ticket manually
router.post('/', liveChat, accessService.bodyThreadGuard(), ticketsController.createTicket);

// Close a ticket
router.post('/:id/close', ticketAccess, ticketsController.closeTicket);

// Reopen a ticket
router.post('/:id/reopen', ticketAccess, ticketsController.reopenTicket);

// Assign a ticket
router.post('/:id/assign', ticketAccess, ticketsController.assignTicket);
router.put('/:id/assign', ticketAccess, ticketsController.assignTicket);

// Toggle autoCreateTickets for a channel
router.put('/channels/:channelId/auto-create', settings, ticketsController.toggleAutoCreate);

// Manual trigger for auto-close check
router.post('/auto-close/trigger', settings, ticketsController.triggerAutoClose);

module.exports = router;
