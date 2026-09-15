const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const channels = await prisma.whatsAppChannel.findMany();
  console.log(JSON.stringify(channels, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
