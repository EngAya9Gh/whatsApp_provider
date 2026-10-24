const mongoose = require('mongoose');

// Internal team chat: a direct conversation between two team members, or a named group.
// Members are "member keys": 'owner' for the account owner, otherwise the sub-user id.
const TeamConversationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['DIRECT', 'GROUP'], required: true },
  name: { type: String, default: '' },
  members: { type: [String], default: [], index: true },
  // DIRECT only: the two member keys sorted and joined, so each pair has one conversation
  directKey: { type: String, default: null },
  createdBy: { type: String },
  lastMessageAt: { type: Date, default: Date.now },
  lastMessage: { type: mongoose.Schema.Types.Mixed, default: null }, // { text, senderKey }
  // memberKey → last time they read this conversation
  reads: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  collection: 'team_conversations',
  minimize: false
});

TeamConversationSchema.index(
  { tenantId: 1, directKey: 1 },
  { unique: true, partialFilterExpression: { directKey: { $type: 'string' } } }
);

module.exports = mongoose.model('TeamConversation', TeamConversationSchema);
