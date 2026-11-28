// Monthly AI quota on the shared platform key (GEMINI_API_KEY), counted in tokens (input + output).
// Set per plan by the admin (system settings → aiQuotaByPlan), or for one account (customFeatures.aiQuota).
// No number = no limit (the default). An account with its own Gemini key is never limited: it pays Google.
const prisma = require('../../config/prisma');

const PLANS = ['FREE', 'STARTER', 'ADVANCED', 'PRO', 'ENTERPRISE'];

/** null = unlimited; otherwise a whole number of tokens ≥ 0 */
function cleanLimit(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) throw { status: 400, message: 'A quota must be a whole number of tokens (0 or more), or empty for no limit' };
  return n;
}

const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

async function planQuotas() {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
  const raw = settings?.data?.aiQuotaByPlan || {};
  return Object.fromEntries(PLANS.map(p => [p, raw[p] === undefined || raw[p] === null ? null : Number(raw[p])]));
}

/** Saves the per-plan quotas into the system settings, keeping every other setting */
async function savePlanQuotas(input = {}) {
  const next = Object.fromEntries(PLANS.map(p => [p, cleanLimit(input[p])]));
  const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
  const data = { ...(settings?.data || {}), aiQuotaByPlan: next };
  await prisma.systemSetting.upsert({ where: { id: 'GLOBAL' }, update: { data }, create: { id: 'GLOBAL', data } });
  return next;
}

async function usedThisMonth(tenantId, now = new Date()) {
  const sum = await prisma.aiUsage.aggregate({
    where: { tenantId, sharedKey: true, createdAt: { gte: monthStart(now) } },
    _sum: { inputTokens: true, outputTokens: true }
  });
  return (sum._sum.inputTokens || 0) + (sum._sum.outputTokens || 0);
}

/**
 * The account's quota this month: { limit, used, remaining, percent, source, ownKey }.
 * source: 'account' (set for this account), 'plan', or 'none' (no limit).
 */
async function quotaFor(tenantId, { tenant = null, plans = null, now = new Date() } = {}) {
  const t = tenant || await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true, customFeatures: true } });
  if (!t) throw { status: 404, message: 'Tenant not found' };
  const ownKey = !!t.customFeatures?.aiSettings?.geminiKey;
  const own = t.customFeatures?.aiQuota;
  let limit = null;
  let source = 'none';
  if (own && own.monthlyTokens !== undefined && own.monthlyTokens !== null) {
    limit = Number(own.monthlyTokens);
    source = 'account';
  } else {
    const byPlan = plans || await planQuotas();
    if (byPlan[t.plan] !== null && byPlan[t.plan] !== undefined) {
      limit = byPlan[t.plan];
      source = 'plan';
    }
  }
  const used = await usedThisMonth(tenantId, now);
  return {
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    percent: limit === null ? null : (limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100))),
    source,
    ownKey
  };
}

/** Throws AI_QUOTA_EXCEEDED before a shared-key request when this month's quota is used up */
async function assertWithinQuota(tenantId) {
  const q = await quotaFor(tenantId);
  if (q.limit !== null && q.used >= q.limit) {
    const { AiError } = require('./ai.client');
    throw new AiError('AI_QUOTA_EXCEEDED',
      q.limit === 0
        ? 'AI on the shared key is not included in this plan: add your own Gemini key in Settings → AI'
        : `This month's AI quota is used up (${q.used} of ${q.limit} tokens): add your own Gemini key or ask to raise it`,
      { status: 429 });
  }
  return q;
}

module.exports = { PLANS, cleanLimit, planQuotas, savePlanQuotas, usedThisMonth, quotaFor, assertWithinQuota };
