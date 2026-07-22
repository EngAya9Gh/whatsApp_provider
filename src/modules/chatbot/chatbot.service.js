const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ChatbotService {
  async getAutoResponders(tenantId) {
    return await prisma.autoResponder.findMany({
      where: { tenantId },
      include: {
        campaign: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAutoResponderById(tenantId, id) {
    return await prisma.autoResponder.findFirst({
      where: { id, tenantId }
    });
  }

  async createAutoResponder(data) {
    return await prisma.autoResponder.create({
      data
    });
  }

  async updateAutoResponder(tenantId, id, data) {
    const existing = await this.getAutoResponderById(tenantId, id);
    if (!existing) {
      throw { status: 404, message: 'Auto Responder rule not found' };
    }

    return await prisma.autoResponder.update({
      where: { id },
      data
    });
  }

  async deleteAutoResponder(tenantId, id) {
    const existing = await this.getAutoResponderById(tenantId, id);
    if (!existing) {
      throw { status: 404, message: 'Auto Responder rule not found' };
    }

    return await prisma.autoResponder.delete({
      where: { id }
    });
  }

  async toggleActive(tenantId, id, isActive) {
    const existing = await this.getAutoResponderById(tenantId, id);
    if (!existing) {
      throw { status: 404, message: 'Auto Responder rule not found' };
    }

    return await prisma.autoResponder.update({
      where: { id },
      data: { isActive }
    });
  }
}

module.exports = new ChatbotService();
