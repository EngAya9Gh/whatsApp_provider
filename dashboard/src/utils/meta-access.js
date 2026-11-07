// Every plan feature that unlocks part of the official Meta (Cloud API) area. Meta access never depends on
// META_API alone: a plan can carry just META_SEND_MESSAGE or META_TEMPLATES, and the admin can switch
// Meta on for a tenant (metaEnabled). The backend's requireMetaEnabled follows the same rule.
export const META_FEATURES = ['META_API', 'META_CAMPAIGN', 'META_AUTORESPONDER', 'META_SEND_MESSAGE', 'META_TEMPLATES']

export function tenantHasMeta(tenant) {
  let t = tenant
  if (!t) {
    try { t = JSON.parse(localStorage.getItem('tenant') || '{}') } catch { t = {} }
  }
  if (t.metaEnabled === true) return true
  if (!t.allowedFeatures) return true // old session without a feature list: show everything, like $hasFeature
  return META_FEATURES.some(f => t.allowedFeatures.includes(f))
}
