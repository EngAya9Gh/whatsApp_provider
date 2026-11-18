// Public API of the website chat widget (no login: visitors on the tenant's website). Mounted before the
// app's own CORS and body parsing, because any website may call it (each widget can limit the sites).
const express = require('express');
const cors = require('cors');
const path = require('path');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const { redisClient } = require('../../config/redis');
const logger = require('../../utils/logger');
const webchatService = require('./webchat.service');

const router = express.Router();
const WIDGET_FILE = path.join(__dirname, 'widget.js');

/** Per-key limit in Redis (shared by all API processes), in memory until Redis is ready */
function limit(keyPrefix, points, duration, keyOf) {
  const memory = new RateLimiterMemory({ keyPrefix, points, duration });
  let redis = null;
  const useRedis = () => { redis = new RateLimiterRedis({ storeClient: redisClient, keyPrefix: `ratelimit:${keyPrefix}`, points, duration, insuranceLimiter: memory }); };
  if (redisClient.status === 'ready') useRedis(); else redisClient.on('ready', useRedis);
  return async (req, res, next) => {
    try {
      await (redis || memory).consume(keyOf(req));
      next();
    } catch (rejection) {
      if (typeof rejection?.msBeforeNext !== 'number') return next(); // limiter failure: let it through
      res.set('Retry-After', Math.ceil(rejection.msBeforeNext / 1000));
      res.status(429).json({ error: { message: 'Too many requests, try again shortly' } });
    }
  };
}
const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';
const visitorOf = (req) => ({ visitorId: req.get('x-visitor-id') || req.query.v, token: req.get('x-visitor-token') || req.query.t });

const publicApi = express.Router();
publicApi.use(cors({ origin: true, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'X-Visitor-Id', 'X-Visitor-Token'], maxAge: 86400 }));
publicApi.use(express.json({ limit: '16kb' }));

const reply = (fn) => async (req, res) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) logger.error(`[Webchat] ${req.method} ${req.path}: ${error.message}`);
    res.status(status).json({ error: { message: status >= 500 ? 'Something went wrong' : error.message, code: error.code } });
  }
};

publicApi.get('/:channelId/config', limit('webchat:config', 120, 60, clientIp),
  reply(req => webchatService.publicConfig(req.params.channelId, req.get('origin'))));
publicApi.post('/:channelId/session', limit('webchat:session', 30, 600, clientIp),
  reply(req => webchatService.startSession(req.params.channelId, req.get('origin'), req.body || {})));
publicApi.get('/:channelId/messages', limit('webchat:poll', 60, 60, req => visitorOf(req).visitorId || clientIp(req)),
  reply(req => webchatService.visitorMessages(req.params.channelId, req.get('origin'), visitorOf(req), { after: req.query.after, seen: req.query.seen === '1' })));
publicApi.post('/:channelId/messages', limit('webchat:send', 15, 60, req => visitorOf(req).visitorId || clientIp(req)),
  reply(req => webchatService.visitorSend(req.params.channelId, req.get('origin'), visitorOf(req), req.body || {})));
publicApi.get('/:channelId/whatsapp', limit('webchat:wa', 20, 60, clientIp),
  reply(req => webchatService.whatsappLink(req.params.channelId, req.get('origin'), visitorOf(req))));

router.use('/public', publicApi);

// The widget script the tenant puts on their website
router.get('/widget.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.set('Access-Control-Allow-Origin', '*');
  res.type('application/javascript').sendFile(WIDGET_FILE);
});

// A blank page with the widget, to try it before putting it on a website (dashboard "Try it")
router.get('/try/:channelId', (req, res) => {
  const id = String(req.params.channelId).replace(/[^0-9a-f-]/gi, '');
  res.type('html').send(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تجربة ويدجت الموقع</title>
<style>body{font-family:system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;background:#f5f6f8;color:#1f2937;margin:0;padding:48px 20px}main{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:20px;margin:0 0 8px}p{line-height:1.8;color:#4b5563}</style></head>
<body><main><h1>صفحة تجربة ويدجت الموقع</h1><p>هكذا يظهر الويدجت على موقعك. افتحه من الزر في زاوية الصفحة واكتب رسالة: ستصل إلى اللايف شات في لوحة التحكم، وردّك من هناك يظهر هنا.</p></main>
<script src="/api/v1/webchat/widget.js" data-id="${id}" async></script></body></html>`);
});

module.exports = router;
