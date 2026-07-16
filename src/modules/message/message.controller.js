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

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const result = await messageService.sendMediaMessage(
      tenantId, 
      phone, 
      type, 
      file.buffer, 
      caption, 
      file.mimetype, 
      file.originalname
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
