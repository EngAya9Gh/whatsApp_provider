// "Set up your account" checklist on the dashboard home: each step is ticked from the account's own data,
// so it stays right without the customer marking anything. Steps carry the feature they need; the dashboard
// hides the ones the plan does not include.
const prisma = require('../../config/prisma');

const STEPS = ['connect', 'contacts', 'team', 'hours', 'aiAgent', 'firstMessage'];

async function mongoChecks(tenantId) {
  const ChannelHours = require('../../models/mongo/ChannelHours');
  const AiAgent = require('../../models/mongo/AiAgent');
  const ChatMessage = require('../../models/mongo/ChatMessage');
  const ChatThread = require('../../models/mongo/ChatThread');
  const [hours, agent, thread] = await Promise.all([
    ChannelHours.exists({ tenantId, enabled: true }),
    AiAgent.findOne({ tenantId }).select('knowledge').lean(),
    ChatThread.findOne({ tenantId }).select('_id').lean()
  ]);
  const replied = thread
    ? await ChatMessage.exists({ threadId: { $in: (await ChatThread.find({ tenantId }).select('_id').limit(200).lean()).map(t => t._id) }, direction: 'OUTBOUND' })
    : null;
  return {
    hours: !!hours,
    aiAgent: (agent?.knowledge || []).some(k => String(k.content || '').trim().length > 0),
    replied: !!replied
  };
}

async function getChecklist(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } });
  if (!tenant) throw { status: 404, message: 'Tenant not found' };
  const [channels, contacts, team, sent, mongo] = await Promise.all([
    prisma.whatsAppChannel.count({ where: { tenantId } }),
    prisma.contact.count({ where: { tenantId } }),
    prisma.subUser.count({ where: { tenantId } }),
    prisma.messageLog.count({ where: { tenantId, status: 'SENT' } }),
    mongoChecks(tenantId).catch(() => ({ hours: false, aiAgent: false, replied: false }))
  ]);
  const done = {
    connect: channels > 0,
    contacts: contacts > 0,
    team: team > 0,
    hours: mongo.hours,
    aiAgent: mongo.aiAgent,
    firstMessage: sent > 0 || mongo.replied
  };
  return {
    steps: STEPS.map(key => ({ key, done: done[key] })),
    dismissedAt: tenant.customFeatures?.onboarding?.dismissedAt || null
  };
}

/** Hides the checklist for good (the customer chose "hide") */
async function dismiss(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } });
  if (!tenant) throw { status: 404, message: 'Tenant not found' };
  const features = tenant.customFeatures && typeof tenant.customFeatures === 'object' ? tenant.customFeatures : {};
  const dismissedAt = new Date().toISOString();
  await prisma.tenant.update({ where: { id: tenantId }, data: { customFeatures: { ...features, onboarding: { ...(features.onboarding || {}), dismissedAt } } } });
  return { dismissedAt };
}

module.exports = { STEPS, getChecklist, dismiss };
