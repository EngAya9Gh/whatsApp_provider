// Live Chat → Instagram / Messenger. Same functions as WhatsApp (channels/channel.sender.js); the customer's
// address is "fb:<id>" or "ig:<id>". WhatsApp's buttons and lists become quick replies (up to 13, titles of
// 20 characters); a link button is Messenger's button template, and a text with the link on Instagram.
// opts.humanAgent: a person's reply after the 24h window, sent with Meta's Human Agent tag (up to 7 days).
const graph = require('./social.graph');

const idOf = (to) => String(to || '').replace(/^(fb|ig):/, '');
const sent = (res) => ({ messages: [{ id: res?.message_id || null }] });
const absolute = (url) => (/^https?:\/\//.test(url) ? url : `${String(process.env.APP_URL || '').replace(/\/+$/, '')}/${String(url).replace(/^\/+/, '')}`);
const ATTACHMENT = { image: 'image', video: 'video', audio: 'audio', document: 'file', pdf: 'file' };

const title20 = (text) => {
  const t = String(text || '').trim();
  return t.length > 20 ? `${t.slice(0, 19)}…` : t;
};

async function sendText(channel, to, text, opts = {}) {
  return sent(await graph.send(channel, idOf(to), { text: String(text || '') }, opts));
}

async function sendMedia(channel, to, type, url, caption, opts = {}) {
  const res = await graph.send(channel, idOf(to), {
    attachment: { type: ATTACHMENT[String(type).toLowerCase()] || 'file', payload: { url: absolute(url), is_reusable: false } }
  }, opts);
  if (caption) await graph.send(channel, idOf(to), { text: caption }, opts);
  return sent(res);
}

/** buttons: [{ id, text }] → quick replies */
async function sendButtons(channel, to, body, buttons, opts = {}) {
  return sent(await graph.send(channel, idOf(to), {
    text: String(body || ''),
    quick_replies: (buttons || []).slice(0, 13).map(b => ({ content_type: 'text', title: title20(b.text), payload: String(b.id) }))
  }, opts));
}

async function sendList(channel, to, header, body, buttonLabel, sections, opts = {}) {
  const rows = (sections || []).flatMap(s => s.rows || []);
  return sendButtons(channel, to, body, rows.map(r => ({ id: r.id, text: r.title })), opts);
}

async function sendLinkButton(channel, to, body, buttonText, url, opts = {}) {
  if (channel.providerType === 'INSTAGRAM') return sendText(channel, to, `${body}\n\n${buttonText}: ${url}`, opts);
  return sent(await graph.send(channel, idOf(to), {
    attachment: { type: 'template', payload: { template_type: 'button', text: String(body || '').slice(0, 640), buttons: [{ type: 'web_url', url, title: title20(buttonText) }] } }
  }, opts));
}

module.exports = { sendText, sendMedia, sendButtons, sendList, sendLinkButton, idOf };
