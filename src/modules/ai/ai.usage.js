// AI usage reports from the ai_usage rows that ai.client.js writes for every Gemini answer.
// Only recording for now: nothing is blocked. The estimated cost uses the per-million-token prices an
// admin enters in Settings (Google's price list for the model), and only counts the shared platform key.
const prisma = require('../../config/prisma');

const FEATURES = ['agent_reply', 'suggest_reply', 'chat_summary', 'ticket_summary', 'stage_suggestion', 'other'];

/** 'YYYY-MM' (UTC month; default: this month) → { month, from, to } */
function monthRange(month, now = new Date()) {
  const m = /^(\d{4})-(\d{2})$/.exec(month || '');
  const year = m ? Number(m[1]) : now.getUTCFullYear();
  const index = m ? Number(m[2]) - 1 : now.getUTCMonth();
  if (index < 0 || index > 11) throw { status: 400, message: 'month must look like 2026-11' };
  const from = new Date(Date.UTC(year, index, 1));
  const to = new Date(Date.UTC(year, index + 1, 1));
  return { month: `${year}-${String(index + 1).padStart(2, '0')}`, from, to };
}

async function prices() {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
  const input = Number(settings?.data?.aiInputPricePerMillionUsd);
  const output = Number(settings?.data?.aiOutputPricePerMillionUsd);
  return { input: input > 0 ? input : null, output: output > 0 ? output : null };
}

const costOf = (p, inputTokens, outputTokens) => (p.input === null || p.output === null
  ? null
  : Math.round(((inputTokens * p.input + outputTokens * p.output) / 1e6) * 10000) / 10000);

const totals = (rows) => rows.reduce((t, r) => ({
  requests: t.requests + r._count._all,
  inputTokens: t.inputTokens + (r._sum.inputTokens || 0),
  outputTokens: t.outputTokens + (r._sum.outputTokens || 0)
}), { requests: 0, inputTokens: 0, outputTokens: 0 });

/** One account's month: per feature, and how much ran on the shared key */
async function tenantUsage(tenantId, month) {
  const range = monthRange(month);
  const rows = await prisma.aiUsage.groupBy({
    by: ['feature', 'sharedKey'],
    where: { tenantId, createdAt: { gte: range.from, lt: range.to } },
    _sum: { inputTokens: true, outputTokens: true },
    _count: { _all: true }
  });
  const p = await prices();
  const byFeature = FEATURES
    .map(feature => ({ feature, ...totals(rows.filter(r => r.feature === feature || (feature === 'other' && !FEATURES.includes(r.feature)))) }))
    .filter(f => f.requests > 0);
  const shared = totals(rows.filter(r => r.sharedKey));
  // The quota is monthly: only shown for the current month
  const quota = range.month === monthRange().month ? await require('./ai.quota').quotaFor(tenantId) : null;
  return {
    month: range.month,
    ...totals(rows),
    quota,
    byFeature,
    shared: { ...shared, estimatedCostUsd: costOf(p, shared.inputTokens, shared.outputTokens) }
  };
}

/** Every account's month (admin), the biggest users of the shared key first */
async function platformUsage(month) {
  const range = monthRange(month);
  const rows = await prisma.aiUsage.groupBy({
    by: ['tenantId', 'sharedKey'],
    where: { createdAt: { gte: range.from, lt: range.to } },
    _sum: { inputTokens: true, outputTokens: true },
    _count: { _all: true }
  });
  const p = await prices();
  const ids = [...new Set(rows.map(r => r.tenantId))];
  const tenants = ids.length
    ? await prisma.tenant.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, plan: true, customFeatures: true } })
    : [];
  const quota = require('./ai.quota');
  const plans = await quota.planQuotas();
  const current = range.month === monthRange().month;
  const byId = new Map(tenants.map(t => [t.id, t]));

  const list = (await Promise.all(ids.map(async id => {
    const mine = rows.filter(r => r.tenantId === id);
    const shared = totals(mine.filter(r => r.sharedKey));
    const own = totals(mine.filter(r => !r.sharedKey));
    const t = byId.get(id);
    return {
      tenantId: id,
      name: t?.name || id,
      email: t?.email || null,
      plan: t?.plan || null,
      shared: { ...shared, estimatedCostUsd: costOf(p, shared.inputTokens, shared.outputTokens) },
      own,
      quota: current && t ? await quota.quotaFor(id, { tenant: t, plans }) : null
    };
  }))).sort((a, b) => (b.shared.inputTokens + b.shared.outputTokens) - (a.shared.inputTokens + a.shared.outputTokens)
    || (b.own.requests - a.own.requests));

  const shared = totals(rows.filter(r => r.sharedKey));
  return {
    month: range.month,
    pricesSet: p.input !== null && p.output !== null,
    planQuotas: plans,
    sharedKeyConfigured: !!process.env.GEMINI_API_KEY,
    totals: { ...totals(rows), shared: { ...shared, estimatedCostUsd: costOf(p, shared.inputTokens, shared.outputTokens) } },
    tenants: list
  };
}

module.exports = { FEATURES, monthRange, tenantUsage, platformUsage };
