const Redis = require('ioredis');
const config = require('./env');
const logger = require('../utils/logger');

const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  // Retry strategy
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true // Let us manually connect during startup
});

redisClient.on('error', (err) => {
  logger.error('Redis client error', err);
});

redisClient.on('ready', () => {
  logger.info('Redis client connected and ready');
});

module.exports = {
  redisClient
};
