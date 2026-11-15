/**
 * Meta Business Agent: Meta's own AI agent for WhatsApp
 * (developers.facebook.com/documentation/meta-business-agent).
 *
 * The Agent Platform API lives on api.facebook.com (not graph.facebook.com), is addressed by the phone
 * number ID, needs an X-API-Version header, and answers errors as { title, detail, status }.
 * The agent's whole configuration is stored at Meta; the platform only relays it (nothing kept locally).
 *
 *   /{phone}/agent_eligibility             GET     can the number use it? (works before the terms)
 *   /{phone}/agent_onboarding              POST    create the agent (the one call that can't be skipped)
 *   /{phone}/agent_config/settings         GET/PUT on/off, audience, handoff, follow-up, never-say phrases
 *   /{phone}/agent_config/business_info    GET/PUT description, contact, payment, returns, shipping
 *   /{phone}/agent_config/faq|websites|skills[/id]   list / create / update / delete
 *   /{phone}/agent_config/files[/id]       list / upload (multipart) / delete
 *   /{phone}/agent_config/allowlist[/id]   test customers (max 20) while the audience is ALLOWLISTED_ONLY
 *   /{phone}/agent_test                    POST    chat with the agent, free, also while it is off
 *   /{phone}/delete_agent                  DELETE  remove the agent
 */
const axios = require('axios');
const { metaErrorInfo } = require('./meta.errors');

const AGENT_API = process.env.META_AGENT_API_BASE || 'https://api.facebook.com';
const AGENT_API_VERSION = process.env.META_AGENT_API_VERSION || '2.0.0';
const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION || 'v21.0'}`;

/** An Agent Platform failure, kept small for the screen (never the token). */
class AgentApiError extends Error {
  constructor(status, title, detail) {
    super(detail || title || 'Meta Business Agent request failed');
    this.status = status;
    this.title = title || null;
  }
}

const toAgentError = (e) => {
  if (e instanceof AgentApiError) return e;
  const d = e.response?.data || {};
  if (d.title || d.detail) return new AgentApiError(e.response?.status || d.status || null, d.title, d.detail);
  const info = metaErrorInfo(e); // Graph-style error body, or a network error
  return new AgentApiError(e.response?.status || null, null, info.details || info.message);
};

async function call(channel, method, sub, { data, params, headers } = {}) {
  if (!channel.metaPhoneNumberId || !channel.metaAccessToken) {
    throw new AgentApiError(400, 'Channel not ready', 'The channel has no phone number ID or access token.');
  }
  try {
    const res = await axios.request({
      method,
      url: `${AGENT_API}/${channel.metaPhoneNumberId}/${sub}`,
      data, params,
      headers: { Authorization: `Bearer ${channel.metaAccessToken}`, 'X-API-Version': AGENT_API_VERSION, ...(headers || {}) },
      timeout: 60000,
      maxBodyLength: Infinity
    });
    return res.data;
  } catch (e) {
    throw toAgentError(e);
  }
}

// Lists come back as an array (or { data: [...] } on paginated resources)
const asList = (d) => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);

/**
 * Can this number use Meta Business Agent? → { ok: true, eligible, reason } or { ok: false, error }.
 * Never throws. `reason` is Meta's display text (it can change; never branch on it). Meta: a failed
 * request (401 / 404 / 429) means "not checked", not "not eligible".
 */
async function checkEligibility(channel) {
  try {
    const d = await call(channel, 'get', 'agent_eligibility');
    return { ok: true, eligible: d?.is_eligible === true, reason: d?.ineligibility_reason || null };
  } catch (e) {
    return { ok: false, error: { status: e.status, title: e.title, message: e.message } };
  }
}

const onboard = (channel) => call(channel, 'post', 'agent_onboarding', { data: {} });
const deleteAgent = (channel) => call(channel, 'delete', 'delete_agent');

/** The number's agent settings, or null when no agent exists yet. */
async function getSettings(channel) {
  try {
    const list = asList(await call(channel, 'get', 'agent_config/settings'));
    return list[0] || null;
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}
const updateSettings = (channel, body, agentId) =>
  call(channel, 'put', 'agent_config/settings', { data: body, params: agentId ? { agent_id: agentId } : undefined });

const getBusinessInfo = (channel) => call(channel, 'get', 'agent_config/business_info');
const putBusinessInfo = (channel, body) => call(channel, 'put', 'agent_config/business_info', { data: body });

// faq | websites | skills share the same list / create / update / delete shape
const KINDS = ['faq', 'websites', 'skills'];
const listItems = async (channel, kind) => asList(await call(channel, 'get', `agent_config/${kind}`));
const createItem = (channel, kind, body) => call(channel, 'post', `agent_config/${kind}`, { data: body });
const updateItem = (channel, kind, id, body) => call(channel, 'put', `agent_config/${kind}/${encodeURIComponent(id)}`, { data: body });
const deleteItem = (channel, kind, id) => call(channel, 'delete', `agent_config/${kind}/${encodeURIComponent(id)}`);

const listFiles = async (channel) => asList(await call(channel, 'get', 'agent_config/files'));
async function uploadFile(channel, { buffer, fileName, mimeType }) {
  const form = new FormData();
  form.append('file_name', fileName);
  form.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), fileName);
  return call(channel, 'post', 'agent_config/files', { data: form });
}
const deleteFile = (channel, id) => call(channel, 'delete', `agent_config/files/${encodeURIComponent(id)}`);

const listAllowlist = async (channel) => asList(await call(channel, 'get', 'agent_config/allowlist'));
const addToAllowlist = (channel, phoneE164) => call(channel, 'post', 'agent_config/allowlist', { data: { consumer_phone_number: phoneE164 } });
const removeFromAllowlist = (channel, entryId) => call(channel, 'delete', `agent_config/allowlist/${encodeURIComponent(entryId)}`);

const test = (channel, userMsg, conversationId) =>
  call(channel, 'post', 'agent_test', { data: { user_msg: userMsg, ...(conversationId ? { conversation_id: conversationId } : {}) } });

/** The business portfolio that owns the number's WhatsApp account (for links into Meta's screens). */
async function ownerBusinessId(channel) {
  if (!channel.metaWabaId || !channel.metaAccessToken) return null;
  try {
    const r = await axios.get(`${GRAPH}/${channel.metaWabaId}`, {
      params: { fields: 'owner_business_info' },
      headers: { Authorization: `Bearer ${channel.metaAccessToken}` },
      timeout: 10000
    });
    return r.data?.owner_business_info?.id || null;
  } catch {
    return null;
  }
}

/** Where the business does its part in Meta's own screens. */
function metaLinks(businessId, wabaId) {
  const q = (extra) => new URLSearchParams({ ...(businessId ? { business_id: businessId } : {}), ...extra }).toString();
  return {
    // WhatsApp Manager › Meta Business Agent tab: terms + "Allow AI agent to respond"
    agentTab: `https://business.facebook.com/latest/whatsapp_manager/business_ai?${q({ asset_id: wabaId })}`,
    // Business Settings › WhatsApp accounts › [account] › Conversation routing
    routing: `https://business.facebook.com/latest/settings/whatsapp_business_presence?${q({ selected_asset_id: wabaId, selected_asset_type: 'whatsapp-business-account' })}`,
    billing: `https://business.facebook.com/billing_hub/payment_settings?${q({})}`
  };
}

module.exports = {
  AgentApiError,
  KINDS,
  checkEligibility,
  onboard,
  deleteAgent,
  getSettings,
  updateSettings,
  getBusinessInfo,
  putBusinessInfo,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  listFiles,
  uploadFile,
  deleteFile,
  listAllowlist,
  addToAllowlist,
  removeFromAllowlist,
  test,
  ownerBusinessId,
  metaLinks
};
