const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { redisClient } = require('./config/redis');
const { Server } = require('socket.io');
const sessionManager = require('./modules/whatsapp/session.manager');
const socketService = require('./services/socket.service');
const connectMongo = require('./config/mongo');
const { role, runsBackground } = require('./config/processRole');

const server = http.createServer(app);

// Setup Socket.io for QR Code streaming and Live Chat
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST']
  }
});
sessionManager.setIo(io);
socketService.init(io);

// Only authenticated dashboard users get a socket; the token decides which rooms they join
socketService.setupConnections(io, require('./middleware/auth.middleware').resolveToken);

const startServer = async () => {
  try {
    // Initialize Database and Redis connections
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Dashboard events also travel through Redis, so the background worker process (or a second API
    // process) can reach the browsers connected here
    const { createAdapter } = require('@socket.io/redis-adapter');
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    // Restore existing WhatsApp sessions
    await sessionManager.restoreAllSessions();

    // Initialize default plans
    const planService = require('./modules/plan/plan.service');
    await planService.initPlans();
    logger.info('Initialized Subscription Plans');

    // Initialize MongoDB
    await connectMongo();

    if (runsBackground) {
      // Start the queue workers now rather than on first use, so jobs waiting from before a restart
      // (scheduled or unfinished campaigns, retries) continue right away
      require('./workers/meta.webhook.worker');
      require('./workers/meta.campaign.worker');
      // Ticket inactivity auto-close scheduler
      require('./services/ticketScheduler').start();
      // Campaign completion + refunds of failed messages
      require('./services/campaignBillingScheduler').start();
      require('./services/channelBillingScheduler').start();
      // Meta campaigns go out in waves per WhatsApp number
      require('./modules/campaign/campaign.dispatcher').start();
    }
    logger.info(`Process role: ${role}${runsBackground ? ' (with background jobs)' : ' (background jobs run in src/worker.js)'}`);

    server.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port} in ${config.env} mode`);
    });
  } catch (error) {
    console.error('SERVER CRASH:', error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
const shutdown = () => {
  logger.info('Shutting down server gracefully...');
  try {
    const ticketScheduler = require('./services/ticketScheduler');
    ticketScheduler.stop();
    require('./services/campaignBillingScheduler').stop();
    require('./services/channelBillingScheduler').stop();
    if (runsBackground) require('./modules/campaign/campaign.dispatcher').stop();
  } catch (e) {}

  server.close(() => {
    logger.info('HTTP server closed.');
    redisClient.quit();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
