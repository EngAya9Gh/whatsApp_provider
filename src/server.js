const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { redisClient } = require('./config/redis');
const { Server } = require('socket.io');
const sessionManager = require('./modules/whatsapp/session.manager');
const socketService = require('./services/socket.service');
const connectMongo = require('./config/mongo');

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

    // Restore existing WhatsApp sessions
    await sessionManager.restoreAllSessions();

    // Initialize default plans
    const planService = require('./modules/plan/plan.service');
    await planService.initPlans();
    logger.info('Initialized Subscription Plans');

    // Initialize MongoDB
    await connectMongo();

    // Start ticket inactivity auto-close scheduler
    const ticketScheduler = require('./services/ticketScheduler');
    ticketScheduler.start();

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
  } catch (e) {}

  server.close(() => {
    logger.info('HTTP server closed.');
    redisClient.quit();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
