// Referrals: every account has an invite link (register?ref=CODE). When an invited account's first invoice is
// paid, the inviter's wallet gets the reward the admin set (system settings → referralRewardAmount, SAR).
// No reward set = referrals are off (no invite card; sign-ups through old links stay PENDING).
const crypto = require('crypto');
const prisma = require('../../config/prisma');
const config = require('../../config/env');
const logger = require('../../utils/logger');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const randomCode = (length = 8) => Array.from(crypto.randomBytes(length), b => ALPHABET[b % ALPHABET.length]).join('');

async function rewardAmount() {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
  const amount = Number(settings?.data?.referralRewardAmount);
  return amount > 0 ? Math.round(amount * 100) / 100 : 0;
}

async function codeOf(tenantId) {
  const found = await prisma.referralCode.findUnique({ where: { tenantId } });
  if (found) return found.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return (await prisma.referralCode.create({ data: { tenantId, code: randomCode() } })).code;
    } catch (err) {
      if (err.code !== 'P2002') throw err;
      const mine = await prisma.referralCode.findUnique({ where: { tenantId } });
      if (mine) return mine.code; // created by a request at the same time
    }
  }
  throw new Error('Could not create an invite code');
}

/** The invite card of an account */
async function summary(tenantId) {
  const reward = await rewardAmount();
  if (!reward) return { enabled: false };
  const code = await codeOf(tenantId);
  const [invited, rewarded] = await Promise.all([
    prisma.referral.count({ where: { referrerId: tenantId } }),
    prisma.referral.aggregate({ where: { referrerId: tenantId, status: 'REWARDED' }, _count: { _all: true }, _sum: { rewardAmount: true } })
  ]);
  const base = String(config.frontendUrl || config.appUrl || '').replace(/\/+$/, '');
  return {
    enabled: true,
    rewardAmount: reward,
    code,
    link: `${base}/register?ref=${code}`,
    invited,
    rewarded: rewarded._count._all,
    earned: Math.round((rewarded._sum.rewardAmount || 0) * 100) / 100
  };
}

/** Links a new account to the account whose code it signed up with (never fails the sign-up) */
async function recordSignup(newTenantId, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;
  try {
    const owner = await prisma.referralCode.findUnique({ where: { code } });
    if (!owner || owner.tenantId === newTenantId) return null;
    return await prisma.referral.create({ data: { referrerId: owner.tenantId, referredId: newTenantId } });
  } catch (err) {
    logger.warn(`[Referral] Could not record the sign-up of ${newTenantId} with code ${code}: ${err.message}`);
    return null;
  }
}

/** Called when an invoice becomes PAID: the first paid invoice of an invited account rewards the inviter once */
async function onInvoicePaid(invoice) {
  try {
    const referral = await prisma.referral.findUnique({ where: { referredId: invoice.tenantId } });
    if (!referral || referral.status !== 'PENDING') return null;
    const amount = await rewardAmount();
    if (!amount) return null;
    const claimed = await prisma.referral.updateMany({
      where: { id: referral.id, status: 'PENDING' },
      data: { status: 'REWARDED', rewardAmount: amount, rewardedAt: new Date() }
    });
    if (claimed.count === 0) return null; // rewarded by a request at the same time
    const walletService = require('../wallet/wallet.service');
    await walletService.credit(referral.referrerId, {
      amount,
      type: walletService.TYPES.REFERRAL_REWARD,
      description: 'Referral reward: an invited account paid its first invoice',
      referenceType: 'REFERRAL',
      referenceId: referral.id,
      createdBy: 'SYSTEM'
    });
    logger.info(`[Referral] ${referral.referrerId} rewarded ${amount} for inviting ${invoice.tenantId}`);
    return { referrerId: referral.referrerId, amount };
  } catch (err) {
    logger.error(`[Referral] Reward for invoice ${invoice.id} failed: ${err.message}`);
    return null;
  }
}

/** Admin list: who invited whom */
async function listAll({ limit = 100 } = {}) {
  const rows = await prisma.referral.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 100, 500),
    include: { referrer: { select: { id: true, name: true, email: true } }, referred: { select: { id: true, name: true, email: true, plan: true } } }
  });
  return { rewardAmount: await rewardAmount(), referrals: rows };
}

module.exports = { randomCode, rewardAmount, codeOf, summary, recordSignup, onInvoicePaid, listAll };
