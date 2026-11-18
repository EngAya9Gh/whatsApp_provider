// The tenant's Live Chat channels of every kind (WhatsApp numbers, website widgets), for the pages that
// work per channel: Live Chat, teams and shifts, working hours, team members' channel
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { LIVE_CHAT_PROVIDERS } = require('./channel.kinds');

const prisma = new PrismaClient();
const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const channels = await prisma.whatsAppChannel.findMany({
      where: { tenantId: req.tenant.id, providerType: { in: LIVE_CHAT_PROVIDERS } },
      select: { id: true, providerType: true, name: true, phoneNumber: true, displayPhoneNumber: true, status: true, isCoexistence: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: channels });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
