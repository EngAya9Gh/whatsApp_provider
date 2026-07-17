const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Middleware to authenticate API requests from clients using their API Key
const apiKeyMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (!token.startsWith('sk_')) {
      // It might be a dashboard JWT token
      const jwt = require('jsonwebtoken');
      const config = require('../config/env');
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const tenant = await prisma.tenant.findUnique({
          where: { id: decoded.tenantId },
          select: { id: true, name: true, email: true, isActive: true, sessionStatus: true }
        });
        if (!tenant || !tenant.isActive) return res.status(401).json({ error: 'Unauthorized' });
        req.tenantId = tenant.id;
        req.tenant = tenant;
        return next();
      } catch (e) {
        console.error('JWT fallback verification failed:', e);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }

    const rawKey = token.replace('sk_', '');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.findFirst({
      where: { 
        keyHash, 
        isActive: true 
      },
      include: {
        tenant: true
      }
    });

    if (!apiKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    if (!apiKey.tenant.isActive) {
      return res.status(403).json({ error: 'Forbidden: Account is disabled' });
    }

    // Async update last used (fire and forget)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    }).catch(err => logger.error('Failed to update API key lastUsedAt', err));

    // Attach tenant ID to request context
    req.tenantId = apiKey.tenant.id;
    req.tenant = apiKey.tenant;
    
    next();
  } catch (error) {
    logger.error('API Key middleware error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { apiKeyMiddleware };
