const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ChatFlow = require('../../models/mongo/ChatFlow');
const ChatThread = require('../../models/mongo/ChatThread');
const Team = require('../../models/mongo/Team');
const ChatMessage = require('../../models/mongo/ChatMessage');
const logger = require('../../utils/logger');

// Guards against loops between steps that do not wait for the customer
const MAX_STEPS_PER_RUN = 25;
// How many times a question is re-asked when the reply matches no option and there is no "other reply" branch
const MAX_QUESTION_RETRIES = 1;

const normalize = (s) => String(s || '').trim().toLowerCase();

/** Reply id sent with each option, so a tap maps back to its branch */
const optionReplyId = (nodeId, optionId) => `F:${nodeId}:${optionId}`;

class FlowEngine {
  /**
   * Whether handleInbound would take this message (no side effects). Used before a ticket is
   * created, so new tickets are not routed to an agent while the flow is still talking.
   */
  async wouldHandle(tenantId, channelId, thread, input) {
    try {
      const flow = await ChatFlow.findOne({ tenantId, channelId, isActive: true, 'published.version': { $gt: 0 } })
        .select('_id published.version published.nodes')
        .lean();
      if (!flow) return false;
      const state = thread.flowState;
      if (state && state.flowId === flow._id.toString() && state.version === flow.published.version && state.nodeId) return true;
      const trigger = flow.published.nodes.find(n => n.type === 'trigger');
      if (!trigger) return false;
      // "Start over for this number" (flow editor): the next message starts the flow right away
      if (state?.restart) return true;
      if (!this._silentLongEnough(trigger, input)) return false;
      return !(await this._isAssigned(tenantId, thread._id.toString()));
    } catch (err) {
      logger.error(`[FlowEngine] wouldHandle failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Handles one customer message. Returns true when the flow took care of it
   * (so other automations — keyword replies, away message — stay quiet).
   * input: { text, interactiveId, previousInboundAt }
   */
  async handleInbound(tenantId, channelId, thread, input) {
    try {
      const flow = await ChatFlow.findOne({ tenantId, channelId, isActive: true, 'published.version': { $gt: 0 } }).lean();
      if (!flow) return false;

      const graph = { nodes: flow.published.nodes, edges: flow.published.edges };
      const state = thread.flowState;
      const ctx = { tenantId, channelId, threadId: thread._id.toString(), flow, graph, input };

      // 1. Waiting on a question or an AI agent step of this same published version
      if (state && state.flowId === flow._id.toString() && state.version === flow.published.version && state.nodeId) {
        const waiting = graph.nodes.find(n => n.id === state.nodeId);
        if (waiting?.type === 'ai_agent') {
          await this._aiTurn(ctx, waiting, state);
          return true;
        }
        if (waiting) {
          await this._answerQuestion(ctx, waiting, state);
          return true;
        }
      }

      // 2. Otherwise start only for a conversation that is new or was silent long enough
      const trigger = graph.nodes.find(n => n.type === 'trigger');
      if (!trigger) return false;
      if (!state?.restart) {
        if (!this._silentLongEnough(trigger, input)) return false;
        if (await this._isAssigned(tenantId, ctx.threadId)) return false;
      }

      await this._setState(ctx, null);
      await this._run(ctx, this._next(graph, trigger.id, 'out'));
      return true;
    } catch (err) {
      logger.error(`[FlowEngine] Failed on thread ${thread._id}: ${err.message}`);
      return false;
    }
  }

  /** New customer, or the previous customer message is older than the start step's silence period */
  _silentLongEnough(trigger, input) {
    const silenceMs = (Number(trigger.data?.inactivityHours) || 24) * 60 * 60 * 1000;
    const previous = input.previousInboundAt ? new Date(input.previousInboundAt).getTime() : null;
    return !previous || Date.now() - previous >= silenceMs;
  }

  async _answerQuestion(ctx, question, state) {
    const { input, graph } = ctx;
    const options = question.data?.options || [];
    const tapped = options.find(o => input.interactiveId === optionReplyId(question.id, o.id));
    // Typed replies: the option title, or its number ("1", "2", …)
    const typed = options.find((o, i) => normalize(input.text) === normalize(o.title) || normalize(input.text) === String(i + 1));
    const chosen = tapped || typed;

    if (chosen) return this._run(ctx, this._next(graph, question.id, `opt-${chosen.id}`));

    const fallback = this._next(graph, question.id, 'fallback');
    if (fallback) return this._run(ctx, fallback);

    if ((state.attempts || 0) < MAX_QUESTION_RETRIES) {
      await this._ask(ctx, question, (state.attempts || 0) + 1);
      return null;
    }
    return this._finish(ctx, true);
  }

  _next(graph, nodeId, handle) {
    const edge = graph.edges.find(e => e.source === nodeId && (e.sourceHandle || 'out') === handle);
    return edge ? edge.target : null;
  }

  async _run(ctx, startNodeId) {
    let nodeId = startNodeId;
    for (let step = 0; step < MAX_STEPS_PER_RUN; step++) {
      if (!nodeId) return this._finish(ctx, true);
      const node = ctx.graph.nodes.find(n => n.id === nodeId);
      if (!node) return this._finish(ctx, true);
      const d = node.data || {};
      this._onStep(ctx, node);

      switch (node.type) {
        case 'message':
          await this._sendText(ctx, d.text);
          nodeId = this._next(ctx.graph, node.id, 'out');
          break;
        case 'link':
          // Meta does not report a tap on a link button, so the flow goes on right away (like a message)
          await this._sendLink(ctx, d);
          nodeId = this._next(ctx.graph, node.id, 'out');
          break;
        case 'question':
          await this._ask(ctx, node, 0);
          return null; // wait for the customer
        case 'condition':
          nodeId = this._next(ctx.graph, node.id, (await this._check(ctx, d)) ? 'yes' : 'no');
          break;
        case 'tag':
          await this._applyTag(ctx, d);
          nodeId = this._next(ctx.graph, node.id, 'out');
          break;
        case 'stage':
          await this._setStage(ctx, d);
          nodeId = this._next(ctx.graph, node.id, 'out');
          break;
        case 'ai_agent':
          return this._aiTurn(ctx, node, null);
        case 'assign':
          await this._handOff(ctx, d);
          return this._finish(ctx, false);
        case 'end':
          return this._finish(ctx, d.handoff !== false);
        default:
          nodeId = this._next(ctx.graph, node.id, 'out');
      }
    }
    this._onLoop(ctx);
    return this._finish(ctx, true);
  }

  /** Called for every step the flow runs (the flow editor's test chat shows them) */
  _onStep() {}

  _onLoop(ctx) {
    logger.warn(`[FlowEngine] Step limit reached on thread ${ctx.threadId} (loop in flow?)`);
  }

  /** Last messages of the conversation, oldest first, for the AI agent */
  async _history(ctx) {
    return (await ChatMessage.find({ threadId: ctx.threadId, isInternal: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()).reverse();
  }

  async _setStage(ctx, d) {
    const chatStageService = require('../chat/chat.stage.service');
    await chatStageService.setThreadStage(ctx.tenantId, ctx.threadId, d.stageId, 'FLOW');
  }

  /**
   * One AI agent reply. Stays on this step (waiting for the customer) until the agent asks for a
   * person, the turn limit is reached, or the AI fails — then follows the "handoff" branch.
   */
  async _aiTurn(ctx, node, state) {
    const aiAgentService = require('../ai/ai.agent.service');
    const turns = state?.turns || 0;
    const maxTurns = await aiAgentService.maxTurns(ctx.tenantId);

    let result;
    if (turns >= maxTurns) {
      result = { reply: '', handoff: true, reason: `وصل الموظف الذكي للحد الأقصى (${maxTurns} ردود)` };
    } else {
      const history = await this._history(ctx);
      try {
        result = await aiAgentService.reply(ctx.tenantId, history);
      } catch (err) {
        logger.error(`[FlowEngine] AI agent failed on thread ${ctx.threadId}: ${err.message}`);
        const busy = ['AI_BUSY', 'AI_TIMEOUT', 'AI_RATE_LIMIT', 'AI_NETWORK'].includes(err.code);
        const reason = busy ? 'خدمة الذكاء الاصطناعي مزدحمة أو متأخرة الآن'
          : err.code === 'AI_KEY_INVALID' ? 'مفتاح Gemini غير صالح، راجعه في الإعدادات'
          : err.code === 'AI_QUOTA_EXCEEDED' ? 'انتهت حصة الذكاء الاصطناعي لهذا الشهر'
          : 'تعذّر رد الذكاء الاصطناعي';
        result = { reply: '', handoff: true, reason };
      }
    }

    if (result.reply) await this._sendText(ctx, result.reply, { ai: true });
    if (result.handoff) {
      await this._note(ctx, `🤖 حوّل الموظف الذكي المحادثة لفريقك${result.reason ? `: ${result.reason}` : ''}`, { handoff: true });
      return this._run(ctx, this._next(ctx.graph, node.id, 'handoff'));
    }
    await this._setState(ctx, node.id, 0, { turns: turns + 1 });
    return null;
  }

  /**
   * Internal note for the team (not sent to the customer). A hand-off note also marks when the customer
   * starts waiting for a person: the team's response time counts from there, not from the bot's turn.
   */
  async _note(ctx, text, meta = {}) {
    if (meta.handoff) ctx.handedOff = true;
    try {
      const chatService = require('../chat/chat.service');
      await chatService.sendMessage(ctx.tenantId, ctx.threadId, {
        content: text, type: 'text', isInternal: true, isAutomated: true, source: meta.handoff ? 'FLOW_HANDOFF' : null
      });
    } catch (err) {
      logger.warn(`[FlowEngine] Could not add note: ${err.message}`);
    }
  }

  async _setState(ctx, nodeId, attempts = 0, extra = {}) {
    const flowState = nodeId
      ? { flowId: ctx.flow._id.toString(), version: ctx.flow.published.version, nodeId, attempts, startedAt: new Date(), ...extra }
      : null;
    await ChatThread.updateOne({ _id: ctx.threadId }, { $set: { flowState } });
    try {
      const socketService = require('../../services/socket.service');
      socketService.emitToTenant(ctx.tenantId, 'thread_updated', { id: ctx.threadId, flowState });
    } catch (e) { /* socket is optional */ }
  }

  /** Ends the session; with handoff the conversation goes to the channel's team */
  async _finish(ctx, handoff) {
    await this._setState(ctx, null);
    if (handoff) await this._handOff(ctx, { mode: 'TEAM' });
    return null;
  }

  /** The flow gives the conversation to a person: one note for the team (unless the AI agent just wrote one), then routing */
  async _handOff(ctx, d) {
    if (!ctx.handedOff) await this._handoffNote(ctx, d);
    await this._assign(ctx, d);
  }

  async _handoffNote(ctx, d) {
    await this._note(ctx, d.mode === 'AGENT' && d.agentId
      ? '⚡ انتهى السير وحوّل المحادثة لموظف محدد'
      : '⚡ انتهى السير وحوّل المحادثة لفريقك', { handoff: true });
  }

  async _sendText(ctx, text, meta = {}) {
    const chatService = require('../chat/chat.service');
    await chatService.sendMessage(ctx.tenantId, ctx.threadId, { content: text, type: 'text', isAutomated: true, source: meta.ai ? 'FLOW_AI' : 'FLOW' });
  }

  async _sendLink(ctx, d) {
    const chatService = require('../chat/chat.service');
    await chatService.sendLinkButton(ctx.tenantId, ctx.threadId, { body: d.text, buttonText: d.buttonText, url: d.url, source: 'FLOW' });
  }

  async _ask(ctx, node, attempts) {
    const chatService = require('../chat/chat.service');
    const d = node.data || {};
    await chatService.sendInteractiveMessage(ctx.tenantId, ctx.threadId, {
      body: d.text,
      buttonLabel: d.buttonLabel || 'الخيارات',
      options: (d.options || []).map(o => ({ id: optionReplyId(node.id, o.id), title: o.title })),
      source: 'FLOW'
    });
    await this._setState(ctx, node.id, attempts);
  }

  async _check(ctx, d) {
    switch (d.check) {
      case 'ASSIGNED':
        return this._isAssigned(ctx.tenantId, ctx.threadId);
      case 'WORKING_HOURS': {
        const hoursService = require('../workforce/hours.service');
        return hoursService.isChannelOpen(ctx.tenantId, ctx.channelId);
      }
      case 'HAS_TAG': {
        const thread = await ChatThread.findById(ctx.threadId).select('tagIds').lean();
        return (thread?.tagIds || []).includes(d.value);
      }
      case 'STAGE_IS': {
        const thread = await ChatThread.findById(ctx.threadId).select('stageId').lean();
        return thread?.stageId === d.value;
      }
      case 'TEXT_CONTAINS': {
        const text = normalize(ctx.input.text);
        return String(d.value || '').split(',').map(normalize).filter(Boolean).some(word => text.includes(word));
      }
      default:
        return false;
    }
  }

  async _applyTag(ctx, d) {
    const chatTagService = require('../chat/chat.tag.service');
    const thread = await ChatThread.findById(ctx.threadId).select('tagIds').lean();
    const current = thread?.tagIds || [];
    const next = d.action === 'REMOVE' ? current.filter(id => id !== d.tagId) : [...new Set([...current, d.tagId])];
    await chatTagService.setThreadTags(ctx.tenantId, ctx.threadId, next);
  }

  async _isAssigned(tenantId, threadId) {
    const ticketsService = require('../tickets/tickets.service');
    const ticket = await ticketsService.getActiveTicket(tenantId, threadId);
    return !!ticket?.assignedToId;
  }

  /** Hands the conversation to a person: the channel team's routing, or one agent */
  async _assign(ctx, d) {
    const ticketsService = require('../tickets/tickets.service');
    const routingService = require('../workforce/routing.service');

    let ticket = await ticketsService.getActiveTicket(ctx.tenantId, ctx.threadId);
    if (!ticket) {
      // Team hand-off with no team on this number: nothing to route to, leave the conversation as is
      if (d.mode !== 'AGENT' && !(await Team.exists({ tenantId: ctx.tenantId, channelIds: ctx.channelId }))) return;
      const thread = await ChatThread.findById(ctx.threadId).select('crmClientId').lean();
      // "One agent" goes straight to that person; the team's routing would pick someone else first
      ticket = await ticketsService.createTicket(ctx.tenantId, ctx.channelId, ctx.threadId, thread?.crmClientId || null, 'محادثة واتساب', null,
        d.mode === 'AGENT' && d.agentId ? { assignedToId: d.agentId, skipRouting: true } : {});
    }
    // From now the ticket is the team's (its pick-up time starts here, not while the flow talked)
    await ticketsService.markReady(ticket.id);
    if (ticket.assignedToId) return;

    let assigned = false;
    if (d.mode === 'AGENT' && d.agentId) {
      try {
        await ticketsService.assignTicket(ctx.tenantId, ticket.id, d.agentId);
        assigned = true;
      } catch (err) {
        logger.warn(`[FlowEngine] Could not hand to agent ${d.agentId} (${err.message}), using the team's routing`);
      }
    }
    if (!assigned) await routingService.autoAssignTicket(ctx.tenantId, ticket);
    try {
      const socketService = require('../../services/socket.service');
      socketService.emitToTenant(ctx.tenantId, 'ticket_updated', { ticketId: ticket.id, threadId: ctx.threadId, status: 'OPEN' });
    } catch (e) { /* socket is optional */ }
  }
}

module.exports = new FlowEngine();
module.exports.FlowEngine = FlowEngine;
module.exports.optionReplyId = optionReplyId;
