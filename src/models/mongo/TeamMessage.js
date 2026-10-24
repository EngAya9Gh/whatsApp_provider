const mongoose = require('mongoose');

const TeamMessageSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamConversation', required: true },
  senderKey: { type: String, required: true },
  text: { type: String, default: '' },
  // A customer conversation shared with the team: { threadId, contactName, contactPhone }
  threadRef: { type: mongoose.Schema.Types.Mixed, default: null }
}, {
  timestamps: true,
  collection: 'team_messages'
});

TeamMessageSchema.index({ conversationId: 1, _id: -1 });
TeamMessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('TeamMessage', TeamMessageSchema);
