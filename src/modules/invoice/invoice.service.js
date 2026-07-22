const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class InvoiceService {
  async getInvoiceById(id) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { name: true, email: true, plan: true, companyName: true, whatsappPhone: true, customFeatures: true }
        }
      }
    });
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }
}

module.exports = new InvoiceService();
