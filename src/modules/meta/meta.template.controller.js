const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const metaTemplateService = require('./meta.template.service');
const logger = require('../../utils/logger');

/**
 * Controller for managing Meta WABA message templates.
 * All endpoints require: authenticated tenant + META_CLOUD channel.
 */
class MetaTemplateController {
  /**
   * Get the Meta channel for the tenant (validates it exists and belongs to tenant).
   */
  async _getChannel(tenantId, channelId) {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: channelId, tenantId, providerType: 'META_CLOUD' }
    });
    if (!channel) {
      throw { status: 404, message: 'Meta channel not found' };
    }
    return channel;
  }

  /**
   * GET /meta/channel/:channelId/meta-templates
   * List all templates for this channel's WABA.
   * Query params: status (APPROVED|PENDING|REJECTED), name, limit
   */
  async listTemplates(req, res, next) {
    try {
      const channel = await this._getChannel(req.tenant.id, req.params.channelId);
      const { status, name, limit, after } = req.query;

      const data = await metaTemplateService.listTemplates(channel, {
        status: status || null,
        name: name || null,
        limit: limit ? parseInt(limit) : 100,
        after: after || null
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /meta/channel/:channelId/meta-templates
   * Create a new template on Meta (goes to review).
   * 
   * Body (simplified form):
   * {
   *   name: "order_confirmation",
   *   language: "ar",
   *   category: "UTILITY",           // MARKETING | UTILITY | AUTHENTICATION
   *   headerType: "TEXT",             // TEXT | IMAGE | VIDEO | DOCUMENT | null
   *   headerText: "Order {{1}}",      // if TEXT header
   *   headerExample: "ORD-123",       // example value for header variable
   *   body: "مرحبا {{1}}، طلبك {{2}} تم تأكيده.", 
   *   bodyVariables: ["أحمد", "ORD-456"],  // example values
   *   footer: "شكراً لتسوقك معنا",  // optional
   *   buttons: [                       // optional
   *     { type: "QUICK_REPLY", text: "نعم" },
   *     { type: "URL", text: "تتبع الطلب", url: "https://example.com/track/{{1}}", urlExample: "https://example.com/track/123" }
   *   ]
   * }
   * 
   * OR send raw components array directly:
   * { name, language, category, components: [...] }
   */
  async createTemplate(req, res, next) {
    try {
      const channel = await this._getChannel(req.tenant.id, req.params.channelId);
      const {
        name, language, category,
        // Simple form fields
        headerType, headerText, headerExample,
        body, bodyVariables, footer, buttons,
        // Or raw components
        components,
        allow_category_change
      } = req.body;

      // Build components from simplified form OR use raw components
      let finalComponents = components;
      if (!finalComponents) {
        if (!body) {
          return res.status(400).json({ success: false, message: 'body text is required' });
        }
        finalComponents = metaTemplateService.buildComponents({
          headerType, headerText, headerExample,
          body, bodyVariables, footer, buttons
        });
      }

      const result = await metaTemplateService.createTemplate(channel, {
        name, language, category, components: finalComponents, allow_category_change
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Template submitted for Meta review. Status will update within minutes to 24 hours.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /meta/channel/:channelId/meta-templates/:templateId
   * Update template components (only body/footer/buttons can be updated).
   * 
   * Body: { components: [...] } OR simplified form fields (body, buttons, etc.)
   */
  async updateTemplate(req, res, next) {
    try {
      const channel = await this._getChannel(req.tenant.id, req.params.channelId);
      const { templateId } = req.params;
      const {
        headerType, headerText, headerExample,
        body, bodyVariables, footer, buttons,
        components
      } = req.body;

      let finalComponents = components;
      if (!finalComponents) {
        if (!body) {
          return res.status(400).json({ success: false, message: 'body text is required' });
        }
        finalComponents = metaTemplateService.buildComponents({
          headerType, headerText, headerExample,
          body, bodyVariables, footer, buttons
        });
      }

      const result = await metaTemplateService.updateTemplate(channel, templateId, { components: finalComponents });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /meta/channel/:channelId/meta-templates/:templateName
   * Delete a template by its name (deletes all language variants).
   */
  async deleteTemplate(req, res, next) {
    try {
      const channel = await this._getChannel(req.tenant.id, req.params.channelId);
      const { templateName } = req.params;

      await metaTemplateService.deleteTemplate(channel, templateName);
      res.status(200).json({
        success: true,
        message: `Template "${templateName}" deleted from Meta`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /meta/channel/:channelId/meta-templates/:templateId/detail
   * Get a single template's full details by ID.
   */
  async getTemplateDetail(req, res, next) {
    try {
      const channel = await this._getChannel(req.tenant.id, req.params.channelId);
      const { templateId } = req.params;

      const data = await metaTemplateService.getTemplateById(channel, templateId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MetaTemplateController();
