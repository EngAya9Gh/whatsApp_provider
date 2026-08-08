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
        <p class="intro">مرحباً بك في منصة <strong>وكيل (Wakeel)</strong>. باستخدامك لمنصتنا لربط أعمالك عبر واتساب، فإنك توافق بشكل كامل على الشروط والأحكام التالية التي تنظم هذه العلاقة لحماية جميع الأطراف.</p>
        
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
          <p>نحن في وكيل نقدم "برمجية التوصيل والإدارة" كطرف تقني مزود للخدمة (Tech Provider). وبناءً عليه:</p>
          <ul>
            <li>نخلي مسؤوليتنا القانونية والتقنية في حال تعطلت خوادم شركة Meta أو واجهت انقطاعات في الخدمة.</li>
            <li>نخلي مسؤوليتنا إذا قامت Meta بحظر رقم هاتفك المرتبط بالخدمة نتيجة كثرة الشكاوى أو ارتفاع معدل الحظر (Block Rate) من قبل المستخدمين.</li>
            <li>لا نتحمل أي تعويضات ناتجة عن إيقاف حسابك من قبل Meta.</li>
          </ul>
        </section>

        <section>
          <h2>3. هيكلية الفوترة (Billing Structure)</h2>
          <p>بما أننا نعمل كمسار تقني (Tech Provider)، يرجى العلم بآلية الفوترة التالية:</p>
          <ul>
            <li>الرسوم التي تدفعها لمنصة وكيل (الاشتراكات الشهرية/السنوية) هي نظير <strong>الاستخدام البرمجي للمنصة وميزاتها فقط</strong>.</li>
            <li>تكلفة الرسائل الصادرة والواردة (المحادثات المفتوحة) <strong>تُدفع من قِبلك مباشرة لشركة Meta</strong> من خلال مدير الأعمال الخاص بك، ولا علاقة لمنصة وكيل بتسعيرتها أو تحصيلها.</li>
          </ul>
        </section>

        <section>
          <h2>4. حق إنهاء الخدمة</h2>
          <p>نحتفظ بحقنا الكامل في إغلاق أو تعليق حساب أي عميل داخل منصتنا فوراً وبدون تعويضات، في حال شكلت ممارساته أو استخدامه للخدمة خطراً على استقرار تطبيقنا المركزي لدى Meta، أو في حال اكتشاف استخدامات ضارة أو غير قانونية للمنصة.</p>
        </section>
      </template>

      <template v-else>
        <h1>Terms of Service</h1>
        <p class="intro">Welcome to <strong>Wakeel</strong>. By using our platform to connect your business via WhatsApp, you fully agree to the following terms and conditions that govern this relationship to protect all parties.</p>
        
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
          <p>At Wakeel, we provide "delivery and management software" as a technical service provider (Tech Provider). Accordingly:</p>
          <ul>
            <li>We disclaim all legal and technical responsibility if Meta's servers crash or face service interruptions.</li>
            <li>We disclaim responsibility if Meta blocks your phone number associated with the service due to frequent complaints or a high Block Rate from users.</li>
            <li>We do not bear any compensation resulting from the suspension of your account by Meta.</li>
          </ul>
        </section>

        <section>
          <h2>3. Billing Structure</h2>
          <p>Since we operate as a Tech Provider, please be aware of the following billing mechanism:</p>
          <ul>
            <li>The fees you pay to the Wakeel platform (monthly/annual subscriptions) are strictly for <strong>software usage of the platform and its features only</strong>.</li>
            <li>The cost of sent and received messages (conversations) is <strong>paid by you directly to Meta</strong> through your Business Manager, and Wakeel has no relation to its pricing or collection.</li>
          </ul>
        </section>

        <section>
          <h2>4. Right to Terminate Service</h2>
          <p>We retain our full right to close or suspend the account of any customer within our platform immediately and without compensation, if their practices or use of the service pose a risk to the stability of our central application at Meta, or if harmful or illegal uses of the platform are discovered.</p>
        </section>
      </template>

      <div class="legal-footer">
        {{ $i18n.locale === 'ar' ? 'آخر تحديث:' : 'Last updated:' }} {{ new Date().toLocaleDateString($i18n.locale === 'ar' ? 'ar-SA' : 'en-US') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.legal-page-container {
  min-height: 100vh;
  background-color: #f9fafb;
  font-family: 'Tajawal', 'Inter', sans-serif;
}
.legal-nav {
  background-color: white;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e5e7eb;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #FF6600;
  text-decoration: none;
  font-weight: 700;
}
.back-link:hover {
  text-decoration: underline;
}
.legal-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  color: #1f2937;
  line-height: 1.8;
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
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
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
  margin-bottom: 0.5rem;
}
.legal-footer {
  text-align: center;
  margin-top: 3rem;
  color: #6b7280;
  font-size: 0.9rem;
}
</style>
