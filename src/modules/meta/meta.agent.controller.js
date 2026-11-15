/**
 * /api/v1/meta/agent/:channelId/... — the "Meta Business Agent" page relays to Meta's Agent Platform.
 * Inputs are checked against Meta's documented limits before they are sent.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const agent = require('./meta.agent');

const SKILL_TITLE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/; // Meta: max 64, lowercase letters, digits, hyphens
const FOLLOWUP_INTERVALS = [0, 300, 900, 1800, 3600, 7200, 28800, 86400];
const AUDIENCES = ['ALLOWLISTED_ONLY', 'EVERYONE'];
const HANDOFF_MESSAGES = ['DEFAULT', 'AGENT', 'CUSTOM'];
const FILE_TYPES = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.csv', '.xlsx'];

const bad = (res, message) => res.status(400).json({ success: false, message });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Meta's answer as an HTTP error for the dashboard, with a hint for the cases a person can fix. */
function sendAgentError(res, e) {
  const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 502;
  let hint = null;
  if (status === 403) hint = 'TERMS';           // terms not accepted in WhatsApp Manager (Meta quickstart)
  else if (status === 404) hint = 'NO_AGENT';    // no agent on this number yet: activate it first
  else if (status === 429) hint = 'RATE_LIMIT';
  else if (status === 409) hint = 'RETRY';       // another write at the same time: nothing saved
  return res.status(status).json({ success: false, message: e.message, metaTitle: e.title || null, hint });
}

/** Wraps a handler: loads the tenant's Meta channel and turns Agent Platform errors into responses. */
const withChannel = (fn) => async (req, res, next) => {
  try {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: req.params.channelId, tenantId: req.tenant.id, providerType: 'META_CLOUD' }
    });
    if (!channel) return res.status(404).json({ success: false, message: 'Meta channel not found' });
    return await fn(req, res, channel);
  } catch (e) {
    if (e instanceof agent.AgentApiError) return sendAgentError(res, e);
    next(e);
  }
};

// ─── Overview: eligibility, agent, links to Meta's screens ───
exports.overview = withChannel(async (req, res, channel) => {
  const [eligibility, settingsR, businessId] = await Promise.all([
    agent.checkEligibility(channel),
    agent.getSettings(channel).then(s => ({ ok: true, settings: s }), e => ({ ok: false, error: { status: e.status, message: e.message } })),
    agent.ownerBusinessId(channel)
  ]);
  res.json({
    success: true,
    data: {
      channel: { id: channel.id, phoneNumber: channel.phoneNumber, wabaId: channel.metaWabaId },
      eligibility,
      agent: settingsR.ok ? settingsR.settings : null,
      agentError: settingsR.ok ? null : settingsR.error,
      links: agent.metaLinks(businessId, channel.metaWabaId)
    }
  });
});

exports.onboard = withChannel(async (req, res, channel) => {
  const d = await agent.onboard(channel);
  res.status(201).json({ success: true, data: d });
});

exports.remove = withChannel(async (req, res, channel) => {
  const d = await agent.deleteAgent(channel);
  res.json({ success: true, data: d });
});

// ─── Settings (partial: only the groups sent are changed; each group is sent whole) ───
exports.updateSettings = withChannel(async (req, res, channel) => {
  const b = req.body || {};
  const body = {};
  if (b.rollout !== undefined) body.rollout = { enabled: !!b.rollout?.enabled };
  if (b.ai_audience !== undefined) {
    if (!AUDIENCES.includes(b.ai_audience)) return bad(res, 'ai_audience must be ALLOWLISTED_ONLY or EVERYONE');
    body.ai_audience = b.ai_audience;
  }
  if (b.handoff !== undefined) {
    const sel = b.handoff?.message_selection || 'DEFAULT';
    if (!HANDOFF_MESSAGES.includes(sel)) return bad(res, 'Invalid handoff message choice');
    body.handoff = { enabled: !!b.handoff?.enabled, message_selection: sel };
    if (sel === 'CUSTOM') body.handoff.message = str(b.handoff?.message, 1000);
  }
  if (b.followup !== undefined) {
    const interval = Number(b.followup?.followup_interval_in_seconds ?? 0);
    if (!FOLLOWUP_INTERVALS.includes(interval)) return bad(res, 'Invalid follow-up interval');
    body.followup = { enabled: !!b.followup?.enabled && interval > 0, followup_interval_in_seconds: interval };
    if (b.followup?.message) body.followup.message = str(b.followup.message, 1000);
  }
  if (b.never_say_phrases !== undefined) {
    if (!Array.isArray(b.never_say_phrases)) return bad(res, 'never_say_phrases must be a list');
    body.never_say_phrases = b.never_say_phrases.map(p => str(p, 500)).filter(Boolean).slice(0, 200);
  }
  if (!Object.keys(body).length) return bad(res, 'Nothing to update');
  const d = await agent.updateSettings(channel, body, b.agent_id ? String(b.agent_id) : null);
  res.json({ success: true, data: d });
});

// ─── Business information (Meta replaces it whole, so the page always sends every field) ───
exports.getBusinessInfo = withChannel(async (req, res, channel) => {
  res.json({ success: true, data: await agent.getBusinessInfo(channel) });
});
exports.putBusinessInfo = withChannel(async (req, res, channel) => {
  const b = req.body || {};
  const c = b.contact_info || {};
  const body = {
    business_description: str(b.business_description, 5000),
    payment_method: str(b.payment_method, 2000),
    return_policy: str(b.return_policy, 5000),
    purchase_info: str(b.purchase_info, 5000),
    delivery_and_shipping: str(b.delivery_and_shipping, 5000),
    contact_info: { email: str(c.email, 200), hours_of_operation: str(c.hours_of_operation, 1000), address: str(c.address, 1000) }
  };
  res.json({ success: true, data: await agent.putBusinessInfo(channel, body) });
});

// ─── FAQs, websites, skills ───
function itemBody(kind, b = {}, partial = false) {
  if (kind === 'faq') {
    const question = str(b.question, 2000), answer = str(b.answer, 5000);
    if (!question || !answer) return { error: 'Question and answer are required' };
    return { body: { question, answer } };
  }
  if (kind === 'websites') {
    const url = str(b.url, 2000);
    if (!/^https?:\/\/[^\s]+$/i.test(url)) return { error: 'Enter a full website address starting with https://' };
    const arr = (v) => (Array.isArray(v) ? v.map(x => str(x, 500)).filter(Boolean).slice(0, 50) : undefined);
    const body = { url };
    for (const k of ['included_url_patterns', 'excluded_url_patterns', 'single_urls']) if (arr(b[k])?.length) body[k] = arr(b[k]);
    return { body };
  }
  // skills
  const body = {};
  if (!partial || b.title !== undefined) {
    const title = str(b.title, 64).toLowerCase();
    if (!SKILL_TITLE.test(title)) return { error: 'Skill name: up to 64 lowercase English letters, digits and hyphens (e.g. reply-style)' };
    body.title = title;
  }
  if (!partial || b.description !== undefined) {
    const description = str(b.description, 1024);
    if (!description) return { error: 'Say when the bot should follow this instruction' };
    body.description = description;
  }
  if (!partial || b.skill !== undefined) {
    const skill = str(b.skill, 20000);
    if (!skill) return { error: 'The instruction text is required' };
    body.skill = skill;
  }
  return { body };
}

const checkKind = (req, res) => {
  if (!agent.KINDS.includes(req.params.kind)) { res.status(404).json({ success: false, message: 'Unknown resource' }); return false; }
  return true;
};

exports.listItems = withChannel(async (req, res, channel) => {
  if (!checkKind(req, res)) return;
  res.json({ success: true, data: await agent.listItems(channel, req.params.kind) });
});
exports.createItem = withChannel(async (req, res, channel) => {
  if (!checkKind(req, res)) return;
  const { body, error } = itemBody(req.params.kind, req.body);
  if (error) return bad(res, error);
  res.status(201).json({ success: true, data: await agent.createItem(channel, req.params.kind, body) });
});
exports.updateItem = withChannel(async (req, res, channel) => {
  if (!checkKind(req, res)) return;
  const { body, error } = itemBody(req.params.kind, req.body, req.params.kind === 'skills');
  if (error) return bad(res, error);
  res.json({ success: true, data: await agent.updateItem(channel, req.params.kind, req.params.itemId, body) });
});
exports.deleteItem = withChannel(async (req, res, channel) => {
  if (!checkKind(req, res)) return;
  await agent.deleteItem(channel, req.params.kind, req.params.itemId);
  res.json({ success: true });
});

// ─── Files ───
exports.listFiles = withChannel(async (req, res, channel) => {
  res.json({ success: true, data: await agent.listFiles(channel) });
});
exports.uploadFile = withChannel(async (req, res, channel) => {
  if (!req.file) return bad(res, 'Choose a file');
  const name = String(req.file.originalname || 'file').replace(/[\\/]/g, '_');
  const ext = (name.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
  if (!FILE_TYPES.includes(ext)) return bad(res, `Allowed files: ${FILE_TYPES.join(' ')}`);
  const d = await agent.uploadFile(channel, { buffer: req.file.buffer, fileName: name, mimeType: req.file.mimetype });
  res.status(201).json({ success: true, data: d });
});
exports.deleteFile = withChannel(async (req, res, channel) => {
  await agent.deleteFile(channel, req.params.fileId);
  res.json({ success: true });
});

// ─── Test customers (allowlist) ───
exports.listAllowlist = withChannel(async (req, res, channel) => {
  res.json({ success: true, data: await agent.listAllowlist(channel) });
});
exports.addToAllowlist = withChannel(async (req, res, channel) => {
  const digits = String(req.body?.phone || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return bad(res, 'Enter the number with its country code, e.g. 966501234567');
  res.status(201).json({ success: true, data: await agent.addToAllowlist(channel, `+${digits}`) });
});
exports.removeFromAllowlist = withChannel(async (req, res, channel) => {
  await agent.removeFromAllowlist(channel, req.params.entryId);
  res.json({ success: true });
});

// ─── Test chat (free, also while the agent is off) ───
exports.test = withChannel(async (req, res, channel) => {
  const message = str(req.body?.message, 4000);
  if (!message) return bad(res, 'Write a message');
  const d = await agent.test(channel, message, req.body?.conversation_id ? String(req.body.conversation_id) : null);
  res.json({ success: true, data: d });
});
