const templateService = require('./template.service');

exports.getTemplates = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const templates = await templateService.getTemplates(tenantId);
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

exports.createTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { name, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }
    const mediaPath = req.file ? req.file.path : null;
    const mediaMime = req.file ? req.file.mimetype : null;
    
    const template = await templateService.createTemplate(tenantId, name, content, mediaPath, mediaMime);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { name, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }
    const mediaPath = req.file ? req.file.path : undefined;
    const mediaMime = req.file ? req.file.mimetype : undefined;
    
    const template = await templateService.updateTemplate(tenantId, id, name, content, mediaPath, mediaMime);
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

exports.deleteTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    await templateService.deleteTemplate(tenantId, id);
    res.status(200).json({ success: true, message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
};

exports.sendTemplateMessage = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { phone, templateId, variables } = req.body;
    const result = await templateService.sendTemplateMessage(tenantId, phone, templateId, variables);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
