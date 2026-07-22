const axios = require('axios');
const logger = require('../../utils/logger');

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Meta Template Management Service
 * Handles CRUD operations for WhatsApp Business Message Templates via Meta API.
 * 
 * Endpoints used:
 *  - GET    /{version}/{waba_id}/message_templates          — list templates
 *  - POST   /{version}/{waba_id}/message_templates          — create template
 *  - POST   /{version}/{template_id}                        — update template
 *  - DELETE /{version}/{waba_id}/message_templates?hsm_id={template_id} — delete template
 * 
 * Authentication: Bearer {metaAccessToken} in Authorization header
 */
class MetaTemplateService {
  /**
   * Get all approved/pending/rejected templates for a WABA.
   * Optional filters: status, name
   */
  async listTemplates(channel, options = {}) {
    const params = {
      limit: options.limit || 100,
      fields: 'id,name,status,category,language,components,quality_score,rejected_reason'
    };

    if (options.status) params.status = options.status;
    if (options.name) params.name = options.name;
    if (options.after) params.after = options.after; // for pagination cursor

    try {
      const res = await axios.get(
        `${GRAPH_API_BASE}/${channel.metaWabaId}/message_templates`,
        {
          params,
          headers: { 'Authorization': `Bearer ${channel.metaAccessToken}` }
        }
      );
      return res.data;
    } catch (error) {
      logger.error('[MetaTemplateService] listTemplates error', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  }

  /**
   * Create a new message template — sent to Meta for review.
   * 
   * @param {object} channel - WhatsAppChannel with metaWabaId and metaAccessToken
   * @param {object} templateData - Template definition
   * @param {string} templateData.name          - Snake_case name (e.g. "order_confirmation")
   * @param {string} templateData.language      - Language code (e.g. "ar", "en_US")
   * @param {string} templateData.category      - "MARKETING" | "UTILITY" | "AUTHENTICATION"
   * @param {array}  templateData.components    - Array of component objects
   * 
   * Component structure per Meta docs:
   * - HEADER: { type: "HEADER", format: "TEXT"|"IMAGE"|"VIDEO"|"DOCUMENT", text?: "...", example?: {...} }
   * - BODY:   { type: "BODY", text: "Hello {{1}}", example?: { body_text: [["sample_value"]] } }
   * - FOOTER: { type: "FOOTER", text: "..." }
   * - BUTTONS: { type: "BUTTONS", buttons: [{type: "QUICK_REPLY", text: "Yes"}, {type: "URL", text: "Visit", url: "..."}, {type: "PHONE_NUMBER", text: "Call", phone_number: "+..."}] }
   * 
   * Returns: { id: "template_id", status: "PENDING" }
   */
  async createTemplate(channel, templateData) {
    const { name, language, category, components, allow_category_change } = templateData;

    // Validate required fields
    if (!name || !language || !category || !components) {
      throw { status: 400, message: 'name, language, category, and components are required' };
    }

    // Template name must be lowercase + underscores only per Meta rules
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const payload = {
      name: cleanName,
      language,
      category,
      components,
      ...(allow_category_change !== undefined && { allow_category_change })
    };

    try {
      const res = await axios.post(
        `${GRAPH_API_BASE}/${channel.metaWabaId}/message_templates`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${channel.metaAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`[MetaTemplateService] Template created: ${cleanName} (id: ${res.data.id})`);
      return res.data; // { id, status: "PENDING" }
    } catch (error) {
      logger.error('[MetaTemplateService] createTemplate error', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  }

  /**
   * Update an existing template (only BODY text and components can be updated, not name/category).
   * Meta requires the template to be in APPROVED or REJECTED state to update.
   * 
   * @param {object} channel
   * @param {string} templateId - Meta's template ID
   * @param {object} updateData  - { components } — only components can be updated
   */
  async updateTemplate(channel, templateId, updateData) {
    const { components } = updateData;

    if (!components) {
      throw { status: 400, message: 'components are required for update' };
    }

    try {
      const res = await axios.post(
        `${GRAPH_API_BASE}/${templateId}`,
        { components },
        {
          headers: {
            'Authorization': `Bearer ${channel.metaAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`[MetaTemplateService] Template updated: ${templateId}`);
      return res.data;
    } catch (error) {
      logger.error('[MetaTemplateService] updateTemplate error', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  }

  /**
   * Delete a template by name.
   * Per Meta docs: DELETE /{waba_id}/message_templates?name={template_name}
   * Deletes ALL languages of that template name.
   * 
   * Note: Meta uses template name (not ID) for deletion.
   */
  async deleteTemplate(channel, templateName) {
    try {
      const res = await axios.delete(
        `${GRAPH_API_BASE}/${channel.metaWabaId}/message_templates`,
        {
          params: { name: templateName },
          headers: { 'Authorization': `Bearer ${channel.metaAccessToken}` }
        }
      );

      logger.info(`[MetaTemplateService] Template deleted: ${templateName}`);
      return res.data;
    } catch (error) {
      logger.error('[MetaTemplateService] deleteTemplate error', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  }

  /**
   * Get a single template by ID with full details.
   */
  async getTemplateById(channel, templateId) {
    try {
      const res = await axios.get(
        `${GRAPH_API_BASE}/${templateId}`,
        {
          params: {
            fields: 'id,name,status,category,language,components,quality_score,rejected_reason'
          },
          headers: { 'Authorization': `Bearer ${channel.metaAccessToken}` }
        }
      );
      return res.data;
    } catch (error) {
      logger.error('[MetaTemplateService] getTemplateById error', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  }

  /**
   * Helper: Build a template components array from simple inputs.
   * Used by the frontend when it sends simplified form data.
   * 
   * @param {object} opts
   * @param {string} opts.headerType   - "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | null
   * @param {string} opts.headerText   - Text if headerType is "TEXT"
   * @param {string} opts.headerExample - URL example for media headers
   * @param {string} opts.body         - Body text with {{1}}, {{2}} variables
   * @param {array}  opts.bodyVariables - Example values for body variables e.g. ["John", "123"]
   * @param {string} opts.footer       - Optional footer text
   * @param {array}  opts.buttons      - Array of button objects
   */
  buildComponents(opts) {
    const components = [];

    // HEADER component
    if (opts.headerType) {
      const header = { type: 'HEADER', format: opts.headerType };

      if (opts.headerType === 'TEXT') {
        header.text = opts.headerText || '';
        if (opts.headerText && opts.headerText.includes('{{')) {
          header.example = { header_text: [opts.headerExample || 'Sample'] };
        }
      } else {
        // IMAGE / VIDEO / DOCUMENT — provide a link example
        header.example = {
          header_handle: [opts.headerExample || 'https://example.com/sample.jpg']
        };
      }
      components.push(header);
    }

    // BODY component (required)
    const body = { type: 'BODY', text: opts.body || '' };
    if (opts.bodyVariables && opts.bodyVariables.length > 0) {
      body.example = { body_text: [opts.bodyVariables] };
    }
    components.push(body);

    // FOOTER component
    if (opts.footer) {
      components.push({ type: 'FOOTER', text: opts.footer });
    }

    // BUTTONS component
    if (opts.buttons && opts.buttons.length > 0) {
      const buttons = opts.buttons.map(btn => {
        if (btn.type === 'QUICK_REPLY') {
          return { type: 'QUICK_REPLY', text: btn.text.substring(0, 25) };
        }
        if (btn.type === 'URL') {
          const urlBtn = { type: 'URL', text: btn.text.substring(0, 25), url: btn.url };
          if (btn.url && btn.url.includes('{{1}}')) {
            urlBtn.example = [btn.urlExample || 'https://example.com/promo'];
          }
          return urlBtn;
        }
        if (btn.type === 'PHONE_NUMBER') {
          return { type: 'PHONE_NUMBER', text: btn.text.substring(0, 25), phone_number: btn.phoneNumber };
        }
        return btn;
      });
      components.push({ type: 'BUTTONS', buttons });
    }

    return components;
  }
}

module.exports = new MetaTemplateService();
