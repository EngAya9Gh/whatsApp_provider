const mongoose = require('mongoose');

// Meta delivery status of one campaign message, keyed by its WhatsApp message id (wamid).
// Kept apart from CampaignTarget.status, which stays SENT / FAILED for the campaign screens.
const CampaignDeliverySchema = new mongoose.Schema({
  wamid: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true, index: true },
  campaignId: { type: String, required: true, index: true },
  targetId: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' }
}, {
  timestamps: true,
  collection: 'campaign_deliveries'
});

// Status only moves forward (sent → delivered → read); failed replaces anything but read
CampaignDeliverySchema.statics.applyStatus = function (wamid, status) {
  const earlier = { delivered: ['sent'], read: ['sent', 'delivered'], failed: ['sent', 'delivered'] }[status];
  if (!earlier) return Promise.resolve(null);
  return this.updateOne({ wamid, status: { $in: earlier } }, { $set: { status } });
};

module.exports = mongoose.model('CampaignDelivery', CampaignDeliverySchema);
