const mongoose = require('mongoose');

// Customer lifecycle stages (sales pipeline) — independent of ticket status.
// MAIN = the main path (first stage is the entry stage), LOST = the loss path.
const CustomerStageSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#64748b' },
  group: { type: String, enum: ['MAIN', 'LOST'], default: 'MAIN' },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'customer_stages'
});

module.exports = mongoose.model('CustomerStage', CustomerStageSchema);
