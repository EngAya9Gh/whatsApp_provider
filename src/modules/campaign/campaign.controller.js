const campaignService = require('./campaign.service');

exports.createCampaign = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { name, message, templateId, interactiveType, startDate, endDate } = req.body;
    const file = req.files?.file?.[0];
    const image = req.files?.image?.[0];

    // Parse buttons from JSON string if provided
    let buttons;
    if (req.body.buttons) {
      try {
        buttons = typeof req.body.buttons === 'string'
          ? JSON.parse(req.body.buttons)
          : req.body.buttons;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid buttons format. Must be a valid JSON array.' });
      }
    }

    if (!file) {
      return res.status(400).json({ error: 'Excel or CSV file is required' });
    }
    if (!name || (!message && !templateId)) {
      return res.status(400).json({ error: 'Campaign name and either message or template are required' });
    }

    const result = await campaignService.createCampaign({
      tenantId,
      name,
      message,
      templateId,
      file,
      image,
      buttons,
      interactiveType: interactiveType || 'TEXT',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
exports.updateCampaign = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { name, message, templateId, interactiveType, startDate, endDate } = req.body;
    const image = req.files?.image?.[0];

    // Parse buttons from JSON string if provided
    let buttons;
    if (req.body.buttons) {
      try {
        buttons = typeof req.body.buttons === 'string'
          ? JSON.parse(req.body.buttons)
          : req.body.buttons;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid buttons format. Must be a valid JSON array.' });
      }
    }

    if (!name || (!message && !templateId)) {
      return res.status(400).json({ error: 'Campaign name and either message or template are required' });
    }

    const result = await campaignService.updateCampaign({
      id,
      tenantId,
      name,
      message,
      templateId,
      image,
      buttons,
      interactiveType: interactiveType || 'TEXT',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.startCampaign = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const result = await campaignService.startCampaign(tenantId, id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getCampaigns = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const campaigns = await campaignService.getCampaigns(tenantId);
    res.status(200).json({ success: true, data: campaigns });
  } catch (error) {
    next(error);
  }
};

exports.getTargets = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const targets = await campaignService.getTargets(tenantId, id);
    res.status(200).json({ success: true, data: targets });
  } catch (error) {
    next(error);
  }
};

exports.retryFailed = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const result = await campaignService.retryFailed(tenantId, id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getCampaignStats = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const stats = await campaignService.getCampaignStats(tenantId, id);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

exports.getInteractions = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const result = await campaignService.getInteractions(tenantId, id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
