// Connecting Instagram and Messenger: the person logs in with Facebook (Facebook Login for Business, config
// META_FB_PAGES_CONFIG_ID), picks a page; its Messenger inbox and its linked Instagram account become
// channels of the account. Each page / Instagram account belongs to one account only (webhooks are routed
// by its id). Monthly fees, if the admin set prices, come from the wallet (channels/channel.billing.js).
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../../utils/logger');
const graph = require('./social.graph');
const channelBilling = require('../channels/channel.billing');

// Listed and disconnected from the same dashboard page; TikTok connects through tiktok/tiktok.service.js
const PROVIDERS = ['MESSENGER', 'INSTAGRAM', 'TIKTOK'];
const LABEL = { MESSENGER: 'Messenger', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok' };
const SESSION_TTL_S = 15 * 60;
const httpError = (status, message, code) => Object.assign(new Error(message), { status, code });
const metaMessage = (err) => err.response?.data?.error?.message || err.message;
const FIELDS = { id: true, tenantId: true, providerType: true, name: true, status: true, externalId: true, settings: true, paidUntil: true, billingState: true, createdAt: true };

// Pages shared in the popup, kept between "start" and "finish" (their tokens never go to the browser)
const memory = new Map();
async function keepSession(id, data) {
  const { redisClient } = require('../../config/redis');
  if (redisClient.status === 'ready') return redisClient.set(`social:connect:${id}`, JSON.stringify(data), 'EX', SESSION_TTL_S);
  memory.set(id, { data, until: Date.now() + SESSION_TTL_S * 1000 });
}
async function readSession(id) {
  const { redisClient } = require('../../config/redis');
  if (redisClient.status === 'ready') {
    const raw = await redisClient.get(`social:connect:${id}`);
    return raw ? JSON.parse(raw) : null;
  }
  const hit = memory.get(id);
  return hit && hit.until > Date.now() ? hit.data : null;
}

const view = (c, prices) => ({
  id: c.id,
  kind: c.providerType,
  name: c.name || '',
  status: c.status,
  externalId: c.externalId,
  picture: c.settings?.picture || null,
  pageName: c.settings?.pageName || null,
  createdAt: c.createdAt,
  billing: { price: prices[c.providerType] || null, paidUntil: prices[c.providerType] ? c.paidUntil : null, state: prices[c.providerType] ? c.billingState || null : null }
});

class SocialService {
  config() {
    return {
      appId: process.env.META_FB_APP_ID || '',
      configId: process.env.META_FB_PAGES_CONFIG_ID || '',
      webhookUrl: `${String(process.env.APP_URL || '').replace(/\/+$/, '')}/api/v1/meta/webhook`
    };
  }

  async _prices() {
    return {
      MESSENGER: await channelBilling.priceNow('MESSENGER'),
      INSTAGRAM: await channelBilling.priceNow('INSTAGRAM'),
      TIKTOK: await channelBilling.priceNow('TIKTOK')
    };
  }

  async listChannels(tenantId) {
    const [channels, prices] = await Promise.all([
      prisma.whatsAppChannel.findMany({ where: { tenantId, providerType: { in: PROVIDERS } }, select: FIELDS, orderBy: { createdAt: 'asc' } }),
      this._prices()
    ]);
    return channels.map(c => view(c, prices));
  }

  /** Step 1: the popup's login (a user token, or a code to exchange) → the pages the person shared
   *  (and which are already connected) */
  async startConnect(tenantId, login) {
    const { code, accessToken } = typeof login === 'string' ? { code: login } : (login || {});
    if (!code && !accessToken) throw httpError(400, 'Missing the Facebook login');
    let pages;
    try {
      const userToken = accessToken ? await graph.checkUserToken(accessToken) : await graph.exchangeCode(code);
      const token = await graph.longLived(userToken).catch(() => userToken);
      pages = await graph.listPages(token);
    } catch (err) {
      logger.error(`[Social] Facebook login failed: ${metaMessage(err)}`);
      throw httpError(400, `Facebook did not accept the login: ${metaMessage(err)}`);
    }
    if (!pages.length) throw httpError(400, 'No Facebook page was shared. Log in again and tick your page (and its Instagram account).', 'NO_PAGES');

    const ids = pages.flatMap(p => [p.id, p.instagram?.id].filter(Boolean));
    const existing = await prisma.whatsAppChannel.findMany({ where: { providerType: { in: PROVIDERS }, externalId: { in: ids } }, select: { tenantId: true, providerType: true, externalId: true, status: true } });
    const stateOf = (kind, id) => {
      const c = existing.find(e => e.providerType === kind && e.externalId === id && e.status === 'CONNECTED');
      return !c ? 'FREE' : c.tenantId === tenantId ? 'HERE' : 'ELSEWHERE';
    };

    const sessionId = crypto.randomBytes(16).toString('hex');
    await keepSession(sessionId, { tenantId, pages });
    return {
      sessionId,
      pages: pages.map(p => ({
        id: p.id,
        name: p.name,
        picture: p.picture,
        messenger: stateOf('MESSENGER', p.id),
        instagram: p.instagram ? { id: p.instagram.id, username: p.instagram.username, picture: p.instagram.picture, state: stateOf('INSTAGRAM', p.instagram.id) } : null
      })),
      prices: await this._prices()
    };
  }

  /** Step 2: connect the chosen page's Messenger and/or Instagram */
  async finishConnect(tenantId, { sessionId, pageId, messenger, instagram } = {}) {
    const session = sessionId ? await readSession(String(sessionId)) : null;
    if (!session || session.tenantId !== tenantId) throw httpError(400, 'The Facebook login expired. Connect again.', 'SESSION_EXPIRED');
    const page = session.pages.find(p => p.id === String(pageId));
    if (!page) throw httpError(404, 'Page not found in this login');
    if (!messenger && !instagram) throw httpError(400, 'Choose Messenger, Instagram or both');
    if (instagram && !page.instagram) throw httpError(400, 'This page has no Instagram professional account linked to it', 'NO_INSTAGRAM');

    try {
      await graph.subscribePage(page.id, page.token);
    } catch (err) {
      throw httpError(400, `Meta did not let us receive this page's messages: ${metaMessage(err)}`, 'SUBSCRIBE_FAILED');
    }

    const connected = [];
    if (messenger) {
      connected.push(await this._upsert(tenantId, 'MESSENGER', page.id, {
        name: page.name, token: page.token, settings: { pageId: page.id, pageName: page.name, picture: page.picture }
      }));
    }
    if (instagram) {
      connected.push(await this._upsert(tenantId, 'INSTAGRAM', page.instagram.id, {
        name: page.instagram.username ? `@${page.instagram.username}` : page.name,
        token: page.token,
        settings: { pageId: page.id, pageName: page.name, igId: page.instagram.id, username: page.instagram.username, picture: page.instagram.picture }
      }));
    }
    const prices = await this._prices();
    return connected.map(c => view(c, prices));
  }

  /** Saves a connected account as a channel of this Wakeel account (also used by tiktok/tiktok.service.js) */
  async _upsert(tenantId, providerType, externalId, { name, token, settings, extra = {} }) {
    const existing = await prisma.whatsAppChannel.findFirst({ where: { providerType, externalId }, select: FIELDS });
    if (existing && existing.tenantId !== tenantId && existing.status === 'CONNECTED') {
      throw httpError(409, `${name} is already connected to another Wakeel account`, 'TAKEN');
    }
    const data = { name: String(name || '').slice(0, 80), metaAccessToken: token, status: 'CONNECTED', settings, ...extra };
    if (existing && existing.tenantId === tenantId) {
      return prisma.whatsAppChannel.update({ where: { id: existing.id }, data, select: FIELDS });
    }
    if (existing) await prisma.whatsAppChannel.update({ where: { id: existing.id }, data: { externalId: null } }); // left by another account
    const channel = await prisma.whatsAppChannel.create({ data: { tenantId, providerType, externalId, ...data }, select: FIELDS });
    // A paid channel starts with its first month, from the wallet
    const billing = await channelBilling.chargeChannel(channel);
    if (billing.insufficient) {
      await prisma.whatsAppChannel.delete({ where: { id: channel.id } }).catch(() => {});
      throw httpError(402, `${LABEL[providerType] || providerType} costs ${billing.price} per month from your wallet, and the balance does not cover it. Top up the wallet first.`, 'INSUFFICIENT_BALANCE');
    }
    return { ...channel, paidUntil: billing.paidUntil, billingState: billing.state };
  }

  /** Stops receiving this channel's messages. Kept (switched off) when its tickets are in the reports. */
  async disconnect(tenantId, id) {
    const channel = await prisma.whatsAppChannel.findFirst({ where: { id, tenantId, providerType: { in: PROVIDERS } } });
    if (!channel) throw httpError(404, 'Channel not found');
    const pageId = channel.settings?.pageId;
    const sameAccount = { providerType: { in: PROVIDERS }, status: 'CONNECTED', NOT: { id }, settings: { path: '$.pageId', equals: pageId } };
    const others = pageId ? await prisma.whatsAppChannel.count({ where: sameAccount }).catch(() => 1) : 1;
    if (!others && channel.metaAccessToken) await graph.unsubscribePage(pageId, channel.metaAccessToken).catch(err => logger.warn(`[Social] Unsubscribe failed: ${metaMessage(err)}`));

    const tickets = await prisma.ticket.count({ where: { channelId: id } });
    if (tickets > 0) {
      await prisma.whatsAppChannel.update({ where: { id }, data: { status: 'DISCONNECTED', metaAccessToken: null, refreshToken: null, tokenExpiresAt: null, billingState: null } });
      return { disconnected: true, kept: true };
    }
    await prisma.whatsAppChannel.delete({ where: { id } });
    return { disconnected: true, kept: false };
  }
}

module.exports = new SocialService();
