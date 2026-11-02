<template>
  <div class="p-6 max-w-4xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">{{ t.title }}</h1>
      <p class="text-slate-500 mt-1">{{ t.subtitle }}</p>
    </div>

    <!-- The one thing to know -->
    <section class="key-warning">
      <div class="kw-icon"><i class="fas fa-mobile-screen-button"></i><i class="fas fa-ban kw-ban"></i></div>
      <div>
        <h2>{{ t.keyTitle }}</h2>
        <p>{{ t.keyBody }}</p>
      </div>
    </section>

    <!-- By the number's current state -->
    <h2 class="section-title">{{ t.statesTitle }}</h2>
    <div class="grid md:grid-cols-3 gap-4 mb-8">
      <div v-for="state in t.states" :key="state.key" class="state-card" :class="state.tone">
        <div class="state-head">
          <i :class="state.icon"></i>
          <span class="state-badge">{{ state.badge }}</span>
        </div>
        <h3>{{ state.title }}</h3>
        <p>{{ state.body }}</p>
        <ol v-if="state.steps" class="steps">
          <li v-for="step in state.steps" :key="step">{{ step }}</li>
        </ol>
        <p v-if="state.note" class="state-note"><i class="fas fa-triangle-exclamation"></i> {{ state.note }}</p>
      </div>
    </div>

    <!-- Before connecting -->
    <h2 class="section-title">{{ t.checklistTitle }}</h2>
    <div class="card mb-8">
      <label v-for="(item, i) in t.checklist" :key="i" class="check-row">
        <input type="checkbox" v-model="checked[i]" class="accent-[#FF6600]" />
        <span>
          <strong>{{ item.title }}</strong>
          <span class="block text-sm text-slate-500 mt-0.5">{{ item.body }}</span>
        </span>
      </label>
    </div>

    <!-- After connecting -->
    <h2 class="section-title">{{ t.afterTitle }}</h2>
    <div class="grid sm:grid-cols-2 gap-3 mb-8">
      <div v-for="item in t.after" :key="item.title" class="after-item">
        <i :class="item.icon"></i>
        <div>
          <div class="font-bold text-slate-800 text-sm">{{ item.title }}</div>
          <div class="text-sm text-slate-500 mt-0.5 leading-relaxed">{{ item.body }}</div>
        </div>
      </div>
    </div>

    <!-- FAQ -->
    <h2 class="section-title">{{ t.faqTitle }}</h2>
    <div class="card mb-8 divide-y divide-slate-100">
      <details v-for="q in t.faq" :key="q.q" class="faq">
        <summary>{{ q.q }}</summary>
        <p>{{ q.a }}</p>
      </details>
    </div>

    <div class="cta">
      <div>
        <div class="font-bold text-slate-800">{{ allChecked ? t.ctaReady : t.ctaNotReady }}</div>
        <div class="text-sm text-slate-500">{{ t.ctaHint }}</div>
      </div>
      <router-link to="/connect" class="cta-btn" :class="{ muted: !allChecked }">
        {{ t.ctaButton }} <i class="fas" :class="isAr ? 'fa-arrow-left' : 'fa-arrow-right'"></i>
      </router-link>
    </div>

    <p class="sources">
      {{ t.sources }}
      <a href="https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers" target="_blank" rel="noopener">Meta — Business phone numbers</a> ·
      <a href="https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/registration" target="_blank" rel="noopener">Meta — Register a business phone number</a>
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const TEXT = {
  ar: {
    title: 'قبل ربط رقمك بواتساب الرسمي (Meta)',
    subtitle: 'اقرأ هذه الصفحة قبل الربط — بعض الخطوات لا يمكن التراجع عنها بسهولة.',
    keyTitle: 'الرقم الذي تربطه بـ Meta لن يعمل على تطبيق واتساب',
    keyBody: 'رقم الإرسال يُسجَّل لدى Meta على منصة WhatsApp Business الرسمية (Cloud API)، فلا يمكن تشغيله في نفس الوقت على تطبيق واتساب أو واتساب للأعمال في الجوال، ولا على واتساب ويب. ستستقبل الرسائل وترد عليها من لوحة التحكم (المحادثات المباشرة) بدل الجوال.',
    statesTitle: 'ماذا أفعل حسب حالة رقمي؟',
    states: [
      {
        key: 'new', tone: 'good', icon: 'fas fa-sim-card', badge: 'الأسهل',
        title: 'رقم جديد غير مستخدم على واتساب',
        body: 'هذا هو الخيار الموصى به: شريحة جديدة أو رقم هاتف أرضي مخصص للنشاط التجاري. اربطه مباشرة.'
      },
      {
        key: 'personal', tone: 'warn', icon: 'fab fa-whatsapp', badge: 'يتطلب حذف الحساب',
        title: 'رقم مفعّل على تطبيق واتساب العادي',
        body: 'Meta لا تقبل رقماً مستخدماً على تطبيق واتساب العادي. يجب حذف حساب واتساب من هذا الرقم أولاً:',
        steps: [
          'افتح واتساب على الجوال ← الإعدادات ← الحساب',
          'اختر «حذف حسابي» وأكّد برقمك',
          'انتظر بضع دقائق (حتى 3 دقائق) ثم ابدأ الربط'
        ],
        note: 'تُفقد المحادثات والمجموعات المحفوظة على هذا الرقم. خذ نسخة احتياطية إن احتجتها.'
      },
      {
        key: 'business', tone: 'warn', icon: 'fas fa-store', badge: 'يتطلب حذف الحساب حالياً',
        title: 'رقم مفعّل على واتساب للأعمال (Business)',
        body: 'حالياً يجب حذف الحساب من تطبيق واتساب للأعمال بنفس الخطوات قبل الربط.',
        note: 'تتيح Meta لاحقاً إبقاء التطبيق مع الربط الرسمي معاً (خاصية Coexistence)، وستتوفر لدينا بعد اعتماد حسابنا كمزوّد تقني لدى Meta.'
      }
    ],
    checklistTitle: 'قائمة التحقق قبل الربط',
    checklist: [
      { title: 'الرقم ملكك ويصلك عليه رمز تحقق', body: 'Meta ترسل رمز تحقق برسالة SMS أو مكالمة صوتية (الرقم الأرضي يصلح عبر المكالمة).' },
      { title: 'الرقم غير مفعّل على أي تطبيق واتساب', body: 'أو أنك حذفت الحساب منه كما في الخطوات أعلاه.' },
      { title: 'اسم نشاط تجاري واضح', body: 'يظهر للعملاء كاسم عرض بعد مراجعة Meta، ويجب أن يطابق نشاطك الفعلي.' },
      { title: 'وسيلة دفع في حساب Meta', body: 'Meta تحاسب مباشرة على المحادثات/الرسائل حسب نوعها، ويُطلب إضافة وسيلة دفع لحساب الرسائل.' }
    ],
    afterTitle: 'ما الذي يتغير بعد الربط؟',
    after: [
      { icon: 'fas fa-comments', title: 'الرد من لوحة التحكم', body: 'كل المحادثات تصل إلى «المحادثات المباشرة»، ويرد عليها فريقك من هنا.' },
      { icon: 'fas fa-clock', title: 'نافذة 24 ساعة', body: 'بعد 24 ساعة من آخر رسالة للعميل لا يمكن مراسلته إلا بقالب معتمد من Meta.' },
      { icon: 'fas fa-users-slash', title: 'لا مجموعات ولا مكالمات حالياً', body: 'نظامنا لا يدعم حالياً مجموعات واتساب ولا المكالمات الصوتية عبر الربط الرسمي — المراسلة الفردية فقط.' },
      { icon: 'fas fa-rotate-left', title: 'الرجوع للتطبيق ممكن لكن ليس فورياً', body: 'لاستخدام الرقم على التطبيق مجدداً يجب أولاً إلغاء تسجيله من المنصة الرسمية — تواصل معنا لذلك.' }
    ],
    faqTitle: 'أسئلة شائعة',
    faq: [
      { q: 'هل يمكنني استخدام رقمي الشخصي؟', a: 'تقنياً نعم بعد حذف حساب واتساب منه، لكن لا ننصح بذلك: ستفقد واتساب الشخصي على هذا الرقم. الأفضل رقم مخصص للعمل.' },
      { q: 'هل يمكنني فتح الرقم على واتساب ويب أو جهاز آخر؟', a: 'لا. الرقم المربوط رسمياً يُدار من لوحة التحكم فقط، ويمكن لعدة موظفين الرد عليه في نفس الوقت من حساباتهم.' },
      { q: 'لم يصلني رمز التحقق، ماذا أفعل؟', a: 'اختر المكالمة الصوتية بدل الرسالة، وتأكد أن الرقم مكتوب بالصيغة الدولية. تسمح Meta بعدد محدود من محاولات التسجيل خلال 72 ساعة، فلا تكرر المحاولة بسرعة.' },
      { q: 'هل أحتاج رقم QR آخر للاستمرار بالإرسال العادي؟', a: 'الربط العادي عبر QR يستخدم رقماً مختلفاً على تطبيق واتساب. لا يمكن أن يكون نفس رقم Meta.' }
    ],
    ctaReady: 'جاهز للربط ✅',
    ctaNotReady: 'أكمل قائمة التحقق أولاً',
    ctaHint: 'الربط يتم من صفحة «الربط» عبر نافذة Facebook الرسمية.',
    ctaButton: 'الذهاب إلى صفحة الربط',
    sources: 'المصدر:'
  },
  en: {
    title: 'Before connecting your number to official WhatsApp (Meta)',
    subtitle: 'Read this first — some steps are not easy to undo.',
    keyTitle: 'The number you connect to Meta will not work in the WhatsApp app',
    keyBody: 'The sending number is registered with Meta on the official WhatsApp Business Platform (Cloud API). It cannot run at the same time in the WhatsApp or WhatsApp Business phone app, or on WhatsApp Web. You receive and answer messages from the dashboard (Live Chat) instead of the phone.',
    statesTitle: 'What to do, by the state of my number',
    states: [
      { key: 'new', tone: 'good', icon: 'fas fa-sim-card', badge: 'Easiest', title: 'A new number not on WhatsApp', body: 'Recommended: a new SIM or a landline dedicated to the business. Connect it right away.' },
      {
        key: 'personal', tone: 'warn', icon: 'fab fa-whatsapp', badge: 'Delete the account first',
        title: 'A number active on regular WhatsApp',
        body: 'Meta does not accept a number in use on the regular WhatsApp app. Delete the WhatsApp account on it first:',
        steps: ['Open WhatsApp → Settings → Account', 'Choose "Delete my account" and confirm with your number', 'Wait a few minutes (up to 3) before connecting'],
        note: 'Chats and groups on this number are lost. Back them up if you need them.'
      },
      {
        key: 'business', tone: 'warn', icon: 'fas fa-store', badge: 'Delete the account for now',
        title: 'A number active on WhatsApp Business',
        body: 'For now, delete the account from the WhatsApp Business app the same way before connecting.',
        note: 'Meta lets businesses keep the app alongside the API (Coexistence); it becomes available here once we are approved as a Meta Tech Provider.'
      }
    ],
    checklistTitle: 'Checklist before connecting',
    checklist: [
      { title: 'You own the number and can receive a code', body: 'Meta sends a verification code by SMS or voice call (landlines work with a call).' },
      { title: 'The number is not active on any WhatsApp app', body: 'Or you deleted the account as shown above.' },
      { title: 'A clear business name', body: 'Shown to customers as the display name after Meta reviews it; it must match your business.' },
      { title: 'A payment method in Meta', body: 'Meta charges for conversations/messages directly; a payment method is required on the messaging account.' }
    ],
    afterTitle: 'What changes after connecting',
    after: [
      { icon: 'fas fa-comments', title: 'Reply from the dashboard', body: 'All conversations arrive in Live Chat and your team answers from there.' },
      { icon: 'fas fa-clock', title: '24-hour window', body: 'More than 24 hours after the customer’s last message, you can only write with a Meta-approved template.' },
      { icon: 'fas fa-users-slash', title: 'No groups or calls for now', body: 'Our platform does not support WhatsApp groups or voice calls on the official connection yet — one-to-one messaging only.' },
      { icon: 'fas fa-rotate-left', title: 'Going back to the app is possible, not instant', body: 'To use the number in the app again it must first be deregistered from the platform — contact us.' }
    ],
    faqTitle: 'FAQ',
    faq: [
      { q: 'Can I use my personal number?', a: 'Technically yes after deleting its WhatsApp account, but you lose personal WhatsApp on it. A dedicated work number is better.' },
      { q: 'Can I open the number on WhatsApp Web or another phone?', a: 'No. An officially connected number is managed only from the dashboard, where several agents can answer at once.' },
      { q: 'I did not get the verification code', a: 'Choose a voice call instead of SMS and check the number is in international format. Meta allows a limited number of registration attempts in 72 hours, so do not retry too fast.' },
      { q: 'Can my QR-connected number be the same as my Meta number?', a: 'No. The QR connection uses a number on the WhatsApp app, so it must be a different number.' }
    ],
    ctaReady: 'Ready to connect ✅',
    ctaNotReady: 'Complete the checklist first',
    ctaHint: 'Connecting is done on the Connections page through the official Facebook window.',
    ctaButton: 'Go to Connections',
    sources: 'Source:'
  }
}

const t = computed(() => TEXT[isAr.value ? 'ar' : 'en'])
const checked = ref([false, false, false, false])
const allChecked = computed(() => checked.value.every(Boolean))
</script>

<style scoped>
.key-warning { display: flex; gap: 16px; align-items: flex-start; background: #fff7ed; border: 1.5px solid #fdba74; border-radius: 18px; padding: 20px 22px; margin-bottom: 28px; }
.key-warning h2 { font-size: 1.1rem; font-weight: 800; color: #9a3412; margin: 0 0 6px; }
.key-warning p { color: #7c2d12; line-height: 1.75; margin: 0; font-size: 0.92rem; }
.kw-icon { position: relative; width: 52px; height: 52px; flex-shrink: 0; border-radius: 14px; background: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.kw-ban { position: absolute; bottom: -4px; inset-inline-end: -4px; font-size: 18px; color: #dc2626; background: white; border-radius: 50%; }
.section-title { font-size: 1.05rem; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
.state-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 18px; }
.state-card.good { border-top: 4px solid #10b981; }
.state-card.warn { border-top: 4px solid #f59e0b; }
.state-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.state-head i { font-size: 20px; color: #475569; }
.state-badge { font-size: 0.7rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: #f1f5f9; color: #475569; }
.good .state-badge { background: #ecfdf5; color: #047857; }
.warn .state-badge { background: #fffbeb; color: #b45309; }
.state-card h3 { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
.state-card p { font-size: 0.85rem; color: #475569; line-height: 1.7; margin: 0; }
.steps { margin: 8px 0 0; padding-inline-start: 18px; font-size: 0.83rem; color: #334155; line-height: 1.8; list-style: decimal; }
.state-note { margin-top: 10px !important; font-size: 0.78rem !important; color: #92400e !important; background: #fffbeb; border-radius: 10px; padding: 8px 10px; }
.card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 6px 18px; }
.check-row { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid #f1f5f9; cursor: pointer; font-size: 0.92rem; color: #0f172a; }
.check-row:last-child { border-bottom: none; }
.check-row input { margin-top: 4px; width: 16px; height: 16px; flex-shrink: 0; }
.after-item { display: flex; gap: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; }
.after-item > i { color: #FF6600; font-size: 18px; margin-top: 2px; width: 22px; text-align: center; }
.faq { padding: 12px 0; }
.faq summary { cursor: pointer; font-weight: 600; color: #0f172a; font-size: 0.92rem; }
.faq p { margin: 8px 0 0; color: #475569; font-size: 0.87rem; line-height: 1.75; }
.cta { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 20px; }
.cta-btn { display: inline-flex; align-items: center; gap: 8px; background: #FF6600; color: white; font-weight: 700; padding: 10px 20px; border-radius: 12px; text-decoration: none; font-size: 0.9rem; }
.cta-btn.muted { background: #fdba74; }
.sources { margin-top: 18px; font-size: 0.75rem; color: #94a3b8; }
.sources a { color: #64748b; text-decoration: underline; }
</style>
