// Graph API calls for Instagram and Messenger channels (Messenger Platform). Pages are connected with the
// platform's own Meta app through Facebook Login for Business; the page access token (never expires when
// it comes from a long-lived user token) is kept on the channel (metaAccessToken).
const axios = require('axios');

const VERSION = process.env.GRAPH_API_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${VERSION}`;
const appId = () => process.env.META_FB_APP_ID;
const appSecret = () => process.env.META_APP_SECRET;

/** The one-time code from the login popup → a user access token */
async function exchangeCode(code) {
  const res = await axios.get(`${GRAPH}/oauth/access_token`, { params: { client_id: appId(), client_secret: appSecret(), code }, timeout: 20000 });
  return res.data.access_token;
}

/** A long-lived user token, so the page tokens taken from it do not expire */
async function longLived(userToken) {
  const res = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: { grant_type: 'fb_exchange_token', client_id: appId(), client_secret: appSecret(), fb_exchange_token: userToken },
    timeout: 20000
  });
  return res.data.access_token || userToken;
}

/** The Facebook Pages the person shared, with their token and linked Instagram professional account */
async function listPages(userToken) {
  const pages = [];
  let url = `${GRAPH}/me/accounts`;
  let params = { fields: 'id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}', limit: 100, access_token: userToken };
  for (let i = 0; url && i < 5; i++) {
    const res = await axios.get(url, { params, timeout: 20000 });
    for (const p of res.data.data || []) {
      pages.push({
        id: String(p.id),
        name: p.name,
        token: p.access_token,
        picture: p.picture?.data?.url || null,
        instagram: p.instagram_business_account
          ? { id: String(p.instagram_business_account.id), username: p.instagram_business_account.username || '', picture: p.instagram_business_account.profile_picture_url || null }
          : null
      });
    }
    url = res.data.paging?.next || null;
    params = undefined; // the next link carries its own query
  }
  return pages;
}

/** Our app receives the page's messages (Messenger, and Instagram through the linked page) */
async function subscribePage(pageId, pageToken) {
  await axios.post(`${GRAPH}/${pageId}/subscribed_apps`, null, {
    params: { subscribed_fields: 'messages,messaging_postbacks', access_token: pageToken },
    timeout: 20000
  });
}

async function unsubscribePage(pageId, pageToken) {
  await axios.delete(`${GRAPH}/${pageId}/subscribed_apps`, { params: { access_token: pageToken }, timeout: 20000 });
}

/** Name and picture of the person writing (Messenger needs "Business Asset User Profile Access") */
async function profile(channel, customerId) {
  const fields = channel.providerType === 'INSTAGRAM' ? 'name,username,profile_pic' : 'first_name,last_name,profile_pic';
  const res = await axios.get(`${GRAPH}/${customerId}`, { params: { fields, access_token: channel.metaAccessToken }, timeout: 10000 });
  const d = res.data || {};
  const name = d.name || [d.first_name, d.last_name].filter(Boolean).join(' ') || d.username || null;
  return { name, username: d.username || null, avatarUrl: d.profile_pic || null };
}

/** Send API (works for Messenger and for Instagram with the linked page's token) */
async function send(channel, recipientId, message) {
  const res = await axios.post(`${GRAPH}/me/messages`, { recipient: { id: recipientId }, messaging_type: 'RESPONSE', message }, {
    params: { access_token: channel.metaAccessToken },
    timeout: 20000
  });
  return res.data;
}

module.exports = { GRAPH, exchangeCode, longLived, listPages, subscribePage, unsubscribePage, profile, send };
