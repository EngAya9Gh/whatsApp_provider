#!/usr/bin/env node
// Asks MongoDB how it runs the two inbox queries of chat.service.js (the list newest first, with and
// without a number filter, and one conversation's messages): the index it used, how many documents it
// read to return 50, and the time. With --create-indexes it first creates the indexes declared in
// src/models/mongo (the same ones the server creates when it starts), so you can see before and after.
// Reads only, apart from that. See README.md.
const { MongoClient } = require('mongodb');

const env = (name, fallback) => (process.env[name] === undefined || process.env[name] === '' ? fallback : process.env[name]);
const MONGO_URI = env('MONGO_URI');
const CREATE = process.argv.includes('--create-indexes');
const LIMIT = 50;

if (!MONGO_URI) {
  console.error('Set MONGO_URI, e.g. mongodb://127.0.0.1:27017/wakeel_bench');
  process.exit(1);
}

// The indexes of src/models/mongo/ChatThread.js and ChatMessage.js that serve the inbox
const INDEXES = {
  chat_threads: [
    { key: { tenantId: 1, channelId: 1, contactPhone: 1 }, options: { unique: true } },
    { key: { tenantId: 1, lastMessageAt: -1 } },
    { key: { tenantId: 1, channelId: 1, lastMessageAt: -1 } }
  ],
  chat_messages: [
    { key: { threadId: 1, createdAt: -1 } },
    { key: { metaMessageId: 1 } }
  ]
};

/** The stages of the winning plan, innermost first: "IXSCAN tenantId_1_lastMessageAt_-1 → FETCH → LIMIT" */
function planOf(stage) {
  const names = [];
  const walk = (s) => {
    if (!s) return;
    names.unshift(s.indexName ? `${s.stage} ${s.indexName}` : s.stage);
    walk(s.inputStage || (s.inputStages || [])[0]);
  };
  walk(stage);
  return names.join(' → ');
}

async function explain(label, cursor) {
  const out = await cursor.explain('executionStats');
  const plan = out.queryPlanner.winningPlan;
  const st = out.executionStats;
  const row = {
    query: label,
    plan: planOf(plan.queryPlan || plan),
    'docs read': st.totalDocsExamined,
    'index keys read': st.totalKeysExamined,
    returned: st.nReturned,
    'time ms': st.executionTimeMillis
  };
  if (/SORT\b/.test(row.plan) && !/SORT_MERGE/.test(row.plan)) row.plan += '   ⚠ sorted in memory';
  return row;
}

(async () => {
  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db();
  const threads = db.collection('chat_threads');
  const messages = db.collection('chat_messages');

  if (CREATE) {
    for (const [name, list] of Object.entries(INDEXES)) {
      for (const { key, options } of list) {
        const started = Date.now();
        const created = await db.collection(name).createIndex(key, options || {});
        console.log(`index ${name}.${created} ready (${Date.now() - started} ms)`);
      }
    }
  }

  // Without TENANT_ID: the account with the most conversations
  let tenantId = process.env.TENANT_ID;
  if (!tenantId) {
    const [top] = await threads.aggregate([{ $group: { _id: '$tenantId', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 1 }]).toArray();
    tenantId = top?._id;
  }
  const sample = tenantId && await threads.findOne({ tenantId }, { sort: { lastMessageAt: -1 } });
  if (!sample) {
    console.error(`No conversations${tenantId ? ` of account ${tenantId}` : ''} in ${db.databaseName}: run seed-inbox.js first, or set TENANT_ID.`);
    process.exit(1);
  }
  const total = await threads.countDocuments({ tenantId });
  console.log(`\nDatabase ${db.databaseName}: ${await threads.estimatedDocumentCount()} conversations and ${await messages.estimatedDocumentCount()} messages in all.`);
  console.log(`Account ${tenantId}: ${total} conversations. Existing indexes:`);
  console.log('  chat_threads:  ' + (await threads.indexes()).map(i => i.name).join(', '));
  console.log('  chat_messages: ' + (await messages.indexes()).map(i => i.name).join(', '));

  const rows = [
    await explain('inbox list, all numbers', threads.find({ tenantId }).sort({ lastMessageAt: -1 }).limit(LIMIT)),
    await explain('inbox list, one number', threads.find({ tenantId, channelId: sample.channelId }).sort({ lastMessageAt: -1 }).limit(LIMIT)),
    await explain('inbox list, page 20', threads.find({ tenantId }).sort({ lastMessageAt: -1 }).skip(19 * LIMIT).limit(LIMIT)),
    await explain('one conversation, messages', messages.find({ threadId: sample._id }).sort({ createdAt: -1 }).limit(LIMIT)),
    await explain('one conversation, count', messages.find({ threadId: sample._id }))
  ];
  console.log(`\nHow MongoDB ran each query (${LIMIT} results asked for):`);
  console.table(rows);
  console.log('A healthy plan reads about as many documents as it returns and has no in-memory SORT.');
  await client.close();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
