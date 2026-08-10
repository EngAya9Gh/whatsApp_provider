const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const queryStart = new Date("2026-08-01T12:00:20.090Z");
  const queryEnd = new Date("2026-08-10T12:00:20.090Z");
  
  const targets = await prisma.campaignTarget.findMany({
    where: {
      campaign: {
        createdAt: { gte: queryStart, lte: queryEnd }
      }
    },
    select: { id: true, status: true, campaign: { select: { createdAt: true } } }
  });
  console.log("Targets count:", targets.length);
  if(targets.length > 0) console.log("Sample:", targets[0]);
}
test().catch(console.error).finally(() => prisma.$disconnect());
