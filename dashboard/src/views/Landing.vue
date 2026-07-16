<template>
  <div class="landing-page" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
    
    <!-- Navbar -->
    <nav class="landing-nav">
      <div class="nav-container">
        <div class="logo">
          <span class="logo-text">Wakeel OTP</span>
        </div>
        <div class="nav-actions">
          <!-- Language Switcher -->
          <button class="lang-btn" @click="toggleLanguage">
            {{ $i18n.locale === 'en' ? 'عربي' : 'EN' }}
          </button>
          
          <router-link to="/login" class="btn-ghost">{{ $i18n.locale === 'ar' ? 'تسجيل الدخول' : 'Sign In' }}</router-link>
          <router-link to="/register" class="btn-primary">{{ $i18n.locale === 'ar' ? 'إنشاء حساب' : 'Sign Up' }}</router-link>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <header class="hero-section">
      <div class="hero-bg-glow"></div>
      <div class="hero-content">
        <h1 class="hero-title">{{ $i18n.locale === 'ar' ? 'منصة التحقق عبر الواتساب الأسرع والأوفر' : 'The Fastest & Most Affordable WhatsApp OTP Platform' }}</h1>
        <p class="hero-subtitle">
          {{ $i18n.locale === 'ar' ? 'اربط تطبيقك أو موقعك بخدمة الواتساب في دقائق، وأرسل رسائل التحقق (OTP) والإشعارات لعملائك بأقل تكلفة ممكنة وبموثوقية تامة.' : 'Integrate your app or website with WhatsApp in minutes. Send OTPs and notifications to your customers with the lowest cost and highest reliability.' }}
        </p>
        <div class="hero-cta">
          <router-link to="/register" class="btn-primary btn-large">{{ $i18n.locale === 'ar' ? 'ابدأ مجاناً الآن' : 'Start for Free Now' }}</router-link>
          <a href="#features" class="btn-secondary btn-large">{{ $i18n.locale === 'ar' ? 'اكتشف المميزات' : 'Discover Features' }}</a>
        </div>
      </div>
    </header>

    <!-- Features Section -->
    <section id="features" class="features-section">
      <div class="section-container">
        <h2 class="section-title">{{ $i18n.locale === 'ar' ? 'لماذا تختار منصتنا؟' : 'Why Choose Our Platform?' }}</h2>
        <div class="features-grid">
          
          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <h3>{{ $i18n.locale === 'ar' ? 'توصيل فائق السرعة' : 'Lightning Fast Delivery' }}</h3>
            <p>{{ $i18n.locale === 'ar' ? 'يتم إرسال رسائل التحقق وتصل للمستخدمين في ثوانٍ معدودة بفضل بنيتنا التحتية الموزعة.' : 'OTP messages are delivered to users in seconds thanks to our distributed infrastructure.' }}</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">💰</div>
            <h3>{{ $i18n.locale === 'ar' ? 'تكلفة أقل بـ 80%' : '80% Lower Cost' }}</h3>
            <p>{{ $i18n.locale === 'ar' ? 'وداعاً لتكاليف رسائل الـ SMS الباهظة. استخدام الواتساب يوفر عليك مبالغ ضخمة شهرياً.' : 'Say goodbye to expensive SMS costs. Using WhatsApp saves you massive amounts monthly.' }}</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">🔒</div>
            <h3>{{ $i18n.locale === 'ar' ? 'حماية وأمان عالي' : 'High Security & Safety' }}</h3>
            <p>{{ $i18n.locale === 'ar' ? 'تشفير كامل للرسائل (End-to-end) وحماية للـ API Keys الخاصة بك بفضل خوادمنا الآمنة.' : 'End-to-end encryption and API Keys protection thanks to our highly secure servers.' }}</p>
          </div>

        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing-section">
      <div class="section-container">
        <h2 class="section-title">{{ $i18n.locale === 'ar' ? 'باقات تناسب جميع احتياجاتك' : 'Plans to fit all your needs' }}</h2>
        
        <div class="pricing-grid">
          
          <div v-for="plan in pricingPlans" :key="plan.id" :class="['price-card', { popular: plan.isPopular }]">
            <div v-if="plan.isPopular" class="popular-badge">{{ $i18n.locale === 'ar' ? 'الأكثر طلباً' : 'Most Popular' }}</div>
            <h3 class="plan-name">{{ plan.name }}</h3>
            <div class="plan-price">${{ plan.price }}<span>/mo</span></div>
            <p class="plan-desc">{{ plan.limit }} Messages / Month</p>
            
            <ul class="plan-features">
              <li>
                <span style="color: #10B981">✓</span>
                {{ plan.limit }} Messages
              </li>
              <li v-for="(feat, idx) in plan.featuresList" :key="idx">
                <span style="color: #10B981">✓</span>
                {{ feat }}
              </li>
            </ul>
            <router-link to="/register" :class="plan.isPopular ? 'btn-primary block-btn' : 'btn-secondary block-btn'">
              {{ $i18n.locale === 'ar' ? 'اختر الباقة' : 'Choose Plan' }}
            </router-link>
          </div>

        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-content">
        <div class="logo">
          <span class="logo-text">Wakeel OTP</span>
        </div>
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

const { locale } = useI18n()
const pricingPlans = ref([])

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'ar' : 'en'
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
/* Root Colors for Landing */
.landing-page {
  background-color: #0F172A;
  color: #E2E8F0;
  min-height: 100vh;
  font-family: 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
  position: absolute;
  top: 0; left: 0; right: 0;
  width: 100%;
}

/* Navbar */
.landing-nav {
  padding: 1.25rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: sticky;
  top: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  z-index: 100;
}
.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 800;
  color: #FFFFFF;
}
.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Buttons */
.btn-primary {
  background: #FF6600;
  color: #fff;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  display: inline-block;
  text-align: center;
}
.btn-primary:hover {
  background: #cc5200;
  transform: translateY(-1px);
}
.btn-secondary {
  background: rgba(255,255,255,0.05);
  color: #F8FAFC;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  border: 1px solid rgba(255,255,255,0.1);
  display: inline-block;
  text-align: center;
}
.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
}
.btn-ghost {
  color: #94A3B8;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}
.btn-ghost:hover {
  color: #FFFFFF;
}
.btn-large {
  padding: 0.875rem 2rem;
  font-size: 1.1rem;
}
.block-btn {
  display: block;
  width: 100%;
}
.lang-btn {
  background: rgba(255,255,255,0.07);
  border: none;
  color: #e2e8f0;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.lang-btn:hover { background: rgba(255,255,255,0.15); }

/* Hero Section */
.hero-section {
  position: relative;
  padding: 6rem 2rem;
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}
.hero-bg-glow {
  position: absolute;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(circle, rgba(255,102,0,0.15) 0%, transparent 60%);
  z-index: 0;
  border-radius: 50%;
  pointer-events: none;
}
.hero-content {
  position: relative;
  z-index: 1;
}
.hero-title {
  font-size: 3.5rem;
  font-weight: 900;
  color: #FFFFFF;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}
.hero-subtitle {
  font-size: 1.25rem;
  color: #94A3B8;
  line-height: 1.6;
  margin-bottom: 2.5rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}
.hero-cta {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Common Section */
.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 5rem 2rem;
}
.section-title {
  text-align: center;
  font-size: 2.25rem;
  font-weight: 800;
  color: #FFFFFF;
  margin-bottom: 3.5rem;
}

/* Features */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}
.feature-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  transition: transform 0.3s, background 0.3s;
}
.feature-card:hover {
  transform: translateY(-5px);
  background: rgba(255,255,255,0.05);
}
.feature-icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
}
.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 1rem;
}
.feature-card p {
  color: #94A3B8;
  line-height: 1.6;
}

/* Pricing */
.pricing-section {
  background: rgba(0,0,0,0.2);
}
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  align-items: center;
}
.price-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 2.5rem;
  position: relative;
  transition: transform 0.3s;
}
.price-card.popular {
  background: rgba(255, 102, 0, 0.05);
  border-color: rgba(255, 102, 0, 0.3);
  transform: scale(1.05);
}
.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #FF6600;
  color: white;
  padding: 0.25rem 1rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}
.plan-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 1rem;
}
.plan-price {
  font-size: 3rem;
  font-weight: 900;
  color: #FFFFFF;
  margin-bottom: 0.5rem;
}
.plan-price span {
  font-size: 1rem;
  font-weight: 500;
  color: #94A3B8;
}
.plan-desc {
  color: #94A3B8;
  font-size: 0.9rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 2.5rem 0;
  text-align: left;
}
.landing-page[dir="rtl"] .plan-features {
  text-align: right;
}
.plan-features li {
  margin-bottom: 1rem;
  color: #E2E8F0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Footer */
.landing-footer {
  border-top: 1px solid rgba(255,255,255,0.05);
  padding: 3rem 2rem;
  text-align: center;
}
.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.copyright {
  color: #64748B;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .hero-title { font-size: 2.5rem; }
  .price-card.popular { transform: none; }
  .hero-cta { flex-direction: column; }
  .hero-cta .btn-large { width: 100%; }
}
</style>
