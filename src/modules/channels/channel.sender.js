// Sends a Live Chat message on the conversation's channel. Each function takes the channel row and the
// customer's address (ChatThread.contactPhone) and returns { messages: [{ id }] } like Meta does, so the
// callers store the message id the same way for every channel.
//
//   WhatsApp Cloud → Meta's API.
//   Website widget → nothing to send: the widget reads its conversation from Live Chat (the message is
//                    saved by the caller), so the id is only ours.
const crypto = require('crypto');
const metaService = require('../meta/meta.service');
const { isWebchat } = require('./channel.kinds');

const kept = () => ({ messages: [{ id: `web.${crypto.randomBytes(8).toString('hex')}` }] });

module.exports = {
  sendText: (channel, to, text) => (isWebchat(channel) ? kept() : metaService.sendText(channel, to, text)),
  sendMedia: (channel, to, type, url, caption) => (isWebchat(channel) ? kept() : metaService.sendMedia(channel, to, type, url, caption)),
  /** buttons: [{ id, text }] */
  sendButtons: (channel, to, body, buttons) => (isWebchat(channel) ? kept() : metaService.sendButtons(channel, to, body, buttons)),
  sendList: (channel, to, header, body, buttonLabel, sections) => (isWebchat(channel) ? kept() : metaService.sendList(channel, to, header, body, buttonLabel, sections)),
  sendLinkButton: (channel, to, body, buttonText, url) => (isWebchat(channel) ? kept() : metaService.sendLinkButton(channel, to, body, buttonText, url))
};
