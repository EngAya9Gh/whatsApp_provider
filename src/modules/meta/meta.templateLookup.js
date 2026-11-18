// The approved versions (language + components) of a template on a channel's WhatsApp account, kept for
// 10 minutes so a campaign does not ask Meta once per recipient. Used by the campaign worker (language,
// Live Chat preview) and by campaign creation (which columns the file must have).
const axios = require('axios');
const logger = require('../../utils/logger');

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

/** The approved versions of a template ([] when Meta cannot be asked or has none) */
async function fetchApproved(channel, templateName) {
  if (!channel?.metaWabaId || !channel?.metaAccessToken || !templateName) return null;
  try {
    const res = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${channel.metaWabaId}/message_templates`,
      {
        params: { name: templateName, fields: 'name,language,status,category,components', limit: 50 },
        headers: { Authorization: `Bearer ${channel.metaAccessToken}` },
        timeout: 15000
      }
    );
    return (res.data?.data || []).filter(t => t.name === templateName && t.status === 'APPROVED');
  } catch (e) {
    logger.warn(`[MetaTemplates] Could not fetch template "${templateName}": ${e.message}`);
    return null; // null = Meta could not be asked (not cached, so the next call tries again)
  }
}

/** The approved versions ([] when there are none; null when Meta could not be asked) */
async function approvedVersionsOrNull(channel, templateName) {
  const key = `${channel?.id}:${templateName}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.templates;
  const templates = await fetchApproved(channel, templateName);
  if (templates === null) return null;
  if (cache.size > 2000) cache.clear();
  cache.set(key, { templates, until: Date.now() + CACHE_MS });
  return templates;
}

async function approvedVersions(channel, templateName) {
  return (await approvedVersionsOrNull(channel, templateName)) || [];
}

/**
 * The template in this language: { reachable, template }. reachable = false when Meta could not be asked
 * (then template is null and the caller decides whether to go on without it).
 */
async function lookup(channel, templateName, language) {
  const versions = await approvedVersionsOrNull(channel, templateName);
  if (versions === null) return { reachable: false, template: null };
  const template = (language && versions.find(t => t.language === language)) || (!language ? versions[0] : null) || null;
  return { reachable: true, template };
}

const clearCache = () => cache.clear();

module.exports = { approvedVersions, lookup, clearCache };
