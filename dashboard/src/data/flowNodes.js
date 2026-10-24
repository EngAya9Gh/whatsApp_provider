// Step types of the WhatsApp flow builder (labels, icons, colors, default data)

const shortId = () => Math.random().toString(36).slice(2, 8)

export const FLOW_NODE_TYPES = {
  trigger: {
    icon: 'fas fa-bolt', color: '#8b5cf6',
    ar: 'بداية السير', en: 'Start',
    descAr: 'عندما يراسلك العميل', descEn: 'When a customer writes',
    addable: false,
    defaults: () => ({ inactivityHours: 24 })
  },
  message: {
    icon: 'fas fa-comment', color: '#3b82f6',
    ar: 'رسالة', en: 'Message',
    descAr: 'إرسال رسالة نصية', descEn: 'Send a text message',
    defaults: () => ({ text: '' })
  },
  question: {
    icon: 'fas fa-list-ul', color: '#10b981',
    ar: 'سؤال بخيارات', en: 'Question',
    descAr: 'أزرار أو قائمة، وكل خيار مسار', descEn: 'Buttons or a list, one branch per option',
    defaults: () => ({ text: '', buttonLabel: 'الخيارات', options: [{ id: shortId(), title: '' }, { id: shortId(), title: '' }] })
  },
  condition: {
    icon: 'fas fa-code-branch', color: '#f59e0b',
    ar: 'شرط', en: 'Condition',
    descAr: 'تفرّع حسب حالة المحادثة', descEn: 'Branch on the conversation',
    defaults: () => ({ check: 'WORKING_HOURS', value: '' })
  },
  tag: {
    icon: 'fas fa-tag', color: '#ec4899',
    ar: 'وسم', en: 'Tag',
    descAr: 'إضافة وسم أو إزالته', descEn: 'Add or remove a tag',
    defaults: () => ({ action: 'ADD', tagId: '' })
  },
  stage: {
    icon: 'fas fa-route', color: '#0ea5e9',
    ar: 'مرحلة العميل', en: 'Customer stage',
    descAr: 'نقل العميل لمرحلة', descEn: 'Move the customer to a stage',
    defaults: () => ({ stageId: '' })
  },
  ai_agent: {
    icon: 'fas fa-robot', color: '#6366f1',
    ar: 'موظف ذكي', en: 'AI agent',
    descAr: 'يرد بالذكاء الاصطناعي من معلومات نشاطك', descEn: 'Answers with AI from your business info',
    defaults: () => ({})
  },
  assign: {
    icon: 'fas fa-user-check', color: '#f97316',
    ar: 'تحويل لموظف', en: 'Hand to a person',
    descAr: 'للفريق أو لموظف محدد، وينتهي السير', descEn: 'To the team or one agent; ends the flow',
    defaults: () => ({ mode: 'TEAM', agentId: '' })
  },
  end: {
    icon: 'fas fa-flag-checkered', color: '#64748b',
    ar: 'إنهاء', en: 'End',
    descAr: 'إنهاء السير', descEn: 'End the flow',
    defaults: () => ({ handoff: true })
  }
}

export const CONDITION_CHECKS = [
  { key: 'WORKING_HOURS', ar: 'ضمن ساعات العمل', en: 'Within working hours' },
  { key: 'ASSIGNED', ar: 'المحادثة مسندة لموظف', en: 'Conversation is assigned' },
  { key: 'HAS_TAG', ar: 'العميل يحمل وسماً', en: 'Customer has a tag' },
  { key: 'STAGE_IS', ar: 'العميل في مرحلة', en: 'Customer is in a stage' },
  { key: 'TEXT_CONTAINS', ar: 'رسالة العميل تحتوي كلمة', en: 'Message contains a word' }
]

export const newOptionId = shortId

/** Output handles of a node — must match the backend (flow.service outputHandles) */
export function outputHandles(node) {
  switch (node.type) {
    case 'question': return [...(node.data?.options || []).map(o => `opt-${o.id}`), 'fallback']
    case 'condition': return ['yes', 'no']
    case 'ai_agent': return ['handoff']
    case 'assign':
    case 'end': return []
    default: return ['out']
  }
}
