const messageService = require('./message.service');

exports.sendMessage = async (req, res, next) => {
  try {
    const { phone, message } = req.body;
    const tenantId = req.tenant.id;
    const result = await messageService.sendCustomMessage(tenantId, phone, message);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.sendMedia = async (req, res, next) => {
  try {
    const { phone, type, url, caption } = req.body;
    const tenantId = req.tenant.id;
    const result = await messageService.sendMediaMessage(tenantId, phone, type, url, caption);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.uploadMedia = async (req, res, next) => {
  try {
    const { phone, type, caption } = req.body;
    const file = req.file;
    const tenantId = req.tenant.id;
    if (!file) return res.status(400).json({ error: 'File is required' });
    const result = await messageService.sendMediaMessage(tenantId, phone, type, file.buffer, caption, file.mimetype, file.originalname);
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
    const imageBuffer = req.file ? req.file.buffer : undefined;
    const result = await messageService.sendButtonsMessage(tenantId, phone, text, parsedButtons, imageBuffer);
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
    const result = await messageService.sendListMessage(tenantId, phone, title, body, buttonText, parsedSections);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.sendLocation = async (req, res, next) => {
  try {
    const { phone, latitude, longitude, name, address } = req.body;
    const tenantId = req.tenant.id;
    const result = await messageService.sendLocationMessage(tenantId, phone, latitude, longitude, name, address);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
