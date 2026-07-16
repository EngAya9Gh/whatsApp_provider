const express = require('express');
const invoiceController = require('./invoice.controller');

const router = express.Router();

// Public route to view an invoice
router.get('/:id', invoiceController.getInvoiceById.bind(invoiceController));

module.exports = router;
