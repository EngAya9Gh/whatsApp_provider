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

  async createTemplate(tenantId, name, content, mediaPath, mediaMime) {
    return await prisma.messageTemplate.create({
      data: { tenantId, name, content, mediaPath, mediaMime }
    });
  }

  async updateTemplate(tenantId, id, name, content, mediaPath, mediaMime) {
    const data = { name, content };
    if (mediaPath !== undefined) data.mediaPath = mediaPath;
    if (mediaMime !== undefined) data.mediaMime = mediaMime;

    return await prisma.messageTemplate.update({
      where: { id, tenantId }, // tenantId ensures they own it
      data
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
    if (template.mediaPath) {
      let type = 'image';
      if (template.mediaMime && template.mediaMime.includes('pdf')) type = 'pdf';
      return await messageService.sendMediaMessage(tenantId, phone, type, template.mediaPath, finalMessage, template.mediaMime, 'template-media');
    } else {
      return await messageService.sendCustomMessage(tenantId, phone, finalMessage);
    }
  }
}

module.exports = new TemplateService();
