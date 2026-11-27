// Sends a Live Chat message on the conversation's channel. Each function takes the channel row and the
// customer's address (ChatThread.contactPhone) and returns { messages: [{ id }] } like Meta does, so the
// callers store the message id the same way for every channel.
//
//   WhatsApp Cloud → Meta's API.
//   Website widget → nothing to send: the widget reads its conversation from Live Chat (the message is
//                    saved by the caller), so the id is only ours.
//   Instagram / Messenger → the Messenger Platform Send API. opts.humanAgent sends a person's reply after
//                    the 24h window with Meta's Human Agent tag (channel.kinds replyWindow decides).
//   TikTok → TikTok's Business Messaging API.
const crypto = require('crypto');
const metaService = require('../meta/meta.service');
const { isWebchat, isSocial, isTikTok } = require('./channel.kinds');

const kept = () => ({ messages: [{ id: `web.${crypto.randomBytes(8).toString('hex')}` }] });
const social = () => require('../social/social.sender');
const tiktok = () => require('../tiktok/tiktok.sender');

/** Calls the channel's sender; only Instagram / Messenger take the extra options */
function route(channel, name, args, opts) {
  if (isWebchat(channel)) return kept();
  if (isSocial(channel)) return social()[name](channel, ...args, opts || {});
  if (isTikTok(channel)) return tiktok()[name](channel, ...args);
  return metaService[name](channel, ...args);
}

module.exports = {
  sendText: (channel, to, text, opts) => route(channel, 'sendText', [to, text], opts),
  sendMedia: (channel, to, type, url, caption, opts) => route(channel, 'sendMedia', [to, type, url, caption], opts),
  /** buttons: [{ id, text }] */
  sendButtons: (channel, to, body, buttons, opts) => route(channel, 'sendButtons', [to, body, buttons], opts),
  sendList: (channel, to, header, body, buttonLabel, sections, opts) => route(channel, 'sendList', [to, header, body, buttonLabel, sections], opts),
  sendLinkButton: (channel, to, body, buttonText, url, opts) => route(channel, 'sendLinkButton', [to, body, buttonText, url], opts)
};
