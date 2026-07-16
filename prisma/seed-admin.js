const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@aya.sa';
  const password = 'password123'; // The default password, they can change it if needed

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash
    }
  });

  console.log(`Admin account seeded or updated: ${admin.email}`);
  console.log(`Password set to: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
