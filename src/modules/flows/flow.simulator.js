// Test chat of the flow editor: runs the DRAFT as if a customer wrote, without sending anything on
// WhatsApp and without touching any conversation, tag, stage or ticket. Only the AI agent step is real
// (it asks Gemini, with the owner's key). The editor keeps the test conversation and sends it back
// with each message, so nothing is stored here.
const Team = require('../../models/mongo/Team');
const { FlowEngine, optionReplyId } = require('./flow.engine');
const flowService = require('./flow.service');

const MAX_HISTORY = 30;
const MAX_TEXT = 4096;

const int = (v, max) => Math.min(Math.max(parseInt(v, 10) || 0, 0), max);

function cleanState(state) {
  if (!state || typeof state !== 'object' || typeof state.nodeId !== 'string') return null;
  return { nodeId: state.nodeId.slice(0, 64), attempts: int(state.attempts, 5), turns: int(state.turns, 100) };
}

function cleanHistory(history) {
  return (Array.isArray(history) ? history : []).slice(-MAX_HISTORY).map(m => ({
    direction: m?.direction === 'INBOUND' ? 'INBOUND' : 'OUTBOUND',
    content: String(m?.content || '').slice(0, MAX_TEXT)
  }));
}

class FlowSimulator extends FlowEngine {
  /**
   * One customer message in the test chat.
   * payload: { nodes, edges, input: { text, interactiveId }, state, history, tags, stageId }
   * Returns what the flow did: { replies, steps, state, ended, history, tags, stageId }
   */
  async run(tenantId, channelId, payload = {}) {
    const graph = flowService.sanitize({ nodes: payload.nodes, edges: payload.edges });
    // Same check as publishing: only what the customer can reach has to be ready
    const problems = await flowService.problemsToFix(tenantId, graph);
    if (problems.length) throw { status: 422, message: 'Fix these steps before testing', errors: problems };

    const input = {
      text: String(payload.input?.text || '').slice(0, MAX_TEXT),
      interactiveId: payload.input?.interactiveId ? String(payload.input.interactiveId).slice(0, 200) : null
    };
    if (!input.text.trim() && !input.interactiveId) throw { status: 400, message: 'Write a message' };

    const history = cleanHistory(payload.history);
    history.push({ direction: 'INBOUND', content: input.text });
    const sim = {
      out: [],
      steps: [],
      state: cleanState(payload.state),
      history,
      tags: (Array.isArray(payload.tags) ? payload.tags : []).map(String).slice(0, 50),
      stageId: payload.stageId ? String(payload.stageId) : null,
      ended: false
    };
    const ctx = { tenantId, channelId, threadId: 'flow-test', flow: { _id: 'flow-test', published: { version: 0 } }, graph, input, sim };

    // Same order as the real engine: a waiting question or AI agent step first, otherwise from the start
    // (the test always starts at once: no silence period, nobody assigned)
    const waiting = sim.state ? graph.nodes.find(n => n.id === sim.state.nodeId) : null;
    if (waiting?.type === 'ai_agent') {
      sim.steps.push(waiting.id);
      await this._aiTurn(ctx, waiting, sim.state);
    } else if (waiting?.type === 'question') {
      sim.steps.push(waiting.id);
      await this._answerQuestion(ctx, waiting, sim.state);
    } else {
      const trigger = graph.nodes.find(n => n.type === 'trigger');
      sim.state = null;
      sim.steps.push(trigger.id);
      await this._run(ctx, this._next(graph, trigger.id, 'out'));
    }

    return {
      replies: sim.out,
      steps: sim.steps,
      state: sim.state,
      ended: sim.ended,
      history: sim.history.slice(-MAX_HISTORY),
      tags: sim.tags,
      stageId: sim.stageId
    };
  }

  // ─── Everything the real engine does to a conversation, recorded instead ───
  _onStep(ctx, node) {
    ctx.sim.steps.push(node.id);
  }

  _onLoop(ctx) {
    ctx.sim.out.push({ kind: 'warning', code: 'LOOP' });
  }

  async _history(ctx) {
    return ctx.sim.history.slice(-20);
  }

  async _setState(ctx, nodeId, attempts = 0, extra = {}) {
    ctx.sim.state = nodeId ? { nodeId, attempts, ...extra } : null;
  }

  async _finish(ctx, handoff) {
    ctx.sim.state = null;
    if (handoff) await this._assign(ctx, { mode: 'TEAM' });
    ctx.sim.ended = true;
    ctx.sim.out.push({ kind: 'end' });
    return null;
  }

  async _sendText(ctx, text, meta = {}) {
    ctx.sim.out.push({ kind: 'text', text, ai: !!meta.ai });
    ctx.sim.history.push({ direction: 'OUTBOUND', content: text });
  }

  async _ask(ctx, node, attempts) {
    const d = node.data || {};
    ctx.sim.out.push({
      kind: 'question',
      nodeId: node.id,
      text: d.text,
      buttonLabel: d.buttonLabel || 'الخيارات',
      options: (d.options || []).map(o => ({ id: optionReplyId(node.id, o.id), title: o.title })),
      retry: attempts > 0
    });
    ctx.sim.history.push({ direction: 'OUTBOUND', content: d.text });
    await this._setState(ctx, node.id, attempts);
  }

  async _note(ctx, text, meta = {}) {
    if (meta.handoff) ctx.handedOff = true;
    ctx.sim.out.push({ kind: 'note', text });
  }

  // The test chat shows the hand-off as its own line ("assign"), so no extra note
  async _handoffNote() {}

  async _applyTag(ctx, d) {
    const remove = d.action === 'REMOVE';
    ctx.sim.tags = remove ? ctx.sim.tags.filter(id => id !== d.tagId) : [...new Set([...ctx.sim.tags, d.tagId])];
    ctx.sim.out.push({ kind: 'tag', action: remove ? 'REMOVE' : 'ADD', tagId: d.tagId });
  }

  async _setStage(ctx, d) {
    ctx.sim.stageId = d.stageId;
    ctx.sim.out.push({ kind: 'stage', stageId: d.stageId });
  }

  async _isAssigned() {
    return false;
  }

  async _check(ctx, d) {
    let result;
    if (d.check === 'ASSIGNED') result = false;
    else if (d.check === 'HAS_TAG') result = ctx.sim.tags.includes(d.value);
    else if (d.check === 'STAGE_IS') result = ctx.sim.stageId === d.value;
    else result = await super._check(ctx, d); // working hours (read only), words in the message
    ctx.sim.out.push({ kind: 'check', check: d.check, value: d.value || '', result: !!result });
    return result;
  }

  async _assign(ctx, d) {
    if (d.mode === 'AGENT' && d.agentId) {
      ctx.sim.out.push({ kind: 'assign', mode: 'AGENT', agentId: d.agentId });
      return;
    }
    const hasTeam = !!(await Team.exists({ tenantId: ctx.tenantId, channelIds: ctx.channelId }));
    ctx.sim.out.push({ kind: 'assign', mode: 'TEAM', hasTeam });
  }
}

module.exports = new FlowSimulator();
