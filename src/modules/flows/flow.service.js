const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ChatFlow = require('../../models/mongo/ChatFlow');
const ChatTag = require('../../models/mongo/ChatTag');
const CustomerStage = require('../../models/mongo/CustomerStage');

const MAX_NODES = 150;
const MAX_EDGES = 300;
const MAX_DATA_BYTES = 8000;

const NODE_TYPES = ['trigger', 'message', 'question', 'condition', 'tag', 'stage', 'assign', 'end'];
const CONDITIONS = ['ASSIGNED', 'WORKING_HOURS', 'HAS_TAG', 'STAGE_IS', 'TEXT_CONTAINS'];

/** Output handles each node type may connect from */
function outputHandles(node) {
  switch (node.type) {
    case 'question': return [...(node.data?.options || []).map(o => `opt-${o.id}`), 'fallback'];
    case 'condition': return ['yes', 'no'];
    case 'assign':
    case 'end': return [];
    default: return ['out'];
  }
}

function defaultDraft() {
  return {
    nodes: [
      { id: 'trigger', type: 'trigger', position: { x: 250, y: 40 }, data: { inactivityHours: 24 } },
      { id: 'welcome', type: 'message', position: { x: 250, y: 200 }, data: { text: 'أهلاً بك! 👋 كيف يمكننا مساعدتك؟' } }
    ],
    edges: [{ id: 'e-trigger-welcome', source: 'trigger', target: 'welcome', sourceHandle: 'out' }]
  };
}

/** Keep only the fields the editor and engine use */
function sanitize({ nodes, edges }) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) throw { status: 400, message: 'nodes and edges must be arrays' };
  if (nodes.length > MAX_NODES || edges.length > MAX_EDGES) throw { status: 400, message: 'The flow is too large' };

  const cleanNodes = nodes.map(n => {
    const data = n.data && typeof n.data === 'object' ? n.data : {};
    if (JSON.stringify(data).length > MAX_DATA_BYTES) throw { status: 400, message: 'A step has too much content' };
    return {
      id: String(n.id).slice(0, 64),
      type: String(n.type),
      position: { x: Number(n.position?.x) || 0, y: Number(n.position?.y) || 0 },
      data
    };
  });
  const ids = new Set(cleanNodes.map(n => n.id));
  const cleanEdges = edges
    .filter(e => ids.has(String(e.source)) && ids.has(String(e.target)))
    .map(e => ({
      id: String(e.id).slice(0, 140),
      source: String(e.source),
      target: String(e.target),
      sourceHandle: e.sourceHandle ? String(e.sourceHandle) : 'out'
    }));
  return { nodes: cleanNodes, edges: cleanEdges };
}

/** Returns a list of { nodeId, message } problems that block publishing */
async function validate(tenantId, { nodes, edges }) {
  const errors = [];
  const add = (nodeId, message) => errors.push({ nodeId, message });

  const triggers = nodes.filter(n => n.type === 'trigger');
  if (triggers.length !== 1) add(null, 'The flow needs exactly one start step');

  const [tags, stages, agents] = await Promise.all([
    ChatTag.find({ tenantId }).select('_id').lean(),
    CustomerStage.find({ tenantId }).select('_id').lean(),
    prisma.subUser.findMany({ where: { tenantId }, select: { id: true } })
  ]);
  const tagIds = new Set(tags.map(t => t._id.toString()));
  const stageIds = new Set(stages.map(s => s._id.toString()));
  const agentIds = new Set(agents.map(a => a.id));

  for (const node of nodes) {
    const d = node.data || {};
    if (!NODE_TYPES.includes(node.type)) { add(node.id, 'Unknown step type'); continue; }
    switch (node.type) {
      case 'trigger': {
        const h = Number(d.inactivityHours);
        if (!(h >= 1 && h <= 720)) add(node.id, 'Silence period must be between 1 and 720 hours');
        if (!edges.some(e => e.source === node.id)) add(node.id, 'Connect the start step to the first step');
        break;
      }
      case 'message':
        if (!String(d.text || '').trim()) add(node.id, 'The message is empty');
        else if (d.text.length > 4096) add(node.id, 'The message is longer than 4096 characters');
        break;
      case 'question': {
        const options = Array.isArray(d.options) ? d.options : [];
        if (!String(d.text || '').trim()) add(node.id, 'The question text is empty');
        else if (d.text.length > 1024) add(node.id, 'The question is longer than 1024 characters');
        if (options.length < 1 || options.length > 10) add(node.id, 'A question needs 1 to 10 options');
        const limit = options.length <= 3 ? 20 : 24; // Meta: button title 20, list row title 24
        if (options.some(o => !String(o.title || '').trim())) add(node.id, 'Every option needs a title');
        if (options.some(o => String(o.title || '').length > limit)) add(node.id, `Option titles must be at most ${limit} characters`);
        if (new Set(options.map(o => String(o.title || '').trim())).size !== options.length) add(node.id, 'Option titles must be different');
        if (options.length > 3 && String(d.buttonLabel || '').length > 20) add(node.id, 'The list button text must be at most 20 characters');
        break;
      }
      case 'condition':
        if (!CONDITIONS.includes(d.check)) add(node.id, 'Choose what to check');
        else if (d.check === 'HAS_TAG' && !tagIds.has(d.value)) add(node.id, 'Choose a tag');
        else if (d.check === 'STAGE_IS' && !stageIds.has(d.value)) add(node.id, 'Choose a stage');
        else if (d.check === 'TEXT_CONTAINS' && !String(d.value || '').trim()) add(node.id, 'Write the words to look for');
        break;
      case 'tag':
        if (!tagIds.has(d.tagId)) add(node.id, 'Choose a tag');
        break;
      case 'stage':
        if (!stageIds.has(d.stageId)) add(node.id, 'Choose a stage');
        break;
      case 'assign':
        if (d.mode === 'AGENT' && !agentIds.has(d.agentId)) add(node.id, 'Choose a team member');
        break;
      default:
        break;
    }
  }

  for (const edge of edges) {
    const source = nodes.find(n => n.id === edge.source);
    if (source && !outputHandles(source).includes(edge.sourceHandle)) add(source.id, 'A connection leaves from an option that no longer exists');
  }
  return errors;
}

const formatFlow = (flow, channelId) => ({
  channelId,
  isActive: !!flow?.isActive,
  draft: flow ? flow.draft : defaultDraft(),
  publishedVersion: flow?.published?.version || 0,
  publishedAt: flow?.published?.publishedAt || null,
  hasDraftChanges: !!flow?.hasDraftChanges
});

class FlowService {
  async _channel(tenantId, channelId) {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { id: channelId, tenantId, providerType: 'META_CLOUD' },
      select: { id: true, name: true, phoneNumber: true, displayPhoneNumber: true }
    });
    if (!channel) throw { status: 404, message: 'Channel not found' };
    return channel;
  }

  async listFlows(tenantId) {
    const [channels, flows] = await Promise.all([
      prisma.whatsAppChannel.findMany({
        where: { tenantId, providerType: 'META_CLOUD' },
        select: { id: true, name: true, phoneNumber: true, displayPhoneNumber: true }
      }),
      ChatFlow.find({ tenantId }).select('channelId isActive published.version published.publishedAt hasDraftChanges draft.nodes').lean()
    ]);
    return channels.map(channel => {
      const flow = flows.find(f => f.channelId === channel.id);
      return {
        channel,
        isActive: !!flow?.isActive,
        publishedVersion: flow?.published?.version || 0,
        publishedAt: flow?.published?.publishedAt || null,
        hasDraftChanges: !!flow?.hasDraftChanges,
        steps: flow ? flow.draft.nodes.length : 0
      };
    });
  }

  async getFlow(tenantId, channelId) {
    const channel = await this._channel(tenantId, channelId);
    const flow = await ChatFlow.findOne({ tenantId, channelId }).lean();
    return { channel, ...formatFlow(flow, channelId) };
  }

  async saveDraft(tenantId, channelId, payload) {
    await this._channel(tenantId, channelId);
    const draft = sanitize(payload);
    const flow = await ChatFlow.findOneAndUpdate(
      { tenantId, channelId },
      { $set: { draft, hasDraftChanges: true } },
      { upsert: true, returnDocument: 'after' }
    ).lean();
    return formatFlow(flow, channelId);
  }

  async publish(tenantId, channelId) {
    await this._channel(tenantId, channelId);
    const flow = await ChatFlow.findOne({ tenantId, channelId });
    const draft = flow ? sanitize(flow.draft) : defaultDraft();
    const errors = await validate(tenantId, draft);
    if (errors.length > 0) throw { status: 422, message: 'The flow has problems to fix before publishing', errors };

    const updated = await ChatFlow.findOneAndUpdate(
      { tenantId, channelId },
      {
        $set: {
          draft,
          'published.nodes': draft.nodes,
          'published.edges': draft.edges,
          'published.publishedAt': new Date(),
          hasDraftChanges: false
        },
        $inc: { 'published.version': 1 }
      },
      { upsert: true, returnDocument: 'after' }
    ).lean();
    return formatFlow(updated, channelId);
  }

  async discardDraft(tenantId, channelId) {
    await this._channel(tenantId, channelId);
    const flow = await ChatFlow.findOne({ tenantId, channelId }).lean();
    if (!flow) return formatFlow(null, channelId);
    const hasPublished = flow.published?.version > 0;
    const draft = hasPublished ? { nodes: flow.published.nodes, edges: flow.published.edges } : defaultDraft();
    const updated = await ChatFlow.findOneAndUpdate(
      { tenantId, channelId },
      { $set: { draft, hasDraftChanges: false } },
      { returnDocument: 'after' }
    ).lean();
    return formatFlow(updated, channelId);
  }

  async setActive(tenantId, channelId, isActive) {
    await this._channel(tenantId, channelId);
    const flow = await ChatFlow.findOne({ tenantId, channelId }).lean();
    if (isActive && !(flow?.published?.version > 0)) throw { status: 400, message: 'Publish the flow before turning it on' };
    const updated = await ChatFlow.findOneAndUpdate(
      { tenantId, channelId },
      { $set: { isActive: !!isActive } },
      { upsert: true, returnDocument: 'after' }
    ).lean();
    return formatFlow(updated, channelId);
  }

  async isFlowActive(tenantId, channelId) {
    return !!(await ChatFlow.exists({ tenantId, channelId, isActive: true, 'published.version': { $gt: 0 } }));
  }
}

module.exports = new FlowService();
module.exports.validate = validate;
module.exports.sanitize = sanitize;
module.exports.outputHandles = outputHandles;
module.exports.defaultDraft = defaultDraft;
