// Background worker process: Meta webhooks, Meta campaigns and the ticket auto-close scheduler, without
// the HTTP API. Start it next to the API (PROCESS_ROLE=api) — see ecosystem.config.js.
process.env.PROCESS_ROLE = 'worker';

const logger = require('./utils/logger');
const { redisClient } = require('./config/redis');
const connectMongo = require('./config/mongo');
const socketService = require('./services/socket.service');

let workers = [];

const start = async () => {
  try {
    await redisClient.connect();
    logger.info('[Worker] Connected to Redis');
    // Live dashboard updates go through Redis to the API process
    socketService.useRedisEmitter(redisClient);
    await connectMongo();

    workers = [
      require('./workers/meta.webhook.worker').worker,
      require('./workers/meta.campaign.worker').worker
    ].filter(Boolean);
    require('./services/ticketScheduler').start();
    require('./services/campaignBillingScheduler').start();
    require('./services/channelBillingScheduler').start();
    require('./modules/campaign/campaign.dispatcher').start();
    logger.info('[Worker] Running: Meta webhooks, Meta campaigns (in waves), ticket auto-close, campaign refunds');
  } catch (error) {
    console.error('WORKER CRASH:', error);
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('[Worker] Shutting down: finishing the jobs in progress…');
  try {
    require('./services/ticketScheduler').stop();
    require('./services/campaignBillingScheduler').stop();
    require('./services/channelBillingScheduler').stop();
    await require('./modules/campaign/campaign.dispatcher').stop();
    await Promise.all(workers.map(w => w.close()));
    await redisClient.quit();
    await require('mongoose').disconnect();
  } catch (e) {
    logger.error(`[Worker] Shutdown error: ${e.message}`);
  }
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
