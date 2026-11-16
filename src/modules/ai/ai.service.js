const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const ChatMessage = require('../../models/mongo/ChatMessage');
const ChatThread = require('../../models/mongo/ChatThread');
const socketService = require('../../services/socket.service');
const aiClient = require('./ai.client');

const HISTORY_LIMIT = 40;
// A stage is only suggested when the model is at least this sure
const MIN_SUGGESTION_CONFIDENCE = 0.6;

async function recentMessages(threadId, limit = HISTORY_LIMIT) {
  const messages = await ChatMessage.find({ threadId, isInternal: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return messages.reverse();
}

const lastActivity = (messages) => (messages.length ? messages[messages.length - 1].createdAt : null);
const sameTime = (a, b) => !!a && !!b && new Date(a).getTime() === new Date(b).getTime();

async function loadThread(tenantId, threadId) {
  if (!mongoose.isValidObjectId(threadId)) throw { status: 404, message: 'Thread not found' };
  const thread = await ChatThread.findOne({ _id: threadId, tenantId }).lean();
  if (!thread) throw { status: 404, message: 'Thread not found' };
  return thread;
}

const REPLY_TONES = {
  default: '',
  shorter: 'اجعل الرد أقصر ما يمكن (جملة أو جملتين).',
  formal: 'استخدم أسلوباً رسمياً ومهذباً.',
  friendly: 'استخدم أسلوباً ودوداً وقريباً من العميل.'
};

const SUGGESTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING', description: 'Draft of the next message to the customer' },
    missing: { type: 'STRING', description: 'In Arabic: what the agent must check or fill in before sending, or empty' }
  },
  required: ['reply', 'missing']
};

class AIService {
  /** Short summary saved on a ticket when it closes. Never throws (closing must not fail). */
  async summarizeTicket(tenantId, threadId) {
    try {
      const messages = await recentMessages(threadId, 50);
      if (messages.length === 0) return null;
      return await aiClient.generate(tenantId, {
        feature: 'ticket_summary',
        system: 'أنت مساعد متخصص في تلخيص تذاكر الدعم الفني باللغة العربية.',
        contents: [{
          role: 'user',
          text: `لخّص المحادثة التالية بين العميل والفريق في جملتين إلى ثلاث جمل. اذكر المشكلة الأساسية وهل حُلّت أم لا:\n\n${aiClient.transcript(messages)}`
        }],
        maxOutputTokens: 400
      });
    } catch (error) {
      if (error.code !== 'AI_NOT_CONFIGURED') logger.error('[AIService] Ticket summary failed: ' + error.message);
      return null;
    }
  }

  /** Summary shown in the chat screen; reused until new messages arrive unless refresh is asked */
  async summarizeConversation(tenantId, threadId, { refresh = false } = {}) {
    const thread = await loadThread(tenantId, threadId);
    const messages = await recentMessages(thread._id);
    if (messages.length === 0) return null;

    const basedOn = lastActivity(messages);
    if (!refresh && thread.aiSummary && sameTime(thread.aiSummary.basedOnMessageAt, basedOn)) return thread.aiSummary;

    const text = await aiClient.generate(tenantId, {
      feature: 'chat_summary',
      system: 'أنت مساعد لفريق خدمة العملاء. تلخّص محادثات واتساب بالعربية بإيجاز ووضوح.',
      contents: [{
        role: 'user',
        text: `لخّص هذه المحادثة في سطرين أو ثلاثة: ماذا يريد العميل، وما الذي تم، وهل يوجد طلب أو موضوع يحتاج متابعة. إذا كانت الرسائل تحيات فقط فقل ذلك.\n\n${aiClient.transcript(messages)}`
      }],
      maxOutputTokens: 400
    });
    const aiSummary = { text, basedOnMessageAt: basedOn, createdAt: new Date() };
    await ChatThread.updateOne({ _id: thread._id }, { $set: { aiSummary } });
    return aiSummary;
  }

  /**
   * Draft of the next reply for the agent in Live Chat (the agent edits it and sends it themselves).
   * Uses the business info of the AI agent page. Facts that are not there become [placeholders] and are
   * listed in `missing`, so nothing invented reaches the customer.
   */
  async suggestReply(tenantId, threadId, { tone = 'default' } = {}) {
    const thread = await loadThread(tenantId, threadId);
    const messages = await recentMessages(thread._id, 30);
    if (!messages.some(m => m.direction === 'INBOUND')) throw { status: 400, message: 'The customer has not written anything yet' };

    const AiAgent = require('../../models/mongo/AiAgent');
    const agent = await AiAgent.findOne({ tenantId }).lean();
    const knowledge = (agent?.knowledge || [])
      .filter(k => String(k.content || '').trim())
      .map(k => `### ${k.title || 'معلومة'}\n${k.content.trim()}`)
      .join('\n\n');

    const result = await aiClient.generate(tenantId, {
      feature: 'suggest_reply',
      system: [
        'أنت تساعد موظف خدمة عملاء يرد على عميل عبر واتساب. اكتب مسودة الرسالة التالية التي سيرسلها الموظف للعميل.',
        '',
        'قواعد:',
        '- اكتب بلسان الموظف، بنفس لغة العميل ولهجته، رداً قصيراً يناسب واتساب (سطر إلى أربعة أسطر)، بدون Markdown.',
        '- استخدم فقط "معلومات النشاط" أدناه وما ورد في المحادثة. لا تخترع أسعاراً أو مواعيد أو سياسات أو روابط.',
        '- إذا احتاج الرد معلومة غير موجودة فاكتب مكانها [بين أقواس مربعة]، مثل [سعر الباقة]، واذكرها في missing.',
        '- إذا كانت آخر رسالة من الفريق، فاكتب متابعة مناسبة بدل تكرار ما قيل.',
        '- لا تطلب بيانات حساسة (كلمات مرور، أرقام بطاقات).',
        agent?.instructions ? `\nتعليمات النشاط:\n${agent.instructions}` : '',
        REPLY_TONES[tone] ? `\nالأسلوب: ${REPLY_TONES[tone]}` : '',
        '',
        'معلومات النشاط:',
        knowledge || '(لا توجد معلومات نشاط محفوظة)'
      ].join('\n'),
      contents: [{ role: 'user', text: `المحادثة حتى الآن:\n\n${aiClient.transcript(messages)}\n\nاكتب مسودة الرد التالي للموظف.` }],
      schema: SUGGESTION_SCHEMA,
      temperature: 0.5,
      maxOutputTokens: 500
    });
    return {
      text: String(result.reply || '').trim().slice(0, 4000),
      missing: String(result.missing || '').trim().slice(0, 300),
      hasKnowledge: !!knowledge
    };
  }

  /**
   * Suggests a customer stage for a conversation (shown with accept / reject in the chat).
   * Computed once per batch of new messages; returns the current suggestion or null.
   */
  async suggestStage(tenantId, threadId) {
    const chatStageService = require('../chat/chat.stage.service');
    const thread = await loadThread(tenantId, threadId);
    const config = await chatStageService.getConfig(tenantId);
    if (!chatStageService.isActiveForChannel(config, thread.channelId) || config.stages.length === 0) return null;

    const messages = await recentMessages(thread._id);
    const customerMessages = messages.filter(m => m.direction === 'INBOUND');
    if (customerMessages.length < 2) return null;

    const basedOn = lastActivity(messages);
    // Already analysed these messages: keep the pending suggestion, and do not re-suggest after a decision
    if (thread.aiSuggestion && sameTime(thread.aiSuggestion.basedOnMessageAt, basedOn)) {
      return thread.aiSuggestion.status === 'PENDING' ? thread.aiSuggestion : null;
    }

    const stageList = config.stages.map(s => `- id: ${s.id} | ${s.name} | ${s.group === 'MAIN' ? 'المسار الرئيسي' : 'مسار الخسارة'}`).join('\n');
    const current = config.stages.find(s => s.id === thread.stageId);
    const result = await aiClient.generate(tenantId, {
      feature: 'stage_suggestion',
      system: 'أنت محلل مبيعات وخدمة عملاء. تحدد مرحلة العميل من محادثته على واتساب بناءً على قائمة مراحل يحددها النشاط التجاري.',
      contents: [{
        role: 'user',
        text: [
          'مراحل العميل المتاحة (المسار الرئيسي بالترتيب، ثم مسار الخسارة):',
          stageList,
          '',
          `المرحلة الحالية: ${current ? current.name : 'بدون مرحلة'}`,
          '',
          'المحادثة:',
          aiClient.transcript(messages),
          '',
          'اختر المرحلة الأنسب الآن. إذا كانت المرحلة الحالية مناسبة أو لا توجد معلومات كافية فأعد stageId فارغاً.',
          'اكتب السبب بالعربية في جملة قصيرة تشير لما قاله العميل.'
        ].join('\n')
      }],
      schema: {
        type: 'OBJECT',
        properties: {
          stageId: { type: 'STRING', description: 'id of the suggested stage, or empty string' },
          confidence: { type: 'NUMBER', description: '0 to 1' },
          reason: { type: 'STRING' }
        },
        required: ['stageId', 'confidence', 'reason']
      },
      temperature: 0.1,
      maxOutputTokens: 300
    });

    const stage = config.stages.find(s => s.id === result.stageId);
    const useful = stage && stage.id !== thread.stageId && Number(result.confidence) >= MIN_SUGGESTION_CONFIDENCE;
    const aiSuggestion = {
      stageId: useful ? stage.id : null,
      reason: useful ? String(result.reason || '').slice(0, 300) : '',
      status: useful ? 'PENDING' : 'NONE',
      basedOnMessageAt: basedOn,
      createdAt: new Date()
    };
    await ChatThread.updateOne({ _id: thread._id }, { $set: { aiSuggestion } });
    return useful ? aiSuggestion : null;
  }

  async decideSuggestion(tenantId, threadId, accept, decidedBy) {
    const thread = await loadThread(tenantId, threadId);
    const suggestion = thread.aiSuggestion;
    if (!suggestion || suggestion.status !== 'PENDING') throw { status: 409, message: 'No pending suggestion' };

    if (accept) {
      const chatStageService = require('../chat/chat.stage.service');
      await chatStageService.setThreadStage(tenantId, threadId, suggestion.stageId, decidedBy);
    }
    await ChatThread.updateOne(
      { _id: thread._id },
      { $set: { 'aiSuggestion.status': accept ? 'ACCEPTED' : 'REJECTED', 'aiSuggestion.decidedBy': decidedBy } }
    );
    socketService.emitToTenant(tenantId, 'thread_updated', { id: threadId, aiSuggestion: null });
    return { stageId: accept ? suggestion.stageId : thread.stageId };
  }
}

module.exports = new AIService();
