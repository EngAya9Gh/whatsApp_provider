// Gemini client with a fake HTTP layer: model order, thinking level, fallback on busy/timeouts,
// what stops at once (bad key, safety block), and the environment overrides.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const { inject, fromRoot } = require('./helpers/env');

let calls = [];
let script = []; // one function per expected request
inject('axios', {
  post: async (url, body, opts) => {
    calls.push({ model: url.split('/models/')[1].split(':')[0], body: JSON.parse(JSON.stringify(body)), timeout: opts.timeout });
    const step = script.shift();
    if (!step) throw new Error('no scripted response');
    return { data: step() };
  }
});
inject('@prisma/client', { PrismaClient: class { constructor() { this.tenant = { findUnique: async () => ({ customFeatures: { aiSettings: { geminiKey: 'k' } } }) }; } } });

const httpError = (status, message) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data: { error: { message } } } });
const fail = (status, message) => () => { throw httpError(status, message); };
const timeout = () => () => { throw Object.assign(new Error('timeout of 20000ms exceeded'), { code: 'ECONNABORTED' }); };
const answer = (text) => () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });

for (const key of ['GEMINI_MODEL', 'GEMINI_FALLBACK_MODELS', 'GEMINI_THINKING_LEVEL']) delete process.env[key];
const client = require(fromRoot('src/modules/ai/ai.client.js'));
const req = { system: 'sys', contents: [{ role: 'user', text: 'hi' }], maxOutputTokens: 400 };
const reset = (steps) => { calls = []; script = steps; };
beforeEach(() => reset([]));

test('stable model first, low thinking, room for thinking tokens', async () => {
  assert.deepStrictEqual(client.modelChain(), ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']);
  reset([answer('مرحبا')]);
  assert.strictEqual(await client.generate('t', req), 'مرحبا');
  assert.strictEqual(calls[0].model, 'gemini-3.6-flash');
  assert.deepStrictEqual(calls[0].body.generationConfig.thinkingConfig, { thinkingLevel: 'low' });
  assert.strictEqual(calls[0].body.generationConfig.maxOutputTokens, 1424);
});

test('busy, timeout and rate limit try the next model; all failing gives AI_BUSY', async () => {
  reset([fail(503, 'This model is currently experiencing high demand.'), answer('ok')]);
  assert.strictEqual(await client.generate('t', req), 'ok');
  assert.deepStrictEqual(calls.map(c => c.model), ['gemini-3.6-flash', 'gemini-3.5-flash-lite']);
  reset([timeout(), fail(429, 'Resource has been exhausted'), fail(503, 'overloaded')]);
  await assert.rejects(client.generate('t', req), (e) => e.code === 'AI_BUSY' && e.status === 503);
  assert.strictEqual(calls.length, 3);
});

test('an invalid key and a safety block stop at once', async () => {
  reset([fail(400, 'API key not valid. Please pass a valid API key.')]);
  await assert.rejects(client.generate('t', req), (e) => e.code === 'AI_KEY_INVALID' && e.status === 400);
  assert.strictEqual(calls.length, 1);
  reset([() => ({ candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }] })]);
  await assert.rejects(client.generate('t', req), (e) => e.code === 'AI_EMPTY');
  assert.strictEqual(calls.length, 1);
});

test('a model that rejects the thinking setting is asked again without it, and remembered', async () => {
  reset([fail(400, 'Invalid JSON payload received. Unknown name "thinkingLevel" at \'generation_config.thinking_config\''), answer('بدون تفكير'), answer('مرة ثانية')]);
  assert.strictEqual(await client.generate('t', req), 'بدون تفكير');
  assert.strictEqual(calls[1].body.generationConfig.thinkingConfig, undefined);
  assert.strictEqual(await client.generate('t', req), 'مرة ثانية');
  assert.strictEqual(calls[2].body.generationConfig.thinkingConfig, undefined);
});

test('JSON answers: broken JSON is retried, thought parts are ignored', async () => {
  reset([answer('{"reply": "نص مقطوع'), () => ({ candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text: '{"reply":"تمام","handoff":false}' }] } }] })]);
  assert.deepStrictEqual(await client.generate('t', { ...req, schema: { type: 'OBJECT' } }), { reply: 'تمام', handoff: false });
});

test('GEMINI_MODEL / GEMINI_FALLBACK_MODELS / GEMINI_THINKING_LEVEL', async () => {
  process.env.GEMINI_MODEL = 'gemini-3.8-flash';
  process.env.GEMINI_FALLBACK_MODELS = 'none';
  assert.deepStrictEqual(client.modelChain(), ['gemini-3.8-flash']);
  process.env.GEMINI_FALLBACK_MODELS = 'gemini-3.6-flash, gemini-3.8-flash';
  assert.deepStrictEqual(client.modelChain(), ['gemini-3.8-flash', 'gemini-3.6-flash']);
  process.env.GEMINI_THINKING_LEVEL = 'off';
  reset([answer('x')]);
  await client.generate('t', req);
  assert.strictEqual(calls[0].body.generationConfig.thinkingConfig, undefined);
  for (const key of ['GEMINI_MODEL', 'GEMINI_FALLBACK_MODELS', 'GEMINI_THINKING_LEVEL']) delete process.env[key];
});
