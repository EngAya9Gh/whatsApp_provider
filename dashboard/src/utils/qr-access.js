// Every plan feature that unlocks part of the QR (WhatsApp Web) area. The QR Connection page is only useful
// with at least one of them, so it follows the same rule as the "Standard (QR)" menu section. The backend's
// whatsapp routes (QR_FEATURES in src/middleware/requireFeature.js) use the same list.
export const QR_FEATURES = ['BAILEYS_SEND_MESSAGE', 'SEND_MESSAGE', 'BAILEYS_CAMPAIGN', 'TEMPLATES', 'BAILEYS_AUTORESPONDER']

export function tenantHasQr(tenant) {
  let t = tenant
  if (!t) {
    try { t = JSON.parse(localStorage.getItem('tenant') || '{}') } catch { t = {} }
  }
  if (!t.allowedFeatures) return true // old session without a feature list: show everything, like $hasFeature
  return QR_FEATURES.some(f => t.allowedFeatures.includes(f))
}
