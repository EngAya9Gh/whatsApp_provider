const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');
const prisma = new PrismaClient();

// Google's stable Flash model; override with GEMINI_MODEL when Google moves on again
const DEFAULT_MODEL = 'gemini-3.6-flash';
// Tried in turn when a model is overloaded, rate-limited, slow or gone.
// GEMINI_FALLBACK_MODELS: comma-separated list, or "none".
const DEFAULT_FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// The answer must arrive before the dashboard's proxy gives up on the request (nginx waits 60s by default)
const TOTAL_BUDGET_MS = 45000;
const ATTEMPT_TIMEOUT_MS = 20000;
const MIN_ATTEMPT_MS = 4000;
// Thinking tokens count against maxOutputTokens: leave room for them so short answers are not cut off
const THINKING_HEADROOM_TOKENS = 1024;
// Finish reasons where another model would refuse the same content
const BLOCKED_REASONS = ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'];

class AiError extends Error {
  constructor(code, message, { status = 502, retryable = false } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

class AiNotConfiguredError extends AiError {
  constructor() {
    super('AI_NOT_CONFIGURED', 'No Gemini API key: add one in Settings → AI', { status: 400 });
  }
}

const model = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

function modelChain() {
  const raw = process.env.GEMINI_FALLBACK_MODELS;
  let fallbacks = DEFAULT_FALLBACK_MODELS;
  if (raw !== undefined) fallbacks = raw.trim().toLowerCase() === 'none' ? [] : raw.split(',').map(s => s.trim()).filter(Boolean);
  return [...new Set([model(), ...fallbacks])];
}

// Customer-service replies need little reasoning; "low" is accepted by every Gemini 3 Flash model. "off" sends no setting.
const thinkingLevel = () => (process.env.GEMINI_THINKING_LEVEL || 'low').trim().toLowerCase();
// Models that rejected the thinking setting: later requests to them go without it
const noThinkingSetting = new Set();

/** The tenant's own Gemini key, else the platform key from GEMINI_API_KEY */
async function resolveApiKey(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { customFeatures: true } });
  return tenant?.customFeatures?.aiSettings?.geminiKey || process.env.GEMINI_API_KEY || null;
}

async function isConfigured(tenantId) {
  return !!(await resolveApiKey(tenantId));
}

/** HTTP failure → AiError with a code the dashboard can explain, and whether another model may succeed */
function requestError(err) {
  const res = err.response;
  const detail = res?.data?.error?.message || err.message;
  const message = `Gemini request failed: ${detail}`;
  if (!res) {
    const timedOut = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || /timeout/i.test(err.message || '');
    return new AiError(timedOut ? 'AI_TIMEOUT' : 'AI_NETWORK', message, { status: timedOut ? 504 : 502, retryable: true });
  }
  if (res.status === 429) return new AiError('AI_RATE_LIMIT', message, { status: 429, retryable: true });
  if (res.status === 404) return new AiError('AI_MODEL_UNAVAILABLE', message, { retryable: true });
  if (res.status >= 500) return new AiError('AI_BUSY', message, { status: 503, retryable: true });
  if (res.status === 401 || res.status === 403 || /api[ _-]?key/i.test(detail)) return new AiError('AI_KEY_INVALID', message, { status: 400 });
  return new AiError('AI_REQUEST_FAILED', message);
}

async function post(apiKey, modelId, body, timeout) {
  try {
    const response = await axios.post(`${API_BASE}/${modelId}:generateContent`, body, {
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      timeout
    });
    return response.data;
  } catch (err) {
    throw requestError(err);
  }
}

/** Sends the request with the thinking level; a model that rejects the setting is asked again without it */
async function callModel(apiKey, modelId, body, timeout) {
  const level = thinkingLevel();
  if (level === 'off' || noThinkingSetting.has(modelId)) return post(apiKey, modelId, body, timeout);

  const withThinking = { ...body, generationConfig: { ...body.generationConfig, thinkingConfig: { thinkingLevel: level } } };
  try {
    return await post(apiKey, modelId, withThinking, timeout);
  } catch (err) {
    if (err.code !== 'AI_REQUEST_FAILED' || !/thinking/i.test(err.message)) throw err;
    noThinkingSetting.add(modelId);
    logger.warn(`[AI] ${modelId} rejected thinking level "${level}", sending requests without it: ${err.message}`);
    return post(apiKey, modelId, body, timeout);
  }
}

function readAnswer(data, schema) {
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    const reason = candidate?.finishReason || blockReason || 'EMPTY';
    throw new AiError('AI_EMPTY', `Gemini returned no answer (${reason})`, { retryable: !blockReason && !BLOCKED_REASONS.includes(reason) });
  }
  if (!schema) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError('AI_BAD_JSON', 'Gemini returned invalid JSON', { retryable: true });
  }
}

/**
 * One Gemini answer. Falls back to the next model when one is busy, slow or unavailable.
 *  system   — system instruction text
 *  contents — [{ role: 'user' | 'model', text }]
 *  schema   — optional response schema; the reply is then parsed JSON
 */
async function generate(tenantId, { system, contents, schema = null, temperature = 0.3, maxOutputTokens = 1024 }) {
  const apiKey = await resolveApiKey(tenantId);
  if (!apiKey) throw new AiNotConfiguredError();

  const body = {
    contents: contents.map(c => ({ role: c.role, parts: [{ text: c.text }] })),
    generationConfig: { temperature, maxOutputTokens: maxOutputTokens + THINKING_HEADROOM_TOKENS }
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (schema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = schema;
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError = null;
  for (const modelId of modelChain()) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;
    try {
      return readAnswer(await callModel(apiKey, modelId, body, Math.min(ATTEMPT_TIMEOUT_MS, remaining)), schema);
    } catch (err) {
      if (!err.retryable) throw err;
      lastError = err;
      logger.warn(`[AI] ${modelId} failed (${err.code}), trying the next model: ${err.message}`);
    }
  }
  throw lastError || new AiError('AI_TIMEOUT', 'Gemini did not answer in time', { status: 504 });
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

module.exports = { generate, isConfigured, resolveApiKey, transcript, model, modelChain, AiError, AiNotConfiguredError };
