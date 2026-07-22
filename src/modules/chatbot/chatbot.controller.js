const chatbotService = require('./chatbot.service');
const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

class ChatbotController {
  async getRules(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const rules = await chatbotService.getAutoResponders(tenantId);
      res.status(200).json({ success: true, data: rules });
    } catch (error) {
      next(error);
    }
  }

  async createRule(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { keyword, matchType, responseType, message, lat, lng, locationName, locationAddress, startDate, endDate, campaignId } = req.body;
      
      let mediaPath = null;
      let mediaMime = null;

      if (req.file) {
        mediaPath = req.file.path;
        mediaMime = req.file.mimetype;
      }

      const newRule = await chatbotService.createAutoResponder({
        tenantId,
        keyword,
        matchType: matchType || 'EXACT',
        responseType: responseType || 'TEXT',
        message: message || null,
        mediaPath,
        mediaMime,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        locationName: locationName || null,
        locationAddress: locationAddress || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        campaignId: campaignId || null
      });

      res.status(201).json({ success: true, data: newRule });
    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      next(error);
    }
  }

  async updateRule(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      const { keyword, matchType, responseType, message, isActive, lat, lng, locationName, locationAddress, startDate, endDate, campaignId } = req.body;
      
      const updateData = { keyword, matchType, responseType, message };
      
      // Update campaignId, handling empty strings/null
      updateData.campaignId = campaignId || null;
      
      // Update dates, handling explicit empty strings to unset them
      updateData.startDate = startDate ? new Date(startDate) : null;
      updateData.endDate = endDate ? new Date(endDate) : null;
      
      if (responseType === 'LOCATION') {
        updateData.lat = lat ? parseFloat(lat) : null;
        updateData.lng = lng ? parseFloat(lng) : null;
        updateData.locationName = locationName || null;
        updateData.locationAddress = locationAddress || null;
      }
      
      if (isActive !== undefined) {
        updateData.isActive = isActive === 'true' || isActive === true;
      }

      if (req.file) {
        updateData.mediaPath = req.file.path;
        updateData.mediaMime = req.file.mimetype;
      }

      const updatedRule = await chatbotService.updateAutoResponder(tenantId, id, updateData);
      res.status(200).json({ success: true, data: updatedRule });
    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      next(error);
    }
  }

  async deleteRule(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      
      // Get rule first to delete media if exists
      const rule = await chatbotService.getAutoResponderById(tenantId, id);
      if (rule && rule.mediaPath) {
        fs.unlink(rule.mediaPath, () => {});
      }

      await chatbotService.deleteAutoResponder(tenantId, id);
      res.status(200).json({ success: true, message: 'Rule deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async toggleRuleActive(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const { id } = req.params;
      const { isActive } = req.body;

      const updatedRule = await chatbotService.toggleActive(tenantId, id, isActive);
      res.status(200).json({ success: true, data: updatedRule });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatbotController();
