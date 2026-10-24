const mongoose = require('mongoose');

// A team of sub-users that handles the conversations of some channels
const TeamSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#8b5cf6' },
  memberIds: { type: [String], default: [] },  // sub-user ids, in round-robin order
  channelIds: { type: [String], default: [] }, // new tickets on these channels are routed to this team
  routing: {
    // ROUND_ROBIN = take turns, LEAST_BUSY = fewest open tickets, MANUAL = no auto-assign
    mode: { type: String, enum: ['ROUND_ROBIN', 'LEAST_BUSY', 'MANUAL'], default: 'ROUND_ROBIN' },
    onlyOnShift: { type: Boolean, default: true },
    stickyOwner: { type: Boolean, default: true } // returning customers go back to their previous agent
  },
  lastAssignedUserId: { type: String, default: null }
}, {
  timestamps: true,
  collection: 'teams'
});

module.exports = mongoose.model('Team', TeamSchema);
