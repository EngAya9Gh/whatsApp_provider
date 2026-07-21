const adminService = require('./src/modules/admin/admin.service.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const tenant = await prisma.tenant.findFirst();
  console.log('Before:', tenant.customFeatures);
  
  await adminService.updateSettings(tenant.id, {
    customFeatures: { "BULK_CAMPAIGN": true }
  });
  
  const updated = await prisma.tenant.findFirst({ where: { id: tenant.id } });
  console.log('After:', updated.customFeatures);
}
run().catch(console.error);
