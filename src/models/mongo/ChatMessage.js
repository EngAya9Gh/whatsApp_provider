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
  metaMessageId: { type: String, index: true }
}, {
  timestamps: true,
  collection: 'chat_messages'
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
