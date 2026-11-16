const logger = require('../utils/logger');

// Every 10 minutes: mark finished campaigns COMPLETED and refund their failed messages
// (late failures arrive from Meta's status webhooks after the campaign has finished sending).
const INTERVAL_MS = 10 * 60 * 1000;
const LOCK_KEY = 'lock:campaign-billing-sweep';

let intervalId = null;
let running = false;

async function runSweep() {
  if (running) return;
  running = true;
  try {
    // With several server processes only one of them sweeps per interval (Redis lock left to expire)
    const { redisClient } = require('../config/redis');
    if (redisClient.status === 'ready') {
      const locked = (await redisClient.set(LOCK_KEY, String(process.pid), 'PX', INTERVAL_MS - 60 * 1000, 'NX')) === 'OK';
      if (!locked) return;
    }
    const { sweep } = require('../modules/campaign/campaign.billing');
    const result = await sweep();
    if (result.refunded > 0) logger.info(`[CampaignBilling] Sweep refunded ${result.refunded} across ${result.campaigns} campaigns`);
  } catch (err) {
    logger.error(`[CampaignBilling] Sweep failed: ${err.message}`);
  } finally {
    running = false;
  }
}

function start() {
  if (intervalId) return;
  setTimeout(runSweep, 60 * 1000).unref();
  intervalId = setInterval(runSweep, INTERVAL_MS);
  intervalId.unref();
  logger.info('[CampaignBilling] Campaign refund sweep started (every 10 minutes)');
}

function stop() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

module.exports = { start, stop, runSweep };
