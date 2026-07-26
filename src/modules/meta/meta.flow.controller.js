const metaFlowService = require('./meta.flow.service');

exports.listFlows = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const result = await metaFlowService.listFlows(req.tenant.id, channelId);
    res.json({ success: true, data: result.data || result });
  } catch (error) {
    next(error);
  }
};

exports.createFlow = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const result = await metaFlowService.createFlow(req.tenant.id, channelId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.uploadFlowJson = async (req, res, next) => {
  try {
    const { channelId, flowId } = req.params;
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'Flow JSON file is required' });
    }
    const file = req.files.file[0];
    const result = await metaFlowService.uploadFlowJson(req.tenant.id, channelId, flowId, file.buffer, file.originalname);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.publishFlow = async (req, res, next) => {
  try {
    const { channelId, flowId } = req.params;
    const result = await metaFlowService.publishFlow(req.tenant.id, channelId, flowId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.deleteFlow = async (req, res, next) => {
  try {
    const { channelId, flowId } = req.params;
    const result = await metaFlowService.deleteFlow(req.tenant.id, channelId, flowId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
