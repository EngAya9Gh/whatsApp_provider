// Test chat of the flow editor: runs the draft step by step like the real engine, records what it would
// do, and never sends a message or touches a conversation, ticket, tag or stage. Also the real engine's
// "start over for this number". No database: every model and service is a test double.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

// Anything that would reach a real conversation fails the test unless the engine test allows it
let allowRealEngine = false;
const calls = [];
const guard = (name, fn) => async (...args) => {
  if (!allowRealEngine) throw new Error(`the test chat must not call ${name}`);
  calls.push([name, ...args]);
  return fn ? fn(...args) : undefined;
};

let flowDoc = null;
let allowFlowRead = false;
let activeTicket = null;
const chain = (value) => ({ select() { return this; }, lean: async () => value });

inject(fromRoot('src/models/mongo/ChatFlow'), {
  findOne: () => {
    if (!allowRealEngine && !allowFlowRead) throw new Error('the test chat must not read the published flow');
    return chain(flowDoc);
  }
});
inject(fromRoot('src/models/mongo/ChatThread'), {
  updateOne: guard('ChatThread.updateOne'),
  findById: () => { throw new Error('the test chat must not read a conversation'); },
  findOneAndUpdate: (filter, update) => {
    calls.push(['ChatThread.findOneAndUpdate', filter, update]);
    return chain(filter.contactPhone === '966500000001' ? { _id: 'th1' } : null);
  }
});
inject(fromRoot('src/models/mongo/ChatMessage'), { find: () => { throw new Error('the test chat must not read messages'); } });
inject(fromRoot('src/models/mongo/Team'), { exists: async () => true });
inject(fromRoot('src/models/mongo/ChatTag'), { find: () => chain([{ _id: 'tag-vip' }]) });
inject(fromRoot('src/models/mongo/CustomerStage'), { find: () => chain([{ _id: 'stage-1' }]) });
inject(fromRoot('src/models/mongo/AiAgent'), { findOne: () => chain({ knowledge: [{ title: 'x', content: 'نفتح من 9 إلى 5' }] }) });
inject(fromRoot('src/modules/ai/ai.client'), { isConfigured: async () => true });
inject('@prisma/client', {
  PrismaClient: class {
    constructor() {
      this.subUser = { findMany: async () => [{ id: 'A1' }] };
      this.whatsAppChannel = { findFirst: async ({ where }) => (where.id === 'ch' ? { id: 'ch' } : null) };
    }
  }
});
inject(fromRoot('src/modules/chat/chat.service'), {
  sendMessage: guard('sendMessage'),
  sendInteractiveMessage: guard('sendInteractiveMessage')
});
inject(fromRoot('src/modules/chat/chat.tag.service'), { setThreadTags: guard('setThreadTags') });
inject(fromRoot('src/modules/chat/chat.stage.service'), { setThreadStage: guard('setThreadStage') });
inject(fromRoot('src/modules/tickets/tickets.service'), {
  getActiveTicket: async () => {
    if (!allowRealEngine) throw new Error('the test chat must not read tickets');
    return activeTicket;
  },
  createTicket: guard('createTicket'),
  assignTicket: guard('assignTicket')
});
inject(fromRoot('src/modules/workforce/routing.service'), { autoAssignTicket: guard('autoAssignTicket') });
inject(fromRoot('src/modules/workforce/hours.service'), { isChannelOpen: async () => false });
inject(fromRoot('src/services/socket.service'), { emitToTenant() {} });

// Gemini stand-in: answers once, then asks for a person
const aiCalls = [];
inject(fromRoot('src/modules/ai/ai.agent.service'), {
  maxTurns: async () => 5,
  reply: async (tenantId, history) => {
    aiCalls.push(history.map(m => `${m.direction}:${m.content}`));
    return aiCalls.length === 1
      ? { reply: 'نفتح من 9 إلى 5 😊', handoff: false, reason: '' }
      : { reply: 'سأحوّلك لزميلي', handoff: true, reason: 'العميل طلب موظفاً' };
  }
});

const simulator = require(fromRoot('src/modules/flows/flow.simulator'));
const engine = require(fromRoot('src/modules/flows/flow.engine'));
const flowService = require(fromRoot('src/modules/flows/flow.service'));

beforeEach(() => {
  allowRealEngine = false;
  calls.length = 0;
  allowFlowRead = false;
  aiCalls.length = 0;
});

const n = (id, type, data = {}) => ({ id, type, position: { x: 0, y: 0 }, data });
const e = (source, target, sourceHandle = 'out') => ({ id: `${source}-${sourceHandle}`, source, target, sourceHandle });

// Start → question (Prices / A person); Prices → message → end; A person → hand-off;
// anything else → AI agent, whose hand-off goes to the team step
const MENU = {
  nodes: [
    n('start', 'trigger', { inactivityHours: 24 }),
    n('ask', 'question', { text: 'كيف نساعدك؟', options: [{ id: 'p', title: 'الأسعار' }, { id: 'h', title: 'موظف' }] }),
    n('prices', 'message', { text: 'الباقة الأساسية 100 ريال' }),
    n('done', 'end', { handoff: false }),
    n('team', 'assign', { mode: 'TEAM' }),
    n('ai', 'ai_agent')
  ],
  edges: [e('start', 'ask'), e('ask', 'prices', 'opt-p'), e('prices', 'done'), e('ask', 'team', 'opt-h'), e('ask', 'ai', 'fallback'), e('ai', 'team', 'handoff')]
};

/** Plays a conversation the way the editor does: sends back the state and history it got */
async function chat(graph, messages) {
  let convo = { state: null, history: [], tags: [], stageId: null };
  const turns = [];
  for (const input of messages) {
    const res = await simulator.run('T', 'ch', { ...graph, ...convo, input });
    convo = { state: res.state, history: res.history, tags: res.tags, stageId: res.stageId };
    turns.push(res);
  }
  return turns;
}

test('a tapped button follows its branch to the end', async () => {
  const [first, second] = await chat(MENU, [{ text: 'مرحبا' }, { text: 'الأسعار', interactiveId: 'F:ask:p' }]);
  assert.deepStrictEqual(first.steps, ['start', 'ask']);
  assert.strictEqual(first.replies.length, 1);
  const q = first.replies[0];
  assert.strictEqual(q.kind, 'question');
  assert.deepStrictEqual(q.options, [{ id: 'F:ask:p', title: 'الأسعار' }, { id: 'F:ask:h', title: 'موظف' }]);
  assert.deepStrictEqual(first.state, { nodeId: 'ask', attempts: 0 });
  assert.strictEqual(first.ended, false);

  assert.deepStrictEqual(second.steps, ['ask', 'prices', 'done']);
  assert.deepStrictEqual(second.replies, [{ kind: 'text', text: 'الباقة الأساسية 100 ريال', ai: false }, { kind: 'end' }]);
  assert.strictEqual(second.state, null);
  assert.strictEqual(second.ended, true);
  assert.deepStrictEqual(calls, [], 'nothing reached a real conversation');
});

test('a typed option number works, and a hand-off says whether a team will get it', async () => {
  const [, second] = await chat(MENU, [{ text: 'hi' }, { text: '2' }]);
  assert.deepStrictEqual(second.replies, [{ kind: 'assign', mode: 'TEAM', hasTeam: true }, { kind: 'end' }]);
});

test('any other reply goes to the AI agent, which answers from the conversation until it hands off', async () => {
  const turns = await chat(MENU, [{ text: 'مرحبا' }, { text: 'متى تفتحون؟' }, { text: 'أبي أكلم أحد' }]);
  const [, ai1, ai2] = turns;
  assert.deepStrictEqual(ai1.replies, [{ kind: 'text', text: 'نفتح من 9 إلى 5 😊', ai: true }]);
  assert.deepStrictEqual(ai1.state, { nodeId: 'ai', attempts: 0, turns: 1 });
  assert.deepStrictEqual(aiCalls[0], ['INBOUND:مرحبا', 'OUTBOUND:كيف نساعدك؟', 'INBOUND:متى تفتحون؟']);

  assert.deepStrictEqual(ai2.replies.map(r => r.kind), ['text', 'note', 'assign', 'end']);
  assert.ok(ai2.replies[1].text.includes('العميل طلب موظفاً'));
  assert.strictEqual(ai2.ended, true);
  assert.deepStrictEqual(calls, []);
});

test('tags, stages and conditions run on the test conversation only', async () => {
  const graph = {
    nodes: [
      n('start', 'trigger', { inactivityHours: 24 }),
      n('t', 'tag', { action: 'ADD', tagId: 'tag-vip' }),
      n('s', 'stage', { stageId: 'stage-1' }),
      n('vip', 'condition', { check: 'HAS_TAG', value: 'tag-vip' }),
      n('open', 'condition', { check: 'WORKING_HOURS' }),
      n('yes', 'message', { text: 'مفتوح' }),
      n('no', 'message', { text: 'مغلق الآن' })
    ],
    edges: [e('start', 't'), e('t', 's'), e('s', 'vip'), e('vip', 'open', 'yes'), e('open', 'yes', 'yes'), e('open', 'no', 'no')]
  };
  const [res] = await chat(graph, [{ text: 'hi' }]);
  assert.deepStrictEqual(res.replies, [
    { kind: 'tag', action: 'ADD', tagId: 'tag-vip' },
    { kind: 'stage', stageId: 'stage-1' },
    { kind: 'check', check: 'HAS_TAG', value: 'tag-vip', result: true },
    { kind: 'check', check: 'WORKING_HOURS', value: '', result: false },
    { kind: 'text', text: 'مغلق الآن', ai: false },
    { kind: 'assign', mode: 'TEAM', hasTeam: true },
    { kind: 'end' }
  ]);
  assert.deepStrictEqual(res.tags, ['tag-vip']);
  assert.strictEqual(res.stageId, 'stage-1');
});

test('only steps the customer can reach must be ready', async () => {
  const loose = { nodes: [...MENU.nodes, n('draft', 'message', { text: '' })], edges: MENU.edges };
  const [ok] = await chat(loose, [{ text: 'hi' }]);
  assert.strictEqual(ok.replies[0].kind, 'question');

  const broken = { nodes: MENU.nodes.map(x => (x.id === 'prices' ? n('prices', 'message', { text: '' }) : x)), edges: MENU.edges };
  await assert.rejects(simulator.run('T', 'ch', { ...broken, input: { text: 'hi' } }), (err) => {
    assert.strictEqual(err.status, 422);
    assert.deepStrictEqual(err.errors, [{ nodeId: 'prices', message: 'The message is empty' }]);
    return true;
  });
  await assert.rejects(simulator.run('T', 'ch', { ...MENU, input: { text: '  ' } }), (err) => err.status === 400);
});

test('a loop between steps is stopped and reported', async () => {
  const graph = {
    nodes: [n('start', 'trigger', { inactivityHours: 24 }), n('a', 'message', { text: 'A' }), n('b', 'message', { text: 'B' })],
    edges: [e('start', 'a'), e('a', 'b'), e('b', 'a')]
  };
  const [res] = await chat(graph, [{ text: 'hi' }]);
  assert.ok(res.replies.some(r => r.kind === 'warning' && r.code === 'LOOP'));
  assert.strictEqual(res.replies.at(-1).kind, 'end');
  assert.ok(res.replies.filter(r => r.kind === 'text').length <= 25);
});

test('real engine: "start over" skips the silence period and the assignment once', async () => {
  allowRealEngine = true;
  flowDoc = { _id: 'F1', isActive: true, published: { version: 3, nodes: MENU.nodes, edges: MENU.edges } };
  activeTicket = { id: 'tk', assignedToId: 'A1' };
  const input = { text: 'hi', previousInboundAt: new Date(Date.now() - 5 * 60 * 1000) };

  const thread = { _id: 'th1', flowState: null };
  assert.strictEqual(await engine.wouldHandle('T', 'ch', thread, input), false, 'wrote 5 minutes ago and assigned: no flow');

  const armed = { _id: 'th1', flowState: { restart: true } };
  assert.strictEqual(await engine.wouldHandle('T', 'ch', armed, input), true);
  assert.strictEqual(await engine.handleInbound('T', 'ch', armed, input), true);
  const sent = calls.find(c => c[0] === 'sendInteractiveMessage');
  assert.ok(sent, 'the question was sent');
  const states = calls.filter(c => c[0] === 'ChatThread.updateOne').map(c => c[2].$set.flowState);
  assert.strictEqual(states[0], null, 'the restart mark is used once');
  assert.strictEqual(states.at(-1).nodeId, 'ask');
});

test('start over for a number: digits only, and says whether the flow is live', async () => {
  allowFlowRead = true;
  flowDoc = { isActive: false, published: { version: 2 } };
  const res = await flowService.restartForNumber('T', 'ch', '+966 50 000 0001');
  assert.deepStrictEqual(res, { phone: '966500000001', found: true, live: false });
  const update = calls.find(c => c[0] === 'ChatThread.findOneAndUpdate');
  assert.deepStrictEqual(update[1], { tenantId: 'T', channelId: 'ch', contactPhone: '966500000001' });
  assert.strictEqual(update[2].$set.flowState.restart, true);

  assert.strictEqual((await flowService.restartForNumber('T', 'ch', '00966500000002')).found, false);
  await assert.rejects(flowService.restartForNumber('T', 'ch', '123'), (err) => err.status === 400);
  await assert.rejects(flowService.restartForNumber('T', 'other', '966500000001'), (err) => err.status === 404);
});

test('real engine: flow messages are marked, and a hand-off leaves one note that starts the team\'s clock', async () => {
  allowRealEngine = true;
  flowDoc = { _id: 'F1', isActive: true, published: { version: 3, nodes: MENU.nodes, edges: MENU.edges } };
  activeTicket = { id: 'tk', assignedToId: 'A1' };
  const notes = () => calls.filter(c => c[0] === 'sendMessage' && c[3].isInternal);

  // "A person" from the menu → hand-off step: one note
  await engine.handleInbound('T', 'ch', { _id: 'th1', flowState: { flowId: 'F1', version: 3, nodeId: 'ask' } }, { text: '2' });
  assert.deepStrictEqual(notes().map(c => c[3].source), ['FLOW_HANDOFF']);
  assert.strictEqual(notes()[0][3].isAutomated, true);

  // The AI agent hands off (reply limit) → its own note is the marker, the hand-off step adds none
  calls.length = 0;
  await engine.handleInbound('T', 'ch', { _id: 'th1', flowState: { flowId: 'F1', version: 3, nodeId: 'ai', turns: 5 } }, { text: 'hi' });
  assert.strictEqual(notes().length, 1);
  assert.match(notes()[0][3].content, /الأقصى \(5 ردود\)/);
  assert.strictEqual(notes()[0][3].source, 'FLOW_HANDOFF');

  // A message step and a question are marked as the flow's
  calls.length = 0;
  await engine.handleInbound('T', 'ch', { _id: 'th1', flowState: { flowId: 'F1', version: 3, nodeId: 'ask' } }, { text: 'الأسعار', interactiveId: 'F:ask:p' });
  const text = calls.find(c => c[0] === 'sendMessage' && !c[3].isInternal);
  assert.strictEqual(text[3].source, 'FLOW');
  assert.strictEqual(notes().length, 0, 'the end step without hand-off writes no note');
});

test('publishing ignores a half-written step that nothing leads to', async () => {
  const loose = { nodes: [...MENU.nodes, n('draft', 'tag', { action: 'ADD', tagId: '' })], edges: MENU.edges };
  assert.deepStrictEqual(await flowService.problemsToFix('T', loose), []);
  const linked = { nodes: loose.nodes, edges: [...MENU.edges.filter(x => x.sourceHandle !== 'opt-h'), e('ask', 'draft', 'opt-h')] };
  assert.deepStrictEqual(await flowService.problemsToFix('T', linked), [{ nodeId: 'draft', message: 'Choose a tag' }]);
});
