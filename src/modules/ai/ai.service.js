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

class AIService {
  /** Short summary saved on a ticket when it closes. Never throws (closing must not fail). */
  async summarizeTicket(tenantId, threadId) {
    try {
      const messages = await recentMessages(threadId, 50);
      if (messages.length === 0) return null;
      return await aiClient.generate(tenantId, {
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
