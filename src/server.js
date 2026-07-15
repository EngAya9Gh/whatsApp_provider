const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { redisClient } = require('./config/redis');
const { Server } = require('socket.io');
const sessionManager = require('./modules/whatsapp/session.manager');

const server = http.createServer(app);

// Setup Socket.io for QR Code streaming
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST']
  }
});
sessionManager.setIo(io);

// Socket.io authentication can be added here
io.on('connection', (socket) => {
  logger.info(`New dashboard client connected: ${socket.id}`);
  
  // Client joins a room based on their tenant ID to receive their specific QR codes
  socket.on('join-tenant', (tenantId) => {
    socket.join(`tenant_${tenantId}`);
    logger.info(`Socket ${socket.id} joined room tenant_${tenantId}`);
  });
});

const startServer = async () => {
  try {
    // Initialize Database and Redis connections
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Restore existing WhatsApp sessions
    await sessionManager.restoreAllSessions();

    server.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port} in ${config.env} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
const shutdown = () => {
  logger.info('Shutting down server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    redisClient.quit();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
