const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const plans = await prisma.planSetting.findMany({ select: { planCode: true, featureFlags: true } });
  console.log(plans);
  const tenants = await prisma.tenant.findMany({ select: { email: true, customFeatures: true } });
  console.log(tenants);
}
run();
