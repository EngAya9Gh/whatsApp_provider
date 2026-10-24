const { RateLimiterRedis } = require('rate-limiter-flexible');
const { redisClient } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Builds a Redis-backed rate limiter middleware keyed by tenant + recipient phone.
 * Requests without a phone (e.g. media uploads) share one bucket per tenant.
 * Fails open while Redis is not connected or errors out.
 */
const createRateLimiter = ({ keyPrefix, points, duration, message }) => {
  // Initialize the rate limiter only if redisClient is ready
  let rateLimiter = null;

  redisClient.on('ready', () => {
    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix,
      points,
      duration,
    });
  });

  return async (req, res, next) => {
    if (!rateLimiter) {
      // If Redis is not connected yet, allow the request (fail-open)
      return next();
    }

    const phone = req.body?.phone;
    const tenantId = req.tenantId;
    const key = phone ? `${tenantId}:${phone}` : `${tenantId}`;

    try {
      const rateLimiterRes = await rateLimiter.consume(key);

      // Set standard RateLimit headers
      res.set('X-RateLimit-Limit', points);
      res.set('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
      res.set('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());

      next();
    } catch (rateLimiterRes) {
      // A Redis failure is not a rejection: keep failing open
      if (!rateLimiterRes || typeof rateLimiterRes.msBeforeNext !== 'number') {
        logger.error(`Rate limiter (${keyPrefix}) error`, rateLimiterRes);
        return next();
      }

      res.set('X-RateLimit-Limit', points);
      res.set('X-RateLimit-Remaining', 0);
      res.set('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      res.set('Retry-After', Math.ceil(rateLimiterRes.msBeforeNext / 1000));

      return res.status(429).json({ error: 'Too Many Requests', message });
    }
  };
};

// OTP only: strict, to prevent brute-forcing or spamming a specific number
const otpRateLimiter = createRateLimiter({
  keyPrefix: 'ratelimit:otp',
  points: 3, // 3 requests
  duration: 15 * 60, // per 15 minutes per tenant + phone
  message: 'You can only request 3 OTPs per 15 minutes for this phone number.'
});

// Regular and transactional messages (ERP invoices, notifications, templates):
// high enough for real traffic, low enough to stop a runaway loop hammering one recipient
const messageRateLimiter = createRateLimiter({
  keyPrefix: 'ratelimit:msg',
  points: 30, // 30 requests
  duration: 60, // per minute per tenant + phone
  message: 'Too many messages to this phone number. Limit: 30 per minute.'
});

module.exports = {
  otpRateLimiter,
  messageRateLimiter
};
