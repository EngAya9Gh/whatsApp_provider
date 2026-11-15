/**
 * What this Node process does (PROCESS_ROLE):
 *  all    (default) — HTTP API + dashboard sockets + WhatsApp QR sessions + background queues + ticket scheduler
 *  api    — HTTP API, dashboard sockets and WhatsApp QR sessions (QR campaigns run here: they need the sessions)
 *  worker — background queues (Meta webhooks, Meta campaigns) and the ticket scheduler, no HTTP (src/worker.js)
 * Run one "api" and one "worker" so a big campaign or a burst of messages never slows the dashboard.
 */
const ROLES = ['all', 'api', 'worker'];
const role = ROLES.includes(process.env.PROCESS_ROLE) ? process.env.PROCESS_ROLE : 'all';

module.exports = {
  role,
  runsBackground: role !== 'api',
  servesHttp: role !== 'worker'
};
