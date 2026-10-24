const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatThread', required: true, index: true },
  direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], required: true },
  type: { type: String, default: 'TEXT' }, 
  content: { type: String },
  hasMedia: { type: Boolean, default: false },
  mediaUrl: { type: String },
  mediaMime: { type: String },
  status: { type: String }, 
  metaMessageId: { type: String, index: true },
  ticketId: { type: String, index: true },
  isInternal: { type: Boolean, default: false },
  // Sub-user who sent an outbound message (null for the owner, API or automations)
  senderId: { type: String, default: null },
  // Sent by the system (away reply, rating thanks) — excluded from response-time stats
  isAutomated: { type: Boolean, default: false },
  // Internal notes: team members mentioned with @ (member keys: 'owner' or sub-user id)
  mentions: { type: [String], default: [] }
}, {
  timestamps: true,
  collection: 'chat_messages'
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
