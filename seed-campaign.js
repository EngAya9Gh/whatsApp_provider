const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const tenantId = 'd6550b31-bff3-4a6a-9572-97871d1451c4';
  
  // Find a channel
  const channel = await prisma.whatsAppChannel.findFirst({ where: { tenantId } });
  
  if (!channel) {
    console.log("No channel found. Cannot create campaign.");
    process.exit(1);
  }

  // Create Campaign
  const campaign = await prisma.campaign.create({
    data: {
      tenantId,
      channelId: channel.id,
      name: 'Summer Sale Offers - Meta API',
      message: 'Hello {{name}}! Enjoy our summer discount. Use code SUMMER20.',
      status: 'COMPLETED',
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });

  console.log(`Campaign created: ${campaign.id}`);

  // Create Targets
  const targets = [
    { phone: '1234567890', status: 'SENT' },
    { phone: '1987654321', status: 'FAILED', error: '[131049] Message Undeliverable: User blocked the sender' },
    { phone: '1122334455', status: 'DELIVERED' },
    { phone: '5544332211', status: 'READ' },
    { phone: '9988776655', status: 'PENDING' },
    { phone: '1231231234', status: 'FAILED', error: '[131026] Message Undeliverable: Number is wrong' }
  ];

  for (const t of targets) {
    const target = await prisma.campaignTarget.create({
      data: {
        campaignId: campaign.id,
        phone: t.phone,
        status: t.status === 'DELIVERED' || t.status === 'READ' ? 'SENT' : t.status,
        error: t.error || null
      }
    });

    // If read, create a button interaction for it just for demo
    if (t.status === 'READ') {
      await prisma.buttonInteraction.create({
        data: {
          tenantId,
          campaignId: campaign.id,
          campaignTargetId: target.id,
          phone: t.phone,
          buttonId: 'btn_yes',
          buttonText: 'Yes, I am interested!',
          interactionType: 'BUTTON'
        }
      });
    }
  }

  console.log("Dummy data seeded successfully.");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
