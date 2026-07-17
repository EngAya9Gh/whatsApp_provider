const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const config = require('./src/config/env');
const prisma = new PrismaClient();

async function run() {
  const email = 'admin@aya.sa';
  const tenant = await prisma.tenant.findUnique({ where: { email } });
  if (!tenant) return console.log('tenant not found');
  
  const token = jwt.sign({ tenantId: tenant.id }, config.jwt.secret);
  console.log('Generated token:', token);
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const foundTenant = await prisma.tenant.findUnique({
      where: { id: decoded.tenantId },
      select: { id: true, name: true, email: true, isActive: true, sessionStatus: true }
    });
    console.log('Found tenant:', foundTenant);
  } catch (e) {
    console.log('Error verifying:', e);
  }
  process.exit(0);
}
run();
