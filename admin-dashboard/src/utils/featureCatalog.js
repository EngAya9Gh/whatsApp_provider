// The features an admin can switch on for a plan or a tenant, grouped the way people think about them:
// the official Meta API, the QR (WhatsApp Web) connection, and the tools both use.
// Keys are the ones the dashboard and the API already check (hasFeature / requireFeature).
export const FEATURE_GROUPS = [
  {
    key: 'meta',
    title: 'Meta Cloud API',
    badge: 'Official',
    description: 'Official WhatsApp Business API: templates, 24h window, delivery receipts.',
    features: [
      { key: 'META_API', label: 'Connection & analytics', hint: 'Meta connection page and Meta analytics' },
      { key: 'META_SEND_MESSAGE', label: 'Send messages', hint: 'Send Message page for Meta numbers' },
      { key: 'META_CAMPAIGN', label: 'Campaigns', hint: 'Bulk campaigns through Meta templates' },
      { key: 'META_AUTORESPONDER', label: 'Auto responder', hint: 'Auto replies, flows and AI agent on Meta numbers' },
      { key: 'META_TEMPLATES', label: 'Message templates', hint: 'Create and manage Meta templates' }
    ]
  },
  {
    key: 'qr',
    title: 'QR Connection',
    badge: 'WhatsApp Web',
    description: 'Link a phone by scanning a QR code.',
    features: [
      { key: 'BAILEYS_SEND_MESSAGE', label: 'Send messages', hint: 'Send Message page for QR numbers' },
      { key: 'BAILEYS_CAMPAIGN', label: 'Campaigns', hint: 'Bulk campaigns from a QR number' },
      { key: 'BAILEYS_AUTORESPONDER', label: 'Auto responder', hint: 'Auto replies on QR numbers' },
      { key: 'TEMPLATES', label: 'Message templates', hint: 'Saved message templates for QR sending' }
    ]
  },
  {
    key: 'general',
    title: 'Shared tools',
    badge: 'Both',
    description: 'Used with either connection.',
    features: [
      { key: 'LIVE_CHAT', label: 'Live Chat', hint: 'Shared inbox, tickets and team chat' },
      { key: 'EXCEL_EXPORT', label: 'Excel export', hint: 'Export reports and contacts' },
      { key: 'API_ACCESS', label: 'API access', hint: 'API keys and developer tools' }
    ]
  }
]

export const ALL_FEATURE_KEYS = FEATURE_GROUPS.flatMap(g => g.features.map(f => f.key))
export const META_FEATURE_KEYS = FEATURE_GROUPS.find(g => g.key === 'meta').features.map(f => f.key)

/**
 * The features a tenant really has: the plan's features, then the tenant's own overrides
 * (true adds, false removes) - the same rule the API applies when it checks access.
 */
export function effectiveFeatures(planFeatures = [], custom = {}) {
  const set = new Set(planFeatures)
  for (const k of ALL_FEATURE_KEYS) {
    if (!custom || !(k in custom)) continue
    if (custom[k]) set.add(k); else set.delete(k)
  }
  return [...set]
}

/**
 * The overrides to store for a chosen set of features: only what differs from the plan, so switching a
 * feature back to the plan's value removes its override. Other keys in `custom` (company details, ticket
 * settings…) are returned untouched.
 */
export function toOverrides(next = [], planFeatures = [], custom = {}) {
  const out = { ...(custom || {}) }
  for (const k of ALL_FEATURE_KEYS) {
    const on = next.includes(k)
    if (on === planFeatures.includes(k)) delete out[k]
    else out[k] = on
  }
  return out
}

/** The official-API switch follows the Meta section: any Meta feature on = Meta enabled. */
export const metaEnabledFor = (features = []) => META_FEATURE_KEYS.some(k => features.includes(k))
