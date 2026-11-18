// Settings of a website chat widget (WhatsAppChannel.settings of a WEBCHAT channel) and the checks on
// them. Pure functions, shared by the dashboard API and the public widget API.

const DEFAULTS = {
  enabled: true,
  title: 'تواصل معنا',
  welcome: 'أهلاً بك 👋 كيف نقدر نساعدك؟',
  color: '#FF6600',
  position: 'right', // corner of the page: right | left
  language: 'ar', // ar | en (texts of the widget itself)
  askName: true, // ask the visitor's name before the first message
  askPhone: 'OPTIONAL', // OFF | OPTIONAL | REQUIRED
  whatsappNumber: '', // "Continue on WhatsApp" button (digits with country code), empty = no button
  allowedDomains: [] // sites the widget may run on, empty = any site
};

const ASK_PHONE = ['OFF', 'OPTIONAL', 'REQUIRED'];
const HOST_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$|^localhost$/;

/** "https://www.shop.com/ar/page" → "www.shop.com" */
function hostOf(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  try {
    return new URL(text.includes('://') ? text : `https://${text}`).hostname;
  } catch (e) {
    return '';
  }
}

/** Digits with the country code; a Saudi local number (05…) gets 966 */
function normalizePhone(value) {
  let digits = String(value || '').replace(/[^\d]/g, '');
  if (/^05\d{8}$/.test(digits)) digits = `966${digits.slice(1)}`;
  if (digits.startsWith('00')) digits = digits.slice(2);
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/**
 * Merges changes into the current settings and checks them.
 * @returns {{ settings: object, errors: string[] }}
 */
function normalizeSettings(input = {}, current = {}) {
  const merged = { ...DEFAULTS, ...(current || {}), ...(input || {}) };
  const errors = [];

  const settings = {
    enabled: merged.enabled !== false,
    title: String(merged.title ?? '').trim(),
    welcome: String(merged.welcome ?? '').trim(),
    color: String(merged.color || '').trim(),
    position: merged.position === 'left' ? 'left' : 'right',
    language: merged.language === 'en' ? 'en' : 'ar',
    askName: merged.askName !== false,
    askPhone: ASK_PHONE.includes(merged.askPhone) ? merged.askPhone : 'OPTIONAL',
    whatsappNumber: '',
    allowedDomains: []
  };

  if (!settings.title) errors.push('Write the widget title');
  if (settings.title.length > 60) errors.push('The title must be at most 60 characters');
  if (settings.welcome.length > 500) errors.push('The welcome message must be at most 500 characters');
  if (!/^#[0-9a-f]{6}$/i.test(settings.color)) errors.push('The colour must look like #FF6600');

  if (String(merged.whatsappNumber || '').trim()) {
    const phone = normalizePhone(merged.whatsappNumber);
    if (phone) settings.whatsappNumber = phone;
    else errors.push('The WhatsApp number must have the country code, e.g. 966500000000');
  }

  const domains = Array.isArray(merged.allowedDomains) ? merged.allowedDomains : String(merged.allowedDomains || '').split(/[\s,]+/);
  for (const entry of domains) {
    if (!String(entry || '').trim()) continue;
    const host = hostOf(entry).replace(/^www\./, '');
    if (!HOST_RE.test(host)) errors.push(`Not a website address: ${entry}`);
    else if (!settings.allowedDomains.includes(host)) settings.allowedDomains.push(host);
  }
  if (settings.allowedDomains.length > 20) errors.push('At most 20 websites');

  return { settings, errors };
}

/**
 * May a page on `origin` use the widget? Any site when no domains are listed; otherwise the listed sites,
 * their subdomains, and our own dashboard (its preview page).
 */
function originAllowed(settings, origin, ownHosts = []) {
  const domains = settings?.allowedDomains || [];
  if (!domains.length) return true;
  const host = hostOf(origin);
  if (!host) return false;
  if (ownHosts.includes(host)) return true;
  return domains.some(d => host === d || host.endsWith(`.${d}`));
}

module.exports = { DEFAULTS, normalizeSettings, originAllowed, normalizePhone, hostOf };
