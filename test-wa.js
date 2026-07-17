const sessionManager = require('./src/modules/whatsapp/session.manager');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) return console.log('No tenants');
  const t = tenants[0];
  console.log('Tenant:', t.id);
  
  await sessionManager.createSession(t.id);
  
  setTimeout(async () => {
    const sock = sessionManager.getSession(t.id);
    if (!sock) return console.log('No sock');
    
    try {
      const res = await sock.onWhatsApp('963932903237');
      console.log('onWhatsApp:', res);
    } catch (e) {
      console.log('error:', e);
    }
    process.exit(0);
  }, 5000);
}
run();
