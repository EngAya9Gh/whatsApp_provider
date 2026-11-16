const pino = require('pino');
const config = require('../config/env');

const logger = pino({
  // LOG_LEVEL overrides (the tests use 'silent')
  level: process.env.LOG_LEVEL || (config.env === 'development' ? 'debug' : 'info'),
  transport: config.env === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

module.exports = logger;
