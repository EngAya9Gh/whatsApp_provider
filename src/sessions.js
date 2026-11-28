// WhatsApp QR (Baileys) sessions process: holds the phone connections, answers the api's calls on them
// (modules/whatsapp/session.rpc.js) and sends the QR campaigns. Runs next to the api (started with
// QR_SESSIONS=remote) and the worker — see ecosystem.config.js. A deploy or a memory restart of the api
// no longer disconnects the numbers; this process restarts only when its own code changes.
process.env.PROCESS_ROLE = 'sessions';

const logger = require('./utils/logger');
const { redisClient } = require('./config/redis');
const connectMongo = require('./config/mongo');
const socketService = require('./services/socket.service');

let rpc = null;
let campaignWorker = null;

const start = async () => {
  try {
    await redisClient.connect();
    logger.info('[Sessions] Connected to Redis');
    // The QR, connection status and chat events reach the dashboards through Redis and the api process
    socketService.useRedisEmitter(redisClient);
    await connectMongo();

    await require('./modules/whatsapp/session.manager').restoreAllSessions();
    rpc = require('./modules/whatsapp/session.rpc');
    rpc.startWorker(require('./modules/whatsapp/whatsapp.service'));
    ({ campaignWorker } = require('./workers/campaign.worker'));
    logger.info('[Sessions] Running: WhatsApp QR sessions, their calls from the api, QR campaigns');
  } catch (error) {
    console.error('SESSIONS CRASH:', error);
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('[Sessions] Shutting down: finishing the calls in progress…');
  try {
    await rpc?.close();
    await campaignWorker?.close();
    await redisClient.quit();
    await require('mongoose').disconnect();
  } catch (e) {
    logger.error(`[Sessions] Shutdown error: ${e.message}`);
  }
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
