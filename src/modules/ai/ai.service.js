const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ChatMessage } = require('../../models/mongo/ChatMessage');

class AIService {
  async summarizeTicket(tenantId, threadId) {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      // Fallback to env or tenant settings for geminiKey
      const geminiKey = tenant?.customFeatures?.aiSettings?.geminiKey || process.env.GEMINI_API_KEY;

      if (!geminiKey) {
        logger.warn('[AIService] No Gemini key found. Skipping summary.');
        return null;
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Fetch last 50 messages
      const ChatThread = require('../../models/mongo/ChatThread');
      const messages = await ChatMessage.find({ threadId })
        .sort({ createdAt: -1 })
        .limit(50);
      
      if (!messages || messages.length === 0) return null;

      // Reverse to chronological
      const convoText = messages.reverse().map(m => {
        const sender = m.direction === 'INBOUND' ? 'العميل' : 'الدعم الفني';
        return `${sender}: ${m.content || (m.hasMedia ? '[ملف ميديا]' : '')}`;
      }).join('\n');

      const prompt = `أنت مساعد ذكي متخصص في تلخيص تذاكر الدعم الفني باللغة العربية.\n\nقم بتلخيص المحادثة التالية بين العميل والدعم الفني في 2 إلى 3 جمل كحد أقصى. اذكر المشكلة الأساسية وما إذا تم حلها أم لا:\n\n${convoText}`;

      const result = await model.generateContent(prompt);
      return result.response.text() || null;

    } catch (error) {
      logger.error('[AIService] Failed to generate summary with Gemini: ' + error.message);
      return null;
    }
  }
}

module.exports = new AIService();
