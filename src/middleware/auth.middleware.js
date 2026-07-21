const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Check if tenant still exists and is active
    const tenant = await prisma.tenant.findUnique({
      where: { id: decoded.tenantId },
      select: { id: true, name: true, email: true, isActive: true, sessionStatus: true, plan: true, metaEnabled: true, customFeatures: true }
    });

    if (!tenant) {
      return res.status(401).json({ error: 'Unauthorized: Tenant not found' });
    }

    if (!tenant.isActive) {
      return res.status(403).json({ error: 'Forbidden: Account is disabled' });
    }

    // Attach tenant to request object
    req.tenant = tenant;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = { authMiddleware };
