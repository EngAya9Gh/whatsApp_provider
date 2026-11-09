// Ready-made chat flows: what each one is for, what the customer sees, and the steps it builds.
// Message texts marked `sample: true` are examples the owner should rewrite before publishing.
import { newOptionId } from './flowNodes'

/** Small graph builder: node() returns the id, link() connects two steps */
function graph(inactivityHours) {
  const nodes = [{ id: 'trigger', type: 'trigger', position: { x: 300, y: 0 }, data: { inactivityHours } }]
  const edges = []
  const node = (id, type, x, y, data = {}) => {
    nodes.push({ id, type, position: { x, y }, data })
    return id
  }
  const link = (source, target, handle = 'out') => {
    edges.push({ id: `e-${source}-${handle}-${target}`, source, target, sourceHandle: handle, targetHandle: 'in' })
  }
  return { nodes, edges, node, link }
}

const question = (text, titles, isAr) => {
  const options = titles.map(title => ({ id: newOptionId(), title }))
  return { data: { text, buttonLabel: isAr ? 'الخيارات' : 'Options', options }, handles: options.map(o => `opt-${o.id}`) }
}

const TEAM = { mode: 'TEAM', agentId: '' }

export const FLOW_TEMPLATES = [
  {
    key: 'menu',
    icon: 'fas fa-list-ul',
    color: '#10b981',
    nameAr: 'قائمة ترحيب بالأزرار',
    nameEn: 'Welcome menu with buttons',
    pickAr: 'الأنسب للبداية: العميل يختار بنفسه ما يريد من أزرار، وكل زر يأخذه لمسار مختلف.',
    pickEn: 'The best place to start: the customer picks what they need from buttons, and each button leads somewhere different.',
    demo: [
      { from: 'customer', ar: 'السلام عليكم', en: 'Hi there' },
      { from: 'bot', ar: 'أهلاً بك 👋\nكيف نقدر نساعدك اليوم؟', en: 'Welcome 👋\nHow can we help you today?', buttons: [['الأسعار والعروض', 'Prices & offers'], ['حالة طلبي', 'My order'], ['التحدث مع موظف', 'Talk to a person']] },
      { from: 'customer', ar: 'الأسعار والعروض', en: 'Prices & offers', tap: true },
      { from: 'bot', ar: 'هذه أسعارنا 👇\n• الباقة الأساسية: 100 ريال\n• الباقة المميزة: 250 ريال', en: 'Here are our prices 👇\n• Basic: $25\n• Premium: $60' }
    ],
    afterAr: [
      'اكتب أسعارك الحقيقية في الرسالة المعلّمة بـ«مثال».',
      'غيّر عناوين الأزرار بما يناسب نشاطك: حتى 3 أزرار، أو حتى 10 خيارات تظهر كقائمة.',
      'إذا كتب العميل نصاً بدل الضغط على زر، يذهب لمسار «رد آخر» (هنا: التحويل لموظف).'
    ],
    afterEn: [
      'Write your real prices in the message marked "Example".',
      'Change the button titles to fit your business: up to 3 buttons, or up to 10 options shown as a list.',
      'If the customer types instead of tapping, they follow "Other reply" (here: hand to a person).'
    ],
    build({ isAr, inactivityHours }) {
      const g = graph(inactivityHours)
      const q = question(isAr ? 'أهلاً بك 👋\nكيف نقدر نساعدك اليوم؟' : 'Welcome 👋\nHow can we help you today?',
        isAr ? ['الأسعار والعروض', 'حالة طلبي', 'التحدث مع موظف'] : ['Prices & offers', 'My order', 'Talk to a person'], isAr)
      const ask = g.node('ask', 'question', 300, 160, q.data)
      const prices = g.node('prices', 'message', -60, 480, {
        text: isAr
          ? 'هذه أسعارنا 👇\n• الباقة الأساسية: 100 ريال\n• الباقة المميزة: 250 ريال\n\nللطلب اكتب لنا هنا وسنخدمك فوراً.'
          : 'Here are our prices 👇\n• Basic: $25\n• Premium: $60\n\nTo order, just write to us here.',
        sample: true
      })
      const pricesEnd = g.node('prices-end', 'end', -60, 720, { handoff: false })
      const order = g.node('order', 'message', 300, 480, { text: isAr ? 'اكتب رقم طلبك 📦 وسيرد عليك أحد موظفينا خلال دقائق.' : 'Send us your order number 📦 and one of our team will reply in a few minutes.' })
      const human = g.node('human', 'message', 660, 480, { text: isAr ? 'حاضر 🙌 سيتم تحويلك لأحد موظفينا الآن.' : 'Sure 🙌 connecting you to one of our team now.' })
      const assign = g.node('assign', 'assign', 480, 720, TEAM)
      g.link('trigger', ask)
      g.link(ask, prices, q.handles[0])
      g.link(ask, order, q.handles[1])
      g.link(ask, human, q.handles[2])
      g.link(ask, human, 'fallback')
      g.link(prices, pricesEnd)
      g.link(order, assign)
      g.link(human, assign)
      return g
    }
  },
  {
    key: 'ai_first',
    icon: 'fas fa-robot',
    color: '#6366f1',
    needsAi: true,
    nameAr: 'الموظف الذكي يرد على كل شيء',
    nameEn: 'AI agent answers everything',
    pickAr: 'إذا كتبت معلومات نشاطك كاملة وتريد رداً فورياً على أي سؤال، ليلاً ونهاراً. يحوّل لفريقك عندما لا يعرف الجواب أو يطلب العميل موظفاً.',
    pickEn: 'When your business info is complete and you want instant answers day and night. It hands to your team when it does not know or the customer asks for a person.',
    demo: [
      { from: 'customer', ar: 'مرحبا، هل التوصيل متاح لجدة؟', en: 'Hi, do you deliver to Jeddah?' },
      { from: 'bot', ar: 'أهلاً بك! 👋 نعم، نوصل لجدة خلال 2–3 أيام عمل 🚚 هل تحب أساعدك بالطلب؟', en: 'Hi! 👋 Yes, we deliver to Jeddah in 2–3 working days 🚚 Want help placing an order?', ai: true },
      { from: 'customer', ar: 'بدي احكي مع موظف', en: 'I want to talk to a person' },
      { from: 'system', ar: 'تحوّلت المحادثة لفريقك', en: 'The chat goes to your team' }
    ],
    afterAr: [
      'الموظف الذكي يجيب فقط من «معلومات النشاط» في صفحة الموظف الذكي، فأكملها جيداً.',
      'جرّبه أولاً من صندوق التجربة في صفحة الموظف الذكي قبل النشر.'
    ],
    afterEn: [
      'The AI agent answers only from the business info on the AI agent page, so fill it in well.',
      'Try it in the playground on the AI agent page before publishing.'
    ],
    build({ inactivityHours }) {
      const g = graph(inactivityHours)
      const ai = g.node('ai', 'ai_agent', 300, 170)
      const assign = g.node('assign', 'assign', 300, 400, TEAM)
      g.link('trigger', ai)
      g.link(ai, assign, 'handoff')
      return g
    }
  },
  {
    key: 'ai_after_hours',
    icon: 'fas fa-moon',
    color: '#8b5cf6',
    needsAi: true,
    needsHours: true,
    nameAr: 'فريقك في الدوام، والذكي بعده',
    nameEn: 'Team in hours, AI after hours',
    pickAr: 'إذا أردت أن يرد موظفوك بأنفسهم أثناء الدوام، ويغطي الموظف الذكي الليل والعطل.',
    pickEn: 'When you want your team to answer during working hours, and the AI agent to cover nights and days off.',
    demo: [
      { from: 'system', ar: 'الساعة 11 ليلاً — خارج الدوام', en: '11 pm — outside working hours' },
      { from: 'customer', ar: 'كم سعر الباقة المميزة؟', en: 'How much is the Premium plan?' },
      { from: 'bot', ar: 'الباقة المميزة بـ 250 ريال شهرياً، وتشمل … هل تحب أرسل لك التفاصيل؟', en: 'Premium is $60 a month and includes … Shall I send the details?', ai: true },
      { from: 'system', ar: 'في الدوام تذهب المحادثة مباشرة لموظفيك', en: 'During working hours the chat goes straight to your team' }
    ],
    afterAr: [
      'حدّد أوقات الدوام من «الفرق والشيفتات ← ساعات العمل». بدونها يُعتبر الرقم في الدوام دائماً.',
      'أكمل معلومات نشاطك في صفحة الموظف الذكي.'
    ],
    afterEn: [
      'Set your working hours in Teams & Shifts → Working hours. Without them the number always counts as open.',
      'Fill in your business info on the AI agent page.'
    ],
    build({ isAr, inactivityHours }) {
      const g = graph(inactivityHours)
      const hours = g.node('hours', 'condition', 300, 160, { check: 'WORKING_HOURS', value: '' })
      const hello = g.node('hello', 'message', 100, 400, { text: isAr ? 'أهلاً بك 👋 سيرد عليك أحد موظفينا خلال دقائق.' : 'Welcome 👋 one of our team will reply in a few minutes.' })
      const assign = g.node('assign', 'assign', 100, 600, TEAM)
      const ai = g.node('ai', 'ai_agent', 500, 400)
      const end = g.node('end', 'end', 500, 640, { handoff: true })
      g.link('trigger', hours)
      g.link(hours, hello, 'yes')
      g.link(hours, ai, 'no')
      g.link(hello, assign)
      g.link(ai, end, 'handoff')
      return g
    }
  },
  {
    key: 'hours',
    icon: 'fas fa-clock',
    color: '#f59e0b',
    needsHours: true,
    nameAr: 'رسالة خارج الدوام',
    nameEn: 'Out-of-hours message',
    pickAr: 'إذا لا تستخدم الموظف الذكي: في الدوام يتحول العميل لموظف، وخارجه يصله رد بأوقات عملك.',
    pickEn: 'When you do not use the AI agent: in hours the customer goes to a person, outside hours they get your opening times.',
    demo: [
      { from: 'system', ar: 'الساعة 11 ليلاً — خارج الدوام', en: '11 pm — outside working hours' },
      { from: 'customer', ar: 'مرحبا', en: 'Hello' },
      { from: 'bot', ar: 'أهلاً بك 👋 نحن خارج أوقات الدوام الآن.\nنعمل من 9 صباحاً حتى 6 مساءً، اترك رسالتك وسنرد عليك أول ما نبدأ.', en: 'Welcome 👋 we are closed right now.\nWe work 9 am – 6 pm; leave a message and we will reply first thing.' },
      { from: 'system', ar: 'صباحاً يجدها فريقك في المحادثات المباشرة', en: 'In the morning your team finds it in Live Chat' }
    ],
    afterAr: [
      'حدّد أوقات الدوام من «الفرق والشيفتات ← ساعات العمل».',
      'اكتب أوقات عملك الحقيقية في الرسالة المعلّمة بـ«مثال».'
    ],
    afterEn: [
      'Set your working hours in Teams & Shifts → Working hours.',
      'Write your real opening times in the message marked "Example".'
    ],
    build({ isAr, inactivityHours }) {
      const g = graph(inactivityHours)
      const hours = g.node('hours', 'condition', 300, 160, { check: 'WORKING_HOURS', value: '' })
      const hello = g.node('hello', 'message', 100, 400, { text: isAr ? 'أهلاً بك 👋 سيرد عليك أحد موظفينا خلال دقائق.' : 'Welcome 👋 one of our team will reply in a few minutes.' })
      const assign = g.node('assign', 'assign', 100, 600, TEAM)
      const closed = g.node('closed', 'message', 500, 400, {
        text: isAr
          ? 'أهلاً بك 👋 نحن خارج أوقات الدوام الآن.\nنعمل من 9 صباحاً حتى 6 مساءً، اترك رسالتك وسنرد عليك أول ما نبدأ.'
          : 'Welcome 👋 we are closed right now.\nWe work 9 am – 6 pm; leave a message and we will reply first thing.',
        sample: true
      })
      const end = g.node('end', 'end', 500, 660, { handoff: true })
      g.link('trigger', hours)
      g.link(hours, hello, 'yes')
      g.link(hours, closed, 'no')
      g.link(hello, assign)
      g.link(closed, end)
      return g
    }
  },
  {
    key: 'sort',
    icon: 'fas fa-tags',
    color: '#ec4899',
    usesStage: true,
    tags: [
      { key: 'sales', ar: 'مبيعات', en: 'Sales', color: '#10b981' },
      { key: 'complaint', ar: 'شكوى', en: 'Complaint', color: '#ef4444' }
    ],
    nameAr: 'فرز العملاء بالوسوم والمراحل',
    nameEn: 'Sort customers with tags & stages',
    pickAr: 'إذا أردت أن تعرف من المحادثات المباشرة مباشرةً مَن يريد الشراء ومَن عنده شكوى: السير يضع الوسم والمرحلة بنفسه حسب الزر الذي يضغطه العميل.',
    pickEn: 'When you want to see in Live Chat who wants to buy and who has a complaint: the flow sets the tag and stage itself, based on the button the customer taps.',
    demo: [
      { from: 'customer', ar: 'مرحبا', en: 'Hello' },
      { from: 'bot', ar: 'أهلاً بك 👋 اختر ما يناسبك حتى نخدمك أسرع:', en: 'Welcome 👋 pick an option so we can help you faster:', buttons: [['أريد الشراء', 'I want to buy'], ['عندي استفسار', 'I have a question'], ['شكوى أو مشكلة', 'A complaint']] },
      { from: 'customer', ar: 'أريد الشراء', en: 'I want to buy', tap: true },
      { from: 'system', ar: 'أُضيف وسم «مبيعات» ونُقل العميل لمرحلة «عميل مهتم»', en: 'Tagged "Sales" and moved to the "Interested" stage' },
      { from: 'bot', ar: 'ممتاز! 🎉 سيتواصل معك أحد موظفي المبيعات الآن.', en: 'Great! 🎉 someone from sales will contact you now.' }
    ],
    afterAr: [
      'ننشئ الوسمين «مبيعات» و«شكوى» تلقائياً إن لم يكونا موجودين، ونثبّتهما كفلتر سريع في المحادثات.',
      'خطوة المرحلة تُضاف فقط إذا كانت مراحل العميل مفعّلة (صفحة الوسوم ومراحل العميل).',
      'لتحويل الشكاوى لموظف بعينه: افتح خطوة التحويل في مسار الشكوى واختر «موظف محدد».'
    ],
    afterEn: [
      'We create the "Sales" and "Complaint" tags if they do not exist, and pin them as quick filters in Live Chat.',
      'The stage step is added only when customer stages are on (Tags & Customer Stages page).',
      'To send complaints to one person: open the hand-off step on the complaint path and pick "One agent".'
    ],
    build({ isAr, inactivityHours, tagIds = {}, stageId = '' }) {
      const g = graph(inactivityHours)
      const q = question(isAr ? 'أهلاً بك 👋 اختر ما يناسبك حتى نخدمك أسرع:' : 'Welcome 👋 pick an option so we can help you faster:',
        isAr ? ['أريد الشراء', 'عندي استفسار', 'شكوى أو مشكلة'] : ['I want to buy', 'I have a question', 'A complaint'], isAr)
      const ask = g.node('ask', 'question', 300, 160, q.data)

      // Buy: tag → (stage) → message → team
      const buyTag = g.node('buy-tag', 'tag', -60, 480, { action: 'ADD', tagId: tagIds.sales || '' })
      let y = 620
      let afterTag = buyTag
      if (stageId) {
        afterTag = g.node('buy-stage', 'stage', -60, y, { stageId })
        g.link(buyTag, afterTag)
        y += 140
      }
      const buyMsg = g.node('buy-msg', 'message', -60, y, { text: isAr ? 'ممتاز! 🎉 سيتواصل معك أحد موظفي المبيعات الآن.' : 'Great! 🎉 someone from sales will contact you now.' })
      const buyAssign = g.node('buy-assign', 'assign', -60, y + 180, TEAM)
      g.link(afterTag, buyMsg)
      g.link(buyMsg, buyAssign)

      // Question: message → end (team)
      const askMsg = g.node('ask-msg', 'message', 300, 480, { text: isAr ? 'تفضّل اكتب سؤالك ✍️ وسيرد عليك أحد موظفينا.' : 'Go ahead and write your question ✍️ one of our team will reply.' })
      const askEnd = g.node('ask-end', 'end', 300, 680, { handoff: true })
      g.link(askMsg, askEnd)

      // Complaint: tag → message → team
      const badTag = g.node('bad-tag', 'tag', 660, 480, { action: 'ADD', tagId: tagIds.complaint || '' })
      const badMsg = g.node('bad-msg', 'message', 660, 620, { text: isAr ? 'نأسف لذلك 🙏 سيتواصل معك موظف الدعم حالاً.' : 'Sorry about that 🙏 our support team will contact you right away.' })
      const badAssign = g.node('bad-assign', 'assign', 660, 800, TEAM)
      g.link(badTag, badMsg)
      g.link(badMsg, badAssign)

      g.link('trigger', ask)
      g.link(ask, buyTag, q.handles[0])
      g.link(ask, askMsg, q.handles[1])
      g.link(ask, badTag, q.handles[2])
      g.link(ask, askMsg, 'fallback')
      return g
    }
  }
]

const norm = (s) => String(s || '').trim().toLowerCase()

/** The "interested" stage of the owner's main path, for the sort template */
export function pickInterestedStage(stages) {
  const main = stages.filter(s => s.group === 'MAIN')
  const named = main.find(s => ['عميل مهتم', 'مهتم', 'interested'].includes(norm(s.name)))
  return named || main[1] || main[0] || null
}

/** Existing tag with the template tag's Arabic or English name */
export function findTag(tags, need) {
  return tags.find(t => norm(t.name) === norm(need.ar) || norm(t.name) === norm(need.en)) || null
}

/**
 * Flattens a flow into readable lines (depth-first from the start step), for the template preview.
 * Each line: { depth, branch, type, text, repeat }
 */
export function outlineOf({ nodes, edges }, isAr, names = {}) {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  const out = (id, handle) => edges.filter(e => e.source === id && (e.sourceHandle || 'out') === handle).map(e => e.target)
  const seen = new Set()
  const lines = []

  const summary = (n) => {
    const d = n.data || {}
    const first = (s) => String(s || '').split('\n')[0]
    switch (n.type) {
      case 'trigger': return isAr ? 'العميل يراسلك' : 'The customer writes'
      case 'message': return first(d.text)
      case 'question': return first(d.text)
      case 'condition': return d.check === 'WORKING_HOURS' ? (isAr ? 'هل نحن في الدوام الآن؟' : 'Are we open right now?') : (isAr ? 'شرط' : 'Condition')
      case 'tag': return (isAr ? 'إضافة وسم ' : 'Add tag ') + `«${names[d.tagId] || '—'}»`
      case 'stage': return (isAr ? 'نقل العميل لمرحلة ' : 'Move to stage ') + `«${names[d.stageId] || '—'}»`
      case 'ai_agent': return isAr ? 'الموظف الذكي يجيب من معلومات نشاطك' : 'The AI agent answers from your business info'
      case 'assign': return isAr ? 'تحويل لفريق الرقم' : "Hand to the number's team"
      case 'end': return d.handoff !== false ? (isAr ? 'ينتهي ويحوّل للفريق' : 'Ends and hands to the team') : (isAr ? 'ينتهي بدون تحويل' : 'Ends without hand-off')
      default: return ''
    }
  }

  const walk = (id, depth, branch) => {
    const n = byId[id]
    if (!n) return
    if (seen.has(id)) {
      lines.push({ depth, branch, type: n.type, text: summary(n), repeat: true })
      return
    }
    seen.add(id)
    lines.push({ depth, branch, type: n.type, text: summary(n) })
    if (n.type === 'question') {
      for (const o of n.data?.options || []) for (const t of out(id, `opt-${o.id}`)) walk(t, depth + 1, (isAr ? 'إذا ضغط «' : 'If they tap "') + o.title + (isAr ? '»' : '"'))
      for (const t of out(id, 'fallback')) walk(t, depth + 1, isAr ? 'إذا كتب شيئاً آخر' : 'If they type something else')
    } else if (n.type === 'condition') {
      for (const t of out(id, 'yes')) walk(t, depth + 1, isAr ? 'نعم' : 'Yes')
      for (const t of out(id, 'no')) walk(t, depth + 1, isAr ? 'لا' : 'No')
    } else if (n.type === 'ai_agent') {
      for (const t of out(id, 'handoff')) walk(t, depth + 1, isAr ? 'عندما لا يعرف أو يطلب العميل موظفاً' : 'When it cannot answer or a person is asked for')
    } else {
      for (const t of out(id, 'out')) walk(t, depth, null)
    }
  }
  walk('trigger', 0, null)
  return lines
}
