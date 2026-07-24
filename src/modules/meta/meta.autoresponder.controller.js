const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');

class MetaAutoResponderController {
  async _getChannel(tenantId, channelId) {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: channelId, tenantId, providerType: 'META_CLOUD' }
    });
    if (!channel) throw { status: 404, message: 'Meta channel not found' };
    return channel;
  }

  async getRules(req, res, next) {
    try {
      const { channelId } = req.params;
      await this._getChannel(req.tenant.id, channelId);
      const rules = await prisma.autoResponder.findMany({
        where: { tenantId: req.tenant.id, channelId },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: rules });
    } catch (err) { next(err); }
  }

  async createRule(req, res, next) {
    try {
      const { channelId } = req.params;
      await this._getChannel(req.tenant.id, channelId);
      const { keyword, matchType, responseType, message, mediaUrl, mediaMime, metaTemplateName, metaTemplateLang, startDate, endDate, isActive } = req.body;
      if (!keyword) return res.status(400).json({ success: false, message: 'keyword is required' });
      const rule = await prisma.autoResponder.create({
        data: {
          tenantId: req.tenant.id, channelId,
          keyword: keyword.trim(),
          matchType: matchType || 'EXACT',
          responseType: responseType || 'TEXT',
          message: message || null,
          mediaUrl: mediaUrl || null,
          mediaMime: mediaMime || null,
          metaTemplateName: metaTemplateName || null,
          metaTemplateLang: metaTemplateLang || 'ar',
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          isActive: isActive !== undefined ? isActive : true
        }
      });
      logger.info(`[MetaAutoResponder] Rule created: "${keyword}" for channel ${channelId}`);
      res.status(201).json({ success: true, data: rule });
    } catch (err) { next(err); }
  }

  async updateRule(req, res, next) {
    try {
      const { channelId, id } = req.params;
      const existing = await prisma.autoResponder.findFirst({ where: { id, tenantId: req.tenant.id, channelId } });
      if (!existing) return res.status(404).json({ success: false, message: 'Rule not found' });
      const { keyword, matchType, responseType, message, mediaUrl, mediaMime, metaTemplateName, metaTemplateLang, startDate, endDate, isActive } = req.body;
      const updated = await prisma.autoResponder.update({
        where: { id },
        data: {
          keyword: keyword ? keyword.trim() : existing.keyword,
          matchType: matchType || existing.matchType,
          responseType: responseType || existing.responseType,
          message: message !== undefined ? message : existing.message,
          mediaUrl: mediaUrl !== undefined ? mediaUrl : existing.mediaUrl,
          mediaMime: mediaMime !== undefined ? mediaMime : existing.mediaMime,
          metaTemplateName: metaTemplateName !== undefined ? metaTemplateName : existing.metaTemplateName,
          metaTemplateLang: metaTemplateLang || existing.metaTemplateLang,
          startDate: startDate ? new Date(startDate) : existing.startDate,
          endDate: endDate ? new Date(endDate) : existing.endDate,
          isActive: isActive !== undefined ? isActive : existing.isActive
        }
      });
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  }

  async deleteRule(req, res, next) {
    try {
      const { channelId, id } = req.params;
      const existing = await prisma.autoResponder.findFirst({ where: { id, tenantId: req.tenant.id, channelId } });
      if (!existing) return res.status(404).json({ success: false, message: 'Rule not found' });
      await prisma.autoResponder.delete({ where: { id } });
      res.json({ success: true, message: 'Rule deleted' });
    } catch (err) { next(err); }
  }

  async toggleActive(req, res, next) {
    try {
      const { channelId, id } = req.params;
      const existing = await prisma.autoResponder.findFirst({ where: { id, tenantId: req.tenant.id, channelId } });
      if (!existing) return res.status(404).json({ success: false, message: 'Rule not found' });
      const updated = await prisma.autoResponder.update({ where: { id }, data: { isActive: req.body.isActive } });
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  }
}

module.exports = new MetaAutoResponderController();
