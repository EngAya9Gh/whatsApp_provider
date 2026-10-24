const mongoose = require('mongoose');

const ChatThreadSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, index: true },
  contactPhone: { type: String, required: true },
  contactName: { type: String },
  crmClientId: { type: String },
  crmSyncedAt: { type: Date },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount: { type: Number, default: 0 },
  // Last customer message — opens Meta's 24h customer-service window
  lastInboundAt: { type: Date },
  // Last automatic "outside working hours" reply (to avoid repeating it)
  awayMessageSentAt: { type: Date },
  tagIds: { type: [String], default: [] },
  stageId: { type: String, default: null },
  stageHistory: [{
    _id: false,
    stageId: { type: String, default: null },
    changedBy: { type: String }, // sub-user id, 'OWNER' or 'SYSTEM'
    changedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  collection: 'chat_threads'
});

// Compound index for finding unique thread per contact
ChatThreadSchema.index({ tenantId: 1, channelId: 1, contactPhone: 1 }, { unique: true });

module.exports = mongoose.model('ChatThread', ChatThreadSchema);
