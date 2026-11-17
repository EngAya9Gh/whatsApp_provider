// QR campaigns paid from the wallet do not also use up the plan's monthly message limit; a campaign that was
// not charged (wallet deduction off) still counts, and so do single messages. Needs TEST_REDIS_HOST (the QR
// campaign queue connects to Redis when it loads).
const { test } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_REDIS_HOST');
process.env.QR_CAMPAIGN_GAP_MS = '0';

const targets = {};
let limitReached = true;
const usage = [];
const sent = [];
inject('@prisma/client', {
  PrismaClient: class {
    constructor() {
      this.walletTransaction = { findFirst: async ({ where }) => (where.referenceId === 'paid' ? { id: 'w1' } : null) };
      this.campaignTarget = { update: async ({ where, data }) => { targets[where.id] = data; } };
      this.whatsAppChannel = { findUnique: async () => null };
      this.messageLog = { create: async () => ({}) };
      this.messageTemplate = { findUnique: async () => null };
    }
  }
});
inject(fromRoot('src/modules/billing/billing.service'), {
  checkLimit: async () => !limitReached,
  incrementUsage: async (tenantId, type) => { usage.push(type); }
});
inject(fromRoot('src/modules/whatsapp/whatsapp.service'), { sendTextMessage: async (tenantId, phone, text) => { sent.push(phone); } });
inject(fromRoot('src/modules/webhook/webhook.service'), { dispatchClientSync: () => {} });

const job = (campaignId, phone) => ({ data: { campaignId, targetId: `t${phone}`, tenantId: 'T', phone, message: 'عرض', interactiveType: 'TEXT', channelId: null } });

test('the monthly limit is reached: a paid campaign still sends and is not counted; an unpaid one is stopped', { skip }, async () => {
  const { processJob, campaignWorker, campaignQueue } = require(fromRoot('src/workers/campaign.worker'));
  try {
    await processJob(job('paid', '9661'));
    assert.strictEqual(targets.t9661.status, 'SENT');
    assert.deepStrictEqual(usage, [], 'not counted in the monthly limit');

    await processJob(job('free', '9662'));
    assert.strictEqual(targets.t9662.status, 'FAILED');
    assert.match(targets.t9662.error, /Monthly message limit/);

    limitReached = false;
    await processJob(job('free', '9663'));
    assert.strictEqual(targets.t9663.status, 'SENT');
    assert.deepStrictEqual(usage, ['sent'], 'an unpaid campaign counts as before');

    limitReached = true;
    const messageService = require(fromRoot('src/modules/message/message.service'));
    await assert.rejects(messageService.sendCustomMessage('T', '9664', 'مرحبا'), (e) => e.status === 402, 'single messages keep the limit');
    assert.deepStrictEqual(sent, ['9661', '9663']);
  } finally {
    await campaignWorker?.close();
    await campaignQueue.close();
  }
});
