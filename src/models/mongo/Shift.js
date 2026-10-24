const mongoose = require('mongoose');

// A named work shift (e.g. Morning 08:00–16:00). Times are in the tenant timezone (ChatSettings.timezone).
// endTime <= startTime means the shift crosses midnight; equal times mean a full day.
const ShiftSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#3b82f6' },
  startTime: { type: String, required: true }, // "HH:mm"
  endTime: { type: String, required: true },   // "HH:mm"
  days: { type: [Number], default: [0, 1, 2, 3, 4] }, // 0 = Sunday … 6 = Saturday
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'shifts'
});

module.exports = mongoose.model('Shift', ShiftSchema);
