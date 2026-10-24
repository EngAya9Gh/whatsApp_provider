const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Shift = require('../../models/mongo/Shift');
const ShiftAssignment = require('../../models/mongo/ShiftAssignment');
const ChatSettings = require('../../models/mongo/ChatSettings');

const DEFAULT_TIMEZONE = 'Asia/Riyadh';
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const isValidTimezone = (timezone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/** Local date ("YYYY-MM-DD"), weekday (0 = Sunday) and minutes since midnight in a timezone */
function localClock(timezone, date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      weekday: 'short'
    }).formatToParts(date).map(p => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

const previousDate = (ymd) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Whether someone is working right now, given the shift they have today and the one they had
 * yesterday (an overnight shift that started yesterday may still be running after midnight).
 */
function isWorkingAt(shiftToday, shiftYesterday, clock) {
  if (shiftToday && shiftToday.days.includes(clock.weekday)) {
    const start = toMinutes(shiftToday.startTime);
    const end = toMinutes(shiftToday.endTime);
    if (start === end) return true;
    if (start < end ? clock.minutes >= start && clock.minutes < end : clock.minutes >= start) return true;
  }
  if (shiftYesterday) {
    const start = toMinutes(shiftYesterday.startTime);
    const end = toMinutes(shiftYesterday.endTime);
    const yesterday = (clock.weekday + 6) % 7;
    if (start > end && shiftYesterday.days.includes(yesterday) && clock.minutes < end) return true;
  }
  return false;
}

/** shiftId in effect on `ymd`, from a user's assignments sorted by effectiveFrom descending */
const shiftIdOn = (assignmentsDesc, ymd) => {
  const current = assignmentsDesc.find(a => a.effectiveFrom <= ymd);
  return current ? current.shiftId : null;
};

const formatShift = (shift) => ({
  id: shift._id.toString(),
  name: shift.name,
  color: shift.color,
  startTime: shift.startTime,
  endTime: shift.endTime,
  days: shift.days,
  sortOrder: shift.sortOrder
});

function validateShift({ name, startTime, endTime, days }) {
  if (!name || !String(name).trim()) throw { status: 400, message: 'Shift name is required' };
  if (!TIME_RE.test(startTime || '') || !TIME_RE.test(endTime || '')) throw { status: 400, message: 'Times must be in HH:mm format' };
  if (!Array.isArray(days) || days.length === 0) throw { status: 400, message: 'Pick at least one day' };
  if (days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw { status: 400, message: 'Invalid day' };
}

class ShiftService {
  async getTimezone(tenantId) {
    const settings = await ChatSettings.findOne({ tenantId }).select('timezone').lean();
    return settings?.timezone || DEFAULT_TIMEZONE;
  }

  async setTimezone(tenantId, timezone) {
    if (!timezone || !isValidTimezone(timezone)) throw { status: 400, message: 'Invalid timezone' };
    await ChatSettings.findOneAndUpdate({ tenantId }, { $set: { timezone } }, { upsert: true });
    return timezone;
  }

  async listShifts(tenantId) {
    const shifts = await Shift.find({ tenantId }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    return shifts.map(formatShift);
  }

  async createShift(tenantId, data) {
    validateShift(data);
    const count = await Shift.countDocuments({ tenantId });
    const shift = await Shift.create({
      tenantId,
      name: String(data.name).trim(),
      color: data.color || '#3b82f6',
      startTime: data.startTime,
      endTime: data.endTime,
      days: [...new Set(data.days)].sort((a, b) => a - b),
      sortOrder: count
    });
    return formatShift(shift);
  }

  async updateShift(tenantId, id, data) {
    if (!mongoose.isValidObjectId(id)) throw { status: 404, message: 'Shift not found' };
    validateShift(data);
    const shift = await Shift.findOneAndUpdate(
      { _id: id, tenantId },
      {
        $set: {
          name: String(data.name).trim(),
          color: data.color || '#3b82f6',
          startTime: data.startTime,
          endTime: data.endTime,
          days: [...new Set(data.days)].sort((a, b) => a - b)
        }
      },
      { returnDocument: 'after' }
    );
    if (!shift) throw { status: 404, message: 'Shift not found' };
    return formatShift(shift);
  }

  async deleteShift(tenantId, id) {
    if (!mongoose.isValidObjectId(id)) throw { status: 404, message: 'Shift not found' };
    const shift = await Shift.findOneAndDelete({ _id: id, tenantId });
    if (!shift) throw { status: 404, message: 'Shift not found' };
    // People on this shift are left without a shift (their history stays)
    await ShiftAssignment.updateMany({ tenantId, shiftId: id }, { $set: { shiftId: null } });
  }

  /** Put a sub-user on a shift (or no shift) from a date — replaces any change on that same date */
  async assignShift(tenantId, { subUserId, shiftId, effectiveFrom }, createdBy) {
    if (!DATE_RE.test(effectiveFrom || '')) throw { status: 400, message: 'effectiveFrom must be YYYY-MM-DD' };

    const subUser = await prisma.subUser.findFirst({ where: { id: subUserId || '', tenantId }, select: { id: true } });
    if (!subUser) throw { status: 404, message: 'Team member not found' };

    if (shiftId) {
      const shift = mongoose.isValidObjectId(shiftId) ? await Shift.findOne({ _id: shiftId, tenantId }).lean() : null;
      if (!shift) throw { status: 404, message: 'Shift not found' };
    }

    const assignment = await ShiftAssignment.findOneAndUpdate(
      { tenantId, subUserId, effectiveFrom },
      { $set: { shiftId: shiftId || null, createdBy } },
      { upsert: true, returnDocument: 'after' }
    );
    return { id: assignment._id.toString(), subUserId, shiftId: assignment.shiftId, effectiveFrom };
  }

  async deleteAssignment(tenantId, id) {
    if (!mongoose.isValidObjectId(id)) throw { status: 404, message: 'Assignment not found' };
    const deleted = await ShiftAssignment.findOneAndDelete({ _id: id, tenantId });
    if (!deleted) throw { status: 404, message: 'Assignment not found' };
  }

  async _loadState(tenantId) {
    const [timezone, shifts, assignments] = await Promise.all([
      this.getTimezone(tenantId),
      Shift.find({ tenantId }).lean(),
      ShiftAssignment.find({ tenantId }).sort({ effectiveFrom: -1 }).lean()
    ]);
    const shiftMap = Object.fromEntries(shifts.map(s => [s._id.toString(), s]));
    const byUser = {};
    for (const a of assignments) (byUser[a.subUserId] = byUser[a.subUserId] || []).push(a);
    return { timezone, shifts, shiftMap, byUser };
  }

  _isUserWorking(state, subUserId, clock) {
    const list = state.byUser[subUserId] || [];
    const today = state.shiftMap[shiftIdOn(list, clock.date)];
    const yesterday = state.shiftMap[shiftIdOn(list, previousDate(clock.date))];
    return isWorkingAt(today, yesterday, clock);
  }

  /** Sub-user ids whose shift is running right now */
  async getOnShiftUserIds(tenantId, now = new Date()) {
    const state = await this._loadState(tenantId);
    const clock = localClock(state.timezone, now);
    return Object.keys(state.byUser).filter(id => this._isUserWorking(state, id, clock));
  }

  /** Everything the shifts screen needs: shifts, and each member's current/upcoming shift */
  async getSchedule(tenantId, now = new Date()) {
    const [state, members] = await Promise.all([
      this._loadState(tenantId),
      prisma.subUser.findMany({
        where: { tenantId },
        select: { id: true, name: true, role: true, isActive: true },
        orderBy: { name: 'asc' }
      })
    ]);
    const clock = localClock(state.timezone, now);

    return {
      timezone: state.timezone,
      today: clock.date,
      shifts: state.shifts.sort((a, b) => a.sortOrder - b.sortOrder).map(formatShift),
      members: members.map(m => {
        const list = state.byUser[m.id] || [];
        const current = list.find(a => a.effectiveFrom <= clock.date) || null;
        return {
          ...m,
          currentShiftId: current?.shiftId || null,
          currentSince: current?.effectiveFrom || null,
          currentAssignmentId: current ? current._id.toString() : null,
          onShiftNow: this._isUserWorking(state, m.id, clock),
          upcoming: list
            .filter(a => a.effectiveFrom > clock.date)
            .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
            .map(a => ({ id: a._id.toString(), shiftId: a.shiftId, effectiveFrom: a.effectiveFrom }))
        };
      })
    };
  }
}

module.exports = new ShiftService();
module.exports.localClock = localClock;
module.exports.isWorkingAt = isWorkingAt;
