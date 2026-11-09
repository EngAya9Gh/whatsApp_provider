// Step types of the WhatsApp flow builder (labels, icons, colors, default data)

const shortId = () => Math.random().toString(36).slice(2, 8)

export const FLOW_NODE_TYPES = {
  trigger: {
    icon: 'fas fa-bolt', color: '#8b5cf6',
    ar: 'بداية السير', en: 'Start',
    descAr: 'عندما يراسلك العميل', descEn: 'When a customer writes',
    helpAr: 'هنا يبدأ السير: مع أول رسالة من عميل جديد، أو عندما يرجع عميل بعد صمت طويل (المدة أدناه). لا تحتاج أن تعرف مسبقاً ماذا يريد العميل؛ الخطوات التالية تسأله أو تفحص حالته.',
    helpEn: 'This is where the flow starts: on a new customer\'s first message, or when a customer comes back after a long silence (set below). You do not need to know what they want in advance; the next steps ask them or check their situation.',
    addable: false,
    defaults: () => ({ inactivityHours: 24 })
  },
  message: {
    icon: 'fas fa-comment', color: '#3b82f6',
    ar: 'رسالة', en: 'Message',
    descAr: 'إرسال رسالة نصية', descEn: 'Send a text message',
    helpAr: 'ترسل نصاً للعميل ثم تنتقل فوراً للخطوة التالية بدون انتظار. مثال: رسالة ترحيب، قائمة أسعار، أو «سيتم تحويلك لموظف».',
    helpEn: 'Sends a text and moves straight to the next step without waiting. Examples: a welcome, a price list, or "connecting you to a person".',
    defaults: () => ({ text: '' })
  },
  question: {
    icon: 'fas fa-list-ul', color: '#10b981',
    ar: 'سؤال بخيارات', en: 'Question',
    descAr: 'أزرار أو قائمة، وكل خيار مسار', descEn: 'Buttons or a list, one branch per option',
    helpAr: 'ترسل سؤالاً مع أزرار وتنتظر اختيار العميل، ولكل زر مسار خاص على اللوحة. مثال: «الأسعار / حالة طلبي / موظف». هكذا يخبرك العميل بنفسه ماذا يريد.',
    helpEn: 'Sends a question with buttons and waits for the customer\'s choice; each button has its own branch on the canvas. Example: "Prices / My order / A person". This is how the customer tells you what they want.',
    defaults: () => ({ text: '', buttonLabel: 'الخيارات', options: [{ id: shortId(), title: '' }, { id: shortId(), title: '' }] })
  },
  condition: {
    icon: 'fas fa-code-branch', color: '#f59e0b',
    ar: 'شرط', en: 'Condition',
    descAr: 'تفرّع حسب حالة المحادثة', descEn: 'Branch on the conversation',
    helpAr: 'تفحص شيئاً وتختار مسار «نعم» أو «لا» تلقائياً، بدون أن تسأل العميل. مثال: هل نحن في الدوام؟ نعم ← موظف، لا ← رسالة خارج الدوام.',
    helpEn: 'Checks something and picks the "Yes" or "No" branch on its own, without asking the customer. Example: are we open? Yes → a person, No → an out-of-hours message.',
    defaults: () => ({ check: 'WORKING_HOURS', value: '' })
  },
  tag: {
    icon: 'fas fa-tag', color: '#ec4899',
    ar: 'وسم', en: 'Tag',
    descAr: 'إضافة وسم أو إزالته', descEn: 'Add or remove a tag',
    helpAr: 'تضع وسماً على المحادثة أو تزيله بصمت، والعميل لا يراه. مثال: عند اختيار «شكوى» ضع وسم «شكوى» لتفلتر به في المحادثات المباشرة.',
    helpEn: 'Adds or removes a tag on the conversation silently; the customer does not see it. Example: when they choose "Complaint", add the "Complaint" tag to filter by it in Live Chat.',
    defaults: () => ({ action: 'ADD', tagId: '' })
  },
  stage: {
    icon: 'fas fa-route', color: '#0ea5e9',
    ar: 'مرحلة العميل', en: 'Customer stage',
    descAr: 'نقل العميل لمرحلة', descEn: 'Move the customer to a stage',
    helpAr: 'تنقل العميل لمرحلة في رحلته بصمت. مثال: عند اختيار «أريد الشراء» انقله لمرحلة «عميل مهتم».',
    helpEn: 'Moves the customer to a stage of their journey silently. Example: when they choose "I want to buy", move them to "Interested".',
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
    helpAr: 'تسلّم المحادثة لإنسان وينتهي السير. «فريق الرقم» يوزعها على الموظفين الموجودين في الدوام، أو اختر موظفاً محدداً.',
    helpEn: 'Hands the conversation to a person and ends the flow. "Number team" gives it to whoever is on shift, or pick one agent.',
    defaults: () => ({ mode: 'TEAM', agentId: '' })
  },
  end: {
    icon: 'fas fa-flag-checkered', color: '#64748b',
    ar: 'إنهاء', en: 'End',
    descAr: 'إنهاء السير', descEn: 'End the flow',
    helpAr: 'تنهي السير. اترك خيار التحويل مفعّلاً ليتابع فريقك المحادثة، أو أوقفه إذا أجاب السير العميل بالكامل.',
    helpEn: 'Ends the flow. Keep the hand-off option on so your team follows up, or turn it off when the flow fully answered the customer.',
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
