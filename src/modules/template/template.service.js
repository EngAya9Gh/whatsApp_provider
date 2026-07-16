const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const messageService = require('../message/message.service');

class TemplateService {
  async getTemplates(tenantId) {
    return await prisma.messageTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTemplate(tenantId, name, content) {
    return await prisma.messageTemplate.create({
      data: { tenantId, name, content }
    });
  }

  async updateTemplate(tenantId, id, name, content) {
    return await prisma.messageTemplate.update({
      where: { id, tenantId }, // tenantId ensures they own it
      data: { name, content }
    });
  }

  async deleteTemplate(tenantId, id) {
    return await prisma.messageTemplate.delete({
      where: { id, tenantId }
    });
  }

  async sendTemplateMessage(tenantId, phone, templateId, variables) {
    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId, tenantId }
    });

    if (!template) {
      throw { status: 404, message: 'Template not found' };
    }

    let finalMessage = template.content;

    // Replace variables e.g. {{name}} with value from variables object
    if (variables && typeof variables === 'object') {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        finalMessage = finalMessage.replace(regex, value);
      }
    }

    // Call message service to actually send it (handles billing & logs)
    return await messageService.sendCustomMessage(tenantId, phone, finalMessage);
  }
}

module.exports = new TemplateService();
