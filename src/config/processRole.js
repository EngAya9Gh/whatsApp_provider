/**
 * What this Node process does (PROCESS_ROLE):
 *  all      (default) — HTTP API + dashboard sockets + WhatsApp QR sessions + background queues + schedulers
 *  api      — HTTP API and dashboard sockets. Also the QR sessions and QR campaigns, unless QR_SESSIONS=remote
 *             says a "sessions" process holds them (every call on a session then goes through session.rpc.js)
 *  worker   — background queues (Meta webhooks, Meta campaigns) and the schedulers, no HTTP (src/worker.js)
 *  sessions — the WhatsApp QR (Baileys) numbers and QR campaigns, no HTTP (src/sessions.js): a deploy or a
 *             memory restart of the api no longer disconnects the numbers
 * Production runs api + worker + sessions (ecosystem.config.js).
 */
const ROLES = ['all', 'api', 'worker', 'sessions'];
const role = ROLES.includes(process.env.PROCESS_ROLE) ? process.env.PROCESS_ROLE : 'all';

module.exports = {
  role,
  runsBackground: role === 'all' || role === 'worker',
  servesHttp: role === 'all' || role === 'api',
  runsSessions: role === 'all' || role === 'sessions' || (role === 'api' && process.env.QR_SESSIONS !== 'remote')
};
