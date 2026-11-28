// The api and the WhatsApp QR sessions can live in different processes: PROCESS_ROLE=sessions holds the
// Baileys sockets, the api runs with QR_SESSIONS=remote. A call on a session from the api is then a job
// on the 'wa-session-rpc' queue; the sessions process runs the WhatsAppService method and returns its
// result (or the error it threw). Buffers (images) travel base64-encoded. Never retried: a send that
// timed out must not go out twice.
const { Queue, Worker, QueueEvents } = require('bullmq');
const { bullConnection } = require('../../config/redis');
const logger = require('../../utils/logger');

const QUEUE_NAME = 'wa-session-rpc';
const TIMEOUT_MS = Number(process.env.QR_SESSION_RPC_TIMEOUT_MS || 60000);

let queue = null;
let events = null;
let worker = null;

const encode = (v) => (Buffer.isBuffer(v) ? { __buffer: v.toString('base64') } : v);
const decode = (v) => (v && typeof v === 'object' && typeof v.__buffer === 'string' ? Buffer.from(v.__buffer, 'base64') : v);

/** Only what survives JSON: Baileys message objects carry bytes and callers only read the key */
function plain(value) {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value && value.key ? { key: value.key } : null;
  }
}

const queueOf = () => {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: bullConnection });
  return queue;
};
const eventsOf = () => {
  if (!events) events = new QueueEvents(QUEUE_NAME, { connection: bullConnection });
  return events;
};

/** Runs WhatsAppService[method](...args) in the sessions process and returns its result (or throws its error) */
async function call(method, args = []) {
  const job = await queueOf().add(method, { method, args: args.map(encode) }, { attempts: 1, removeOnComplete: true, removeOnFail: true });
  const ev = eventsOf();
  await ev.waitUntilReady();
  let out;
  try {
    out = await job.waitUntilFinished(ev, TIMEOUT_MS);
  } catch (err) {
    // No sessions process answered in time: take the job back so it does not run later, unannounced
    await job.remove().catch(() => {});
    logger.error(`[SessionRpc] ${method} got no answer from the sessions process: ${err.message}`);
    throw { status: 503, message: 'The WhatsApp sessions process did not answer. Is whatsapp-sessions running?' };
  }
  if (!out || !out.ok) throw (out && out.error) || { status: 500, message: 'Empty answer from the sessions process' };
  return out.result;
}

/**
 * The sessions process: runs the calls on its sessions. target is WhatsAppService (tests pass a stand-in).
 * Errors come back as data: the service throws plain { status, message } objects, which BullMQ would
 * flatten to "[object Object]".
 */
function startWorker(target) {
  if (worker) return worker;
  worker = new Worker(QUEUE_NAME, async (job) => {
    const { method, args } = job.data;
    if (typeof target[method] !== 'function') return { ok: false, error: { status: 400, message: `Unknown session call: ${method}` } };
    try {
      return { ok: true, result: plain(await target[method](...(args || []).map(decode))) };
    } catch (err) {
      return {
        ok: false,
        error: err && err.status ? { status: err.status, message: err.message } : { status: 500, message: (err && err.message) || String(err) }
      };
    }
  }, { connection: bullConnection, concurrency: 20 });
  worker.on('error', (err) => logger.error(`[SessionRpc] worker error: ${err.message}`));
  logger.info('[SessionRpc] Answering the api\'s calls on the WhatsApp QR sessions');
  return worker;
}

/** Closes the queue objects of this process (shutdown and tests) */
async function close() {
  await Promise.all([worker?.close(), events?.close(), queue?.close()].filter(Boolean).map(p => p.catch(() => {})));
  worker = events = queue = null;
}

module.exports = { QUEUE_NAME, call, startWorker, close };
