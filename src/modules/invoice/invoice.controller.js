const invoiceService = require('./invoice.service');

class InvoiceController {
  async getInvoiceById(req, res, next) {
    try {
      const invoice = await invoiceService.getInvoiceById(req.params.id);
      res.json({ success: true, data: invoice });
    } catch (error) {
      if (error.message === 'Invoice not found') {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      next(error);
    }
  }
}

module.exports = new InvoiceController();
