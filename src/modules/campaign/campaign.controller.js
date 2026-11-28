const campaignService = require('./campaign.service');

exports.createCampaign = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { name, message, templateId, templateName, templateLanguage, interactiveType, startDate, endDate, campaignType, channelId, metaCategory, contactGroupId, countryCode, variableMap, fallbacks } = req.body;
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

    if (!file && !contactGroupId) {
      return res.status(400).json({ error: 'Excel/CSV file or Contact Group is required' });
    }
    
    // For Meta campaigns, templateName is required instead of message
    if (campaignType === 'META') {
      if (!name || !templateName) {
        return res.status(400).json({ error: 'Campaign name and Meta template name are required for Meta campaigns' });
      }
      
      // The account's Meta number (the given one, or its first) is checked by the service
    } else {
      if (!name || (!message && !templateId)) {
        return res.status(400).json({ error: 'Campaign name and either message or template are required' });
      }
    }

    const result = await campaignService.createCampaign({
      tenantId,
      name,
      message: campaignType === 'META' ? templateName : message,
      templateId,
      templateLanguage: campaignType === 'META' ? (templateLanguage || null) : (templateLanguage || 'ar'),
      file,
      image,
      buttons,
      interactiveType: interactiveType || 'TEXT',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      campaignType: campaignType || 'BAILEYS',
      channelId,
      metaCategory,
      contactGroupId,
      headerMedia: campaignType === 'META' ? req.body.headerMedia : undefined,
      countryCode,
      mapping: variableMap,
      fallbacks
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const campaignType = req.query.campaignType;
    const channelId = req.query.channelId;
    const channelIds = channelId ? null : await require('../channels/channel.access').allowedChannelIds(req);
    const campaigns = await campaignService.getCampaigns(tenantId, { page, limit, campaignType, channelId, channelIds });
    res.status(200).json({ 
      success: true, 
      data: campaigns.data, 
      meta: { total: campaigns.total, page: campaigns.page, totalPages: campaigns.totalPages }
    });
  } catch (error) {
    next(error);
  }
};

exports.getTargets = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { page, limit, status, search } = req.query;
    
    const targets = await campaignService.getTargets(tenantId, id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      status,
      search
    });
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
    const { page, limit, search, status } = req.query;
    
    const result = await campaignService.getInteractions(tenantId, id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      search,
      status
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.exportCampaignData = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { type, status } = req.query; // type can be 'targets' or 'interactions'
    
    const csvData = await campaignService.exportCampaignData(tenantId, id, type, status);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=campaign_${String(id).slice(0, 8)}_${type === 'interactions' ? 'interactions' : 'targets'}.csv`);
    res.status(200).send('\ufeff' + csvData); // BOM: Excel shows Arabic text correctly
  } catch (error) {
    next(error);
  }
};


// Meta campaigns: the uploaded file / group checked against the template, before anything is charged
exports.previewAudience = async (req, res, next) => {
  try {
    const result = await campaignService.previewAudience(req.tenant.id, {
      channelId: req.body.channelId,
      templateName: req.body.templateName,
      templateLanguage: req.body.templateLanguage,
      metaCategory: req.body.metaCategory,
      contactGroupId: req.body.contactGroupId,
      countryCode: req.body.countryCode,
      mapping: req.body.variableMap,
      fallbacks: req.body.fallbacks
    }, req.file);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// The Excel file a template's campaign needs (columns + an example row)
exports.sampleFile = async (req, res, next) => {
  try {
    const { buffer, filename } = await campaignService.sampleFile(req.tenant.id, {
      channelId: req.query.channelId,
      templateName: req.query.templateName,
      templateLanguage: req.query.templateLanguage
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

exports.getCampaign = async (req, res, next) => {
  try {
    res.json({ success: true, data: await campaignService.getCampaign(req.tenant.id, req.params.id) });
  } catch (error) {
    next(error);
  }
};

const action = (method) => async (req, res, next) => {
  try {
    res.json(await campaignService[method](req.tenant.id, req.params.id));
  } catch (error) {
    next(error);
  }
};
exports.pauseCampaign = action('pauseCampaign');
exports.resumeCampaign = action('resumeCampaign');
exports.stopCampaign = action('stopCampaign');
