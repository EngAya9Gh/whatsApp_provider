const mongoose = require('mongoose');

// Meta delivery status of one campaign message, keyed by its WhatsApp message id (wamid).
// Kept apart from CampaignTarget.status, which stays SENT / FAILED for the campaign screens.
const CampaignDeliverySchema = new mongoose.Schema({
  wamid: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  campaignId: { type: String, required: true, index: true },
  targetId: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
  // For Live Chat: campaigns do not open conversations, but when the customer replies, the campaign
  // messages they got are added to the conversation (chat.service attachCampaignMessages)
  channelId: { type: String, default: null },
  phone: { type: String, default: null }, // digits only, like ChatThread.contactPhone
  preview: { type: String, default: null }, // the template text as the customer received it
  campaignName: { type: String, default: null },
  inChatAt: { type: Date, default: null } // when it was added to the conversation
}, {
  timestamps: true,
  collection: 'campaign_deliveries'
});
CampaignDeliverySchema.index({ tenantId: 1, channelId: 1, phone: 1, inChatAt: 1 });

// Status only moves forward (sent → delivered → read); failed replaces anything but read
CampaignDeliverySchema.statics.applyStatus = function (wamid, status) {
  const earlier = { delivered: ['sent'], read: ['sent', 'delivered'], failed: ['sent', 'delivered'] }[status];
  if (!earlier) return Promise.resolve(null);
  return this.updateOne({ wamid, status: { $in: earlier } }, { $set: { status } });
};

module.exports = mongoose.model('CampaignDelivery', CampaignDeliverySchema);
