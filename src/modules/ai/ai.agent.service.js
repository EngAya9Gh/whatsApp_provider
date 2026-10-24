const crypto = require('crypto');
const AiAgent = require('../../models/mongo/AiAgent');
const aiClient = require('./ai.client');

const MAX_KNOWLEDGE_CHARS = 40000;
const MAX_ENTRIES = 60;
const MAX_INSTRUCTIONS = 2000;
const HISTORY_LIMIT = 20;

const DEFAULTS = {
  name: 'المساعد الذكي',
  instructions: 'كن ودوداً ومختصراً. رحّب بالعميل باسمه إن عرفته.',
  knowledge: [],
  maxTurns: 8
};

const formatAgent = (doc, configured) => ({
  name: doc?.name ?? DEFAULTS.name,
  instructions: doc?.instructions ?? DEFAULTS.instructions,
  knowledge: doc?.knowledge ?? DEFAULTS.knowledge,
  maxTurns: doc?.maxTurns ?? DEFAULTS.maxTurns,
  updatedAt: doc?.updatedAt || null,
  aiConfigured: configured,
  model: aiClient.model()
});

function buildSystemPrompt(agent) {
  const knowledge = agent.knowledge
    .filter(k => String(k.content || '').trim())
    .map(k => `### ${k.title || 'معلومة'}\n${k.content.trim()}`)
    .join('\n\n');

  return [
    `أنت "${agent.name}"، موظف خدمة عملاء آلي يرد على العملاء عبر واتساب نيابة عن النشاط التجاري.`,
    '',
    'قواعد ثابتة:',
    '- أجب فقط من "معلومات النشاط" أدناه. لا تخترع أسعاراً أو مواعيد أو سياسات أو روابط غير مذكورة.',
    '- إذا لم تجد الجواب في المعلومات، أو طلب العميل التحدث مع موظف، أو كان غاضباً أو يشتكي، أو يحتاج إجراءً لا تستطيعه (حجز فعلي، دفع، إلغاء، استرجاع): اجعل handoff = true واكتب رداً قصيراً يخبره أن أحد الموظفين سيتابع معه.',
    '- رد بنفس لغة العميل ولهجته قدر الإمكان.',
    '- اكتب ردوداً قصيرة تناسب واتساب (سطرين إلى أربعة)، بدون عناوين أو تنسيق Markdown.',
    '- لا تطلب بيانات حساسة (كلمات مرور، أرقام بطاقات).',
    '',
    agent.instructions ? `تعليمات النشاط:\n${agent.instructions}\n` : '',
    'معلومات النشاط:',
    knowledge || '(لا توجد معلومات — حوّل أي سؤال لموظف)'
  ].join('\n');
}

const REPLY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING', description: 'Message to send to the customer' },
    handoff: { type: 'BOOLEAN', description: 'true when a human should take over' },
    reason: { type: 'STRING', description: 'Short internal reason (for the team), in Arabic' }
  },
  required: ['reply', 'handoff', 'reason']
};

class AiAgentService {
  async getAgent(tenantId) {
    const [doc, configured] = await Promise.all([
      AiAgent.findOne({ tenantId }).lean(),
      aiClient.isConfigured(tenantId)
    ]);
    return formatAgent(doc, configured);
  }

  async saveAgent(tenantId, data, updatedBy) {
    const name = String(data.name || '').trim().slice(0, 60) || DEFAULTS.name;
    const instructions = String(data.instructions || '').slice(0, MAX_INSTRUCTIONS);
    const maxTurns = Math.min(Math.max(parseInt(data.maxTurns, 10) || DEFAULTS.maxTurns, 1), 30);
    if (!Array.isArray(data.knowledge)) throw { status: 400, message: 'knowledge must be an array' };
    if (data.knowledge.length > MAX_ENTRIES) throw { status: 400, message: `At most ${MAX_ENTRIES} knowledge entries` };

    const knowledge = data.knowledge
      .map(k => ({
        id: String(k.id || crypto.randomUUID()).slice(0, 40),
        title: String(k.title || '').trim().slice(0, 120),
        content: String(k.content || '').trim()
      }))
      .filter(k => k.title || k.content);
    const total = knowledge.reduce((s, k) => s + k.title.length + k.content.length, 0);
    if (total > MAX_KNOWLEDGE_CHARS) throw { status: 400, message: `The knowledge is too long (${total} / ${MAX_KNOWLEDGE_CHARS} characters)` };

    const doc = await AiAgent.findOneAndUpdate(
      { tenantId },
      { $set: { name, instructions, knowledge, maxTurns, updatedBy } },
      { upsert: true, returnDocument: 'after' }
    ).lean();
    return formatAgent(doc, await aiClient.isConfigured(tenantId));
  }

  /**
   * Next agent reply for a conversation.
   * history: [{ direction: 'INBOUND' | 'OUTBOUND', content, isAutomated }] oldest first.
   * Returns { reply, handoff, reason }.
   */
  async reply(tenantId, history) {
    const doc = await AiAgent.findOne({ tenantId }).lean();
    const agent = formatAgent(doc, true);
    const turns = history
      .filter(m => String(m.content || '').trim() && !m.isInternal)
      .slice(-HISTORY_LIMIT)
      .map(m => ({ role: m.direction === 'INBOUND' ? 'user' : 'model', text: m.content }));

    // Gemini expects the conversation to start with the user and alternate roles
    const merged = [];
    for (const t of turns) {
      const last = merged[merged.length - 1];
      if (last && last.role === t.role) last.text += `\n${t.text}`;
      else merged.push({ ...t });
    }
    while (merged.length && merged[0].role !== 'user') merged.shift();
    if (merged.length === 0 || merged[merged.length - 1].role !== 'user') {
      return { reply: '', handoff: true, reason: 'لا توجد رسالة من العميل للرد عليها' };
    }

    const result = await aiClient.generate(tenantId, {
      system: buildSystemPrompt(agent),
      contents: merged,
      schema: REPLY_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 600
    });
    return {
      reply: String(result.reply || '').trim().slice(0, 4000),
      handoff: !!result.handoff,
      reason: String(result.reason || '').slice(0, 300)
    };
  }

  async maxTurns(tenantId) {
    const doc = await AiAgent.findOne({ tenantId }).select('maxTurns').lean();
    return doc?.maxTurns ?? DEFAULTS.maxTurns;
  }
}

module.exports = new AiAgentService();
module.exports.buildSystemPrompt = buildSystemPrompt;
