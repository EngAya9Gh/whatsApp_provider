const { RateLimiterRedis } = require('rate-limiter-flexible');
const { redisClient } = require('../config/redis');

// Initialize the rate limiter only if redisClient is ready
let rateLimiter = null;

redisClient.on('ready', () => {
  rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'ratelimit:otp',
    points: 3, // 3 requests
    duration: 15 * 60, // per 15 minutes by IP or Phone
  });
});

const otpRateLimiter = async (req, res, next) => {
  if (!rateLimiter) {
    // If Redis is not connected yet, allow the request (fail-open)
    return next();
  }

  const { phone } = req.body;
  const tenantId = req.tenantId;

  // Rate limit key: limit by tenant + phone number to prevent brute-forcing a specific number
  const key = `${tenantId}:${phone}`;

  try {
    const rateLimiterRes = await rateLimiter.consume(key);
    
    // Set standard RateLimit headers
    res.set('X-RateLimit-Limit', 3);
    res.set('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.set('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
    
    next();
  } catch (rateLimiterRes) {
    res.set('X-RateLimit-Limit', 3);
    res.set('X-RateLimit-Remaining', 0);
    res.set('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
    res.set('Retry-After', Math.ceil(rateLimiterRes.msBeforeNext / 1000));
    
    return res.status(429).json({ 
      error: 'Too Many Requests', 
      message: 'You can only request 3 OTPs per 15 minutes for this phone number.'
    });
  }
};

module.exports = {
  otpRateLimiter
};
