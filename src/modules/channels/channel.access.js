// Which numbers (channels) an account may work on: send from, run campaigns and templates on, and pick in the
// sidebar's number selector.
//  - The owner, API keys and ADMIN employees: every number, and they switch between them.
//  - Other employees: their assigned number plus the numbers of the teams they belong to.
//  - An employee with neither keeps every number (the employee form's "No assignment").
// Which conversations an employee sees in Live Chat is a separate setting (chat_scope, workforce/access.service).
const Team = require('../../models/mongo/Team');

/** null = every number; otherwise the channel ids this request may use (worked out once per request) */
async function allowedChannelIds(req) {
  if (!req.isSubUser || !req.subUser) return null;
  if (req._allowedChannelIds !== undefined) return req._allowedChannelIds;

  let ids = null;
  if (req.subUser.role !== 'ADMIN') {
    const teams = await Team.find({ tenantId: req.tenant.id, memberIds: req.subUser.id }).select('channelIds').lean();
    const list = [req.subUser.channelId, ...teams.flatMap(t => t.channelIds || [])].filter(Boolean).map(String);
    ids = list.length ? [...new Set(list)] : null;
  }
  req._allowedChannelIds = ids;
  return ids;
}

async function canUseChannel(req, channelId) {
  if (!channelId) return true;
  const ids = await allowedChannelIds(req);
  return !ids || ids.includes(String(channelId));
}

/** The number a request names: a route's :channelId, or channelId / channel_id in the body or the query */
function requestedChannelId(req) {
  return req.params?.channelId || req.body?.channelId || req.body?.channel_id || req.query?.channelId || req.query?.channel_id || null;
}

/**
 * Express middleware: 403 when the request names a number this account may not use. Put it after any
 * multipart parser (multer) on routes that send files, so their body is read.
 */
async function channelGuard(req, res, next) {
  try {
    if (await canUseChannel(req, requestedChannelId(req))) return next();
    return res.status(403).json({ error: { code: 'CHANNEL_NOT_ALLOWED', message: 'You do not have access to this number' } });
  } catch (err) {
    next(err);
  }
}

module.exports = { allowedChannelIds, canUseChannel, channelGuard, requestedChannelId };
