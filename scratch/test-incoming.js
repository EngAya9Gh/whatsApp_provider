require('dotenv').config();
const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const chatService = require('../src/modules/chat/chat.service');
const connectMongo = require('../src/config/mongo');

async function test() {
  await connectMongo();
  await prisma.$connect();

  const msg = {
    id: "ABGGFlA5Fpa_" + Date.now(),
    timestamp: "1504902988",
    from: "966535278722",
    from_user_id: "US.13491208655302741918",
    type: "text",
    text: { body: "this is a text message" }
  };

  const channel = await prisma.whatsAppChannel.findFirst();
  if (!channel) {
    console.error("No channels found in DB");
    return process.exit(1);
  }

  console.log(`Testing with Tenant: ${channel.tenantId}, Channel: ${channel.id}`);

  try {
    await chatService.handleIncomingMessage(channel.tenantId, channel.id, msg.from, 'test user name', msg);
    console.log("Success! Message saved to Live Chat MongoDB.");
  } catch (err) {
    console.error("Error saving message:", err);
  }

  process.exit(0);
}

test();
