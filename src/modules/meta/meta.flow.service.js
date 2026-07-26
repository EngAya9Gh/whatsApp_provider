const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FormData = require('form-data');

class MetaFlowService {
  async getChannel(tenantId, channelId) {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: channelId, tenantId, providerType: 'META_CLOUD' }
    });
    if (!channel) throw { status: 404, message: 'Meta channel not found' };
    if (!channel.metaWabaId) throw { status: 400, message: 'Meta WABA ID is missing. Please re-authenticate your WhatsApp Business Account.' };
    return channel;
  }

  async listFlows(tenantId, channelId) {
    const channel = await this.getChannel(tenantId, channelId);
    try {
      const response = await axios.get(`https://graph.facebook.com/v19.0/${channel.metaWabaId}/flows`, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` }
      });
      return response.data;
    } catch (error) {
      console.error('[MetaFlowService] listFlows error', error.response?.data || error.message);
      throw { status: 400, message: 'Failed to list flows from Meta', data: error.response?.data };
    }
  }

  async createFlow(tenantId, channelId, data) {
    const channel = await this.getChannel(tenantId, channelId);
    try {
      const response = await axios.post(`https://graph.facebook.com/v19.0/${channel.metaWabaId}/flows`, {
        name: data.name,
        categories: data.categories // e.g. ["SURVEY"]
      }, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` }
      });
      return response.data;
    } catch (error) {
      console.error('[MetaFlowService] createFlow error', error.response?.data || error.message);
      throw { status: 400, message: 'Failed to create flow', data: error.response?.data };
    }
  }

  async uploadFlowJson(tenantId, channelId, flowId, fileBuffer, fileName = 'flow.json') {
    const channel = await this.getChannel(tenantId, channelId);
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename: fileName, contentType: 'application/json' });
      formData.append('name', 'flow.json');
      formData.append('asset_type', 'FLOW_JSON');

      const response = await axios.post(`https://graph.facebook.com/v19.0/${flowId}/assets`, formData, {
        headers: {
          Authorization: `Bearer ${channel.metaAccessToken}`,
          ...formData.getHeaders()
        }
      });
      return response.data;
    } catch (error) {
      console.error('[MetaFlowService] uploadFlowJson error', error.response?.data || error.message);
      throw { status: 400, message: 'Failed to upload flow JSON. Please ensure it passes Meta validation.', data: error.response?.data };
    }
  }

  async publishFlow(tenantId, channelId, flowId) {
    const channel = await this.getChannel(tenantId, channelId);
    try {
      const response = await axios.post(`https://graph.facebook.com/v19.0/${flowId}/publish`, {}, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` }
      });
      return response.data;
    } catch (error) {
      console.error('[MetaFlowService] publishFlow error', error.response?.data || error.message);
      throw { status: 400, message: 'Failed to publish flow. Ensure JSON is uploaded and valid.', data: error.response?.data };
    }
  }

  async deleteFlow(tenantId, channelId, flowId) {
    const channel = await this.getChannel(tenantId, channelId);
    try {
      const response = await axios.delete(`https://graph.facebook.com/v19.0/${flowId}`, {
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` }
      });
      return response.data;
    } catch (error) {
      console.error('[MetaFlowService] deleteFlow error', error.response?.data || error.message);
      throw { status: 400, message: 'Failed to delete flow', data: error.response?.data };
    }
  }
}

module.exports = new MetaFlowService();
