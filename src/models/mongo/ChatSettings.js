const mongoose = require('mongoose');

// Per-tenant live chat settings (one document per tenant)
const ChatSettingsSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true },
  // IANA timezone used for shifts and working hours
  timezone: { type: String, default: 'Asia/Riyadh' },
  stages: {
    enabled: { type: Boolean, default: false },
    // Empty = applies to all channels
    channelIds: { type: [String], default: [] },
    // Put new conversations into the first MAIN stage automatically
    autoAssignEntry: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  collection: 'chat_settings'
});

module.exports = mongoose.model('ChatSettings', ChatSettingsSchema);
