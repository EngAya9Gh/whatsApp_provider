const mongoose = require('mongoose');

// One AI agent per tenant: who it is, how it talks, and what it knows about the business
const AiAgentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true },
  name: { type: String, default: 'المساعد الذكي' },
  instructions: { type: String, default: '' },
  knowledge: [{
    _id: false,
    id: { type: String, required: true },
    title: { type: String, default: '' },
    content: { type: String, default: '' }
  }],
  // Replies in one flow session before the chat goes to a person
  maxTurns: { type: Number, default: 8 },
  updatedBy: { type: String }
}, {
  timestamps: true,
  collection: 'ai_agents'
});

module.exports = mongoose.model('AiAgent', AiAgentSchema);
