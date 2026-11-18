// Sends running Meta campaigns in waves, one WhatsApp number at a time.
//
// Every second (in the background worker process) each number gets the next wave of recipients: as many as
// the number may send in a second (Meta: 80 messages per second per number, 20 for a number shared with the
// WhatsApp Business app; we use less so live chat keeps room). Recipients go PENDING → QUEUED (in the send
// queue) → SENT / FAILED. A number never has more than a few seconds of work waiting in the queue, so:
//  - campaigns of different customers / numbers take turns instead of waiting behind one big campaign;
//  - a big campaign does not fill Redis with hundreds of thousands of jobs at once;
//  - pausing or stopping takes effect within seconds;
//  - when Meta says a number sends too fast, only that number waits.
// Scheduled campaigns start here when their time comes. A campaign is COMPLETED when nothing is left to
// send, and its failed messages are refunded then.
const { PrismaClient, Prisma } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

const positive = (v, fallback) => (Number(v) > 0 ? Number(v) : fallback);
function config() {
  return {
    perNumber: positive(process.env.META_CAMPAIGN_RATE_PER_NUMBER, 50),
    perCoexNumber: positive(process.env.META_CAMPAIGN_RATE_PER_COEX_NUMBER, 15),
    total: positive(process.env.META_CAMPAIGN_RATE_PER_SECOND, 150),
    tickMs: positive(process.env.META_CAMPAIGN_TICK_MS, 1000),
    bufferSeconds: 3,
    staleMs: positive(process.env.META_CAMPAIGN_STALE_MS, 15 * 60 * 1000)
  };
}

const THROTTLE_KEY = (channelId) => `wakeel:meta-campaign:throttle:${channelId}`;
const LEADER_KEY = 'wakeel:meta-campaign:dispatcher';
const LEADER_ID = `${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
const OPEN = ['PENDING', 'QUEUED'];

/** Messages per second one number sends campaign messages at */
function rateFor(channel, cfg = config()) {
  return Math.max(1, Math.min(channel?.isCoexistence ? cfg.perCoexNumber : cfg.perNumber, cfg.total));
}

const queue = () => require('../../workers/meta.campaign.worker').metaCampaignQueue;
const redis = () => queue().client;

const parseVariables = (v) => {
  try { return v ? JSON.parse(v) : []; } catch { return []; }
};

function sendJob(campaign, target) {
  return {
    name: 'send-meta-campaign-message',
    data: {
      campaignId: campaign.id,
      targetId: target.id,
      tenantId: campaign.tenantId,
      channelId: campaign.channelId,
      phone: target.phone,
      variables: parseVariables(target.variables),
      templateName: campaign.message,
      templateLanguage: campaign.templateId || null, // templateId keeps the language for META
      metaCategory: campaign.metaCategory,
      headerMedia: campaign.headerMedia || null
    }
  };
}

/** Numbers Meta asked to slow down (the worker sets a key that expires after the pause) */
async function throttledChannels(channelIds) {
  if (!channelIds.length) return new Set();
  const client = await redis();
  const values = await client.mget(channelIds.map(THROTTLE_KEY));
  return new Set(channelIds.filter((_, i) => values[i]));
}

/**
 * Marks a running campaign COMPLETED when nothing is left to send (one statement, so a retry that just
 * put failed recipients back is never closed by mistake), then refunds its failed messages.
 */
async function completeIfDone(campaignId, now = new Date()) {
  const done = await prisma.$executeRaw`
    UPDATE campaigns SET status = 'COMPLETED', completed_at = ${now}
    WHERE id = ${campaignId} AND status = 'RUNNING'
      AND NOT EXISTS (SELECT 1 FROM campaign_targets WHERE campaign_id = ${campaignId} AND status IN (${Prisma.join(OPEN)}))`;
  if (done) {
    logger.info(`[CampaignDispatcher] Campaign ${campaignId} completed`);
    await require('./campaign.billing').settle(campaignId)
      .catch(err => logger.warn(`[CampaignDispatcher] Settling campaign ${campaignId} failed: ${err.message}`));
  }
  return done > 0;
}

/** One wave for every running Meta campaign. Returns { released, campaigns, completed } */
async function tick(now = new Date(), cfg = config()) {
  // Scheduled campaigns whose time has come
  await prisma.campaign.updateMany({
    where: { campaignType: 'META', status: 'SCHEDULED', launchedAt: { not: null }, startDate: { lte: now } },
    data: { status: 'RUNNING' }
  });

  const running = await prisma.campaign.findMany({
    where: { campaignType: 'META', status: 'RUNNING', launchedAt: { not: null } },
    select: { id: true, tenantId: true, channelId: true, message: true, templateId: true, metaCategory: true, headerMedia: true },
    orderBy: { launchedAt: 'asc' }
  });
  if (!running.length) return { released: 0, campaigns: 0, completed: 0 };

  const ids = running.map(c => c.id);
  const queuedRows = await prisma.campaignTarget.groupBy({ by: ['campaignId'], where: { campaignId: { in: ids }, status: 'QUEUED' }, _count: { _all: true } });
  const queued = Object.fromEntries(queuedRows.map(r => [r.campaignId, r._count._all]));

  const channelIds = [...new Set(running.map(c => c.channelId).filter(Boolean))];
  const channels = await prisma.whatsAppChannel.findMany({ where: { id: { in: channelIds } }, select: { id: true, isCoexistence: true } });
  const channelById = Object.fromEntries(channels.map(c => [c.id, c]));
  const throttled = await throttledChannels(channelIds);

  const byChannel = new Map();
  for (const c of running) {
    const key = c.channelId || 'none';
    if (!byChannel.has(key)) byChannel.set(key, []);
    byChannel.get(key).push(c);
  }

  const jobs = [];
  const finished = [];
  for (const [channelId, list] of byChannel) {
    if (throttled.has(channelId)) continue;
    const rate = rateFor(channelById[channelId], cfg);
    const waiting = list.reduce((sum, c) => sum + (queued[c.id] || 0), 0);
    let budget = Math.min(Math.round(rate * cfg.tickMs / 1000), rate * cfg.bufferSeconds - waiting);

    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const take = budget > 0 ? Math.ceil(budget / (list.length - i)) : 0;
      const targets = take > 0
        ? await prisma.campaignTarget.findMany({ where: { campaignId: c.id, status: 'PENDING' }, orderBy: { id: 'asc' }, take, select: { id: true, phone: true, variables: true } })
        : [];
      if (targets.length) {
        await prisma.campaignTarget.updateMany({ where: { id: { in: targets.map(t => t.id) }, status: 'PENDING' }, data: { status: 'QUEUED', queuedAt: now } });
        for (const t of targets) jobs.push(sendJob(c, t));
        budget -= targets.length;
      } else if (!queued[c.id]) {
        finished.push(c.id); // nothing released and nothing in the queue: maybe done (completeIfDone checks)
      }
    }
  }

  for (let i = 0; i < jobs.length; i += 1000) await queue().addBulk(jobs.slice(i, i + 1000));

  let completed = 0;
  for (const id of finished) if (await completeIfDone(id, now)) completed++;
  return { released: jobs.length, campaigns: running.length, completed };
}

/** Recipients left QUEUED much longer than a wave takes (their job was lost, e.g. Redis restarted) go back */
async function recoverStale(now = new Date(), cfg = config()) {
  const open = await prisma.campaign.findMany({ where: { campaignType: 'META', status: { in: ['RUNNING', 'PAUSED'] }, launchedAt: { not: null } }, select: { id: true } });
  if (!open.length) return 0;
  const r = await prisma.campaignTarget.updateMany({
    where: { campaignId: { in: open.map(c => c.id) }, status: 'QUEUED', queuedAt: { lt: new Date(now.getTime() - cfg.staleMs) } },
    data: { status: 'PENDING', queuedAt: null }
  });
  if (r.count) logger.warn(`[CampaignDispatcher] ${r.count} queued campaign messages had no job; sending them again`);
  return r.count;
}

/** With several worker processes only one dispatches (a Redis lease, renewed every tick) */
async function isLeader() {
  const client = await redis();
  if ((await client.set(LEADER_KEY, LEADER_ID, 'PX', 10000, 'NX')) === 'OK') return true;
  if ((await client.get(LEADER_KEY)) === LEADER_ID) {
    await client.pexpire(LEADER_KEY, 10000);
    return true;
  }
  return false;
}

let timer = null;
let busy = false;
let ticks = 0;

async function loop() {
  if (busy) return;
  busy = true;
  try {
    if (!(await isLeader())) return;
    await tick();
    if (++ticks % 60 === 0) await recoverStale();
  } catch (err) {
    logger.error(`[CampaignDispatcher] ${err.message}`);
  } finally {
    busy = false;
  }
}

function start() {
  if (timer) return;
  const cfg = config();
  timer = setInterval(loop, cfg.tickMs);
  timer.unref?.();
  logger.info(`[CampaignDispatcher] Sending Meta campaigns in waves: ${cfg.perNumber}/s per number (${cfg.perCoexNumber}/s shared with the WhatsApp Business app), ${cfg.total}/s in total`);
}

async function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  try {
    const client = await redis();
    if ((await client.get(LEADER_KEY)) === LEADER_ID) await client.del(LEADER_KEY);
  } catch { /* the lease expires by itself */ }
}

module.exports = { config, rateFor, tick, recoverStale, completeIfDone, start, stop, THROTTLE_KEY, OPEN };
