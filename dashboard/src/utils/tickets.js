// Shared bits for tickets: status labels, category colors, avatars and readable API errors
import { LABEL_COLORS } from '../data/chatLabels'

export const TICKET_STATUS = {
  OPEN: { ar: 'مفتوحة', en: 'Open', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  PENDING: { ar: 'بانتظار العميل', en: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  RESOLVED: { ar: 'تم الحل', en: 'Resolved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLOSED: { ar: 'مغلقة', en: 'Closed', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
}

export const isActiveStatus = (status) => status === 'OPEN' || status === 'PENDING'

/** Stable color per category name (categories have no color of their own) */
export function categoryColor(name = '') {
  let hash = 0
  for (const ch of String(name)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
  return LABEL_COLORS[hash % LABEL_COLORS.length]
}

export const chipStyle = (color) => ({
  background: `${color}1a`,
  borderColor: `${color}40`,
  color: `color-mix(in srgb, ${color} 70%, #0f172a)`
})

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

const ERRORS_AR = {
  'This ticket is already closed': 'هذه التذكرة مغلقة بالفعل.',
  'Only closed tickets can be reopened': 'يمكن إعادة فتح التذاكر المغلقة فقط.',
  'Reopen the ticket before assigning it': 'أعد فتح التذكرة قبل إسنادها.',
  'Team member not found': 'لم يُعثر على هذا الموظف.',
  'This team member is deactivated': 'هذا الموظف معطّل، اختر موظفاً آخر.',
  'Category not found': 'لم يُعثر على هذا التصنيف.',
  'Ticket not found': 'لم يُعثر على التذكرة.',
  'You do not have access to this ticket': 'لا تملك صلاحية على هذه التذكرة.',
  'A category with this name already exists': 'يوجد تصنيف بهذا الاسم.'
}

/** Message for a failed ticket request, in the dashboard language */
export function ticketErrorText(err, isAr) {
  const message = err?.response?.data?.error?.message || err?.response?.data?.error || err?.message || ''
  const text = typeof message === 'string' ? message : ''
  if (!isAr) return text
  const already = text.match(/^Ticket (.+) is already open for this conversation$/)
  if (already) return `التذكرة ${already[1]} مفتوحة بالفعل لهذه المحادثة.`
  return ERRORS_AR[text] || text
}
