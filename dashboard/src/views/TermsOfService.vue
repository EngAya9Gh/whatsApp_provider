<template>
  <div class="legal-page-container">
    <nav class="legal-nav">
      <router-link to="/" class="back-link">
        <svg v-if="$i18n.locale === 'ar'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 5 12 12 19"></polyline></svg>
        {{ $i18n.locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home' }}
      </router-link>
    </nav>
    <div class="legal-content" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">
      <template v-if="$i18n.locale === 'ar'">
        <h1>شروط الخدمة (Terms of Service)</h1>
        <p class="intro">مرحباً بك في منصة <strong>وكيل (Wakeel)</strong>، وهي منتج تابع لـ <strong>{{ COMPANY.legalName.ar }}</strong>. باستخدامك لمنصتنا لربط أعمالك عبر واتساب، فإنك توافق بشكل كامل على الشروط والأحكام التالية التي تنظم هذه العلاقة لحماية جميع الأطراف.</p>
        
        <section>
          <h2>1. الامتثال التام لسياسات Meta</h2>
          <p>يُلزم العميل بالخضوع التام لـ <strong>"سياسة واتساب للتجارة والأعمال"</strong>. استخدامك لمنصة وكيل يعني التزامك الكامل بما يلي:</p>
          <ul>
            <li>يمنع منعاً باتاً إرسال الرسائل المزعجة (Spam) للمستخدمين.</li>
            <li>يمنع الترويج للمنتجات والخدمات الممنوعة بموجب سياسات Meta (مثل التبغ، الأسلحة، العقاقير غير المرخصة، إلخ).</li>
            <li>أي انتهاك لهذه السياسات سيؤدي إلى <strong>إيقاف حسابك فوراً</strong> دون سابق إنذار.</li>
          </ul>
        </section>

        <section>
          <h2>2. حدود المسؤولية التقنية (Limitation of Liability)</h2>
          <p>نحن في وكيل نقدم "برمجية التوصيل والإدارة" كمزوّد خدمة تقنية يربط أعمالك بمنصة واتساب الرسمية. وبناءً عليه:</p>
          <ul>
            <li>نخلي مسؤوليتنا القانونية والتقنية في حال تعطلت خوادم شركة Meta أو واجهت انقطاعات في الخدمة.</li>
            <li>نخلي مسؤوليتنا إذا قامت Meta بحظر رقم هاتفك المرتبط بالخدمة نتيجة كثرة الشكاوى أو ارتفاع معدل الحظر (Block Rate) من قبل المستخدمين.</li>
            <li>لا نتحمل أي تعويضات ناتجة عن إيقاف حسابك من قبل Meta.</li>
          </ul>
        </section>

        <section>
          <h2>3. هيكلية الفوترة (Billing Structure)</h2>
          <p>بما أننا نقدم البرمجية فقط، يرجى العلم بآلية الفوترة التالية:</p>
          <ul>
            <li>الرسوم التي تدفعها لمنصة وكيل (الاشتراكات الشهرية/السنوية) هي نظير <strong>الاستخدام البرمجي للمنصة وميزاتها فقط</strong>.</li>
            <li>تكلفة الرسائل الصادرة والواردة (المحادثات المفتوحة) <strong>تُدفع من قِبلك مباشرة لشركة Meta</strong> من خلال مدير الأعمال الخاص بك، ولا علاقة لمنصة وكيل بتسعيرتها أو تحصيلها.</li>
          </ul>
        </section>

        <section>
          <h2>4. حق إنهاء الخدمة</h2>
          <p>نحتفظ بحقنا الكامل في إغلاق أو تعليق حساب أي عميل داخل منصتنا فوراً وبدون تعويضات، في حال شكلت ممارساته أو استخدامه للخدمة خطراً على استقرار تطبيقنا المركزي لدى Meta، أو في حال اكتشاف استخدامات ضارة أو غير قانونية للمنصة.</p>
        </section>

        <section>
          <h2>5. الجهة المشغّلة والتواصل</h2>
          <ul>
            <li><strong>الجهة:</strong> {{ COMPANY.legalName.ar }} ({{ COMPANY.legalName.en }})، سجل تجاري رقم {{ COMPANY.crNumber }}</li>
            <li><strong>العنوان:</strong> {{ COMPANY.address.ar }}</li>
            <li><strong>البريد الإلكتروني:</strong> <a :href="`mailto:${COMPANY.email}`" dir="ltr">{{ COMPANY.email }}</a></li>
            <li><strong>الهاتف:</strong> <a :href="`tel:${COMPANY.phone}`" dir="ltr">{{ COMPANY.phoneDisplay }}</a></li>
          </ul>
        </section>
      </template>

      <template v-else>
        <h1>Terms of Service</h1>
        <p class="intro">Welcome to <strong>Wakeel</strong>, a product of <strong>{{ COMPANY.legalName.en }}</strong>. By using our platform to connect your business via WhatsApp, you fully agree to the following terms and conditions that govern this relationship to protect all parties.</p>
        
        <section>
          <h2>1. Total Compliance with Meta Policies</h2>
          <p>The customer is obligated to fully submit to the <strong>"WhatsApp Commerce and Business Policy"</strong>. Your use of Wakeel means your full commitment to the following:</p>
          <ul>
            <li>Sending Spam messages to users is strictly prohibited.</li>
            <li>Promoting products and services prohibited under Meta's policies (e.g., tobacco, weapons, unlicensed drugs, etc.) is prohibited.</li>
            <li>Any violation of these policies will lead to <strong>immediate termination of your account</strong> without prior notice.</li>
          </ul>
        </section>

        <section>
          <h2>2. Limitation of Liability</h2>
          <p>At Wakeel, we provide "delivery and management software" as a technology service provider connecting your business to the official WhatsApp platform. Accordingly:</p>
          <ul>
            <li>We disclaim all legal and technical responsibility if Meta's servers crash or face service interruptions.</li>
            <li>We disclaim responsibility if Meta blocks your phone number associated with the service due to frequent complaints or a high Block Rate from users.</li>
            <li>We do not bear any compensation resulting from the suspension of your account by Meta.</li>
          </ul>
        </section>

        <section>
          <h2>3. Billing Structure</h2>
          <p>Since we provide the software only, please be aware of the following billing mechanism:</p>
          <ul>
            <li>The fees you pay to the Wakeel platform (monthly/annual subscriptions) are strictly for <strong>software usage of the platform and its features only</strong>.</li>
            <li>The cost of sent and received messages (conversations) is <strong>paid by you directly to Meta</strong> through your Business Manager, and Wakeel has no relation to its pricing or collection.</li>
          </ul>
        </section>

        <section>
          <h2>4. Right to Terminate Service</h2>
          <p>We retain our full right to close or suspend the account of any customer within our platform immediately and without compensation, if their practices or use of the service pose a risk to the stability of our central application at Meta, or if harmful or illegal uses of the platform are discovered.</p>
        </section>

        <section>
          <h2>5. Operator and Contact</h2>
          <ul>
            <li><strong>Operator:</strong> {{ COMPANY.legalName.en }} ({{ COMPANY.legalName.ar }}), Commercial Registration No. {{ COMPANY.crNumber }}</li>
            <li><strong>Address:</strong> {{ COMPANY.address.en }}</li>
            <li><strong>Email:</strong> <a :href="`mailto:${COMPANY.email}`">{{ COMPANY.email }}</a></li>
            <li><strong>Phone:</strong> <a :href="`tel:${COMPANY.phone}`">{{ COMPANY.phoneDisplay }}</a></li>
          </ul>
        </section>
      </template>

      <div class="legal-footer">
        {{ $i18n.locale === 'ar' ? 'آخر تحديث:' : 'Last updated:' }} {{ new Date(COMPANY.legalUpdated).toLocaleDateString($i18n.locale === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}
        <div class="legal-entity">{{ $i18n.locale === 'ar' ? COMPANY.legalName.ar : COMPANY.legalName.en }} · {{ $i18n.locale === 'ar' ? 'سجل تجاري' : 'CR' }} {{ COMPANY.crNumber }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { COMPANY } from '../data/company'
</script>

<style scoped>
.legal-page-container {
  min-height: 100vh;
  width: 100%;
  background-color: #0B1121;
  background-image: 
    radial-gradient(circle at 15% 20%, rgba(255, 102, 0, 0.12) 0%, transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.12) 0%, transparent 40%),
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
  font-family: 'Tajawal', 'Inter', sans-serif;
  padding-bottom: 4rem;
}
.legal-nav {
  background-color: rgba(11, 17, 33, 0.85);
  backdrop-filter: blur(16px);
  padding: 1.25rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: sticky;
  top: 0;
  z-index: 50;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #FF6600;
  text-decoration: none;
  font-weight: 700;
  transition: opacity 0.3s ease;
}
.back-link:hover {
  opacity: 0.8;
}
.legal-content {
  max-width: 900px;
  margin: 4rem auto 0;
  padding: 4rem 3.5rem;
  background: white;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(255, 102, 0, 0.05);
  color: #1f2937;
  line-height: 1.9;
  position: relative;
}
.legal-content h1 {
  font-size: 2.5rem;
  font-weight: 900;
  color: #111827;
  margin-bottom: 1.5rem;
  border-bottom: 3px solid #FF6600;
  display: inline-block;
  padding-bottom: 0.5rem;
}
.intro {
  font-size: 1.2rem;
  color: #4b5563;
  margin-bottom: 2.5rem;
}
.legal-content section {
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px dashed #e5e7eb;
}
.legal-content section:last-of-type {
  border-bottom: none;
}
.legal-content h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #374151;
  margin-bottom: 1rem;
}
.legal-content ul {
  padding-right: 1.5rem;
  margin-top: 0.5rem;
}
.legal-content[dir="ltr"] ul {
  padding-right: 0;
  padding-left: 1.5rem;
}
.legal-content li {
  margin-bottom: 0.75rem;
}
.legal-content a {
  color: #c2410c;
  font-weight: 600;
}
.legal-entity {
  margin-top: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: #9ca3af;
}
.legal-footer {
  text-align: center;
  margin-top: 3rem;
  color: #6b7280;
  font-size: 0.95rem;
  font-weight: 600;
}
@media (max-width: 768px) {
  .legal-content {
    margin: 2rem 1rem 0;
    padding: 2rem 1.5rem;
  }
}
</style>
