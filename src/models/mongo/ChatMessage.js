const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatThread', required: true },
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
  // Where a message came from when it was not exchanged through the platform (Coexistence numbers):
  // 'BUSINESS_APP' = sent from the customer's WhatsApp Business app, 'HISTORY' = imported old chat,
  // 'STANDBY' / 'META_AI' = Meta Business Agent. WhatsApp flows: 'FLOW' (a step's message),
  // 'FLOW_AI' (the AI agent step's reply), 'FLOW_HANDOFF' (team note: the flow handed the chat to a person,
  // which is when the team's response time starts). 'CAMPAIGN' = a campaign message, added to the
  // conversation when the customer replied (campaignName says which campaign)
  source: { type: String, default: null },
  campaignName: { type: String, default: null },
  // Buttons of a message the customer can tap, for channels that draw them (the website widget):
  // { body, options: [{ id, title }] } for a question, { body, link: { text, url } } for a link button
  interactive: { type: mongoose.Schema.Types.Mixed, default: undefined },
  // Internal notes: team members mentioned with @ (member keys: 'owner' or sub-user id)
  mentions: { type: [String], default: [] }
}, {
  timestamps: true,
  collection: 'chat_messages'
});

// A conversation's messages newest first (the chat's pages, the AI's context, flows). Replaces the
// index on threadId alone, which this one also serves; a database that has the old `threadId_1`
// index keeps it until someone drops it.
ChatMessageSchema.index({ threadId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
