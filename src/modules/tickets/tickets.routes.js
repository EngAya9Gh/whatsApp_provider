const express = require('express');
const router = express.Router();
const ticketsController = require('./tickets.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

// Get all tickets
router.get('/', ticketsController.getTickets);

// Get a single ticket
router.get('/:id', ticketsController.getTicket);

// Create a ticket manually
router.post('/', ticketsController.createTicket);

// Close a ticket
router.post('/:id/close', ticketsController.closeTicket);

// Assign a ticket
router.post('/:id/assign', ticketsController.assignTicket);

module.exports = router;
