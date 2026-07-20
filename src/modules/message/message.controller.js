const messageService = require('./message.service');

exports.sendMessage = async (req, res, next) => {
  try {
    const { phone, message, channelId, channel_id } = req.body;
    const tenantId = req.tenant.id;
    const resolvedChannelId = channelId || channel_id;
    const result = await messageService.sendCustomMessage(tenantId, phone, message, resolvedChannelId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.sendMedia = async (req, res, next) => {
  try {
    const { phone, type, url, caption, channelId, channel_id } = req.body;
    const tenantId = req.tenant.id;
    const resolvedChannelId = channelId || channel_id;
    const result = await messageService.sendMediaMessage(tenantId, phone, type, url, caption, null, null, resolvedChannelId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.uploadMedia = async (req, res, next) => {
  try {
    const { phone, type, caption, channelId, channel_id } = req.body;
    const file = req.file;
    const tenantId = req.tenant.id;
    const resolvedChannelId = channelId || channel_id;
    if (!file) return res.status(400).json({ error: 'File is required' });
    const result = await messageService.sendMediaMessage(tenantId, phone, type, file.buffer, caption, file.mimetype, file.originalname, resolvedChannelId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.sendButtons = async (req, res, next) => {
  try {
    const { phone, text, buttons } = req.body;
    let parsedButtons = buttons;
    if (typeof buttons === 'string') {
      try {
        parsedButtons = JSON.parse(buttons);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid buttons format' });
      }
    }
    const tenantId = req.tenant.id;
    const { channelId, channel_id } = req.body;
    const resolvedChannelId = channelId || channel_id;
    const imageBuffer = req.file ? req.file.buffer : undefined;
    const result = await messageService.sendButtonsMessage(tenantId, phone, text, parsedButtons, imageBuffer, resolvedChannelId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.sendList = async (req, res, next) => {
  try {
    const { phone, title, body, buttonText, sections } = req.body;
    let parsedSections = sections;
    if (typeof sections === 'string') {
      try {
        parsedSections = JSON.parse(sections);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid sections format' });
      }
    }
    const tenantId = req.tenant.id;
    const { channelId, channel_id } = req.body;
    const resolvedChannelId = channelId || channel_id;
    const result = await messageService.sendListMessage(tenantId, phone, title, body, buttonText, parsedSections, resolvedChannelId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.sendLocation = async (req, res, next) => {
  try {
    const { phone, latitude, longitude, name, address, channelId, channel_id } = req.body;
    const tenantId = req.tenant.id;
    const resolvedChannelId = channelId || channel_id;
    const result = await messageService.sendLocationMessage(tenantId, phone, latitude, longitude, name, address, resolvedChannelId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.sendMetaTemplate = async (req, res, next) => {
  try {
    const { phone, templateName, languageCode, components, channelId, channel_id } = req.body;
    const tenantId = req.tenant.id;
    const resolvedChannelId = channelId || channel_id;
    const result = await messageService.sendMetaTemplate(tenantId, phone, templateName, languageCode, components, resolvedChannelId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
