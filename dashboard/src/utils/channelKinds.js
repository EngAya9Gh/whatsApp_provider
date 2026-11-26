// How each kind of Live Chat channel looks in the dashboard (icon, colour, name)
const KINDS = {
  META_CLOUD: { icon: 'fab fa-whatsapp', color: '#16a34a', ar: 'واتساب', en: 'WhatsApp' },
  WEBCHAT: { icon: 'fas fa-globe', color: '#0891b2', ar: 'ويدجت الموقع', en: 'Website widget' },
  INSTAGRAM: { icon: 'fab fa-instagram', color: '#db2777', ar: 'انستغرام', en: 'Instagram' },
  MESSENGER: { icon: 'fab fa-facebook-messenger', color: '#2563eb', ar: 'ماسنجر', en: 'Messenger' },
  TIKTOK: { icon: 'fab fa-tiktok', color: '#0f172a', ar: 'تيك توك', en: 'TikTok' }
}

/** The kind of a conversation's channel; old conversations without one are WhatsApp */
export function threadKind(thread) {
  const type = thread?.channel?.providerType
  if (type && KINDS[type]) return type
  const address = String(thread?.contactPhone || '')
  if (address.startsWith('web:')) return 'WEBCHAT'
  if (address.startsWith('ig:')) return 'INSTAGRAM'
  if (address.startsWith('fb:')) return 'MESSENGER'
  if (address.startsWith('tt:')) return 'TIKTOK'
  return 'META_CLOUD'
}

export const kindInfo = (type) => KINDS[type] || KINDS.META_CLOUD
export const kindLabel = (type, isAr) => (isAr ? kindInfo(type).ar : kindInfo(type).en)
