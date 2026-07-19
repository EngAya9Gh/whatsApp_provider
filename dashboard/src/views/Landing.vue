<template>
  <div class="landing-page" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
    
    <!-- Navbar -->
    <nav class="landing-nav">
      <div class="nav-container">
        <div class="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6600" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          <span class="logo-text">Wakeel OTP</span>
        </div>
        <div class="nav-actions">
          <button class="lang-btn" @click="toggleLanguage">
            <svg v-if="$i18n.locale === 'en'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            <span v-else style="font-weight: 800; font-size: 1.1rem; line-height: 1;">ع</span>
          </button>
          <router-link to="/login" class="btn-ghost">{{ $i18n.locale === 'ar' ? 'تسجيل الدخول' : 'Sign In' }}</router-link>
          <router-link to="/register" class="btn-primary">{{ $i18n.locale === 'ar' ? 'ابدأ مجاناً' : 'Get Started' }}</router-link>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <header class="hero-section">
      <!-- Glow Effects -->
      <div class="glow-orb glow-top-left"></div>
      <div class="glow-orb glow-bottom-right"></div>

      <div class="hero-container">
        <!-- Hero Text -->
        <div class="hero-text-content">
          <div class="badge-pill">
            <span class="badge-dot"></span>
            {{ $i18n.locale === 'ar' ? 'الإصدار الجديد متاح الآن' : 'New Version Available' }}
          </div>
          <h1 class="hero-title">
            <template v-if="$i18n.locale === 'ar'">ارتقِ بتجربة عملائك عبر <span class="text-gradient">الواتساب</span> بذكاء واحترافية</template>
            <template v-else>Elevate your customer experience on <span class="text-gradient">WhatsApp</span></template>
          </h1>
          <p class="hero-subtitle">
            {{ $i18n.locale === 'ar' ? 'المنصة الأسرع والأكثر موثوقية لإرسال رسائل التحقق (OTP) والحملات التسويقية. اربط نظامك في ثوانٍ وانطلق.' : 'The fastest, most reliable platform for OTPs and marketing campaigns. Integrate your system in seconds and launch.' }}
          </p>
          <div class="hero-cta-group">
            <router-link to="/register" class="btn-primary btn-large">
              {{ $i18n.locale === 'ar' ? 'إنشاء حساب مجاني' : 'Start for Free' }}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="$i18n.locale === 'ar' ? 'transform: rotate(180deg)' : ''"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </router-link>
            <a href="#pricing" class="btn-secondary btn-large">
              {{ $i18n.locale === 'ar' ? 'عرض الباقات' : 'View Pricing' }}
            </a>
          </div>
        </div>

        <!-- Hero Visual (CSS Mockup) -->
        <div class="hero-visual">
          <div class="iphone-mockup">
            <div class="iphone-notch"></div>
            <div class="iphone-screen">
              <!-- App Header -->
              <div class="chat-header">
                <div class="chat-avatar">W</div>
                <div class="chat-info">
                  <strong>Wakeel OTP</strong>
                  <span>Bot</span>
                </div>
              </div>
              <!-- Chat Body -->
              <div class="chat-body">
                <div class="chat-date">{{ $i18n.locale === 'ar' ? 'اليوم' : 'Today' }}</div>
                
                <div class="chat-bubble bot fade-in-up" style="animation-delay: 0.5s">
                  <div class="bubble-text">
                    {{ $i18n.locale === 'ar' ? 'أهلاً بك في منصة وكيل! كود التحقق الخاص بك هو:' : 'Welcome to Wakeel! Your verification code is:' }}
                  </div>
                  <div class="otp-code">749201</div>
                  <div class="bubble-meta">10:42</div>
                </div>

                <div class="chat-bubble user fade-in-up" style="animation-delay: 1.5s">
                  <div class="bubble-text">{{ $i18n.locale === 'ar' ? 'شكراً لكم 👍' : 'Thank you 👍' }}</div>
                  <div class="bubble-meta">10:43 <span class="read-ticks">✓✓</span></div>
                </div>

                <div class="chat-bubble bot fade-in-up" style="animation-delay: 2.5s">
                  <div class="bubble-text">
                    {{ $i18n.locale === 'ar' ? '✨ لا تفوت عرض الصيف! خصم 50% على الباقة السنوية. هل ترغب بالاشتراك؟' : '✨ Don\'t miss our Summer Offer! 50% off annual plans. Subscribe now?' }}
                  </div>
                  <div class="bubble-buttons">
                    <button class="chat-btn">{{ $i18n.locale === 'ar' ? 'نعم، أريد الاشتراك' : 'Yes, Subscribe' }}</button>
                    <button class="chat-btn">{{ $i18n.locale === 'ar' ? 'تفاصيل أكثر' : 'More Details' }}</button>
                  </div>
                  <div class="bubble-meta">10:45</div>
                </div>
              </div>
            </div>
          </div>
          <!-- Floating elements around phone -->
          <div class="floating-badge badge-1 float-anim"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> {{ $i18n.locale === 'ar' ? 'تم التسليم' : 'Delivered' }}</div>
          <div class="floating-badge badge-2 float-anim-delayed"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg> {{ $i18n.locale === 'ar' ? 'توصيل فوري' : 'Instant' }}</div>
        </div>
      </div>
    </header>

    <!-- Trust / Stats Banner -->
    <section class="stats-banner">
      <div class="stats-container">
        <div class="stat-item">
          <h3>99.9%</h3>
          <p>{{ $i18n.locale === 'ar' ? 'استقرار المنصة' : 'Uptime Guarantee' }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <h3>&lt; 1s</h3>
          <p>{{ $i18n.locale === 'ar' ? 'سرعة الإرسال' : 'Delivery Speed' }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <h3>10M+</h3>
          <p>{{ $i18n.locale === 'ar' ? 'رسالة أرسلت' : 'Messages Sent' }}</p>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <h3>24/7</h3>
          <p>{{ $i18n.locale === 'ar' ? 'دعم فني متواصل' : 'Technical Support' }}</p>
        </div>
      </div>
    </section>

    <!-- Features Bento Grid Section -->
    <section id="features" class="features-section">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">{{ $i18n.locale === 'ar' ? 'مميزات استثنائية لأعمالك' : 'Exceptional Features for your Business' }}</h2>
        </div>
        
        <div class="bento-grid">
          <!-- Big Card 1 -->
          <div class="bento-card bento-large">
            <div class="bento-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF6600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
            <h3>{{ $i18n.locale === 'ar' ? 'حملات تسويقية ذكية' : 'Smart Marketing Campaigns' }}</h3>
            <p>{{ $i18n.locale === 'ar' ? 'ارفع ملف إكسل بآلاف الأرقام، أضف أزرار تفاعلية للرسالة، وأطلق حملتك التسويقية بضغطة زر مع نظام حماية ذكي ضد الحظر.' : 'Upload an Excel file with thousands of numbers, add interactive buttons, and launch campaigns with one click. Features anti-ban protection.' }}</p>
            <div class="bento-visual mockup-campaign">
              <div class="mock-btn">🔘 {{ $i18n.locale === 'ar' ? 'شراء الآن' : 'Buy Now' }}</div>
              <div class="mock-btn">🔘 {{ $i18n.locale === 'ar' ? 'تواصل معنا' : 'Contact Us' }}</div>
            </div>
          </div>

          <!-- Small Card 1 -->
          <div class="bento-card">
            <div class="bento-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
            <h3>{{ $i18n.locale === 'ar' ? 'توصيل فائق السرعة' : 'Lightning Fast Delivery' }}</h3>
            <p>{{ $i18n.locale === 'ar' ? 'بنية تحتية موزعة تضمن وصول رسائل التحقق (OTP) في أقل من ثانية واحدة.' : 'Distributed infrastructure ensures OTP messages are delivered in under 1 second.' }}</p>
          </div>

          <!-- Small Card 2 -->
          <div class="bento-card">
            <div class="bento-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
            <h3>{{ $i18n.locale === 'ar' ? 'API قوي وموثق' : 'Robust & Documented API' }}</h3>
            <p>{{ $i18n.locale === 'ar' ? 'توثيق برمجي شامل يسهل على المطورين ربط أنظمتهم بخدماتنا بسلاسة.' : 'Comprehensive documentation makes it easy for developers to integrate seamlessly.' }}</p>
          </div>

          <!-- Big Card 2 -->
          <div class="bento-card bento-large-horizontal">
            <div class="bento-content-side">
              <div class="bento-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></div>
              <h3>{{ $i18n.locale === 'ar' ? 'الرد الآلي (Auto Responder)' : 'Smart Auto-Responder' }}</h3>
              <p>{{ $i18n.locale === 'ar' ? 'قم بإعداد كلمات مفتاحية معينة ليرد عليها الواتساب تلقائياً برسائل مخصصة، صور، أو حتى ملفات PDF.' : 'Set up keyword triggers so your WhatsApp replies automatically with custom messages, images, or PDFs.' }}</p>
            </div>
            <div class="bento-visual-side mockup-auto-reply">
               <div class="mock-message user-msg">/أسعار</div>
               <div class="mock-message bot-msg">أهلاً بك! باقاتنا تبدأ من 19$ شهرياً 💳</div>
            </div>
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
            <h3 class="plan-name">{{ plan.name }}</h3>
            <div class="plan-price">${{ plan.price }}</div>
            <p class="plan-desc">{{ plan.limit }} {{ $i18n.locale === 'ar' ? 'رسالة' : 'Messages' }}</p>
            
            <ul class="plan-features">
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>{{ plan.limit }} {{ $i18n.locale === 'ar' ? 'رسالة' : 'Messages' }}</span>
              </li>
              <li v-for="(feat, idx) in plan.featuresList" :key="idx">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>{{ feat }}</span>
              </li>
            </ul>
            <router-link to="/register" :class="plan.isPopular ? 'btn-primary block-btn' : 'btn-secondary block-btn'">
              {{ $i18n.locale === 'ar' ? 'اشترك الآن' : 'Subscribe Now' }}
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="section-container footer-container">
        <div class="footer-brand">
          <div class="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6600" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span class="logo-text" style="font-size: 1.2rem;">Wakeel OTP</span>
          </div>
          <p class="footer-desc">
            {{ $i18n.locale === 'ar' ? 'الحل الأمثل لربط خدماتك بالواتساب وتفعيل التحقق الثنائي والحملات بكفاءة.' : 'The perfect solution to integrate your services with WhatsApp for OTPs and campaigns.' }}
          </p>
        </div>
        
        <div class="footer-links">
          <h4>{{ $i18n.locale === 'ar' ? 'روابط سريعة' : 'Quick Links' }}</h4>
          <a href="#features">{{ $i18n.locale === 'ar' ? 'المميزات' : 'Features' }}</a>
          <a href="#pricing">{{ $i18n.locale === 'ar' ? 'الأسعار' : 'Pricing' }}</a>
          <router-link to="/register">{{ $i18n.locale === 'ar' ? 'إنشاء حساب' : 'Sign Up' }}</router-link>
          <router-link to="/login">{{ $i18n.locale === 'ar' ? 'تسجيل الدخول' : 'Sign In' }}</router-link>
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
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

import { setLanguage } from '../i18n'

const { locale } = useI18n()
const pricingPlans = ref([])

const toggleLanguage = () => {
  const newLang = locale.value === 'en' ? 'ar' : 'en'
  setLanguage(newLang)
}

onMounted(async () => {
  try {
    const res = await axios.get('/api/plans')
    // We sort or use them directly. Assume backend sorts them by price.
    const plansData = res.data.data.map(p => {
      let parsedFeatures = []
      try { parsedFeatures = typeof p.features === 'string' ? JSON.parse(p.features) : p.features } catch(e){}
      return {
        id: p.planCode.toLowerCase(),
        name: p.name,
        price: p.price,
        limit: p.limit,
        isPopular: p.planCode === 'PRO' || p.planCode === 'STARTER',
        featuresList: parsedFeatures
      }
    })
    pricingPlans.value = plansData
  } catch (err) {
    console.error('Failed to fetch pricing plans')
  }
})
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

/* Base Utility Classes */
.section-container { max-width: 1200px; margin: 0 auto; padding: 6rem 2rem; }
.section-header { text-align: center; margin-bottom: 4rem; }
.section-label {
  display: inline-block; padding: 0.5rem 1rem;
  background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);
  color: #34D399; border-radius: 999px; font-size: 0.9rem; font-weight: 700;
  margin-bottom: 1rem;
}
.section-title { font-size: 2.5rem; font-weight: 900; letter-spacing: -1px; margin-bottom: 1rem; }

/* Navbar */
.landing-nav {
  padding: 1.25rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: sticky; top: 0;
  background: rgba(11, 17, 33, 0.85); backdrop-filter: blur(16px);
  z-index: 100;
}
.nav-container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; display: flex; justify-content: space-between; align-items: center; }
.logo { display: flex; align-items: center; gap: 0.5rem; font-size: 1.4rem; font-weight: 900; color: #FFFFFF; }
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
.hero-section { position: relative; padding: 6rem 2rem; overflow: hidden; min-height: 85vh; display: flex; align-items: center; }
.glow-orb { position: absolute; width: 600px; height: 600px; filter: blur(120px); border-radius: 50%; opacity: 0.15; z-index: 0; pointer-events: none; }
.glow-top-left { background: #FF6600; top: -20%; left: -10%; }
.glow-bottom-right { background: #10B981; bottom: -20%; right: -10%; }
.hero-container { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; position: relative; z-index: 1; }

/* Hero Text */
.badge-pill { display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.05); padding: 6px 16px; border-radius: 999px; font-size: 0.85rem; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 1.5rem; }
.badge-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 10px #10B981; }
.hero-title { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 950; line-height: 1.4; margin-bottom: 1.5rem; letter-spacing: -1px; }
.text-gradient { background: linear-gradient(135deg, #FF6600 0%, #FF9900 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; padding: 0.1em 0; }
.hero-subtitle { font-size: 1.25rem; color: #94A3B8; margin-bottom: 2.5rem; max-width: 90%; }
.hero-cta-group { display: flex; gap: 1rem; flex-wrap: wrap; }

/* CSS Mockup */
.hero-visual { position: relative; display: flex; justify-content: center; align-items: center; height: 600px; }
.iphone-mockup { width: 300px; height: 600px; background: #0F172A; border-radius: 48px; border: 12px solid #1E293B; box-shadow: 0 30px 60px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.5); position: relative; overflow: hidden; transform: perspective(1000px) rotateY(-15deg) rotateX(5deg); transition: transform 0.5s; }
.landing-page[dir="rtl"] .iphone-mockup { transform: perspective(1000px) rotateY(15deg) rotateX(5deg); }
.iphone-mockup:hover { transform: perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1.02); }
.iphone-notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 120px; height: 25px; background: #1E293B; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; z-index: 10; }
.iphone-screen { background: #E2E8F0; width: 100%; height: 100%; display: flex; flex-direction: column; }
.chat-header { background: #075E54; padding: 2.5rem 1rem 1rem; display: flex; align-items: center; gap: 10px; color: white; }
.chat-avatar { width: 36px; height: 36px; background: white; color: #075E54; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.chat-info strong { display: block; font-size: 1rem; line-height: 1.2; }
.chat-info span { font-size: 0.75rem; opacity: 0.8; }
.chat-body { flex: 1; padding: 1rem; display: flex; flex-direction: column; gap: 12px; background-image: url('data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Ccircle cx="2" cy="2" r="1" fill="%23cbd5e1" fill-opacity="0.4"/%3E%3C/svg%3E'); }
.chat-date { text-align: center; background: rgba(0,0,0,0.05); color: #64748B; font-size: 0.7rem; padding: 4px 10px; border-radius: 10px; align-self: center; margin-bottom: 8px; }
.chat-bubble { max-width: 85%; width: fit-content; padding: 10px; border-radius: 12px; font-size: 0.85rem; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,0.1); color: #1E293B; }
.chat-bubble.bot { background: white; align-self: flex-start; border-top-left-radius: 2px; }
.landing-page[dir="rtl"] .chat-bubble.bot { border-top-left-radius: 12px; border-top-right-radius: 2px; }
.chat-bubble.user { background: #DCF8C6; align-self: flex-end; border-top-right-radius: 2px; }
.landing-page[dir="rtl"] .chat-bubble.user { border-top-right-radius: 12px; border-top-left-radius: 2px; }
.otp-code { font-size: 1.5rem; font-weight: 900; letter-spacing: 2px; text-align: center; margin: 10px 0; color: #000; }
.bubble-meta { font-size: 0.65rem; color: #94A3B8; text-align: right; margin-top: 4px; display: flex; justify-content: flex-end; align-items: center; gap: 4px; }
.read-ticks { color: #3B82F6; font-size: 0.7rem; }
.bubble-buttons { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.chat-btn { background: #F1F5F9; border: none; padding: 6px; border-radius: 6px; color: #3B82F6; font-weight: 600; cursor: pointer; font-size: 0.8rem; }
.floating-badge { position: absolute; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 8px 16px; border-radius: 100px; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 700; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 20; }
.badge-1 { top: 20%; right: -20px; }
.badge-2 { bottom: 30%; left: -40px; }

/* Stats Banner */
.stats-banner { background: #1E293B; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); }
.stats-container { max-width: 1200px; margin: 0 auto; padding: 3rem 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 2rem; }
.stat-item { text-align: center; flex: 1; min-width: 150px; }
.stat-item h3 { font-size: 2.5rem; font-weight: 900; color: #FF6600; margin-bottom: 0.2rem; }
.stat-item p { color: #94A3B8; font-weight: 600; font-size: 1rem; }
.stat-divider { width: 1px; height: 50px; background: rgba(255,255,255,0.1); }

/* Workflow */
.workflow-section { background: #0B1121; }
.workflow-grid { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.step-card { flex: 1; text-align: center; padding: 2rem; background: rgba(255,255,255,0.02); border-radius: 24px; border: 1px solid rgba(255,255,255,0.05); transition: 0.3s; }
.step-card:hover { background: rgba(255,255,255,0.05); transform: translateY(-5px); }
.step-icon-wrap { width: 80px; height: 80px; margin: 0 auto 1.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; color: #10B981; }
.step-number { position: absolute; top: -5px; right: -5px; width: 28px; height: 28px; background: #FF6600; color: white; border-radius: 50%; font-weight: bold; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; border: 3px solid #0B1121; }
.step-card h3 { font-size: 1.3rem; margin-bottom: 1rem; color: #FFF; }
.step-card p { color: #94A3B8; font-size: 0.95rem; }
.step-arrow { color: #334155; }

/* Features Bento Grid */
.bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.bento-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 2rem; overflow: hidden; display: flex; flex-direction: column; transition: 0.3s; position: relative; }
.bento-card:hover { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); }
.bento-icon { width: 56px; height: 56px; background: rgba(255,255,255,0.05); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
.bento-card h3 { font-size: 1.4rem; color: #FFF; margin-bottom: 1rem; }
.bento-card p { color: #94A3B8; margin-bottom: 2rem; flex: 1; }
.bento-large { grid-column: span 1; grid-row: span 2; }
.bento-large-horizontal { grid-column: span 2; flex-direction: row; align-items: center; gap: 2rem; padding: 3rem; }
.bento-content-side { flex: 1; display: flex; flex-direction: column; }
.bento-visual { background: #1E293B; border-radius: 16px; padding: 1.5rem; margin-top: auto; border: 1px solid rgba(255,255,255,0.05); }
.mock-btn { background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 8px; color: #CBD5E1; display: flex; align-items: center; gap: 8px; }
.bento-visual-side { flex: 1; background: #0F172A; border-radius: 20px; padding: 2rem; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 1rem; }
.mock-message { padding: 12px 16px; border-radius: 12px; font-size: 0.9rem; max-width: 90%; }
.user-msg { background: #1E293B; color: #F8FAFC; align-self: flex-end; border-bottom-right-radius: 4px; }
.landing-page[dir="rtl"] .user-msg { align-self: flex-start; border-bottom-left-radius: 4px; border-bottom-right-radius: 12px; }
.bot-msg { background: rgba(16, 185, 129, 0.1); color: #34D399; align-self: flex-start; border-bottom-left-radius: 4px; }
.landing-page[dir="rtl"] .bot-msg { align-self: flex-end; border-bottom-right-radius: 4px; border-bottom-left-radius: 12px; }

/* Pricing */
.pricing-section { background: rgba(0,0,0,0.2); }
.pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; align-items: center; justify-content: center; max-width: 1000px; margin: 0 auto; }
.price-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 3rem 2rem; position: relative; transition: transform 0.3s; }
.price-card.popular { background: rgba(255, 102, 0, 0.05); border-color: rgba(255, 102, 0, 0.3); transform: scale(1.05); box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #FF6600, #FF9900); color: white; padding: 4px 16px; border-radius: 999px; font-size: 0.85rem; font-weight: 700; box-shadow: 0 4px 10px rgba(255,102,0,0.3); }
.plan-name { font-size: 1.4rem; font-weight: 800; color: #FFFFFF; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px; }
.plan-price { font-size: 3.5rem; font-weight: 900; color: #FFFFFF; margin-bottom: 0.5rem; line-height: 1; }
.plan-period { font-size: 1.2rem; font-weight: 500; color: #94A3B8; display: none; }
.plan-desc { color: #94A3B8; font-size: 1rem; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
.plan-features { list-style: none; padding: 0; margin: 0 0 3rem 0; text-align: left; }
.landing-page[dir="rtl"] .plan-features { text-align: right; }
.plan-features li { margin-bottom: 1.2rem; color: #E2E8F0; display: flex; align-items: flex-start; gap: 0.75rem; font-size: 1rem; }
.block-btn { display: block; width: 100%; text-align: center; padding: 1rem; font-size: 1.1rem; }

/* Footer */
.landing-footer { border-top: 1px solid rgba(255,255,255,0.05); padding: 4rem 2rem 2rem; background: #080C17; }
.footer-container { padding: 0; display: grid; grid-template-columns: 2fr 1fr; gap: 4rem; margin-bottom: 4rem; }
.footer-desc { color: #94A3B8; margin-top: 1.5rem; max-width: 400px; font-size: 1.05rem; }
.footer-links h4 { color: #FFF; font-size: 1.2rem; margin-bottom: 1.5rem; }
.footer-links a { display: block; color: #94A3B8; text-decoration: none; margin-bottom: 1rem; transition: 0.2s; }
.footer-links a:hover { color: #FF6600; }
.footer-bottom { text-align: center; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.05); color: #64748B; font-size: 0.9rem; }

/* Animations */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.fade-in-up { animation: fadeInUp 0.6s ease forwards; opacity: 0; }
@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
.float-anim { animation: float 4s ease-in-out infinite; }
.float-anim-delayed { animation: float 4s ease-in-out infinite 2s; }

/* Responsive */
@media (max-width: 992px) {
  .hero-container { grid-template-columns: 1fr; text-align: center; }
  .hero-subtitle { margin: 0 auto 2.5rem; }
  .hero-cta-group { justify-content: center; }
  .hero-visual { margin-top: 2rem; }
  .bento-grid { grid-template-columns: 1fr; }
  .bento-large, .bento-large-horizontal { grid-column: span 1; }
  .bento-large-horizontal { flex-direction: column; text-align: center; }
  .workflow-grid { flex-direction: column; }
  .step-arrow { transform: rotate(90deg); margin: 1rem 0; }
  .stat-divider { display: none; }
  .footer-container { grid-template-columns: 1fr; text-align: center; }
  .footer-desc { margin: 1.5rem auto 0; }
}
</style>
