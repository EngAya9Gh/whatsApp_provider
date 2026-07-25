const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  await prisma.campaign.updateMany({
    where: { name: 'Summer Sale Offers - Meta API' },
    data: { campaignType: 'META', metaCategory: 'MARKETING' }
  });
  console.log('Fixed dummy campaign to META');
}
fix().catch(console.error).finally(() => prisma.$disconnect());
