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
    replyButtons: 13,
    listRows: 13,
    linkButton: false, // sent as a text with the link
    media: true,
    metered: false,
    addressPrefix: 'ig:'
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

module.exports = { PROVIDERS, LIVE_CHAT_PROVIDERS, capabilitiesOf, isWebchat, isSocial, isWhatsAppCloud, phoneOf };
