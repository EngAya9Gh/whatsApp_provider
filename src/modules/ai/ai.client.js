const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// gemini-1.5-* models are retired; override with GEMINI_MODEL when Google moves on again
const DEFAULT_MODEL = 'gemini-3.8-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

class AiNotConfiguredError extends Error {
  constructor() {
    super('No Gemini API key: add one in Settings → AI');
    this.code = 'AI_NOT_CONFIGURED';
    this.status = 400;
  }
}

const model = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

/** The tenant's own Gemini key, else the platform key from GEMINI_API_KEY */
async function resolveApiKey(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } });
  return tenant?.customFeatures?.aiSettings?.geminiKey || process.env.GEMINI_API_KEY || null;
}

async function isConfigured(tenantId) {
  return !!(await resolveApiKey(tenantId));
}

/**
 * One Gemini call.
 *  system   — system instruction text
 *  contents — [{ role: 'user' | 'model', text }]
 *  schema   — optional response schema; the reply is then parsed JSON
 */
async function generate(tenantId, { system, contents, schema = null, temperature = 0.3, maxOutputTokens = 1024 }) {
  const apiKey = await resolveApiKey(tenantId);
  if (!apiKey) throw new AiNotConfiguredError();

  const body = {
    contents: contents.map(c => ({ role: c.role, parts: [{ text: c.text }] })),
    generationConfig: { temperature, maxOutputTokens }
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (schema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = schema;
  }

  let response;
  try {
    response = await axios.post(`${API_BASE}/${model()}:generateContent`, body, {
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      timeout: 30000
    });
  } catch (err) {
    const message = err.response?.data?.error?.message || err.message;
    const wrapped = new Error(`Gemini request failed: ${message}`);
    wrapped.code = 'AI_REQUEST_FAILED';
    wrapped.status = 502;
    throw wrapped;
  }

  const text = (response.data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  if (!text) {
    const reason = response.data?.candidates?.[0]?.finishReason || response.data?.promptFeedback?.blockReason || 'EMPTY';
    const err = new Error(`Gemini returned no answer (${reason})`);
    err.code = 'AI_EMPTY';
    err.status = 502;
    throw err;
  }
  if (!schema) return text;
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error('Gemini returned invalid JSON');
    err.code = 'AI_BAD_JSON';
    err.status = 502;
    throw err;
  }
}

/** Conversation messages → plain transcript lines for prompts */
function transcript(messages, { customer = 'العميل', team = 'الفريق', bot = 'البوت' } = {}) {
  return messages
    .filter(m => !m.isInternal)
    .map(m => {
      const who = m.direction === 'INBOUND' ? customer : (m.isAutomated ? bot : team);
      const body = m.content || (m.hasMedia ? `[${m.type || 'MEDIA'}]` : '');
      return `${who}: ${body}`;
    })
    .join('\n');
}

module.exports = { generate, isConfigured, resolveApiKey, transcript, model, AiNotConfiguredError };
