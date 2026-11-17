// The text of a Meta template as the customer received it, for the conversation in Live Chat: header,
// body with the recipient's values in place of {{1}}, {{2}}…, footer and the buttons' titles.

const MEDIA_LABEL = { IMAGE: '🖼️ [صورة]', VIDEO: '🎬 [فيديو]', DOCUMENT: '📄 [ملف]', LOCATION: '📍 [موقع]' };

const fill = (text, values) => String(text || '').replace(/\{\{\s*(\d+)\s*\}\}/g, (whole, n) => {
  const value = values[Number(n) - 1];
  return value === undefined || value === null ? whole : String(value);
});

/**
 * @param {Array} components the template's components as Meta lists them (HEADER, BODY, FOOTER, BUTTONS)
 * @param {Array} variables the recipient's body values, in order
 * @returns {string} '' when the template's text is unknown
 */
function templatePreview(components, variables = []) {
  if (!Array.isArray(components) || !components.length) return '';
  const values = Array.isArray(variables) ? variables : [];
  const part = (type) => components.find(c => String(c?.type).toUpperCase() === type);
  const lines = [];

  const header = part('HEADER');
  if (header) {
    const format = String(header.format || 'TEXT').toUpperCase();
    if (format === 'TEXT') { if (header.text) lines.push(fill(header.text, values)); } else if (MEDIA_LABEL[format]) lines.push(MEDIA_LABEL[format]);
  }
  const body = part('BODY');
  if (body?.text) lines.push(fill(body.text, values));
  const footer = part('FOOTER');
  if (footer?.text) lines.push(footer.text);
  for (const button of part('BUTTONS')?.buttons || []) {
    if (button?.text) lines.push(`• ${button.text}`);
  }
  return lines.join('\n').trim();
}

module.exports = { templatePreview };
