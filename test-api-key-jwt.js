const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const config = require('./src/config/env');
const prisma = new PrismaClient();

async function run() {
  const email = 'admin@aya.sa';
  const tenant = await prisma.tenant.findUnique({ where: { email } });
  
  const token = jwt.sign({ tenantId: tenant.id }, config.jwt.secret);
  
  // Simulate middleware
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = { 
    status: (code) => ({ json: (data) => console.log('Response:', code, data) }) 
  };
  const next = () => console.log('Next called! req.tenantId =', req.tenantId);
  
  // from apiKeyMiddleware.js
  try {
    const authHeader = req.headers.authorization;
    const tokenVal = authHeader.split(' ')[1];

    if (!tokenVal.startsWith('sk_')) {
      const jwt2 = require('jsonwebtoken');
      const config2 = require('./src/config/env');
      try {
        const decoded = jwt2.verify(tokenVal, config2.jwt.secret);
        const t = await prisma.tenant.findUnique({
          where: { id: decoded.tenantId },
          select: { id: true, name: true, email: true, isActive: true, sessionStatus: true }
        });
        if (!t || !t.isActive) return res.status(401).json({ error: 'Unauthorized' });
        req.tenantId = t.id;
        req.tenant = t;
        return next();
      } catch (e) {
        console.error('JWT fallback verification failed:', e);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }
  } catch(e) {
    console.log('Outer error:', e);
  }
}
run();
