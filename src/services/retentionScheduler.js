// Deletes old rows nobody reads any more, so the tables and their indexes stay small: once a day, in
// batches, only for the kinds the admin gave a period (admin Settings → Data retention; empty = keep).
//   retentionMessageLogsDays          message_logs: send logs of the API / Send page (usage counters,
//                                     invoices and campaign totals live elsewhere and are not touched)
//   retentionAiUsageDays              ai_usage: one row per AI request (quotas look at the current month)
//   retentionChatMessagesDays         chat_messages (MongoDB): the conversations themselves stay
//   retentionCampaignDeliveriesDays   campaign_deliveries (MongoDB): delivery ticks of campaign messages,
//                                     read for refunds up to 14 days and for showing a campaign message in
//                                     a chat up to 30 days — default 90
const logger = require('../utils/logger');

const INTERVAL_MS = 24 * 60 * 60 * 1000;
const FIRST_RUN_MS = 10 * 60 * 1000;
const LOCK_KEY = 'lock:retention';
const BATCH = 5000;
const DEFAULTS = { retentionCampaignDeliveriesDays: 90 };
const KEYS = ['retentionMessageLogsDays', 'retentionAiUsageDays', 'retentionChatMessagesDays', 'retentionCampaignDeliveriesDays'];

let intervalId = null;
let running = false;

/** The period of one kind in whole days, or null when that kind is kept forever */
function daysOf(data, key) {
  const raw = data?.[key] === undefined || data?.[key] === null || data?.[key] === '' ? DEFAULTS[key] : data[key];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}
const cutoff = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/** Rows of a MySQL table older than `date`, deleted BATCH at a time so the table is never locked for long */
async function deleteMysqlBefore(table, column, date) {
  const prisma = require('../config/prisma');
  let total = 0;
  for (;;) {
    const n = await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\` WHERE \`${column}\` < ? LIMIT ${BATCH}`, date);
    total += n;
    if (n < BATCH) return total;
  }
}

/** Same for a MongoDB collection (by ids, so each delete is a short operation) */
async function deleteMongoBefore(Model, column, date) {
  let total = 0;
  for (;;) {
    const ids = (await Model.find({ [column]: { $lt: date } }).select('_id').limit(BATCH).lean()).map(d => d._id);
    if (!ids.length) return total;
    const r = await Model.deleteMany({ _id: { $in: ids } });
    total += r.deletedCount || 0;
    if (ids.length < BATCH) return total;
  }
}

/** One pass over every kind with a period; returns what was deleted, e.g. { messageLogs: 1200 } */
async function run() {
  const prisma = require('../config/prisma');
  const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
  const data = settings?.data || {};
  const out = {};
  let days;
  if ((days = daysOf(data, 'retentionMessageLogsDays'))) out.messageLogs = await deleteMysqlBefore('message_logs', 'created_at', cutoff(days));
  if ((days = daysOf(data, 'retentionAiUsageDays'))) out.aiUsage = await deleteMysqlBefore('ai_usage', 'created_at', cutoff(days));
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) {
    if ((days = daysOf(data, 'retentionChatMessagesDays'))) out.chatMessages = await deleteMongoBefore(require('../models/mongo/ChatMessage'), 'createdAt', cutoff(days));
    if ((days = daysOf(data, 'retentionCampaignDeliveriesDays'))) out.campaignDeliveries = await deleteMongoBefore(require('../models/mongo/CampaignDelivery'), 'createdAt', cutoff(days));
  }
  return out;
}

async function tick() {
  if (running) return;
  running = true;
  try {
    // With several server processes only one of them runs per day (Redis lock left to expire)
    const { redisClient } = require('../config/redis');
    if (redisClient.status === 'ready') {
      const locked = (await redisClient.set(LOCK_KEY, String(process.pid), 'PX', INTERVAL_MS - 60 * 60 * 1000, 'NX')) === 'OK';
      if (!locked) return;
    }
    const out = await run();
    const parts = Object.entries(out).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`);
    if (parts.length) logger.info(`[Retention] Deleted old rows: ${parts.join(', ')}`);
  } catch (err) {
    logger.error(`[Retention] Run failed: ${err.message}`);
  } finally {
    running = false;
  }
}

function start() {
  if (intervalId) return;
  setTimeout(tick, FIRST_RUN_MS).unref();
  intervalId = setInterval(tick, INTERVAL_MS);
  intervalId.unref();
  logger.info('[Retention] Daily cleanup of old rows started');
}

function stop() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

module.exports = { start, stop, run, daysOf, KEYS, DEFAULTS };
