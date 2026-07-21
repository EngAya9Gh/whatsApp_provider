const planService = require('./src/modules/plan/plan.service.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const plan = await prisma.planSetting.findUnique({ where: { planCode: 'FREE' } });
  console.log('Before:', plan.featureFlags);
  
  await planService.updatePlan(plan.id, {
    name: plan.name,
    price: plan.price,
    limit: plan.limit,
    features: plan.features,
    featureFlags: ['TEST_FEATURE']
  });
  
  const updatedPlan = await prisma.planSetting.findUnique({ where: { planCode: 'FREE' } });
  console.log('After:', updatedPlan.featureFlags);
}
run().catch(console.error);
