// Live dashboard events from the background worker process reach the browsers connected to the API
// process, through Redis (Socket.io Redis adapter + emitter). Needs TEST_REDIS_HOST.
const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { fromRoot, skipUnless, ROOT } = require('./helpers/env');

const skip = skipUnless('TEST_REDIS_HOST');

test('worker → Redis → API → browser: full rooms, scoped pings, personal events', { skip, timeout: 30000 }, async () => {
  const { Server } = require(fromRoot('node_modules/socket.io'));
  const { createAdapter } = require(fromRoot('node_modules/@socket.io/redis-adapter'));
  const Redis = require(fromRoot('node_modules/ioredis'));
  const { io: connect } = require(fromRoot('node_modules/socket.io-client'));

  // The API process side, set up like src/server.js
  const pub = new Redis({ host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT), db: Number(process.env.REDIS_DB) });
  const sub = pub.duplicate();
  const server = http.createServer();
  const io = new Server(server);
  io.adapter(createAdapter(pub, sub));
  io.on('connection', (socket) => { for (const room of String(socket.handshake.query.rooms).split(',')) socket.join(room); });
  await new Promise(resolve => server.listen(0, resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  const got = { full: [], scoped: [], member: [] };
  const clients = {
    full: connect(url, { query: { rooms: 'tenant_T' } }),
    scoped: connect(url, { query: { rooms: 'tenant_T:scoped' } }),
    member: connect(url, { query: { rooms: 'member_T_A' } })
  };
  for (const [key, client] of Object.entries(clients)) client.onAny((event, data) => got[key].push([event, data]));
  await Promise.all(Object.values(clients).map(c => new Promise(resolve => c.on('connect', resolve))));

  // The worker process side: a separate Node process using socket.service with the Redis emitter
  const child = spawn(process.execPath, ['-e', `
    require(${JSON.stringify(fromRoot('tests/helpers/env'))});
    const { redisClient } = require(${JSON.stringify(fromRoot('src/config/redis'))});
    const socketService = require(${JSON.stringify(fromRoot('src/services/socket.service'))});
    (async () => {
      await redisClient.connect();
      socketService.useRedisEmitter(redisClient);
      socketService.emitToTenant('T', 'new_chat_message', { threadId: 'th1', content: 'مرحبا من العامل' });
      socketService.emitToMember('T', 'A', 'team_unread', { total: 3 });
      setTimeout(() => process.exit(0), 300);
    })();
  `], { cwd: ROOT, env: process.env, stdio: ['ignore', 'ignore', 'inherit'] });
  await new Promise(resolve => child.on('exit', resolve));
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    assert.deepStrictEqual(got.full, [['new_chat_message', { threadId: 'th1', content: 'مرحبا من العامل' }]]);
    assert.deepStrictEqual(got.scoped, [['chat_activity', { threadId: 'th1', event: 'new_chat_message' }]], 'restricted agents get no message content');
    assert.deepStrictEqual(got.member, [['team_unread', { total: 3 }]]);
  } finally {
    Object.values(clients).forEach(c => c.close());
    io.close();
    pub.quit();
    sub.quit();
  }
});
