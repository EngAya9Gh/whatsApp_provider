<template>
  <div class="landing-page" :dir="isAr ? 'rtl' : 'ltr'">

    <!-- Navbar -->
    <nav class="landing-nav">
      <div class="nav-container">
        <a href="#top" class="logo">
          <span class="logo-mark"><i class="fab fa-whatsapp"></i></span>
          <span class="logo-text">Wakeel <span class="logo-accent">WhatsApp</span></span>
        </a>
        <div class="nav-links">
          <a href="#how">{{ c.nav.how }}</a>
          <a href="#features">{{ c.nav.features }}</a>
          <a href="#campaigns">{{ c.nav.campaigns }}</a>
          <a href="#pricing">{{ c.nav.pricing }}</a>
        </div>
        <div class="nav-actions">
          <button class="lang-btn" @click="toggleLanguage" :aria-label="isAr ? 'English' : 'العربية'">
            <svg v-if="$i18n.locale === 'en'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            <span v-else style="font-weight: 800; font-size: 1.1rem; line-height: 1;">ع</span>
          </button>
          <router-link to="/login" class="btn-ghost">{{ c.nav.signIn }}</router-link>
          <router-link to="/register" class="btn-primary">{{ c.nav.start }}</router-link>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <header id="top" class="hero-section">
      <div class="glow-orb glow-top-left"></div>
      <div class="glow-orb glow-bottom-right"></div>

      <div class="hero-container">
        <div class="hero-text-content">
          <div class="badge-pill">
            <span class="badge-dot"></span>
            {{ c.hero.badge }}
          </div>
          <h1 class="hero-title">
            {{ c.hero.titleStart }} <span class="text-gradient">{{ c.hero.titleHighlight }}</span> {{ c.hero.titleEnd }}
          </h1>
          <p class="hero-subtitle">{{ c.hero.subtitle }}</p>
          <ul class="hero-points">
            <li v-for="point in c.hero.points" :key="point"><i class="fas fa-circle-check"></i> {{ point }}</li>
          </ul>
          <div class="hero-cta-group">
            <router-link to="/register" class="btn-primary btn-large">
              {{ c.hero.ctaPrimary }}
              <i class="fas fa-arrow-right flip-rtl"></i>
            </router-link>
            <a href="#pricing" class="btn-secondary btn-large">{{ c.hero.ctaSecondary }}</a>
          </div>
        </div>

        <!-- Hero Visual: shared inbox mockup -->
        <div class="hero-visual" aria-hidden="true">
          <div class="app-window">
            <div class="window-bar">
              <span class="dots"><i></i><i></i><i></i></span>
              <span class="window-url"><i class="fas fa-lock"></i> provider.wakeel.cc/live-chat</span>
            </div>
            <div class="inbox">
              <div class="threads">
                <div class="threads-head">
                  <strong>{{ c.mock.title }}</strong>
                  <span class="search"><i class="fas fa-magnifying-glass"></i> {{ c.mock.search }}</span>
                </div>
                <div v-for="(thread, i) in c.mock.threads" :key="thread.name" :class="['thread', { active: i === 0 }]">
                  <span class="avatar" :style="{ background: avatarColors[i] }">{{ thread.initials }}</span>
                  <span class="thread-body">
                    <span class="thread-top"><b>{{ thread.name }}</b><small>{{ thread.time }}</small></span>
                    <span class="thread-msg">{{ thread.message }}</span>
                    <span class="thread-meta">
                      <span v-if="thread.tag" class="tag" :class="`tag-${thread.tone}`">{{ thread.tag }}</span>
                      <span class="agent"><i class="fas fa-user"></i> {{ thread.agent }}</span>
                      <span v-if="thread.unread" class="unread">{{ thread.unread }}</span>
                    </span>
                  </span>
                </div>
              </div>
              <div class="chat">
                <div class="chat-head">
                  <span class="avatar" :style="{ background: avatarColors[0] }">{{ c.mock.threads[0].initials }}</span>
                  <span><b>{{ c.mock.threads[0].name }}</b><small dir="ltr">+966 55 012 3456</small></span>
                  <span class="stage">{{ c.mock.stage }}</span>
                </div>
                <div class="ticket-bar">
                  <span class="ticket-id">TKT-1042</span>
                  <span class="status status-open">{{ c.statuses.open }}</span>
                  <span class="ticket-cat">{{ c.mock.category }}</span>
                  <span class="ticket-actions"><span class="mini-btn"><i class="fas fa-user-plus"></i> {{ c.mock.assign }}</span><span class="mini-btn danger"><i class="fas fa-xmark"></i> {{ c.mock.close }}</span></span>
                </div>
                <div class="messages">
                  <div class="msg msg-in">{{ c.mock.msgIn1 }}<small>10:40</small></div>
                  <div class="note"><i class="fas fa-lock"></i> {{ c.mock.note }}</div>
                  <div class="msg msg-out">{{ c.mock.msgOut1 }}<small>10:41 <i class="fas fa-check-double"></i></small></div>
                  <div class="msg msg-in">{{ c.mock.msgIn2 }}<small>10:42</small></div>
                  <div class="typing"><i></i><i></i><i></i></div>
                </div>
                <div class="composer">
                  <i class="far fa-face-smile"></i><i class="fas fa-paperclip"></i>
                  <span class="composer-input">{{ c.mock.composer }}</span>
                  <i class="fas fa-microphone"></i>
                  <span class="send"><i class="fas fa-paper-plane flip-rtl"></i></span>
                </div>
              </div>
            </div>
          </div>

          <div class="floating-card card-route float-anim">
            <span class="floating-icon green"><i class="fas fa-shuffle"></i></span>
            <span><b>{{ c.mock.routeTitle }}</b><small>{{ c.mock.routeMeta }}</small></span>
          </div>
          <div class="floating-card card-rated float-anim-delayed">
            <span class="floating-icon amber"><i class="fas fa-ticket"></i></span>
            <span><b>{{ c.mock.ratedTitle }}</b><span class="stars">★★★★★</span><small>{{ c.mock.ratedMeta }}</small></span>
          </div>
        </div>
      </div>
    </header>

    <!-- Product numbers -->
    <section class="stats-banner">
      <div class="stats-container">
        <template v-for="(stat, i) in c.stats" :key="stat.label">
          <div v-if="i > 0" class="stat-divider"></div>
          <div class="stat-item">
            <h3 dir="ltr">{{ stat.value }}</h3>
            <p>{{ stat.label }}</p>
          </div>
        </template>
      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="workflow-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-label">{{ c.how.label }}</span>
          <h2 class="section-title">{{ c.how.title }}</h2>
          <p class="section-subtitle">{{ c.how.subtitle }}</p>
        </div>
        <div class="workflow-grid">
          <template v-for="(step, i) in c.how.steps" :key="step.title">
            <div v-if="i > 0" class="step-arrow"><i class="fas fa-chevron-right flip-rtl"></i></div>
            <div class="step-card">
              <div class="step-icon-wrap">
                <i :class="['fas', howIcons[i]]"></i>
                <span class="step-number">{{ i + 1 }}</span>
              </div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.desc }}</p>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- Customer service features -->
    <section id="features" class="features-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-label">{{ c.service.label }}</span>
          <h2 class="section-title">{{ c.service.title }}</h2>
          <p class="section-subtitle">{{ c.service.subtitle }}</p>
        </div>

        <div class="bento-grid">
          <div class="bento-card bento-large featured">
            <div class="bento-icon solid-green"><i class="fas fa-comments"></i></div>
            <h3>{{ c.service.inbox.title }}</h3>
            <p>{{ c.service.inbox.desc }}</p>
            <div class="chips">
              <span v-for="chip in c.service.inbox.chips" :key="chip" class="chip"><i class="fas fa-check"></i> {{ chip }}</span>
            </div>
            <div class="mini-threads">
              <div v-for="(thread, i) in c.mock.threads.slice(0, 3)" :key="thread.name" class="mini-thread">
                <span class="avatar" :style="{ background: avatarColors[i] }">{{ thread.initials }}</span>
                <span class="mini-body"><b>{{ thread.name }}</b><small>{{ thread.message }}</small></span>
                <span v-if="thread.tag" class="tag" :class="`tag-${thread.tone}`">{{ thread.tag }}</span>
              </div>
            </div>
          </div>

          <div class="bento-card">
            <div class="bento-icon"><i class="fas fa-ticket"></i></div>
            <h3>{{ c.service.tickets.title }}</h3>
            <p>{{ c.service.tickets.desc }}</p>
            <div class="lifecycle">
              <span v-for="status in ['open', 'pending', 'resolved', 'closed']" :key="status" :class="['status', `status-${status}`]">{{ c.statuses[status] }}</span>
            </div>
          </div>

          <div class="bento-card">
            <div class="bento-icon"><i class="fas fa-users-gear"></i></div>
            <h3>{{ c.service.routing.title }}</h3>
            <p>{{ c.service.routing.desc }}</p>
            <div class="chips">
              <span v-for="mode in c.service.routing.modes" :key="mode" class="chip"><i class="fas fa-shuffle"></i> {{ mode }}</span>
            </div>
          </div>

          <div class="bento-card bento-large-horizontal">
            <div class="bento-content-side">
              <div class="bento-icon"><i class="fas fa-star"></i></div>
              <h3>{{ c.service.csat.title }}</h3>
              <p>{{ c.service.csat.desc }}</p>
              <div class="chips">
                <span v-for="format in c.service.csat.formats" :key="format" class="chip"><i class="fas fa-check"></i> {{ format }}</span>
              </div>
            </div>
            <div class="bento-visual-side survey" aria-hidden="true">
              <div class="mock-message bot-msg">{{ c.service.csat.question }}</div>
              <div class="survey-options">
                <span v-for="(option, i) in c.service.csat.options" :key="option" class="survey-option">
                  <span class="stars">{{ '★'.repeat(5 - i) }}</span> {{ option }}
                </span>
              </div>
              <div class="mock-message user-msg">★★★★★</div>
            </div>
          </div>

          <div v-for="(item, i) in c.service.more" :key="item.title" class="bento-card">
            <div class="bento-icon"><i :class="['fas', moreIcons[i]]"></i></div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Campaigns & messaging -->
    <section id="campaigns" class="features-section campaigns-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-label">{{ c.campaigns.label }}</span>
          <h2 class="section-title">{{ c.campaigns.title }}</h2>
          <p class="section-subtitle">{{ c.campaigns.subtitle }}</p>
        </div>

        <div class="modes">
          <div class="mode">
            <div class="mode-head"><i class="fas fa-qrcode"></i> {{ c.campaigns.modes.qr.title }}</div>
            <p>{{ c.campaigns.modes.qr.desc }}</p>
            <ul><li v-for="point in c.campaigns.modes.qr.points" :key="point"><i class="fas fa-check"></i> {{ point }}</li></ul>
          </div>
          <div class="mode official">
            <div class="mode-head"><i class="fas fa-circle-check"></i> {{ c.campaigns.modes.meta.title }} <span class="mode-badge">{{ c.campaigns.modes.meta.badge }}</span></div>
            <p>{{ c.campaigns.modes.meta.desc }}</p>
            <ul><li v-for="point in c.campaigns.modes.meta.points" :key="point"><i class="fas fa-check"></i> {{ point }}</li></ul>
          </div>
        </div>

        <div class="bento-grid">
          <div class="bento-card bento-large-horizontal featured">
            <div class="bento-content-side">
              <div class="bento-icon solid-green"><i class="fas fa-bullhorn"></i></div>
              <h3>{{ c.campaigns.meta.title }}</h3>
              <p>{{ c.campaigns.meta.desc }}</p>
              <div class="chips">
                <span v-for="chip in c.campaigns.meta.chips" :key="chip" class="chip"><i class="fas fa-check"></i> {{ chip }}</span>
              </div>
            </div>
            <div class="bento-visual-side campaign-stats" aria-hidden="true">
              <div class="campaign-name"><i class="fas fa-bullhorn"></i> {{ c.campaigns.meta.campaignName }}</div>
              <div v-for="stat in c.campaigns.meta.stats" :key="stat.label" class="campaign-row">
                <span class="campaign-row-head"><span>{{ stat.label }}</span><b dir="ltr">{{ stat.value }}</b></span>
                <span class="bar"><span :style="{ width: stat.percent + '%' }"></span></span>
              </div>
            </div>
          </div>

          <div class="bento-card">
            <div class="bento-icon"><i class="fas fa-file-excel"></i></div>
            <h3>{{ c.campaigns.qr.title }}</h3>
            <p>{{ c.campaigns.qr.desc }}</p>
          </div>

          <div v-for="(item, i) in c.campaigns.more" :key="item.title" class="bento-card">
            <div class="bento-icon"><i :class="['fas', campaignIcons[i]]"></i></div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </div>

          <div class="bento-card bento-full api-card">
            <div class="bento-content-side">
              <div class="bento-icon"><i class="fas fa-code"></i></div>
              <h3>{{ c.campaigns.api.title }}</h3>
              <p>{{ c.campaigns.api.desc }}</p>
            </div>
            <pre class="code" dir="ltr"><span class="code-method">POST</span> /api/v1/message/send
<span class="code-key">Authorization:</span> Bearer sk_live_••••••••

{
  <span class="code-key">"phone"</span>: <span class="code-str">"966500000000"</span>,
  <span class="code-key">"message"</span>: <span class="code-str">"{{ c.campaigns.api.sample }}"</span>
}</pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-label">{{ $i18n.locale === 'ar' ? 'الأسعار' : 'Pricing' }}</span>
          <h2 class="section-title">{{ $i18n.locale === 'ar' ? 'باقات تناسب جميع احتياجاتك' : 'Plans to fit all your needs' }}</h2>
        </div>

        <div class="pricing-grid">
          <div v-for="plan in pricingPlans" :key="plan.id" :class="['price-card', { popular: plan.isPopular }]">
            <div v-if="plan.isPopular" class="popular-badge">{{ $i18n.locale === 'ar' ? 'الأكثر طلباً' : 'Most Popular' }}</div>
            <h3 class="plan-name">{{ $i18n.locale === 'ar' ? plan.nameAr : plan.nameEn }}</h3>
            <div v-if="plan.price === 0 && plan.limit === 'Unlimited/Custom'" class="plan-price" style="font-size: 1.8rem;">
              {{ $i18n.locale === 'ar' ? 'تواصل معنا' : 'Contact Us' }}
            </div>
            <div v-else-if="plan.price === 0" class="plan-price">{{ $i18n.locale === 'ar' ? 'مجاني' : 'Free' }}</div>
            <div v-else class="plan-price">${{ plan.price }}</div>

            <p class="plan-desc">
              <template v-if="plan.limit !== 'Unlimited/Custom'">
                <span style="font-weight: bold; color: #fff;">{{ $i18n.locale === 'ar' ? 'الحد:' : 'Limit:' }}</span> {{ plan.limit }} {{ $i18n.locale === 'ar' ? 'رسالة' : 'Messages' }}
              </template>
              <template v-else-if="plan.id === 'pro'">
                <span style="font-weight: bold; color: #fff;">{{ $i18n.locale === 'ar' ? 'الدفع حسب الاستهلاك' : 'Pay as you go' }}</span>
              </template>
              <template v-else-if="plan.id === 'enterprise'">
                <span style="color: #FF6600; font-size: 0.95rem; font-weight: 600;">
                  {{ $i18n.locale === 'ar' ? 'يتم احتساب اشتراك منفصل لكل رقم يتم ربطه بميتا' : 'A separate subscription is charged for each Meta number' }}
                </span>
              </template>
              <template v-else>{{ plan.limit }}</template>
            </p>

            <ul class="plan-features">
              <li v-if="plan.limit !== 'Unlimited/Custom' && plan.id !== 'pro'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>{{ plan.limit }} {{ $i18n.locale === 'ar' ? 'رسالة مضمنة' : 'Messages included' }}</span>
              </li>
              <li v-else-if="plan.id === 'pro'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>{{ $i18n.locale === 'ar' ? 'رسائل غير محدودة حسب الاستهلاك' : 'Unlimited pay as you go messages' }}</span>
              </li>
              <li v-for="(feat, idx) in ($i18n.locale === 'ar' ? plan.featuresArList : plan.featuresEnList)" :key="idx">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>{{ feat }}</span>
              </li>
            </ul>
            <router-link to="/register" :class="plan.isPopular ? 'btn-primary block-btn mt-auto' : 'btn-secondary block-btn mt-auto'" style="margin-top: auto;">
              {{ $i18n.locale === 'ar' ? (plan.buttonTextAr || 'اشترك الآن') : (plan.buttonTextEn || 'Subscribe Now') }}
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="cta-band">
      <div class="cta-inner">
        <h2>{{ c.cta.title }}</h2>
        <p>{{ c.cta.subtitle }}</p>
        <div class="hero-cta-group">
          <router-link to="/register" class="btn-primary btn-large">{{ c.cta.primary }} <i class="fas fa-arrow-right flip-rtl"></i></router-link>
          <router-link to="/login" class="btn-secondary btn-large">{{ c.nav.signIn }}</router-link>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="section-container footer-container">
        <div class="footer-brand">
          <div class="logo">
            <span class="logo-mark"><i class="fab fa-whatsapp"></i></span>
            <span class="logo-text" style="font-size: 1.2rem;">Wakeel <span class="logo-accent">WhatsApp</span></span>
          </div>
          <p class="footer-desc">{{ c.footer.desc }}</p>
        </div>

        <div class="footer-links">
          <h4>{{ $i18n.locale === 'ar' ? 'روابط سريعة' : 'Quick Links' }}</h4>
          <a href="#features">{{ $i18n.locale === 'ar' ? 'المميزات' : 'Features' }}</a>
          <a href="#pricing">{{ $i18n.locale === 'ar' ? 'الأسعار' : 'Pricing' }}</a>
          <router-link to="/register">{{ $i18n.locale === 'ar' ? 'إنشاء حساب' : 'Sign Up' }}</router-link>
          <router-link to="/login">{{ $i18n.locale === 'ar' ? 'تسجيل الدخول' : 'Sign In' }}</router-link>
          <router-link to="/privacy">{{ $i18n.locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy' }}</router-link>
          <router-link to="/terms">{{ $i18n.locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service' }}</router-link>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="copyright">
          © 2026 Wakeel Tech. All rights reserved.
        </p>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

import { setLanguage } from '../i18n'

const { locale } = useI18n()
const pricingPlans = ref([])
const isAr = computed(() => locale.value === 'ar')

const avatarColors = ['#FF6600', '#8B5CF6', '#0EA5E9', '#10B981']
const howIcons = ['fa-comment-dots', 'fa-shuffle', 'fa-reply', 'fa-star']
const moreIcons = ['fa-eye-slash', 'fa-wand-magic-sparkles', 'fa-arrows-rotate']
const campaignIcons = ['fa-table-list', 'fa-robot', 'fa-key']

// Landing copy lives here (not in locales/*.json) to keep the dashboard translations small
const copy = {
  ar: {
    nav: { how: 'كيف تعمل', features: 'خدمة العملاء', campaigns: 'الحملات', pricing: 'الأسعار', signIn: 'تسجيل الدخول', start: 'ابدأ مجاناً' },
    hero: {
      badge: 'جديد: صندوق وارد مشترك، تذاكر، وفرق وشيفتات',
      titleStart: 'حوّل محادثات',
      titleHighlight: 'واتساب',
      titleEnd: 'إلى خدمة عملاء منظمة',
      subtitle: 'صندوق وارد مشترك لكل أرقامك، تذكرة لكل محادثة تُوزَّع تلقائياً على الموظف المتواجد في الدوام، وتقييم رضا وملخص ذكي عند الإغلاق. إلى جانب الحملات الرسمية عبر Meta ورموز التحقق وواجهة API للمطورين.',
      points: ['WhatsApp Cloud API الرسمي أو ربط سريع عبر QR', 'مزامنة تلقائية مع Wakeel CRM', 'واجهة عربية وإنجليزية بالكامل'],
      ctaPrimary: 'إنشاء حساب مجاني',
      ctaSecondary: 'عرض الباقات'
    },
    mock: {
      title: 'المحادثات',
      search: 'بحث في المحادثات...',
      threads: [
        { name: 'أحمد السالم', initials: 'أ', message: 'دفعت قيمة الطلب ولم يصلني تأكيد', time: '10:42', tag: 'شكوى', tone: 'red', unread: 2, agent: 'سارة' },
        { name: 'نورة القحطاني', initials: 'ن', message: 'هل يتوفر التوصيل إلى جدة؟', time: '10:31', tag: 'VIP', tone: 'amber', unread: 1, agent: 'محمد' },
        { name: 'مؤسسة الريان', initials: 'م', message: 'نحتاج عرض سعر لـ 50 وحدة', time: '09:58', tag: 'جملة', tone: 'blue', unread: 0, agent: 'خالد' },
        { name: 'خالد العتيبي', initials: 'خ', message: 'شكراً لكم 🌹', time: 'أمس', tag: '', tone: '', unread: 0, agent: 'ريم' }
      ],
      stage: 'مهتم',
      category: 'الدفع',
      assign: 'إسناد',
      close: 'إغلاق التذكرة',
      msgIn1: 'السلام عليكم، دفعت قيمة الطلب #4821 أمس ولم يصلني تأكيد',
      note: 'ملاحظة داخلية: تم التحقق من التحويل البنكي ✔ — سارة',
      msgOut1: 'وعليكم السلام أحمد، تم تأكيد الدفع وسيصلك الطلب اليوم 🚚',
      msgIn2: 'ممتاز، شكراً لكم!',
      composer: 'اكتب رسالة... أو / للردود السريعة',
      routeTitle: 'أُسندت تلقائياً إلى سارة',
      routeMeta: 'فريق الدعم · في الدوام الآن',
      ratedTitle: 'أُغلقت التذكرة TKT-1042',
      ratedMeta: 'ملخص AI: تم تأكيد الدفع وشحن الطلب'
    },
    statuses: { open: 'مفتوحة', pending: 'قيد الانتظار', resolved: 'تم الحل', closed: 'مغلقة' },
    stats: [
      { value: '3', label: 'أنماط لتوزيع المحادثات' },
      { value: '4', label: 'حالات لتتبع كل تذكرة' },
      { value: '15', label: 'صلاحية لأعضاء الفريق' },
      { value: '10', label: 'أنواع رسائل تفاعلية' }
    ],
    how: {
      label: 'كيف تعمل',
      title: 'من رسالة العميل حتى تقييمه... في دورة واحدة واضحة',
      subtitle: 'كل محادثة تتحول تلقائياً إلى تذكرة لها صاحب ومهلة ونتيجة.',
      steps: [
        { title: 'رسالة واردة', desc: 'تصل محادثة العميل لحظياً إلى صندوق الوارد المشترك من أي رقم من أرقامك.' },
        { title: 'توزيع تلقائي', desc: 'تُفتح تذكرة وتُسند للموظف المتواجد في الدوام من الفريق المسؤول عن الرقم.' },
        { title: 'رد سريع ومنظم', desc: 'ردود جاهزة بالاختصارات، ملاحظات داخلية، وسوم ومراحل لكل عميل.' },
        { title: 'تقييم وملخص', desc: 'استبيان رضا عند الإغلاق، وملخص ذكي للمحادثة يُرسل إلى نظام CRM.' }
      ]
    },
    service: {
      label: 'خدمة العملاء',
      title: 'كل ما يحتاجه فريق الدعم والمبيعات',
      subtitle: 'أدوات صُممت لفرق تعمل معاً على نفس الأرقام دون تضارب أو ضياع محادثات.',
      inbox: {
        title: 'صندوق وارد مشترك لكل أرقامك',
        desc: 'كل محادثات واتساب تصل لحظياً إلى شاشة واحدة يعمل عليها فريقك معاً: فلترة حسب الرقم والوسم والمرحلة، ملاحظات داخلية لا يراها العميل، ردود سريعة، رسائل صوتية ووسائط.',
        chips: ['ملاحظات داخلية', 'ردود سريعة', 'رسائل صوتية', 'وسوم ملوّنة', 'مسارات للمبيعات والحجوزات', 'فلترة حسب الرقم']
      },
      tickets: {
        title: 'تذاكر تُدار من داخل المحادثة',
        desc: 'تُفتح التذكرة تلقائياً مع أول رسالة بتصنيف ورقم مميز، تُسند لأول موظف يرد، يُعاد فتحها إذا عاد العميل، وتُغلق تلقائياً بعد 12 إلى 72 ساعة من الخمول.'
      },
      routing: {
        title: 'فرق وشيفتات وتوزيع ذكي',
        desc: 'اربط كل رقم بفريق، عرّف الشيفتات وأيام الدوام، ووزّع المحادثات على المتواجدين فقط، مع إعادة العميل العائد لنفس الموظف.',
        modes: ['بالتناوب', 'الأقل انشغالاً', 'يدوي']
      },
      csat: {
        title: 'تقييم رضا العملاء',
        desc: 'استبيان تلقائي بعد إغلاق التذكرة، يُحفظ التقييم في التذكرة ويُرسل إلى CRM لتعرف رضا عملائك عن كل موظف.',
        formats: ['قائمة نجوم تفاعلية', 'أزرار سريعة', 'رد نصي'],
        question: 'كيف تقيّم تجربتك معنا؟',
        options: ['ممتاز', 'جيد جداً', 'جيد']
      },
      more: [
        { title: 'خصوصية المحادثات', desc: 'حدّد ما يراه كل موظف: كل المحادثات، أو محادثات فريقه، أو المسندة إليه فقط، مع 15 صلاحية قابلة للتخصيص.' },
        { title: 'ملخص ذكي لكل تذكرة', desc: 'عند الإغلاق يلخّص الذكاء الاصطناعي المشكلة والحل في سطرين ويرسلهما إلى CRM.' },
        { title: 'مزامنة مع Wakeel CRM', desc: 'يُنشأ العميل في CRM تلقائياً، وتُزامَن التذاكر وملخصاتها وتقييماتها مع ملفه.' }
      ]
    },
    campaigns: {
      label: 'الحملات والمراسلة',
      title: 'وصّل رسالتك لآلاف العملاء... رسمياً وبأمان',
      subtitle: 'اختر طريقة الربط المناسبة لك، وأطلق حملات مخصصة وتابع نتائجها لحظة بلحظة.',
      modes: {
        qr: { title: 'الربط السريع عبر QR', desc: 'امسح الرمز من جوالك وابدأ الإرسال فوراً.', points: ['حملات من ملفات Excel / CSV', 'روبوت رد آلي بالكلمات المفتاحية', 'أزرار وقوائم تفاعلية'] },
        meta: { title: 'WhatsApp Cloud API الرسمي', badge: 'رسمي من Meta', desc: 'استقرار كامل، حماية من الحظر، وأهلية للعلامة الخضراء.', points: ['ربط رسمي خلال دقيقتين تقريباً', 'أرقام متعددة وصندوق وارد مشترك', 'قوالب معتمدة وWhatsApp Flows'] }
      },
      meta: {
        title: 'حملات واتساب الرسمية عبر Meta',
        desc: 'حملات بقوالب معتمدة من Meta: متغيرات مخصصة لكل عميل من ملف Excel أو مجموعة جهات اتصال، إرسال فوري أو مجدول، وإحصائيات الإرسال والقراءة والفشل، مع مراعاة حدود Meta اليومية وتكلفة واضحة لكل فئة.',
        chips: ['قوالب معتمدة', 'متغيرات مخصصة', 'إرسال مجدول', 'حدود Meta اليومية'],
        campaignName: 'حملة عرض نهاية الأسبوع',
        stats: [
          { label: 'تم الإرسال', value: '1,730', percent: 100 },
          { label: 'تمت القراءة', value: '1,284', percent: 74 },
          { label: 'فشل', value: '38', percent: 2 }
        ]
      },
      qr: { title: 'حملات عبر ربط QR', desc: 'ارفع ملف Excel أو اختر مجموعة، أضف صورة أو PDF أو أزراراً، والإرسال يتم بفواصل عشوائية تحمي رقمك من الحظر، مع تتبع الردود وإعادة إرسال الفاشل.' },
      more: [
        { title: 'قوالب Meta و WhatsApp Flows', desc: 'أنشئ القوالب وأرسلها للاعتماد من داخل المنصة، ابدأ من 7 قوالب جاهزة، وصمّم نماذج للحجز والاستبيانات وجمع العملاء.' },
        { title: 'روبوت رد آلي', desc: 'قواعد بالكلمات المفتاحية تعمل على مدار الساعة، تستجيب لضغطات الأزرار والقوائم، ويمكن ربطها بحملة محددة.' },
        { title: 'رموز التحقق OTP', desc: 'أرسل رمزاً من 6 أرقام وتحقق منه بطلب API واحد، مع حماية مدمجة من الإساءة.' }
      ],
      api: {
        title: 'API و Webhooks للمطورين',
        desc: 'واجهة REST موثّقة بمفاتيح آمنة لإرسال الرسائل والوسائط والقوالب من نظامك أو ERP، وإشعارات فورية بالرسائل الواردة وحالات التسليم والقراءة، مع إعادة محاولة تلقائية.',
        sample: 'تم شحن طلبك وسيصلك اليوم 🚚'
      }
    },
    cta: {
      title: 'جاهز لتنظيم خدمة عملائك على واتساب؟',
      subtitle: 'أنشئ حسابك مجاناً واربط رقمك خلال دقائق.',
      primary: 'ابدأ مجاناً'
    },
    footer: { desc: 'منصة واتساب متكاملة للأعمال: صندوق وارد مشترك، تذاكر دعم، فرق وشيفتات، حملات رسمية، ورموز تحقق وواجهة API.' }
  },
  en: {
    nav: { how: 'How it works', features: 'Customer service', campaigns: 'Campaigns', pricing: 'Pricing', signIn: 'Sign In', start: 'Get Started' },
    hero: {
      badge: 'New: shared inbox, tickets, teams & shifts',
      titleStart: 'Turn your',
      titleHighlight: 'WhatsApp',
      titleEnd: 'conversations into organized customer service',
      subtitle: 'A shared inbox for all your numbers, a ticket for every chat routed automatically to the agent on shift, and a satisfaction rating with an AI summary on close. Plus official Meta campaigns, OTPs and a developer API.',
      points: ['Official WhatsApp Cloud API or quick QR connection', 'Automatic sync with Wakeel CRM', 'Full Arabic & English interface'],
      ctaPrimary: 'Start for Free',
      ctaSecondary: 'View Pricing'
    },
    mock: {
      title: 'Conversations',
      search: 'Search conversations...',
      threads: [
        { name: 'Ahmed Alsalem', initials: 'A', message: 'I paid for my order but got no confirmation', time: '10:42', tag: 'Complaint', tone: 'red', unread: 2, agent: 'Sarah' },
        { name: 'Noura Alqahtani', initials: 'N', message: 'Do you deliver to Jeddah?', time: '10:31', tag: 'VIP', tone: 'amber', unread: 1, agent: 'Mohammed' },
        { name: 'Alrayan Est.', initials: 'R', message: 'We need a quote for 50 units', time: '09:58', tag: 'Wholesale', tone: 'blue', unread: 0, agent: 'Khaled' },
        { name: 'Khaled Alotaibi', initials: 'K', message: 'Thank you 🌹', time: 'Yesterday', tag: '', tone: '', unread: 0, agent: 'Reem' }
      ],
      stage: 'Interested',
      category: 'Payments',
      assign: 'Assign',
      close: 'Close ticket',
      msgIn1: 'Hello, I paid for order #4821 yesterday and haven\'t received a confirmation',
      note: 'Internal note: bank transfer verified ✔ — Sarah',
      msgOut1: 'Hi Ahmed, your payment is confirmed and your order will arrive today 🚚',
      msgIn2: 'Great, thank you!',
      composer: 'Type a message... or / for quick replies',
      routeTitle: 'Auto-assigned to Sarah',
      routeMeta: 'Support team · on shift now',
      ratedTitle: 'Ticket TKT-1042 closed',
      ratedMeta: 'AI summary: payment confirmed, order shipped'
    },
    statuses: { open: 'Open', pending: 'Pending', resolved: 'Resolved', closed: 'Closed' },
    stats: [
      { value: '3', label: 'Conversation routing modes' },
      { value: '4', label: 'Statuses to track every ticket' },
      { value: '15', label: 'Team permissions' },
      { value: '10', label: 'Interactive message types' }
    ],
    how: {
      label: 'How it works',
      title: 'From the customer\'s message to their rating, in one clear loop',
      subtitle: 'Every conversation automatically becomes a ticket with an owner, a deadline and an outcome.',
      steps: [
        { title: 'Message arrives', desc: 'The customer\'s chat lands in real time in the shared inbox, from any of your numbers.' },
        { title: 'Auto-routed', desc: 'A ticket opens and is assigned to an on-shift agent of the team that owns the number.' },
        { title: 'Fast, organized replies', desc: 'Quick-reply shortcuts, internal notes, tags and a stage for every customer.' },
        { title: 'Rating & summary', desc: 'A satisfaction survey on close, and an AI summary of the chat sent to your CRM.' }
      ]
    },
    service: {
      label: 'Customer service',
      title: 'Everything your support and sales team needs',
      subtitle: 'Tools built for teams working on the same numbers together, with no overlaps and no lost chats.',
      inbox: {
        title: 'A shared inbox for all your numbers',
        desc: 'Every WhatsApp chat lands in real time on one screen your team works from together: filter by number, tag and stage, leave internal notes the customer never sees, use quick replies, and send voice notes and media.',
        chips: ['Internal notes', 'Quick replies', 'Voice notes', 'Colored tags', 'Sales & booking pipelines', 'Filter by number']
      },
      tickets: {
        title: 'Tickets managed inside the chat',
        desc: 'A ticket opens automatically with the first message, with a category and unique number. It\'s assigned to the first agent who replies, reopens when the customer comes back, and closes automatically after 12 to 72 hours of inactivity.'
      },
      routing: {
        title: 'Teams, shifts & smart routing',
        desc: 'Link each number to a team, define shifts and working days, and route chats only to agents on duty, sending returning customers back to the same agent.',
        modes: ['Round-robin', 'Least busy', 'Manual']
      },
      csat: {
        title: 'Customer satisfaction ratings',
        desc: 'An automatic survey after a ticket closes. The rating is saved on the ticket and sent to your CRM, so you know how satisfied customers are with every agent.',
        formats: ['Interactive star list', 'Quick buttons', 'Text reply'],
        question: 'How would you rate your experience with us?',
        options: ['Excellent', 'Very good', 'Good']
      },
      more: [
        { title: 'Conversation privacy', desc: 'Decide what each agent sees: every conversation, their team\'s conversations, or only those assigned to them, plus 15 adjustable permissions.' },
        { title: 'AI summary for every ticket', desc: 'When a ticket closes, AI summarizes the issue and its resolution in two lines and sends it to your CRM.' },
        { title: 'Synced with Wakeel CRM', desc: 'The customer is created in your CRM automatically, and tickets, summaries and ratings are synced to their profile.' }
      ]
    },
    campaigns: {
      label: 'Campaigns & messaging',
      title: 'Reach thousands of customers, officially and safely',
      subtitle: 'Pick the connection that suits you, launch personalized campaigns and follow their results live.',
      modes: {
        qr: { title: 'Quick QR connection', desc: 'Scan from your phone and start sending right away.', points: ['Campaigns from Excel / CSV files', 'Keyword auto-reply bot', 'Interactive buttons & lists'] },
        meta: { title: 'Official WhatsApp Cloud API', badge: 'Official · Meta', desc: 'Full stability, ban protection and Green Tick eligibility.', points: ['Official signup in about two minutes', 'Multiple numbers & a shared inbox', 'Approved templates & WhatsApp Flows'] }
      },
      meta: {
        title: 'Official WhatsApp campaigns via Meta',
        desc: 'Campaigns with Meta-approved templates: personal variables for every customer from an Excel file or a contact group, send now or schedule, and track sent, read and failed counts, within Meta\'s daily limits and with clear pricing per category.',
        chips: ['Approved templates', 'Personal variables', 'Scheduled sending', 'Meta daily limits'],
        campaignName: 'Weekend offer campaign',
        stats: [
          { label: 'Sent', value: '1,730', percent: 100 },
          { label: 'Read', value: '1,284', percent: 74 },
          { label: 'Failed', value: '38', percent: 2 }
        ]
      },
      qr: { title: 'Campaigns over QR', desc: 'Upload an Excel file or pick a group, add an image, PDF or buttons, and messages go out at random intervals to protect your number from bans, with reply tracking and one-click retry for failures.' },
      more: [
        { title: 'Meta templates & WhatsApp Flows', desc: 'Create templates and submit them for approval in-app, start from 7 ready-made ones, and build Flows for bookings, surveys and lead capture.' },
        { title: 'Auto-reply bot', desc: 'Keyword rules that work around the clock, respond to button taps and list picks, and can be tied to a specific campaign.' },
        { title: 'OTP verification', desc: 'Send a 6-digit code and verify it with a single API call, with built-in abuse protection.' }
      ],
      api: {
        title: 'API & webhooks for developers',
        desc: 'A documented REST API with secure keys to send messages, media and templates from your system or ERP, plus instant webhooks for incoming messages and delivery and read receipts, with automatic retries.',
        sample: 'Your order #4821 has shipped 🚚'
      }
    },
    cta: {
      title: 'Ready to organize your customer service on WhatsApp?',
      subtitle: 'Create your free account and connect your number in minutes.',
      primary: 'Start for Free'
    },
    footer: { desc: 'An all-in-one WhatsApp business platform: shared inbox, support tickets, teams & shifts, official campaigns, OTPs and a developer API.' }
  }
}

const c = computed(() => copy[locale.value] || copy.en)

const toggleLanguage = () => {
  const newLang = locale.value === 'en' ? 'ar' : 'en'
  setLanguage(newLang)
}

onMounted(() => {
  fetchPlans()
})

const fetchPlans = async () => {
  try {
    const res = await axios.get('/api/plans')
    if (res.data && res.data.data) {
      const activePlans = res.data.data.filter(p => p.isActive)
      // Already sorted by backend on sortOrder
      pricingPlans.value = activePlans.map(p => {
        let parsedFeaturesAr = []
        let parsedFeaturesEn = []
        try { parsedFeaturesAr = JSON.parse(p.featuresAr || '[]') } catch (e) {}
        try { parsedFeaturesEn = JSON.parse(p.featuresEn || '[]') } catch (e) {}

        return {
          id: p.planCode.toLowerCase(),
          nameAr: p.nameAr || p.name,
          nameEn: p.nameEn || p.name,
          price: p.price,
          limit: p.limit === 0 || p.limit > 100000 ? 'Unlimited/Custom' : p.limit.toString(),
          isPopular: p.isPopular,
          buttonTextAr: p.buttonTextAr,
          buttonTextEn: p.buttonTextEn,
          featuresArList: parsedFeaturesAr,
          featuresEnList: parsedFeaturesEn
        }
      })
    }
  } catch (error) {
    console.error('Failed to load plans:', error)
  }
}
</script>

<style scoped>
/* Root Styling */
.landing-page {
  background-color: #0B1121; /* Deeper slate for premium feel */
  color: #F8FAFC;
  min-height: 100vh;
  font-family: 'Tajawal', 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
  position: absolute;
  top: 0; left: 0; right: 0;
  width: 100%;
  line-height: 1.6;
}
.landing-page[dir="rtl"] {
  font-family: 'Tajawal', system-ui, sans-serif;
}
.landing-page[dir="rtl"] .flip-rtl { transform: scaleX(-1); }

/* Base Utility Classes */
.section-container { max-width: 1200px; margin: 0 auto; padding: 6rem 2rem; }
.section-header { text-align: center; margin-bottom: 4rem; max-width: 760px; margin-left: auto; margin-right: auto; }
.section-label {
  display: inline-block; padding: 0.5rem 1rem;
  background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);
  color: #34D399; border-radius: 999px; font-size: 0.9rem; font-weight: 700;
  margin-bottom: 1rem;
}
.section-title { font-size: clamp(1.9rem, 4vw, 2.6rem); font-weight: 900; letter-spacing: -1px; margin-bottom: 1rem; line-height: 1.3; }
.landing-page[dir="rtl"] .section-title { letter-spacing: 0; }
.section-subtitle { color: #94A3B8; font-size: 1.1rem; }

/* Navbar */
.landing-nav {
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: sticky; top: 0;
  background: rgba(11, 17, 33, 0.85); backdrop-filter: blur(16px);
  z-index: 100;
}
.nav-container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; }
.logo { display: flex; align-items: center; gap: 0.6rem; font-size: 1.3rem; font-weight: 900; color: #FFFFFF; text-decoration: none; }
.logo-mark { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; font-size: 1.25rem; box-shadow: 0 8px 20px -6px rgba(37, 211, 102, 0.5); }
.logo-accent { color: #FF6600; }
.nav-links { display: flex; gap: 1.75rem; }
.nav-links a { color: #94A3B8; font-weight: 600; text-decoration: none; transition: 0.2s; }
.nav-links a:hover { color: #FFFFFF; }
.nav-actions { display: flex; align-items: center; gap: 1rem; }
.lang-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #e2e8f0; padding: 0.4rem 0.6rem; border-radius: 8px; cursor: pointer; transition: 0.2s; display:flex; align-items:center; }
.lang-btn:hover { background: rgba(255,255,255,0.1); }
.btn-ghost { color: #94A3B8; font-weight: 600; text-decoration: none; transition: 0.2s; }
.btn-ghost:hover { color: #FFFFFF; }
.btn-primary { background: #FF6600; color: #fff; padding: 0.6rem 1.25rem; border-radius: 999px; font-weight: 700; text-decoration: none; transition: 0.3s; box-shadow: 0 4px 15px rgba(255, 102, 0, 0.3); display: flex; align-items: center; gap: 0.5rem; }
.btn-primary:hover { background: #E65C00; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 102, 0, 0.4); }
.btn-secondary { background: rgba(255,255,255,0.05); color: #fff; padding: 0.6rem 1.25rem; border-radius: 999px; font-weight: 700; text-decoration: none; transition: 0.3s; border: 1px solid rgba(255,255,255,0.1); }
.btn-secondary:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
.btn-large { padding: 0.8rem 2rem; font-size: 1.1rem; }

/* Hero Section */
.hero-section { position: relative; padding: 5rem 2rem 6rem; overflow: hidden; min-height: 85vh; display: flex; align-items: center; }
.glow-orb { position: absolute; width: 600px; height: 600px; filter: blur(120px); border-radius: 50%; opacity: 0.15; z-index: 0; pointer-events: none; }
.glow-top-left { background: #FF6600; top: -20%; left: -10%; }
.glow-bottom-right { background: #10B981; bottom: -20%; right: -10%; }
.hero-container { max-width: 1200px; width: 100%; margin: 0 auto; display: grid; grid-template-columns: 1fr 1.1fr; gap: 4rem; align-items: center; position: relative; z-index: 1; }

/* Hero Text */
.badge-pill { display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.05); padding: 6px 16px; border-radius: 999px; font-size: 0.85rem; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 1.5rem; }
.badge-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 10px #10B981; }
.hero-title { font-size: clamp(2.3rem, 4.6vw, 3.6rem); font-weight: 950; line-height: 1.35; margin-bottom: 1.5rem; letter-spacing: -1px; }
.landing-page[dir="rtl"] .hero-title { letter-spacing: 0; }
.text-gradient { background: linear-gradient(135deg, #25D366 0%, #86EFAC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; padding: 0.1em 0; }
.hero-subtitle { font-size: 1.15rem; color: #94A3B8; margin-bottom: 1.5rem; max-width: 95%; }
.hero-points { list-style: none; padding: 0; margin: 0 0 2.25rem; display: grid; gap: 0.6rem; }
.hero-points li { display: flex; align-items: center; gap: 0.6rem; font-weight: 600; color: #E2E8F0; }
.hero-points i { color: #34D399; }
.hero-cta-group { display: flex; gap: 1rem; flex-wrap: wrap; }

/* Hero inbox mockup */
.hero-visual { position: relative; padding: 2rem 0; }
.app-window { background: #fff; color: #0F172A; border-radius: 18px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 40px 80px -30px rgba(0,0,0,0.7); font-size: 12px; line-height: 1.5; text-align: start; }
.window-bar { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
.dots { display: flex; gap: 6px; }
.dots i { width: 10px; height: 10px; border-radius: 50%; background: #FF5F57; }
.dots i:nth-child(2) { background: #FEBC2E; }
.dots i:nth-child(3) { background: #28C840; }
.window-url { flex: 1; max-width: 260px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 4px 10px; border-radius: 8px; background: #fff; border: 1px solid #E2E8F0; color: #64748B; font-size: 10.5px; direction: ltr; white-space: nowrap; overflow: hidden; }
.window-url i { color: #16A34A; font-size: 9px; }
.inbox { display: grid; grid-template-columns: 38% 1fr; height: 430px; }
.threads { border-inline-end: 1px solid #E2E8F0; display: flex; flex-direction: column; min-width: 0; }
.threads-head { padding: 12px; display: grid; gap: 8px; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
.search { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; background: #F1F5F9; color: #94A3B8; font-size: 11px; white-space: nowrap; overflow: hidden; }
.thread { display: flex; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #F8FAFC; border-inline-start: 3px solid transparent; }
.thread.active { background: #FFF7ED; border-inline-start-color: #FF6600; }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; color: #fff; font-weight: 800; font-size: 12px; }
.thread-body { flex: 1; min-width: 0; display: block; }
.thread-top { display: flex; justify-content: space-between; gap: 6px; }
.thread-top b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread-top small { color: #94A3B8; font-size: 10px; flex-shrink: 0; }
.thread-msg { display: block; color: #64748B; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread-meta { display: flex; align-items: center; gap: 5px; margin-top: 5px; }
.tag { font-size: 9.5px; font-weight: 700; padding: 1px 7px; border-radius: 100px; white-space: nowrap; }
.tag-red { background: #FEF2F2; color: #DC2626; }
.tag-amber { background: #FFFBEB; color: #D97706; }
.tag-blue { background: #EFF6FF; color: #2563EB; }
.agent { font-size: 9.5px; color: #64748B; font-weight: 600; white-space: nowrap; }
.agent i { font-size: 8px; }
.unread { margin-inline-start: auto; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; display: grid; place-items: center; background: #25D366; color: #fff; font-size: 10px; font-weight: 800; }
.chat { display: flex; flex-direction: column; min-width: 0; background-color: #EFE7DE; }
.chat-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #fff; border-bottom: 1px solid #E2E8F0; }
.chat-head b { display: block; font-size: 12.5px; }
.chat-head small { display: block; color: #94A3B8; font-size: 10px; }
.stage { margin-inline-start: auto; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 100px; background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
.ticket-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 7px 14px; background: #FFF7ED; border-bottom: 1px solid #FED7AA; font-size: 10.5px; }
.ticket-id { font-family: ui-monospace, Menlo, monospace; font-weight: 800; color: #C2410C; }
.ticket-cat { color: #9A3412; font-weight: 600; }
.ticket-actions { display: flex; gap: 6px; margin-inline-start: auto; }
.mini-btn { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #334155; white-space: nowrap; }
.mini-btn.danger { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
.status { font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 100px; border: 1px solid transparent; white-space: nowrap; }
.status-open { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
.status-pending { background: #FFFBEB; color: #B45309; border-color: #FDE68A; }
.status-resolved { background: #ECFDF5; color: #047857; border-color: #A7F3D0; }
.status-closed { background: #F1F5F9; color: #475569; border-color: #E2E8F0; }
.messages { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 14px; overflow: hidden; background-image: radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1px); background-size: 14px 14px; }
.msg { max-width: 78%; padding: 7px 10px 5px; border-radius: 10px; font-size: 11.5px; color: #111B21; box-shadow: 0 1px 1px rgba(0,0,0,0.06); }
.msg small { display: block; text-align: end; font-size: 9.5px; color: #667781; }
.msg small i { color: #53BDEB; }
.msg-in { align-self: flex-start; background: #fff; border-start-start-radius: 3px; }
.msg-out { align-self: flex-end; background: #D9FDD3; border-start-end-radius: 3px; }
.note { align-self: center; max-width: 90%; display: flex; gap: 6px; padding: 7px 10px; border-radius: 10px; background: #FEF9C3; border: 1px dashed #EAB308; color: #713F12; font-size: 11px; font-weight: 600; }
.note i { margin-top: 3px; font-size: 9px; }
.typing { align-self: flex-start; display: flex; gap: 4px; padding: 10px 12px; border-radius: 10px; background: #fff; }
.typing i { width: 6px; height: 6px; border-radius: 50%; background: #94A3B8; animation: typing 1.2s ease-in-out infinite; }
.typing i:nth-child(2) { animation-delay: 0.15s; }
.typing i:nth-child(3) { animation-delay: 0.3s; }
.composer { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #F0F2F5; color: #54656F; font-size: 14px; }
.composer-input { flex: 1; min-width: 0; padding: 7px 10px; border-radius: 8px; background: #fff; color: #94A3B8; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.send { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: #25D366; color: #fff; font-size: 12px; flex-shrink: 0; }
.floating-card { position: absolute; z-index: 5; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 18px; background: rgba(12, 22, 17, 0.9); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(12px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.6); white-space: nowrap; }
.floating-card b { display: block; font-size: 0.9rem; }
.floating-card small { display: block; color: #9CA3AF; font-size: 0.75rem; }
.floating-icon { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; }
.floating-icon.green { background: rgba(37, 211, 102, 0.15); color: #4ADE80; }
.floating-icon.amber { background: rgba(251, 191, 36, 0.15); color: #FBBF24; }
.stars { color: #FBBF24; letter-spacing: 1px; }
.card-route { top: -4px; inset-inline-start: -28px; }
.card-rated { bottom: -6px; inset-inline-end: -28px; }

/* Stats Banner */
.stats-banner { background: #1E293B; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); }
.stats-container { max-width: 1200px; margin: 0 auto; padding: 3rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 2rem; }
.stat-item { text-align: center; flex: 1; min-width: 150px; }
.stat-item h3 { font-size: 2.5rem; font-weight: 900; color: #FF6600; margin-bottom: 0.2rem; }
.stat-item p { color: #94A3B8; font-weight: 600; font-size: 1rem; }
.stat-divider { width: 1px; height: 50px; background: rgba(255,255,255,0.1); }

/* Workflow */
.workflow-section { background: #0B1121; }
.workflow-grid { display: flex; justify-content: space-between; align-items: stretch; gap: 1rem; }
.step-card { flex: 1; text-align: center; padding: 2rem 1.5rem; background: rgba(255,255,255,0.02); border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); transition: 0.3s; }
.step-card:hover { background: rgba(255,255,255,0.05); transform: translateY(-5px); }
.step-icon-wrap { width: 80px; height: 80px; margin: 0 auto 1.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; color: #10B981; font-size: 1.7rem; }
.step-number { position: absolute; top: -5px; right: -5px; width: 28px; height: 28px; background: #FF6600; color: white; border-radius: 50%; font-weight: bold; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; border: 3px solid #0B1121; }
.step-card h3 { font-size: 1.25rem; margin-bottom: 0.75rem; color: #FFF; }
.step-card p { color: #94A3B8; font-size: 0.95rem; }
.step-arrow { color: #334155; display: flex; align-items: center; }

/* Features Bento Grid */
.features-section { background: rgba(0,0,0,0.15); }
.campaigns-section { background: #0B1121; }
.bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.bento-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 2rem; overflow: hidden; display: flex; flex-direction: column; transition: 0.3s; position: relative; }
.bento-card:hover { border-color: rgba(37, 211, 102, 0.3); background: rgba(255,255,255,0.05); transform: translateY(-4px); }
.bento-card.featured { background: radial-gradient(100% 70% at 0% 0%, rgba(37, 211, 102, 0.18), transparent 55%), linear-gradient(180deg, #0D1F17, #0A1712); border-color: rgba(37, 211, 102, 0.22); }
.landing-page[dir="rtl"] .bento-card.featured { background: radial-gradient(100% 70% at 100% 0%, rgba(37, 211, 102, 0.18), transparent 55%), linear-gradient(180deg, #0D1F17, #0A1712); }
.bento-icon { width: 56px; height: 56px; background: rgba(37, 211, 102, 0.12); color: #34D399; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; font-size: 1.4rem; }
.bento-icon.solid-green { background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; }
.bento-card h3 { font-size: 1.3rem; color: #FFF; margin-bottom: 0.75rem; }
.bento-card p { color: #94A3B8; margin-bottom: 1.5rem; flex: 1; }
.bento-large { grid-column: span 1; grid-row: span 2; }
.bento-large-horizontal { grid-column: span 2; flex-direction: row; align-items: center; gap: 2rem; padding: 2.5rem; }
.bento-full { grid-column: 1 / -1; flex-direction: row; align-items: center; gap: 2rem; padding: 2.5rem; }
.bento-content-side { flex: 1; display: flex; flex-direction: column; }
.bento-visual-side { flex: 1; background: #0F172A; border-radius: 20px; padding: 1.75rem; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 1rem; }
.mock-message { padding: 12px 16px; border-radius: 12px; font-size: 0.9rem; max-width: 90%; }
.user-msg { background: #1E293B; color: #F8FAFC; align-self: flex-end; border-bottom-right-radius: 4px; }
.landing-page[dir="rtl"] .user-msg { align-self: flex-start; border-bottom-left-radius: 4px; border-bottom-right-radius: 12px; }
.bot-msg { background: rgba(16, 185, 129, 0.1); color: #34D399; align-self: flex-start; border-bottom-left-radius: 4px; }
.landing-page[dir="rtl"] .bot-msg { align-self: flex-end; border-bottom-right-radius: 4px; border-bottom-left-radius: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #E5E7EB; font-size: 0.82rem; font-weight: 700; }
.chip i { color: #34D399; font-size: 0.75rem; }
.mini-threads { margin-top: auto; border-radius: 18px; overflow: hidden; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); }
.mini-thread { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
.mini-thread + .mini-thread { border-top: 1px solid rgba(255,255,255,0.06); }
.mini-body { flex: 1; min-width: 0; }
.mini-body b { display: block; font-size: 0.9rem; }
.mini-body small { display: block; color: #9CA3AF; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lifecycle { display: flex; flex-wrap: wrap; gap: 6px; }
.lifecycle .status { font-size: 0.78rem; padding: 4px 10px; }
.survey-options { display: grid; gap: 6px; align-self: stretch; }
.survey-option { padding: 8px 12px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #E2E8F0; font-size: 0.85rem; font-weight: 600; }
.survey-option .stars { font-size: 0.8rem; margin-inline-end: 6px; direction: ltr; display: inline-block; }

/* Connection modes */
.modes { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem; }
.mode { padding: 1.75rem; border-radius: 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
.mode.official { background: linear-gradient(160deg, rgba(37, 211, 102, 0.14), rgba(37, 211, 102, 0.02)); border-color: rgba(37, 211, 102, 0.3); }
.mode-head { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-weight: 800; font-size: 1.15rem; margin-bottom: 0.5rem; }
.mode-head i { color: #34D399; }
.mode-badge { font-size: 0.75rem; padding: 3px 10px; border-radius: 100px; background: #25D366; color: #052E16; }
.mode p { color: #94A3B8; margin-bottom: 1rem; }
.mode ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.mode li { display: flex; align-items: center; gap: 0.5rem; color: #E5E7EB; font-weight: 600; font-size: 0.95rem; }
.mode li i { color: #34D399; font-size: 0.8rem; }

/* Campaign stats visual */
.campaign-name { font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; }
.campaign-name i { color: #34D399; }
.campaign-row { display: grid; gap: 6px; }
.campaign-row-head { display: flex; justify-content: space-between; color: #CBD5E1; font-size: 0.88rem; font-weight: 600; }
.campaign-row-head b { color: #fff; }
.bar { height: 8px; border-radius: 8px; background: rgba(255,255,255,0.08); overflow: hidden; }
.bar span { display: block; height: 100%; border-radius: 8px; background: linear-gradient(90deg, #25D366, #86EFAC); }

/* API code sample */
.code { flex: 1.1; margin: 0; padding: 1.5rem; border-radius: 18px; background: #0F172A; border: 1px solid rgba(255,255,255,0.06); color: #CBD5E1; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85rem; line-height: 1.7; overflow-x: auto; text-align: left; white-space: pre; }
.code-method { color: #34D399; font-weight: 700; }
.code-key { color: #93C5FD; }
.code-str { color: #FDBA74; }

/* Pricing */
.pricing-section { background: rgba(0,0,0,0.2); }
.pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; align-items: stretch; justify-content: center; max-width: 1200px; margin: 0 auto; }
.price-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 3rem 2rem; position: relative; transition: transform 0.3s; display: flex; flex-direction: column; height: 100%; }
.price-card.popular { background: rgba(255, 102, 0, 0.05); border-color: rgba(255, 102, 0, 0.3); transform: scale(1.05); box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #FF6600, #FF9900); color: white; padding: 4px 16px; border-radius: 999px; font-size: 0.85rem; font-weight: 700; box-shadow: 0 4px 10px rgba(255,102,0,0.3); }
.plan-name { font-size: 1.4rem; font-weight: 800; color: #FFFFFF; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px; }
.plan-price { font-size: 3.5rem; font-weight: 900; color: #FFFFFF; margin-bottom: 0.5rem; line-height: 1; }
.plan-period { font-size: 1.2rem; font-weight: 500; color: #94A3B8; display: none; }
.plan-desc { color: #94A3B8; font-size: 1rem; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
.plan-features { list-style: none; padding: 0; margin: 0 0 3rem 0; text-align: left; flex-grow: 1; }
.landing-page[dir="rtl"] .plan-features { text-align: right; }
.plan-features li { margin-bottom: 1.2rem; color: #E2E8F0; display: flex; align-items: flex-start; gap: 0.75rem; font-size: 1rem; }
.block-btn { display: block; width: 100%; text-align: center; padding: 1rem; font-size: 1.1rem; }

/* Final CTA */
.cta-band { padding: 0 2rem 6rem; }
.cta-inner { max-width: 1000px; margin: 0 auto; text-align: center; padding: 4rem 2rem; border-radius: 32px; background: radial-gradient(80% 120% at 50% 0%, rgba(37, 211, 102, 0.2), transparent 60%), #0F172A; border: 1px solid rgba(37, 211, 102, 0.2); }
.cta-inner h2 { font-size: clamp(1.7rem, 3.5vw, 2.4rem); font-weight: 900; margin-bottom: 0.75rem; }
.cta-inner p { color: #94A3B8; font-size: 1.1rem; margin-bottom: 2rem; }
.cta-inner .hero-cta-group { justify-content: center; }

/* Footer */
.landing-footer { border-top: 1px solid rgba(255,255,255,0.05); padding: 4rem 2rem 2rem; background: #080C17; }
.footer-container { padding: 0; display: grid; grid-template-columns: 2fr 1fr; gap: 4rem; margin-bottom: 4rem; }
.footer-desc { color: #94A3B8; margin-top: 1.5rem; max-width: 420px; font-size: 1.05rem; }
.footer-links h4 { color: #FFF; font-size: 1.2rem; margin-bottom: 1.5rem; }
.footer-links a { display: block; color: #94A3B8; text-decoration: none; margin-bottom: 1rem; transition: 0.2s; }
.footer-links a:hover { color: #FF6600; }
.footer-bottom { text-align: center; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.05); color: #64748B; font-size: 0.9rem; }

/* Animations */
@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
@keyframes typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-3px); opacity: 1; } }
.float-anim { animation: float 5s ease-in-out infinite; }
.float-anim-delayed { animation: float 5s ease-in-out infinite 2.5s; }
@media (prefers-reduced-motion: reduce) {
  .float-anim, .float-anim-delayed, .typing i { animation: none; }
}

/* Responsive */
@media (max-width: 1100px) {
  .nav-links { display: none; }
}
@media (max-width: 992px) {
  .hero-container { grid-template-columns: 1fr; text-align: center; }
  .hero-subtitle { margin: 0 auto 1.5rem; }
  .hero-points { justify-items: center; }
  .hero-cta-group { justify-content: center; }
  .hero-visual { margin-top: 1rem; }
  .card-route { inset-inline-start: 0; }
  .card-rated { inset-inline-end: 0; }
  .bento-grid { grid-template-columns: 1fr; }
  .bento-large, .bento-large-horizontal, .bento-full { grid-column: span 1; grid-row: auto; }
  .bento-large-horizontal, .bento-full { flex-direction: column; align-items: stretch; }
  .modes { grid-template-columns: 1fr; }
  .workflow-grid { flex-direction: column; }
  /* Steps stack vertically: the arrow points down in both directions */
  .step-arrow { transform: rotate(90deg); margin: 0 auto; }
  .landing-page[dir="rtl"] .step-arrow .flip-rtl { transform: none; }
  .stat-divider { display: none; }
  .footer-container { grid-template-columns: 1fr; text-align: center; }
  .footer-desc { margin: 1.5rem auto 0; }
  .footer-brand .logo { justify-content: center; }
}
@media (max-width: 600px) {
  .nav-container { padding: 0 1rem; gap: 0.75rem; }
  .btn-ghost { display: none; }
  .logo { font-size: 1.05rem; white-space: nowrap; }
  .logo-mark { width: 30px; height: 30px; font-size: 1.05rem; }
  .nav-actions .btn-primary { white-space: nowrap; padding: 0.5rem 1rem; font-size: 0.9rem; }
  .section-container { padding: 4.5rem 1.25rem; }
  .hero-section { padding: 3rem 1.25rem 4rem; }
  .inbox { grid-template-columns: 1fr; height: 400px; }
  .threads { display: none; }
  .floating-card { padding: 10px 12px; }
  .floating-card b { font-size: 0.8rem; }
}
</style>
