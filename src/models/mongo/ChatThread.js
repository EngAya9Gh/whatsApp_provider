const mongoose = require('mongoose');

const ChatThreadSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, index: true },
  contactPhone: { type: String, required: true },
  contactName: { type: String },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'chat_threads'
});

// Compound index for finding unique thread per contact
ChatThreadSchema.index({ tenantId: 1, channelId: 1, contactPhone: 1 }, { unique: true });

module.exports = mongoose.model('ChatThread', ChatThreadSchema);
