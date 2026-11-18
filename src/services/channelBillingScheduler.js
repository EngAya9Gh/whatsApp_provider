const logger = require('../utils/logger');

// Every hour: charge the monthly fee of paid channels whose month is over, and switch stopped channels
// back on once their wallet covers the fee (channels/channel.billing.js).
const INTERVAL_MS = 60 * 60 * 1000;
const LOCK_KEY = 'lock:channel-billing';

let intervalId = null;
let running = false;

async function run() {
  if (running) return;
  running = true;
  try {
    // With several server processes only one of them charges per interval (Redis lock left to expire)
    const { redisClient } = require('../config/redis');
    if (redisClient.status === 'ready') {
      const locked = (await redisClient.set(LOCK_KEY, String(process.pid), 'PX', INTERVAL_MS - 5 * 60 * 1000, 'NX')) === 'OK';
      if (!locked) return;
    }
    const result = await require('../modules/channels/channel.billing').chargeDue();
    if (result.charged || result.unpaid || result.freed) {
      logger.info(`[ChannelBilling] charged ${result.charged}, stopped for balance ${result.unpaid}, now free ${result.freed}`);
    }
  } catch (err) {
    logger.error(`[ChannelBilling] Run failed: ${err.message}`);
  } finally {
    running = false;
  }
}

function start() {
  if (intervalId) return;
  setTimeout(run, 2 * 60 * 1000).unref();
  intervalId = setInterval(run, INTERVAL_MS);
  intervalId.unref();
  logger.info('[ChannelBilling] Monthly channel fees started (every hour)');
}

function stop() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

module.exports = { start, stop, run };
