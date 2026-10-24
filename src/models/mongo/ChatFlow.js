const mongoose = require('mongoose');

// Visual WhatsApp flow of one channel. Nodes/edges use the Vue Flow shape:
// node { id, type, position: { x, y }, data }, edge { id, source, target, sourceHandle }.
// Customers only ever run the published copy; the editor works on the draft.
const ChatFlowSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  draft: {
    nodes: { type: Array, default: [] },
    edges: { type: Array, default: [] }
  },
  published: {
    nodes: { type: Array, default: [] },
    edges: { type: Array, default: [] },
    version: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null }
  },
  hasDraftChanges: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'chat_flows'
});

ChatFlowSchema.index({ tenantId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('ChatFlow', ChatFlowSchema);
