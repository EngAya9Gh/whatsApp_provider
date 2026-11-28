// The API reference (src/docs/openapi.js) must describe the real app: every documented path and method is
// routed (a renamed or removed route fails here), every $ref resolves, the exported docs/openapi.json is
// current, and /api/docs and /api/openapi.json answer. No database: Prisma is a stand-in that signs in an
// API key and answers nothing else, so each route is reached and fails after its routing, never before.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { inject, fromRoot } = require('./helpers/env');

const fakeQueue = { add: async () => ({}), addBulk: async () => {}, client: Promise.resolve({ mget: async (k) => k.map(() => null) }) };
inject(fromRoot('src/workers/campaign.worker.js'), { campaignQueue: fakeQueue, campaignWorker: null });
inject(fromRoot('src/workers/meta.campaign.worker.js'), { metaCampaignQueue: fakeQueue, worker: null });
inject(fromRoot('src/workers/meta.webhook.worker.js'), { metaWebhookQueue: fakeQueue, worker: null });

// A tenant whose API key signs in; every other query answers "nothing" (null, [], 0)
const TENANT = { id: 'T', name: 'Shop', email: 'o@shop.sa', isActive: true, plan: 'PRO', metaEnabled: true, customFeatures: {}, sessionStatus: 'CONNECTED', companyName: 'Shop' };
const answer = (model, method) => async () => {
  if (model === 'apiKey' && method === 'findFirst') return { id: 'key', tenantId: 'T', isActive: true, tenant: TENANT };
  if (model === 'tenant' && (method === 'findUnique' || method === 'findFirst')) return TENANT;
  if (method === 'findMany') return [];
  if (method === 'count') return 0;
  if (method === 'updateMany' || method === 'deleteMany') return { count: 0 };
  if (method === 'create' || method === 'update' || method === 'upsert') return {};
  return null;
};
const fakePrisma = new Proxy({}, {
  get: (_, model) => {
    if (model === '$disconnect' || model === '$connect') return async () => {};
    if (model === '$transaction') return async (ops) => (Array.isArray(ops) ? Promise.all(ops) : ops(fakePrisma));
    if (typeof model !== 'string' || model.startsWith('$')) return undefined;
    return new Proxy({}, { get: (__, method) => answer(model, method) });
  }
});
inject(fromRoot('src/config/prisma.js'), fakePrisma);

const { buildSpec: build } = require(fromRoot('src/docs/openapi'));
/** The document as it is served and exported (JSON: no undefined fields) */
const buildSpec = (serverUrl) => JSON.parse(JSON.stringify(build(serverUrl)));
const spec = buildSpec('https://api.example.com');
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const operations = Object.entries(spec.paths).flatMap(([p, item]) => METHODS.filter(m => item[m]).map(m => ({ path: p, method: m, op: item[m] })));

let server;
let url;
before(async () => {
  // Mongoose is not connected: fail at once instead of buffering for 10 seconds
  require(fromRoot('node_modules/mongoose')).set('bufferCommands', false);
  const app = require(fromRoot('src/app'));
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

/** Express's own answer for a path nothing handles: an HTML page saying "Cannot GET /x" */
const notRouted = (res, text) => res.status === 404 && /^\s*<!DOCTYPE html>/i.test(text) && text.includes('Cannot ');

const concrete = (p) => p.replace('{threadId}', '66a1f2c3d4e5f67890123456').replace(/\{[a-zA-Z]+\}/g, '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b');
async function call(method, p) {
  try {
    const res = await fetch(`${url}${p}`, {
      method: method.toUpperCase(),
      headers: { Authorization: 'Bearer sk_test', 'Content-Type': 'application/json' },
      body: method === 'get' ? undefined : '{}',
      signal: AbortSignal.timeout(4000)
    });
    return { res, text: await res.text() };
  } catch (e) {
    // A route that waits on a service this test does not run (Redis, WhatsApp) is still a route
    if (e.name === 'TimeoutError') return { res: { status: 0 }, text: '' };
    throw e;
  }
}

test('the document is well formed: tags declared, summaries present, every $ref resolves', () => {
  assert.strictEqual(spec.openapi, '3.1.0');
  assert.ok(operations.length >= 40, `${operations.length} operations`);
  const tags = new Set(spec.tags.map(t => t.name));
  for (const { path, method, op } of operations) {
    assert.ok(op.summary, `${method} ${path} has a summary`);
    assert.ok(op.tags.every(t => tags.has(t)), `${method} ${path} uses declared tags`);
    assert.ok(Object.keys(op.responses).some(s => s.startsWith('2')), `${method} ${path} documents a success response`);
    assert.ok(op.responses[401], `${method} ${path} documents 401`);
  }
  const refs = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      if (typeof node.$ref === 'string') refs.push(node.$ref);
      Object.values(node).forEach(walk);
    }
  };
  walk(spec);
  for (const r of refs) {
    const [, kind, name] = r.match(/^#\/components\/(schemas|responses)\/(.+)$/) || [];
    assert.ok(kind && spec.components[kind][name], `${r} resolves`);
  }
});

test('docs/openapi.json is the current document (npm run openapi:export)', () => {
  const file = JSON.parse(fs.readFileSync(fromRoot('docs/openapi.json'), 'utf8'));
  assert.deepStrictEqual(file, buildSpec(file.servers[0].url), 'docs/openapi.json is stale: run npm run openapi:export');
});

test('/api/docs and /api/openapi.json answer without a key', async () => {
  const page = await fetch(`${url}/api/docs`);
  assert.strictEqual(page.status, 200);
  assert.match(await page.text(), /swagger-ui.*\/api\/openapi\.json/s);
  const doc = await fetch(`${url}/api/openapi.json`);
  assert.strictEqual(doc.status, 200);
  const body = await doc.json();
  assert.strictEqual(body.servers[0].url, process.env.APP_URL);
  assert.deepStrictEqual(Object.keys(body.paths), Object.keys(spec.paths));
});

test('an unknown path is recognised as not routed (so the next test cannot pass by accident)', async () => {
  const { res, text } = await call('get', '/api/v1/no-such-thing');
  assert.ok(notRouted(res, text));
});

test('every documented path and method is routed by the app', { timeout: 120000 }, async () => {
  const missing = [];
  for (const { path, method } of operations) {
    const { res, text } = await call(method, concrete(path));
    if (notRouted(res, text)) missing.push(`${method.toUpperCase()} ${path}`);
  }
  assert.deepStrictEqual(missing, [], `documented but not routed:\n${missing.join('\n')}`);
});
