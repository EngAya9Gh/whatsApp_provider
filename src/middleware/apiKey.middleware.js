const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Middleware to authenticate API requests from clients using their API Key
const apiKeyMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer sk_')) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key format. Use Bearer sk_...' });
    }

    const rawKey = authHeader.split(' ')[1].replace('sk_', '');
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
