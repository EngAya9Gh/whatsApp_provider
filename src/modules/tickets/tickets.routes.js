const express = require('express');
const router = express.Router();
const ticketsController = require('./tickets.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

// Get all tickets
router.get('/', ticketsController.getTickets);

// Categories
router.get('/categories', ticketsController.getCategories);
router.post('/categories', ticketsController.createCategory);
router.delete('/categories/:id', ticketsController.deleteCategory);

// Get a single ticket
router.get('/:id', ticketsController.getTicket);

// Create a ticket manually
router.post('/', ticketsController.createTicket);

// Close a ticket
router.post('/:id/close', ticketsController.closeTicket);

// Assign a ticket
router.post('/:id/assign', ticketsController.assignTicket);

// Toggle autoCreateTickets for a channel
router.put('/channels/:channelId/auto-create', ticketsController.toggleAutoCreate);

module.exports = router;
