const mongoose = require('mongoose');

// Weekly working hours of one channel (number), with an automatic reply sent outside them.
// Times are in the tenant timezone (ChatSettings.timezone); to <= from means it ends after midnight.
const ChannelHoursSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  days: [{
    _id: false,
    day: { type: Number, required: true }, // 0 = Sunday … 6 = Saturday
    open: { type: Boolean, default: false },
    from: { type: String, default: '09:00' },
    to: { type: String, default: '17:00' }
  }],
  awayMessage: { type: String, default: '' }
}, {
  timestamps: true,
  collection: 'channel_hours'
});

ChannelHoursSchema.index({ tenantId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('ChannelHours', ChannelHoursSchema);
