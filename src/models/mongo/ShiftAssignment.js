const mongoose = require('mongoose');

// Puts a sub-user on a shift starting from a date. The latest assignment whose
// effectiveFrom <= today is the current one, so rotations can be scheduled ahead.
// shiftId = null means "no shift" from that date.
const ShiftAssignmentSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  subUserId: { type: String, required: true, index: true },
  shiftId: { type: String, default: null },
  effectiveFrom: { type: String, required: true }, // "YYYY-MM-DD" in the tenant timezone
  createdBy: { type: String }
}, {
  timestamps: true,
  collection: 'shift_assignments'
});

ShiftAssignmentSchema.index({ tenantId: 1, subUserId: 1, effectiveFrom: 1 }, { unique: true });

module.exports = mongoose.model('ShiftAssignment', ShiftAssignmentSchema);
