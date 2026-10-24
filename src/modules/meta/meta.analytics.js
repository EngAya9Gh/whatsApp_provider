const axios = require('axios');

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

/**
 * Message counts as Meta reports them for a WhatsApp Business Account (all its numbers).
 * Includes messages sent outside this platform (e.g. Meta's API test console).
 * Returns { sent, delivered, daily: [{ date, sent, delivered }] }.
 */
async function fetchWabaAnalytics(channel, startDate, endDate) {
  if (!channel.metaWabaId || !channel.metaAccessToken) {
    throw new Error('Channel missing WABA ID or access token');
  }
  const startTs = Math.floor(startDate.getTime() / 1000);
  const endTs = Math.floor(endDate.getTime() / 1000);
  const days = (endTs - startTs) / 86400;
  const granularity = days <= 90 ? 'DAY' : 'MONTH';

  // Rounded to the hour so repeated page loads hit the cache
  const key = `${channel.metaWabaId}:${Math.floor(startTs / 3600)}:${Math.floor(endTs / 3600)}:${granularity}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const response = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${channel.metaWabaId}`, {
    headers: { Authorization: `Bearer ${channel.metaAccessToken}` },
    params: { fields: `analytics.start(${startTs}).end(${endTs}).granularity(${granularity})` },
    timeout: 15000
  });

  const points = response.data?.analytics?.data_points || response.data?.analytics?.data || [];
  const value = {
    sent: points.reduce((s, p) => s + (Number(p.sent) || 0), 0),
    delivered: points.reduce((s, p) => s + (Number(p.delivered) || 0), 0),
    granularity,
    daily: points.map(p => ({
      date: new Date(Number(p.start) * 1000).toISOString().slice(0, 10),
      sent: Number(p.sent) || 0,
      delivered: Number(p.delivered) || 0
    }))
  };
  cache.set(key, { value, expires: Date.now() + CACHE_MS });
  return value;
}

/** Sum over several channels, counting each WhatsApp Business Account once */
async function fetchForChannels(channels, startDate, endDate) {
  const byWaba = new Map();
  for (const ch of channels) if (ch.metaWabaId && !byWaba.has(ch.metaWabaId)) byWaba.set(ch.metaWabaId, ch);
  if (byWaba.size === 0) return { available: false, reason: 'NO_CREDENTIALS' };

  const results = await Promise.allSettled([...byWaba.values()].map(ch => fetchWabaAnalytics(ch, startDate, endDate)));
  const ok = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  if (ok.length === 0) {
    const err = results[0].reason;
    return { available: false, reason: 'META_ERROR', message: err.response?.data?.error?.message || err.message };
  }
  return {
    available: true,
    partial: ok.length < results.length,
    sent: ok.reduce((s, r) => s + r.sent, 0),
    delivered: ok.reduce((s, r) => s + r.delivered, 0)
  };
}

module.exports = { fetchWabaAnalytics, fetchForChannels };
