#!/usr/bin/env node
// Fills a conversations database with many conversations and messages for one account, to measure the
// inbox at scale (inbox-explain.js, or the dashboard pointed at this database). Writes the raw
// collections, so it creates none of the models' indexes: that is what inbox-explain.js --create-indexes
// is for, to see before and after. See README.md.
const { MongoClient, ObjectId } = require('mongodb');

const env = (name, fallback) => (process.env[name] === undefined || process.env[name] === '' ? fallback : process.env[name]);
const MONGO_URI = env('MONGO_URI');
const TENANT_ID = env('TENANT_ID', 'bench');
const CHANNEL_ID = env('CHANNEL_ID', 'bench-1');
const THREADS = Number(env('THREADS', 100000));
const MESSAGES = Number(env('MESSAGES', 5));
const BATCH = 5000;

if (!MONGO_URI || !/\/[^/?]+(\?|$)/.test(MONGO_URI.replace(/^mongodb(\+srv)?:\/\/[^/]+/, ''))) {
  console.error('Set MONGO_URI with a database name, e.g. mongodb://127.0.0.1:27017/wakeel_bench (a throwaway database).');
  process.exit(1);
}

const DAY = 24 * 3600 * 1000;
const NAMES = ['أحمد', 'سارة', 'محمد', 'نورة', 'خالد', 'ريم', 'فهد', 'لمى', 'عبدالله', 'هند'];

(async () => {
  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db();
  const threads = db.collection('chat_threads');
  const messages = db.collection('chat_messages');
  const existing = await threads.countDocuments({ tenantId: TENANT_ID });
  console.log(`Database ${db.databaseName}: ${existing} conversations of account ${TENANT_ID} already there; adding ${THREADS} with ${MESSAGES} messages each`);

  const startedAt = Date.now();
  for (let done = 0; done < THREADS; done += BATCH) {
    const count = Math.min(BATCH, THREADS - done);
    const now = Date.now();
    const threadDocs = [];
    const messageDocs = [];
    for (let i = 0; i < count; i++) {
      const n = existing + done + i;
      const _id = new ObjectId();
      const lastMessageAt = new Date(now - Math.floor(Math.random() * 90 * DAY));
      const createdAt = new Date(lastMessageAt.getTime() - MESSAGES * 60000);
      threadDocs.push({
        _id, tenantId: TENANT_ID, channelId: CHANNEL_ID, contactPhone: `9665${String(n).padStart(8, '0')}`,
        contactName: `${NAMES[n % NAMES.length]} ${n}`, nameEditedAt: null, lastMessageAt, lastInboundAt: lastMessageAt,
        unreadCount: n % 7 === 0 ? 1 : 0, flowState: null, aiSummary: null, aiSuggestion: null, tagIds: [], stageId: null,
        stageHistory: [], createdAt, updatedAt: lastMessageAt, __v: 0
      });
      for (let m = 0; m < MESSAGES; m++) {
        const at = new Date(createdAt.getTime() + m * 60000);
        messageDocs.push({
          threadId: _id, direction: m % 2 ? 'OUTBOUND' : 'INBOUND', type: 'TEXT', content: `message ${m} of conversation ${n}`,
          hasMedia: false, status: m % 2 ? 'READ' : undefined, metaMessageId: `wamid.bench.${n}.${m}`, isInternal: false,
          senderId: null, isAutomated: false, source: null, campaignName: null, mentions: [], createdAt: at, updatedAt: at, __v: 0
        });
      }
    }
    await threads.insertMany(threadDocs, { ordered: false });
    if (messageDocs.length) await messages.insertMany(messageDocs, { ordered: false });
    console.log(`  ${done + count} / ${THREADS} conversations (${((Date.now() - startedAt) / 1000).toFixed(0)} s)`);
  }
  console.log(`Done: ${await threads.countDocuments({ tenantId: TENANT_ID })} conversations, ${await messages.estimatedDocumentCount()} messages in the database`);
  await client.close();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
