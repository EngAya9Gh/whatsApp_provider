// What a campaign file must hold for one Meta template: the body variables in order ({{1}}, {{2}}…), the
// example values Meta keeps from when the template was submitted, and whether the template can be sent as a
// campaign at all. Mirrors dashboard/src/utils/metaTemplate.js (normalizeTemplate) on the server side.
const POSITIONAL = /\{\{\s*(\d+)\s*\}\}/g;
const ANY_VARIABLE = /\{\{[^}]*\}\}/;
const DYNAMIC_URL = /^[^{}]*\{\{1\}\}$/;
const MEDIA_HEADERS = { IMAGE: 'image', VIDEO: 'video', DOCUMENT: 'document' };
const FORM_COMPONENTS = ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'];
const FORM_BUTTONS = ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'];

/**
 * { name, language, category, body, variables: [1, 2], examples: ['Sara', '25%'], headerMedia, supported, reason }
 * reason (when not supported): carousel | buttons | variables | media | other
 */
function templateSpec(tpl) {
  const components = tpl?.components || [];
  const bodyComponent = components.find(c => c.type === 'BODY');
  const body = bodyComponent?.text || '';
  const header = components.find(c => c.type === 'HEADER');
  const buttons = components.find(c => c.type === 'BUTTONS')?.buttons || [];
  const variables = [...new Set([...body.matchAll(POSITIONAL)].map(m => Number(m[1])))].sort((a, b) => a - b);
  const sample = bodyComponent?.example?.body_text?.[0] || [];
  const examples = variables.map((n, i) => String(sample[n - 1] ?? sample[i] ?? ''));

  const headerMedia = MEDIA_HEADERS[header?.format] || null;
  const headerUnsupported = header && !headerMedia && (header.format !== 'TEXT' || ANY_VARIABLE.test(header.text || ''));
  const dynamicButton = buttons.some(b => b.type === 'URL' && DYNAMIC_URL.test(b.url || ''));
  const buttonsUnsupported = buttons.some(b =>
    !FORM_BUTTONS.includes(b.type) || (b.type === 'URL' && ANY_VARIABLE.test(b.url || '') && !DYNAMIC_URL.test(b.url || '')));

  let reason = null;
  if (components.some(c => c.type === 'CAROUSEL')) reason = 'carousel';
  else if (components.some(c => !FORM_COMPONENTS.includes(c.type))) reason = 'other';
  else if (headerUnsupported) reason = header.format !== 'TEXT' ? 'media' : 'variables';
  else if (buttonsUnsupported || dynamicButton) reason = 'buttons'; // a per-recipient link is not sent by campaigns
  else if (ANY_VARIABLE.test(body.replace(POSITIONAL, ''))) reason = 'variables';

  return {
    name: tpl?.name,
    language: tpl?.language,
    category: tpl?.category,
    body,
    variables,
    examples,
    headerMedia,
    supported: reason === null,
    reason
  };
}

const REASON_TEXT = {
  carousel: 'This is a carousel template; it cannot be sent as a campaign.',
  buttons: 'This template has a button with a per-recipient link (or a copy-code / OTP / Flow button); campaigns cannot send it.',
  variables: 'This template uses named variables or a variable in the header; campaigns cannot send it.',
  media: 'This template has a location header; campaigns cannot send it.',
  other: 'This template is of a special type campaigns cannot send.'
};

module.exports = { templateSpec, REASON_TEXT };
