// Live Chat → TikTok (Business Messaging API). Same functions as WhatsApp (channels/channel.sender.js); the
// customer's address is "tt:<conversation id>".
//   Buttons → TikTok's Q&A button card (1–3 buttons of up to 20 characters, a question of up to 40). When
//             the customer taps one, TikTok sends its text as their message, which flows match by title.
//             More options, or longer titles, go as a numbered list: flows also accept the number.
//   Links and media → a text with the link (images need TikTok's own upload).
const api = require('./tiktok.api');
const tiktokService = require('./tiktok.service');

const conversationOf = (to) => String(to || '').replace(/^tt:/, '');
const sent = (data) => ({ messages: [{ id: data?.message?.message_id || data?.message_id || null }] });
const absolute = (url) => (/^https?:\/\//.test(url) ? url : `${String(process.env.APP_URL || '').replace(/\/+$/, '')}/${String(url).replace(/^\/+/, '')}`);
const TEXT_MAX = 6000;

async function send(channel, to, message) {
  const token = await tiktokService.accessTokenOf(channel);
  return sent(await api.send(token, channel.externalId, conversationOf(to), message));
}

async function sendText(channel, to, text) {
  return send(channel, to, { message_type: 'TEXT', text: { body: String(text || '').slice(0, TEXT_MAX) } });
}

async function sendMedia(channel, to, type, url, caption) {
  return sendText(channel, to, [caption, absolute(url)].filter(Boolean).join('\n'));
}

const numbered = (body, titles) => [String(body || ''), '', ...titles.map((t, i) => `${i + 1}. ${t}`)].join('\n');

/** buttons: [{ id, text }] */
async function sendButtons(channel, to, body, buttons) {
  const list = (buttons || []).map(b => ({ id: String(b.id || '').slice(0, 40), title: String(b.text || '').trim() }));
  const card = list.length >= 1 && list.length <= 3 && list.every(b => b.title && b.title.length <= 20);
  if (!card) return sendText(channel, to, numbered(body, list.map(b => b.title)));

  const question = String(body || '').trim();
  // The card holds a question of 40 characters: a longer text goes first, then the card points to it
  let first = null;
  if (question.length > 40) first = await sendText(channel, to, question);
  const res = await send(channel, to, {
    message_type: 'TEMPLATE',
    template: {
      type: 'QA_BUTTON_CARD',
      title: question.length > 40 ? '👇' : question || '👇',
      buttons: list.map(b => ({ type: 'REPLY', title: b.title, id: b.id }))
    }
  });
  return first && !res.messages[0].id ? first : res;
}

async function sendList(channel, to, header, body, buttonLabel, sections) {
  const rows = (sections || []).flatMap(s => s.rows || []);
  return sendButtons(channel, to, [header, body].filter(Boolean).join('\n'), rows.map(r => ({ id: r.id, text: r.title })));
}

async function sendLinkButton(channel, to, body, buttonText, url) {
  return sendText(channel, to, `${body}\n\n${buttonText}: ${url}`);
}

module.exports = { sendText, sendMedia, sendButtons, sendList, sendLinkButton, conversationOf };
