// The kinds of channel a tenant can connect, and what each one can do. Channels live in the
// whatsapp_channels table (WhatsAppChannel, providerType) whatever their kind, because teams, shifts,
// working hours, tickets, flows and conversations are all tied to a channel id.
//
// Live Chat conversations (ChatThread) keep the customer's address on the channel in `contactPhone`:
// the phone number on WhatsApp, `web:<visitor id>` on the website widget. Use phoneOf() for a phone.

const PROVIDERS = {
  // WhatsApp Cloud API (Meta): Live Chat, flows, tickets, templates, campaigns
  META_CLOUD: {
    kind: 'WHATSAPP',
    liveChat: true,
    hasPhone: true,
    templates: true,
    campaigns: true,
    windowHours: 24, // free-form replies only within 24h of the customer's last message
    replyButtons: 3,
    listRows: 10,
    linkButton: true,
    media: true,
    metered: true // counts against the WhatsApp message quota
  },
  // WhatsApp through a linked phone (QR): sending from the API and QR campaigns, no Live Chat
  BAILEYS: {
    kind: 'WHATSAPP_QR',
    liveChat: false,
    hasPhone: true,
    templates: false,
    campaigns: true,
    windowHours: null,
    replyButtons: 3,
    listRows: 10,
    linkButton: false,
    media: true,
    metered: true
  },
  // Chat widget on the tenant's website: the visitor chats from the page, no Meta involved
  WEBCHAT: {
    kind: 'WEBCHAT',
    liveChat: true,
    hasPhone: false,
    templates: false,
    campaigns: false,
    windowHours: null, // no window: the visitor reads replies whenever they come back
    replyButtons: 10,
    listRows: 10,
    linkButton: true,
    media: false,
    metered: false
  },
  // Facebook Page inbox (Messenger Platform): page-scoped customer ids, no phone
  MESSENGER: {
    kind: 'MESSENGER',
    liveChat: true,
    hasPhone: false,
    templates: false,
    campaigns: false,
    windowHours: 24, // Meta: free replies within 24h of the customer's last message
    humanAgentHours: 168, // a person (not automation) may still reply for 7 days: Meta's Human Agent tag
    replyButtons: 13, // quick replies
    listRows: 13,
    linkButton: true,
    media: true,
    metered: false,
    addressPrefix: 'fb:'
  },
  // Instagram professional account linked to a Facebook Page (Messenger Platform for Instagram)
  INSTAGRAM: {
    kind: 'INSTAGRAM',
    liveChat: true,
    hasPhone: false,
    templates: false,
    campaigns: false,
    windowHours: 24,
    humanAgentHours: 168, // Human Agent tag, as on Messenger
    replyButtons: 13,
    listRows: 13,
    linkButton: false, // sent as a text with the link
    media: true,
    metered: false,
    addressPrefix: 'ig:'
  },
  // TikTok account (TikTok API for Business, Business Messaging): the address is the conversation id
  TIKTOK: {
    kind: 'TIKTOK',
    liveChat: true,
    hasPhone: false,
    templates: false,
    campaigns: false,
    windowHours: 48, // TikTok: up to 10 replies within 48h of the customer's last message
    replyButtons: 3, // Q&A button card
    listRows: 3,
    linkButton: false, // sent as a text with the link
    media: false, // images need TikTok's own upload; sent as a link for now
    metered: false,
    addressPrefix: 'tt:'
  }
};

/** Provider types whose conversations are in Live Chat (with tickets, teams, hours and flows) */
const LIVE_CHAT_PROVIDERS = Object.keys(PROVIDERS).filter(p => PROVIDERS[p].liveChat);

/**
 * What a channel can do. Unknown or missing provider types are treated as WhatsApp Cloud, which is
 * what every Live Chat conversation was before other channels existed.
 */
function capabilitiesOf(channelOrProvider) {
  const provider = typeof channelOrProvider === 'string' ? channelOrProvider : channelOrProvider?.providerType;
  return { providerType: PROVIDERS[provider] ? provider : 'META_CLOUD', ...(PROVIDERS[provider] || PROVIDERS.META_CLOUD) };
}

const isWebchat = (channel) => channel?.providerType === 'WEBCHAT';
const isSocial = (channel) => ['MESSENGER', 'INSTAGRAM'].includes(channel?.providerType);
const isTikTok = (channel) => channel?.providerType === 'TIKTOK';
const isWhatsAppCloud = (channel) => capabilitiesOf(channel).providerType === 'META_CLOUD';

/**
 * The customer's phone number in a conversation, or null when the channel does not have one
 * (a website visitor who did not leave it). Used for the CRM, saved contacts and WhatsApp follow-ups.
 */
function phoneOf(thread, channel) {
  if (!thread) return null;
  if (capabilitiesOf(channel).hasPhone) return thread.contactPhone || null;
  return thread.contactInfo?.phone || null;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Whether a reply can go out now on a channel without templates (Instagram, Messenger, TikTok), counted
 * from the customer's last message: { ok, humanAgent } or { ok: false, hours }.
 *   Inside the window (24h, TikTok 48h) → a normal reply.
 *   After it, a reply a person writes (human) → sent with Meta's Human Agent tag, up to 7 days.
 *   Later, or an automated message after the window → refused (the platform would refuse it too).
 * WhatsApp is not limited here: its closed window is handled with templates. Without a known last
 * message (older conversations) the platform decides.
 */
function replyWindow(channel, lastInboundAt, { human = false, now = Date.now() } = {}) {
  const caps = capabilitiesOf(channel);
  if (caps.templates || !caps.windowHours || !lastInboundAt) return { ok: true, humanAgent: false };
  const age = now - new Date(lastInboundAt).getTime();
  if (age <= caps.windowHours * HOUR_MS) return { ok: true, humanAgent: false };
  if (human && caps.humanAgentHours && age <= caps.humanAgentHours * HOUR_MS) return { ok: true, humanAgent: true };
  return { ok: false, hours: human && caps.humanAgentHours ? caps.humanAgentHours : caps.windowHours };
}

module.exports = { PROVIDERS, LIVE_CHAT_PROVIDERS, capabilitiesOf, isWebchat, isSocial, isTikTok, isWhatsAppCloud, phoneOf, replyWindow };
