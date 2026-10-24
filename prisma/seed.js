const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = require('../src/config/defaultPlans');

  for (const p of plans) {
    await prisma.planSetting.upsert({
      where: { planCode: p.planCode },
      update: p,
      create: p
    });
  }
  
  // Clean up any old unused plans if they exist
  try { await prisma.planSetting.delete({ where: { planCode: 'ADVANCED' } }); } catch(e) {}

  console.log('Database seeded with standard plans.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
