// Sends a Live Chat message on the conversation's channel. Each function takes the channel row and the
// customer's address (ChatThread.contactPhone) and returns { messages: [{ id }] } like Meta does, so the
// callers store the message id the same way for every channel.
//
//   WhatsApp Cloud → Meta's API.
//   Website widget → nothing to send: the widget reads its conversation from Live Chat (the message is
//                    saved by the caller), so the id is only ours.
//   Instagram / Messenger → the Messenger Platform Send API.
//   TikTok → TikTok's Business Messaging API.
const crypto = require('crypto');
const metaService = require('../meta/meta.service');
const { isWebchat, isSocial, isTikTok } = require('./channel.kinds');

const kept = () => ({ messages: [{ id: `web.${crypto.randomBytes(8).toString('hex')}` }] });
// Instagram / Messenger go through the Messenger Platform (social/social.sender.js), TikTok through tiktok/
const senderOf = (channel) => {
  if (isSocial(channel)) return require('../social/social.sender');
  if (isTikTok(channel)) return require('../tiktok/tiktok.sender');
  return metaService;
};

module.exports = {
  sendText: (channel, to, text) => (isWebchat(channel) ? kept() : senderOf(channel).sendText(channel, to, text)),
  sendMedia: (channel, to, type, url, caption) => (isWebchat(channel) ? kept() : senderOf(channel).sendMedia(channel, to, type, url, caption)),
  /** buttons: [{ id, text }] */
  sendButtons: (channel, to, body, buttons) => (isWebchat(channel) ? kept() : senderOf(channel).sendButtons(channel, to, body, buttons)),
  sendList: (channel, to, header, body, buttonLabel, sections) => (isWebchat(channel) ? kept() : senderOf(channel).sendList(channel, to, header, body, buttonLabel, sections)),
  sendLinkButton: (channel, to, body, buttonText, url) => (isWebchat(channel) ? kept() : senderOf(channel).sendLinkButton(channel, to, body, buttonText, url))
};
