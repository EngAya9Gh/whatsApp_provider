// The ready-made chat flows of the dashboard: every step connected the way the engine expects,
// nothing overlapping on the canvas, the preview lists every step, and the server accepts them for
// publishing (same validation as the Publish button).
const { test } = require('node:test');
const assert = require('node:assert');
const { pathToFileURL } = require('node:url');
const { inject, fromRoot } = require('./helpers/env');

// What publishing checks against: tags, stages, team members, AI key and business info
inject(fromRoot('src/models/mongo/ChatTag'), { find: () => ({ select: () => ({ lean: async () => [{ _id: 'tag-sales' }, { _id: 'tag-bad' }] }) }) });
inject(fromRoot('src/models/mongo/CustomerStage'), { find: () => ({ select: () => ({ lean: async () => [{ _id: 'stage-1' }] }) }) });
inject(fromRoot('src/models/mongo/AiAgent'), { findOne: () => ({ lean: async () => ({ knowledge: [{ title: 'x', content: 'y' }] }) }) });
inject(fromRoot('src/modules/ai/ai.client'), { isConfigured: async () => true });
inject('@prisma/client', { PrismaClient: class { constructor() { this.subUser = { findMany: async () => [{ id: 'A' }] }; } } });

const load = (file) => import(pathToFileURL(fromRoot(`dashboard/src/data/${file}`)).href);

test('every template, in Arabic and English', async () => {
  const { FLOW_TEMPLATES, outlineOf } = await load('flowTemplates.js');
  const { outputHandles } = await load('flowNodes.js');
  const { validate } = require(fromRoot('src/modules/flows/flow.service'));
  assert.ok(FLOW_TEMPLATES.length >= 5);

  for (const tpl of FLOW_TEMPLATES) {
    for (const isAr of [true, false]) {
      const g = tpl.build({ isAr, inactivityHours: 12, tagIds: { sales: 'tag-sales', complaint: 'tag-bad' }, stageId: tpl.usesStage ? 'stage-1' : '' });
      const ids = g.nodes.map(n => n.id);
      assert.strictEqual(new Set(ids).size, ids.length, `${tpl.key}: unique step ids`);
      assert.strictEqual(g.nodes.find(n => n.type === 'trigger').data.inactivityHours, 12, `${tpl.key}: keeps the silence period`);
      for (const e of g.edges) {
        const source = g.nodes.find(n => n.id === e.source);
        assert.ok(source && ids.includes(e.target), `${tpl.key}: ${e.id} connects existing steps`);
        assert.ok(outputHandles(source).includes(e.sourceHandle), `${tpl.key}: ${e.id} leaves from a real output`);
      }
      for (const n of g.nodes) {
        for (const handle of outputHandles(n)) {
          if (n.type === 'question' && handle === 'fallback') continue;
          assert.ok(g.edges.some(e => e.source === n.id && e.sourceHandle === handle), `${tpl.key}: ${n.id}/${handle} is connected`);
        }
      }
      assert.strictEqual(outlineOf(g, isAr, {}).filter(l => !l.repeat).length, g.nodes.length, `${tpl.key}: the preview shows every step once`);
      for (const a of g.nodes) {
        for (const b of g.nodes) {
          if (a !== b && Math.abs(a.position.x - b.position.x) < 260) assert.ok(Math.abs(a.position.y - b.position.y) >= 130, `${tpl.key}: ${a.id} and ${b.id} overlap`);
        }
      }
      const problems = await validate('T', g);
      assert.deepStrictEqual(problems, [], `${tpl.key} (${isAr ? 'ar' : 'en'}) can be published`);
    }
  }
});

test('the sort template works without customer stages', async () => {
  const { FLOW_TEMPLATES } = await load('flowTemplates.js');
  const g = FLOW_TEMPLATES.find(t => t.key === 'sort').build({ isAr: true, inactivityHours: 24, tagIds: { sales: 's', complaint: 'c' }, stageId: '' });
  assert.ok(!g.nodes.some(n => n.type === 'stage'));
  assert.ok(g.edges.some(e => e.source === 'buy-tag' && e.target === 'buy-msg'), 'the tag connects straight to the message');
});
