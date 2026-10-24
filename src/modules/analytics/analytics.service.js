const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ChatThread = require('../../models/mongo/ChatThread');
const ChatMessage = require('../../models/mongo/ChatMessage');
const ChatTag = require('../../models/mongo/ChatTag');
const shiftService = require('../workforce/shift.service');
const { localClock } = require('../workforce/shift.service');
const chatStageService = require('../chat/chat.stage.service');
const billingService = require('../billing/billing.service');

const DAY_MS = 24 * 60 * 60 * 1000;
// Safety cap on rows pulled into memory for one report
const MAX_ROWS = 300000;
const META_CAMPAIGN_TYPES = ['META', 'META_CLOUD'];

// ─── Helpers ──────────────────────────────────────────────────
function buildRange(days) {
  const n = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365);
  const end = new Date();
  const start = new Date(end.getTime() - n * DAY_MS);
  const prevStart = new Date(start.getTime() - n * DAY_MS);
  return { days: n, start, end, prevStart };
}

const between = (date, from, to) => !!date && date >= from && date < to;
const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
const round = (n, digits = 1) => (n === null || n === undefined || Number.isNaN(n) ? null : Math.round(n * 10 ** digits) / 10 ** digits);
const pct = (part, total) => (total ? round((part / total) * 100) : null);
/** % change vs previous period (null when there is nothing to compare with) */
const delta = (current, previous) => (previous && current !== null && current !== undefined ? round(((current - previous) / previous) * 100) : null);
const median = (list) => {
  if (!list.length) return null;
  const s = [...list].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const minutes = (ms) => (ms === null ? null : round(ms / 60000));
const hours = (ms) => (ms === null ? null : round(ms / 3600000));

/** Every local date ("YYYY-MM-DD") of the period, oldest first */
function dateKeys(timezone, start, end) {
  const keys = [];
  for (let t = start.getTime(); t < end.getTime() + DAY_MS; t += DAY_MS) {
    const key = localClock(timezone, new Date(Math.min(t, end.getTime()))).date;
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

const emptyHeatmap = () => Array.from({ length: 7 }, () => Array(24).fill(0));

function addToHeatmap(heatmap, timezone, date) {
  const clock = localClock(timezone, date);
  heatmap[clock.weekday][Math.floor(clock.minutes / 60)]++;
}

/**
 * Human response times: from the first unanswered customer message in a conversation
 * to the next reply written by the team (internal notes and automations do not count).
 */
function responseTimes(messagesAsc) {
  const waiting = new Map();
  const pairs = [];
  for (const m of messagesAsc) {
    const key = String(m.threadId);
    if (m.direction === 'INBOUND') {
      if (!m.isRating && !waiting.has(key)) waiting.set(key, m.createdAt);
    } else if (!m.isInternal && !m.isAutomated && waiting.has(key)) {
      pairs.push({ ms: m.createdAt - waiting.get(key), senderId: m.senderId || null, at: m.createdAt });
      waiting.delete(key);
    }
  }
  return { pairs, waiting };
}

class AnalyticsService {
  // ═══════════════════════════════════════════════════════════
  // Meta (Cloud API) analytics: conversations, tickets, team, stages
  // ═══════════════════════════════════════════════════════════
  async getMetaAnalytics(tenantId, { days, channelId } = {}) {
    const range = buildRange(days);
    const { start, end, prevStart } = range;
    const timezone = await shiftService.getTimezone(tenantId);

    const metaChannels = await prisma.whatsAppChannel.findMany({
      where: { tenantId, providerType: 'META_CLOUD' },
      select: { id: true, name: true, phoneNumber: true, displayPhoneNumber: true }
    });
    const channelIds = channelId ? metaChannels.filter(c => c.id === channelId).map(c => c.id) : metaChannels.map(c => c.id);

    const threads = await ChatThread.find({ tenantId, channelId: { $in: channelIds } })
      .select('_id channelId createdAt stageId tagIds stageHistory')
      .lean();

    // Newest first so a capped result keeps the current period, then back to chronological order
    const messages = (await ChatMessage.aggregate([
      { $match: { threadId: { $in: threads.map(t => t._id) }, createdAt: { $gte: prevStart, $lt: end } } },
      { $sort: { createdAt: -1 } },
      { $limit: MAX_ROWS },
      {
        $project: {
          threadId: 1, direction: 1, type: 1, status: 1, isInternal: 1, isAutomated: 1, senderId: 1, createdAt: 1,
          isRating: { $regexMatch: { input: { $ifNull: ['$content', ''] }, regex: '^\\[العميل قام بتقييم' } }
        }
      }
    ]).allowDiskUse(true)).reverse();

    const cur = messages.filter(m => between(m.createdAt, start, end));
    const prev = messages.filter(m => between(m.createdAt, prevStart, start));
    const inbound = (list) => list.filter(m => m.direction === 'INBOUND' && !m.isRating);
    const outbound = (list) => list.filter(m => m.direction === 'OUTBOUND' && !m.isInternal);

    const curIn = inbound(cur);
    const curOut = outbound(cur);
    const prevIn = inbound(prev);
    const prevOut = outbound(prev);

    const { pairs, waiting } = responseTimes(messages);
    const curPairs = pairs.filter(p => between(p.at, start, end));
    const prevPairs = pairs.filter(p => between(p.at, prevStart, start));
    const awaitingReply = [...waiting.values()].filter(at => between(at, start, end)).length;

    const newConv = threads.filter(t => between(t.createdAt, start, end)).length;
    const prevNewConv = threads.filter(t => between(t.createdAt, prevStart, start)).length;

    // Daily series & heatmap (tenant timezone)
    const keys = dateKeys(timezone, start, end);
    const daily = Object.fromEntries(keys.map(k => [k, { date: k, inbound: 0, outbound: 0 }]));
    const heatmap = emptyHeatmap();
    for (const m of curIn) {
      const key = localClock(timezone, m.createdAt).date;
      if (daily[key]) daily[key].inbound++;
      addToHeatmap(heatmap, timezone, m.createdAt);
    }
    for (const m of curOut) {
      const key = localClock(timezone, m.createdAt).date;
      if (daily[key]) daily[key].outbound++;
    }

    // Delivery funnel of what the team / system sent
    const delivered = curOut.filter(m => m.status === 'DELIVERED' || m.status === 'READ').length;
    const read = curOut.filter(m => m.status === 'READ').length;
    const failed = curOut.filter(m => m.status === 'FAILED').length;

    // ─── Tickets ───
    const ticketScope = { tenantId, ...(channelId ? { channelId } : { channelId: { in: channelIds } }) };
    const [tickets, openNow] = await Promise.all([
      prisma.ticket.findMany({
        where: { ...ticketScope, OR: [{ createdAt: { gte: prevStart } }, { resolvedAt: { gte: prevStart } }] },
        select: { id: true, status: true, createdAt: true, resolvedAt: true, rating: true, assignedToId: true },
        take: MAX_ROWS
      }),
      prisma.ticket.count({ where: { ...ticketScope, status: 'OPEN' } })
    ]);
    const ticketStats = (from, to) => {
      const opened = tickets.filter(t => between(t.createdAt, from, to));
      const closed = tickets.filter(t => between(t.resolvedAt, from, to));
      const rated = closed.filter(t => t.rating);
      return {
        opened: opened.length,
        closed: closed.length,
        avgResolutionHours: hours(avg(closed.map(t => t.resolvedAt - t.createdAt))),
        avgRating: round(avg(rated.map(t => t.rating))),
        ratedCount: rated.length,
        ratingDistribution: [1, 2, 3, 4, 5].map(r => rated.filter(t => t.rating === r).length)
      };
    };
    const curTickets = ticketStats(start, end);
    const prevTickets = ticketStats(prevStart, start);

    // ─── Team ───
    const [members, onShift] = await Promise.all([
      prisma.subUser.findMany({ where: { tenantId }, select: { id: true, name: true, isActive: true }, orderBy: { name: 'asc' } }),
      shiftService.getOnShiftUserIds(tenantId)
    ]);
    const onShiftSet = new Set(onShift);
    const agents = members.map(member => {
      const assigned = tickets.filter(t => t.assignedToId === member.id && between(t.createdAt, start, end));
      const closed = tickets.filter(t => t.assignedToId === member.id && between(t.resolvedAt, start, end));
      const rated = closed.filter(t => t.rating);
      const responses = curPairs.filter(p => p.senderId === member.id);
      return {
        id: member.id,
        name: member.name,
        isActive: member.isActive,
        onShiftNow: onShiftSet.has(member.id),
        ticketsAssigned: assigned.length,
        ticketsClosed: closed.length,
        avgRating: round(avg(rated.map(t => t.rating))),
        avgResolutionHours: hours(avg(closed.map(t => t.resolvedAt - t.createdAt))),
        messagesSent: curOut.filter(m => m.senderId === member.id).length,
        avgResponseMinutes: minutes(avg(responses.map(p => p.ms)))
      };
    }).sort((a, b) => b.ticketsClosed - a.ticketsClosed || b.messagesSent - a.messagesSent);

    // ─── Customer stages & tags ───
    const stageConfig = await chatStageService.getConfig(tenantId);
    let stages = null;
    if (stageConfig.enabled && stageConfig.stages.length > 0) {
      const scoped = threads.filter(t => chatStageService.isActiveForChannel(stageConfig, t.channelId));
      stages = {
        noStage: scoped.filter(t => !t.stageId).length,
        list: stageConfig.stages.map(stage => ({
          ...stage,
          current: scoped.filter(t => t.stageId === stage.id).length,
          // Conversations that moved into this stage during the period
          entered: scoped.filter(t => (t.stageHistory || []).some(h => h.stageId === stage.id && between(new Date(h.changedAt), start, end))).length
        }))
      };
    }
    const tags = (await ChatTag.find({ tenantId }).sort({ sortOrder: 1 }).lean()).map(tag => {
      const id = tag._id.toString();
      return { id, name: tag.name, color: tag.color, count: threads.filter(t => (t.tagIds || []).includes(id)).length };
    });

    // ─── Meta campaigns ───
    const campaignWhere = {
      tenantId,
      campaignType: { in: META_CAMPAIGN_TYPES },
      createdAt: { gte: start, lt: end },
      ...(channelId ? { channelId } : {})
    };
    const [campaigns, targetStatuses] = await Promise.all([
      prisma.campaign.findMany({
        where: campaignWhere,
        select: { id: true, name: true, status: true, createdAt: true, metaCategory: true, _count: { select: { targets: true, interactions: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.campaignTarget.groupBy({ by: ['status'], where: { campaign: campaignWhere }, _count: { _all: true } })
    ]);
    const targetCount = (status) => targetStatuses.filter(t => t.status === status).reduce((s, t) => s + t._count._all, 0);

    return {
      range: { days: range.days, start, end, timezone },
      channels: metaChannels,
      truncated: messages.length >= MAX_ROWS,
      conversations: {
        new: newConv,
        newChange: delta(newConv, prevNewConv),
        active: new Set(cur.map(m => String(m.threadId))).size,
        awaitingReply,
        inbound: curIn.length,
        inboundChange: delta(curIn.length, prevIn.length),
        outbound: curOut.length,
        outboundChange: delta(curOut.length, prevOut.length),
        templatesSent: curOut.filter(m => m.type === 'TEMPLATE').length,
        automated: curOut.filter(m => m.isAutomated).length,
        avgResponseMinutes: minutes(avg(curPairs.map(p => p.ms))),
        medianResponseMinutes: minutes(median(curPairs.map(p => p.ms))),
        avgResponseChange: delta(avg(curPairs.map(p => p.ms)), avg(prevPairs.map(p => p.ms)))
      },
      delivery: {
        sent: curOut.length,
        delivered,
        read,
        failed,
        deliveredRate: pct(delivered, curOut.length),
        readRate: pct(read, curOut.length),
        failedRate: pct(failed, curOut.length)
      },
      daily: keys.map(k => daily[k]),
      heatmap,
      tickets: {
        ...curTickets,
        openNow,
        openedChange: delta(curTickets.opened, prevTickets.opened),
        closedChange: delta(curTickets.closed, prevTickets.closed),
        resolutionChange: delta(curTickets.avgResolutionHours, prevTickets.avgResolutionHours),
        ratingChange: delta(curTickets.avgRating, prevTickets.avgRating)
      },
      agents,
      stages,
      tags,
      campaigns: {
        count: campaigns.length,
        targets: targetStatuses.reduce((s, t) => s + t._count._all, 0),
        sent: targetCount('SENT') + targetCount('DELIVERED') + targetCount('READ'),
        failed: targetCount('FAILED'),
        interactions: campaigns.reduce((s, c) => s + c._count.interactions, 0),
        list: campaigns.slice(0, 10).map(c => ({
          id: c.id, name: c.name, status: c.status, createdAt: c.createdAt, category: c.metaCategory,
          targets: c._count.targets, interactions: c._count.interactions
        }))
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Regular (QR / Baileys) analytics: API sends and campaigns
  // ═══════════════════════════════════════════════════════════
  async getQrAnalytics(tenantId, { days } = {}) {
    const range = buildRange(days);
    const { start, end, prevStart } = range;
    const timezone = await shiftService.getTimezone(tenantId);

    // QR sends are logged without a channel, or on a BAILEYS channel
    const qrScope = { tenantId, OR: [{ channelId: null }, { channel: { providerType: 'BAILEYS' } }] };
    const logs = await prisma.messageLog.findMany({
      where: { ...qrScope, createdAt: { gte: prevStart, lt: end } },
      select: { status: true, messageType: true, createdAt: true, errorMessage: true, phone: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS
    });
    const isSent = (l) => l.status !== 'FAILED' && l.status !== 'QUEUED';

    const cur = logs.filter(l => between(l.createdAt, start, end));
    const prev = logs.filter(l => between(l.createdAt, prevStart, start));
    const curSent = cur.filter(isSent).length;
    const curFailed = cur.filter(l => l.status === 'FAILED').length;
    const prevSent = prev.filter(isSent).length;

    const keys = dateKeys(timezone, start, end);
    const daily = Object.fromEntries(keys.map(k => [k, { date: k, sent: 0, failed: 0 }]));
    const heatmap = emptyHeatmap();
    for (const l of cur) {
      const key = localClock(timezone, l.createdAt).date;
      if (daily[key]) daily[key][l.status === 'FAILED' ? 'failed' : 'sent']++;
      addToHeatmap(heatmap, timezone, l.createdAt);
    }

    const errorCounts = {};
    for (const l of cur.filter(x => x.status === 'FAILED')) {
      const reason = (l.errorMessage || 'Unknown error').slice(0, 120);
      errorCounts[reason] = (errorCounts[reason] || 0) + 1;
    }

    // ─── QR campaigns ───
    const campaignWhere = { tenantId, campaignType: 'BAILEYS', createdAt: { gte: start, lt: end } };
    const campaigns = await prisma.campaign.findMany({
      where: campaignWhere,
      select: { id: true, name: true, status: true, createdAt: true, _count: { select: { interactions: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const perCampaign = campaigns.length
      ? await prisma.campaignTarget.groupBy({
        by: ['campaignId', 'status'],
        where: { campaignId: { in: campaigns.map(c => c.id) } },
        _count: { _all: true }
      })
      : [];
    const campaignRows = campaigns.map(c => {
      const rows = perCampaign.filter(r => r.campaignId === c.id);
      const count = (statuses) => rows.filter(r => statuses.includes(r.status)).reduce((s, r) => s + r._count._all, 0);
      const total = rows.reduce((s, r) => s + r._count._all, 0);
      const sent = count(['SENT', 'DELIVERED', 'READ']);
      return {
        id: c.id, name: c.name, status: c.status, createdAt: c.createdAt,
        total, sent, failed: count(['FAILED']), pending: total - sent - count(['FAILED']),
        interactions: c._count.interactions,
        responseRate: pct(c._count.interactions, sent)
      };
    });

    const [tenant, baileysChannels, usage] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { sessionStatus: true, whatsappPhone: true } }),
      prisma.whatsAppChannel.findMany({ where: { tenantId, providerType: 'BAILEYS' }, select: { id: true, name: true, phoneNumber: true, status: true } }),
      billingService.getUsage(tenantId)
    ]);

    return {
      range: { days: range.days, start, end, timezone },
      truncated: logs.length >= MAX_ROWS,
      connection: { status: tenant?.sessionStatus || 'DISCONNECTED', phone: tenant?.whatsappPhone || null, channels: baileysChannels },
      usage: { messagesSent: usage.messagesSent, messagesFailed: usage.messagesFailed, monthlyLimit: usage.monthlyLimit, unlimited: usage.unlimited, remaining: usage.remaining },
      messages: {
        total: cur.length,
        totalChange: delta(cur.length, prev.length),
        sent: curSent,
        sentChange: delta(curSent, prevSent),
        failed: curFailed,
        successRate: pct(curSent, cur.length),
        recipients: new Set(cur.map(l => l.phone)).size,
        byType: ['OTP', 'CUSTOM', 'INTERACTIVE'].map(type => ({ type, count: cur.filter(l => l.messageType === type).length }))
      },
      daily: keys.map(k => daily[k]),
      heatmap,
      topErrors: Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([reason, count]) => ({ reason, count })),
      campaigns: {
        count: campaignRows.length,
        targets: campaignRows.reduce((s, c) => s + c.total, 0),
        sent: campaignRows.reduce((s, c) => s + c.sent, 0),
        failed: campaignRows.reduce((s, c) => s + c.failed, 0),
        interactions: campaignRows.reduce((s, c) => s + c.interactions, 0),
        list: campaignRows.slice(0, 10)
      }
    };
  }
}

module.exports = new AnalyticsService();
module.exports.responseTimes = responseTimes;
module.exports.dateKeys = dateKeys;
