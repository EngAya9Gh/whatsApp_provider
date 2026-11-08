// Turns a Meta message template into what a sender needs: the variables to fill, and the components
// Meta expects when the template is sent. Shared by the Live Chat template picker and the Send Message page.
const POSITIONAL = /\{\{\s*(\d+)\s*\}\}/g
const ANY_VARIABLE = /\{\{[^}]*\}\}/
// A URL button may end with a single {{1}} (e.g. https://shop.com/track/{{1}}): the sender fills it in.
const DYNAMIC_URL = /^[^{}]*\{\{1\}\}$/

// Shows a variable as it appears in the template, e.g. {{1}}
// (kept in code: a literal braces pair inside a Vue interpolation breaks the compile)
export const varToken = (n) => `{{${n}}}`
// A dynamic URL button without its {{1}}: the fixed part the sender's value is appended to
export const urlPrefix = (url) => url.replace('{{1}}', '')

// What a form can fill in: header / body / footer / buttons only. Anything else in a template (a CAROUSEL of
// cards, a limited-time offer…) needs extra parameters, and Meta rejects the send with 132012.
const FORM_COMPONENTS = ['HEADER', 'BODY', 'FOOTER', 'BUTTONS']
const FORM_BUTTONS = ['QUICK_REPLY', 'URL', 'PHONE_NUMBER']

/**
 * Only text templates whose variables are positional body variables (plus an optional dynamic URL button)
 * can be sent from a form; media headers, carousels, copy-code/OTP/flow/catalog buttons and other variable
 * placements cannot.
 */
export function normalizeTemplate(tpl) {
  const components = tpl.components || []
  const body = components.find(c => c.type === 'BODY')?.text || ''
  const header = components.find(c => c.type === 'HEADER')
  const buttons = components.find(c => c.type === 'BUTTONS')?.buttons || []
  const variables = [...new Set([...body.matchAll(POSITIONAL)].map(m => Number(m[1])))].sort((a, b) => a - b)
  const bodyHasNamed = ANY_VARIABLE.test(body.replace(POSITIONAL, ''))
  const headerUnsupported = header && (header.format !== 'TEXT' || ANY_VARIABLE.test(header.text || ''))
  const buttonVars = buttons
    .map((b, index) => ({ b, index }))
    .filter(({ b }) => b.type === 'URL' && DYNAMIC_URL.test(b.url || ''))
    .map(({ b, index }) => ({ index, text: b.text, url: b.url }))
  const buttonsUnsupported = buttons.some(b =>
    !FORM_BUTTONS.includes(b.type) || (b.type === 'URL' && ANY_VARIABLE.test(b.url || '') && !DYNAMIC_URL.test(b.url || '')))
  const otherComponents = components.some(c => !FORM_COMPONENTS.includes(c.type))
  // Why it cannot be sent from a form (null = it can), for a clear message instead of Meta's 132012
  let unsupportedKind = null
  if (components.some(c => c.type === 'CAROUSEL')) unsupportedKind = 'carousel'
  else if (otherComponents) unsupportedKind = 'other'
  else if (headerUnsupported) unsupportedKind = header.format !== 'TEXT' ? 'media' : 'variables'
  else if (buttonsUnsupported) unsupportedKind = 'buttons'
  else if (bodyHasNamed) unsupportedKind = 'variables'
  return {
    id: tpl.id,
    name: tpl.name,
    language: tpl.language,
    category: tpl.category,
    status: tpl.status,
    body,
    headerText: header?.format === 'TEXT' ? header.text : '',
    variables,
    buttonVars,
    supported: unsupportedKind === null,
    unsupportedKind
  }
}

const UNSUPPORTED_TEXT = {
  carousel: {
    ar: 'هذا القالب «شرائح» (Carousel) بصور وأزرار لكل شريحة، ولا يمكن إرساله من هذا النموذج.',
    en: 'This is a carousel template (cards with media and buttons) and cannot be sent from this form.'
  },
  media: {
    ar: 'هذا القالب له ترويسة وسائط (صورة/فيديو/ملف) ولا يمكن إرساله من هذا النموذج.',
    en: 'This template has a media header (image / video / document) and cannot be sent from this form.'
  },
  buttons: {
    ar: 'هذا القالب فيه أزرار (نسخ الكود، رمز تحقق، Flow، كتالوج…) لا يدعمها هذا النموذج.',
    en: 'This template has buttons (copy code, OTP, Flow, catalog…) this form cannot send.'
  },
  variables: {
    ar: 'هذا القالب فيه متغيرات بصيغة لا يدعمها هذا النموذج (أسماء بدل أرقام، أو متغير في الترويسة).',
    en: 'This template has variables in a form this one cannot send (named variables, or a variable in the header).'
  },
  other: {
    ar: 'هذا القالب من نوع خاص لا يدعمه هذا النموذج.',
    en: 'This template is of a special type this form cannot send.'
  }
}

/** The sentence that explains why a template cannot be sent from a form ('' when it can). */
export function unsupportedReason(tpl, isAr = true) {
  const entry = tpl?.unsupportedKind && UNSUPPORTED_TEXT[tpl.unsupportedKind]
  return entry ? entry[isAr ? 'ar' : 'en'] : ''
}

/** What the recipient will read, with the values typed so far (empty ones stay as {{n}}). */
export function buildPreview(tpl, values = [], buttonValues = []) {
  const body = tpl.body.replace(POSITIONAL, (_, n) => {
    const v = values[tpl.variables.indexOf(Number(n))]
    return v || `{{${n}}}`
  })
  const text = tpl.headerText ? `${tpl.headerText}\n\n${body}` : body
  const links = tpl.buttonVars.map((b, i) => `🔗 ${b.text}: ${b.url.replace('{{1}}', buttonValues[i] || '{{1}}')}`)
  return links.length ? `${text}\n\n${links.join('\n')}` : text
}

/** The `components` array of Meta's template message: body values in variable order, then each URL button's value. */
export function buildComponents(tpl, values = [], buttonValues = []) {
  const components = []
  if (tpl.variables.length > 0) {
    components.push({ type: 'body', parameters: tpl.variables.map((_, i) => ({ type: 'text', text: String(values[i] ?? '').trim() })) })
  }
  tpl.buttonVars.forEach((b, i) => {
    components.push({ type: 'button', sub_type: 'url', index: String(b.index), parameters: [{ type: 'text', text: String(buttonValues[i] ?? '').trim() }] })
  })
  return components
}
