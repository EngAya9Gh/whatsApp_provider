const mongoose = require('mongoose');

// Conversation tags (e.g. VIP, مهم) — tenant-defined, attached to threads via ChatThread.tagIds
const ChatTagSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#64748b' },
  isPinned: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'chat_tags'
});

ChatTagSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ChatTag', ChatTagSchema);
