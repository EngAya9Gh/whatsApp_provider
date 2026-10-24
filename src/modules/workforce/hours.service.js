const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ChannelHours = require('../../models/mongo/ChannelHours');
const ChatThread = require('../../models/mongo/ChatThread');
const shiftService = require('./shift.service');
const { localClock, isWorkingAt } = require('./shift.service');
const logger = require('../../utils/logger');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// Do not repeat the away reply to the same customer more often than this
const AWAY_COOLDOWN_MS = 12 * 60 * 60 * 1000;

const DEFAULT_AWAY_MESSAGE = 'شكراً لتواصلك معنا 🌙 نحن خارج أوقات العمل حالياً، وسنرد عليك في أقرب وقت خلال ساعات الدوام.';

// Sunday–Thursday 09:00–17:00
const defaultDays = () => [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, open: day <= 4, from: '09:00', to: '17:00' }));

const formatHours = (channelId, doc) => ({
  channelId,
  enabled: !!doc?.enabled,
  days: doc?.days?.length === 7
    ? [...doc.days].sort((a, b) => a.day - b.day).map(d => ({ day: d.day, open: d.open, from: d.from, to: d.to }))
    : defaultDays(),
  awayMessage: doc?.awayMessage || DEFAULT_AWAY_MESSAGE
});

/** Whether a channel is open at `clock`, treating each open day like a one-day shift */
function isOpenAt(hours, clock) {
  const asShift = (entry, weekday) => (entry && entry.open ? { startTime: entry.from, endTime: entry.to, days: [weekday] } : null);
  const yesterday = (clock.weekday + 6) % 7;
  const today = hours.days.find(d => d.day === clock.weekday);
  const prev = hours.days.find(d => d.day === yesterday);
  return isWorkingAt(asShift(today, clock.weekday), asShift(prev, yesterday), clock);
}

class HoursService {
  /** Hours of every channel of the tenant (defaults for channels never configured) */
  async listHours(tenantId) {
    const [channels, docs] = await Promise.all([
      // Live chat (and its away replies) runs on Meta Cloud numbers
      prisma.whatsAppChannel.findMany({ where: { tenantId, providerType: 'META_CLOUD' }, select: { id: true } }),
      ChannelHours.find({ tenantId }).lean()
    ]);
    const byChannel = Object.fromEntries(docs.map(d => [d.channelId, d]));
    return channels.map(ch => formatHours(ch.id, byChannel[ch.id]));
  }

  async saveHours(tenantId, channelId, { enabled, days, awayMessage }) {
    const channel = await prisma.whatsAppChannel.findFirst({ where: { id: channelId, tenantId }, select: { id: true } });
    if (!channel) throw { status: 404, message: 'Channel not found' };

    if (!Array.isArray(days) || days.length !== 7) throw { status: 400, message: 'days must list all 7 days' };
    const cleanDays = days.map(d => ({ day: Number(d.day), open: !!d.open, from: d.from, to: d.to }));
    if (new Set(cleanDays.map(d => d.day)).size !== 7 || cleanDays.some(d => d.day < 0 || d.day > 6)) {
      throw { status: 400, message: 'Invalid days' };
    }
    if (cleanDays.some(d => d.open && (!TIME_RE.test(d.from || '') || !TIME_RE.test(d.to || '')))) {
      throw { status: 400, message: 'Times must be in HH:mm format' };
    }
    const message = String(awayMessage || '').trim();
    if (enabled && !message) throw { status: 400, message: 'The away message cannot be empty' };

    const doc = await ChannelHours.findOneAndUpdate(
      { tenantId, channelId },
      { $set: { enabled: !!enabled, days: cleanDays, awayMessage: message } },
      { upsert: true, returnDocument: 'after' }
    ).lean();
    return formatHours(channelId, doc);
  }

  async isChannelOpen(tenantId, channelId, now = new Date()) {
    const doc = await ChannelHours.findOne({ tenantId, channelId }).lean();
    if (!doc || !doc.enabled) return true;
    const timezone = await shiftService.getTimezone(tenantId);
    return isOpenAt(formatHours(channelId, doc), localClock(timezone, now));
  }

  /**
   * Called for each customer message: if the channel is closed now, reply once with the away message.
   * Returns true when a reply was sent.
   */
  async sendAwayMessageIfClosed(tenantId, channelId, thread, now = new Date()) {
    const doc = await ChannelHours.findOne({ tenantId, channelId }).lean();
    if (!doc || !doc.enabled || !doc.awayMessage) return false;

    const timezone = await shiftService.getTimezone(tenantId);
    if (isOpenAt(formatHours(channelId, doc), localClock(timezone, now))) return false;

    // Claim the reply atomically so two quick messages do not trigger two replies
    const claimed = await ChatThread.findOneAndUpdate(
      {
        _id: thread._id,
        $or: [{ awayMessageSentAt: null }, { awayMessageSentAt: { $lt: new Date(now.getTime() - AWAY_COOLDOWN_MS) } }]
      },
      { $set: { awayMessageSentAt: now } }
    );
    if (!claimed) return false;

    const chatService = require('../chat/chat.service');
    await chatService.sendMessage(tenantId, thread._id.toString(), { content: doc.awayMessage, type: 'text' });
    logger.info(`[Hours] Away message sent on channel ${channelId} to thread ${thread._id}`);
    return true;
  }
}

module.exports = new HoursService();
module.exports.isOpenAt = isOpenAt;
module.exports.DEFAULT_AWAY_MESSAGE = DEFAULT_AWAY_MESSAGE;
