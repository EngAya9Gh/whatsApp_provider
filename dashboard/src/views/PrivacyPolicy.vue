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
        <h1>سياسة الخصوصية (Privacy Policy)</h1>
        <p class="intro">نحن في <strong>وكيل (Wakeel)</strong> نلتزم بحماية خصوصية بياناتك ومعلومات عملائك. تشرح هذه السياسة كيفية جمعنا واستخدامنا وتخزيننا للبيانات المتعلقة بخدماتنا، خصوصاً عند ربط حسابك بمنصة WhatsApp Cloud API.</p>

        <section>
          <h2>1. من نحن</h2>
          <p>منصة وكيل منتج تابع لـ <strong>{{ COMPANY.legalName.ar }}</strong> ({{ COMPANY.legalName.en }})، سجل تجاري رقم {{ COMPANY.crNumber }}، وهي الجهة المسؤولة عن البيانات التي تعالجها المنصة.</p>
          <ul>
            <li><strong>العنوان:</strong> {{ COMPANY.address.ar }}</li>
            <li><strong>البريد الإلكتروني:</strong> <a :href="`mailto:${COMPANY.email}`" dir="ltr">{{ COMPANY.email }}</a></li>
            <li><strong>الهاتف:</strong> <a :href="`tel:${COMPANY.phone}`" dir="ltr">{{ COMPANY.phoneDisplay }}</a></li>
          </ul>
        </section>

        <section>
          <h2>2. البيانات التي نجمعها</h2>
          <ul>
            <li><strong>بيانات حسابك في المنصة:</strong> الاسم، البريد الإلكتروني، اسم المنشأة وبياناتها الضريبية للفواتير، وبيانات أعضاء فريقك.</li>
            <li><strong>بيانات تسجيل الدخول عبر فيسبوك:</strong> عند ربط رقمك عبر نافذة Facebook الرسمية نحصل على اسمك وصورة ملفك الشخصي بحسب ما توافق عليه في تلك النافذة، دون أي صلاحية للنشر على فيسبوك.</li>
            <li><strong>المعرفات التقنية للربط:</strong> مفاتيح الربط (Access Tokens)، ومعرفات الأعمال في واتساب (WABA IDs و Phone Number IDs)، وأرقام الهواتف المرتبطة بالحساب.</li>
            <li><strong>بيانات المحادثات:</strong> نصوص الرسائل الصادرة والواردة، وبيانات عملائك الذين تتواصل معهم (مثل الأسماء والأرقام)، والوسائط المتبادلة (صور، مستندات، إلخ)، والملاحظات الداخلية لفريقك.</li>
          </ul>
        </section>

        <section>
          <h2>3. كيف نستخدم البيانات</h2>
          <p>نستخدم البيانات فقط لتقديم الخدمة التي تطلبها: إرسال واستقبال رسائل واتساب، وصندوق الوارد الموحد وأرشفة المحادثات، والتذاكر والتقارير، والأتمتة التي تفعّلها، والفوترة والدعم الفني. لا نبيع بياناتك ولا بيانات عملائك ولا نستخدمها للإعلان.</p>
        </section>

        <section>
          <h2>4. مشاركة البيانات مع أطراف أخرى</h2>
          <ul>
            <li><strong>Meta:</strong> تستخدم منصتنا واجهات <strong>WhatsApp Cloud API</strong> الرسمية، فتمر الرسائل الصادرة والواردة عبر خوادم شركة <strong>Meta</strong>، وتخضع لسياسة الخصوصية وشروط الاستخدام الخاصة بها.</li>
            <li><strong>Google (Gemini):</strong> عند استخدامك ميزات الذكاء الاصطناعي (ملخص المحادثة، اقتراح مرحلة العميل، الموظف الذكي) تُرسل نصوص المحادثة المعنية إلى خدمة Gemini من Google لمعالجتها. هذه الميزات اختيارية.</li>
            <li><strong>مزودو الاستضافة:</strong> خوادم المنصة مستضافة لدى <strong>Hostinger</strong> في ألمانيا، وتُخزّن المحادثات في قاعدة بيانات <strong>MongoDB Atlas</strong> (على Google Cloud في الهند). يعالجون البيانات نيابةً عنا لتشغيل الخدمة فقط.</li>
            <li><strong>التكاملات التي تضبطها بنفسك:</strong> مثل نظام CRM أو روابط Webhook، تُرسل إليها البيانات التي تختارها فقط.</li>
          </ul>
        </section>

        <section>
          <h2>5. التخزين والحماية</h2>
          <p>تُخزّن البيانات في قواعد بيانات المنصة المحمية، ويقتصر الوصول إليها على حسابك وأعضاء فريقك بحسب الصلاحيات التي تحددها. نحتفظ بالبيانات طوال مدة اشتراكك، ونحذفها عند طلبك أو عند إغلاق الحساب، إلا ما يلزمنا القانون بالاحتفاظ به (مثل الفواتير).</p>
        </section>

        <section id="data-deletion">
          <h2>6. حذف البيانات وإلغاء التفويض</h2>
          <p>بصفتك مستخدماً للمنصة، تمتلك كامل الحقوق للتحكم في بياناتك:</p>
          <ul>
            <li><strong>طلب حذف البيانات:</strong> أرسل بريداً إلى <a :href="`mailto:${COMPANY.email}?subject=${encodeURIComponent('طلب حذف بيانات')}`" dir="ltr">{{ COMPANY.email }}</a> من البريد المسجّل في حسابك بعنوان «طلب حذف بيانات»، وسنحذف حسابك ومحادثاتك وبيانات عملائك من خوادمنا نهائياً خلال 30 يوماً، ونؤكد لك ذلك بالبريد.</li>
            <li><strong>إلغاء تفويض فيسبوك:</strong> يمكنك إزالة صلاحية تطبيقنا من إعدادات فيسبوك (الإعدادات ← التطبيقات ومواقع الويب) أو من إعدادات مدير الأعمال الخاص بك (Meta Business Manager) في أي وقت.</li>
          </ul>
        </section>

        <section id="government-requests">
          <h2>7. طلبات الجهات الرسمية</h2>
          <p>إذا طلبت جهة حكومية أو قضائية الاطلاع على بيانات المستخدمين، فإننا:</p>
          <ul>
            <li>نراجع الطلب للتأكد من أنه قانوني وصادر عن جهة مختصة.</li>
            <li>نعترض على الطلب إذا رأينا أنه غير قانوني.</li>
            <li>نقدّم أقل قدر من البيانات يلزم للرد على الطلب، وبالقدر الذي يسمح به القانون.</li>
            <li>نوثّق كل طلب نتلقاه وكيف رددنا عليه.</li>
          </ul>
        </section>

        <section>
          <h2>8. التواصل معنا</h2>
          <p>لأي سؤال عن هذه السياسة أو بياناتك: <a :href="`mailto:${COMPANY.email}`" dir="ltr">{{ COMPANY.email }}</a> أو <a :href="`tel:${COMPANY.phone}`" dir="ltr">{{ COMPANY.phoneDisplay }}</a></p>
        </section>
      </template>

      <template v-else>
        <h1>Privacy Policy</h1>
        <p class="intro">At <strong>Wakeel</strong>, we are committed to protecting the privacy of your data and your customers' information. This policy explains how we collect, use, and store data related to our services, especially when connecting your account to the WhatsApp Cloud API.</p>

        <section>
          <h2>1. Who We Are</h2>
          <p>Wakeel is a product of <strong>{{ COMPANY.legalName.en }}</strong> ({{ COMPANY.legalName.ar }}), Commercial Registration No. {{ COMPANY.crNumber }}, which is responsible for the data processed by the platform.</p>
          <ul>
            <li><strong>Address:</strong> {{ COMPANY.address.en }}</li>
            <li><strong>Email:</strong> <a :href="`mailto:${COMPANY.email}`">{{ COMPANY.email }}</a></li>
            <li><strong>Phone:</strong> <a :href="`tel:${COMPANY.phone}`">{{ COMPANY.phoneDisplay }}</a></li>
          </ul>
        </section>

        <section>
          <h2>2. Data We Collect</h2>
          <ul>
            <li><strong>Your platform account:</strong> name, email, business name and tax details for invoices, and your team members' details.</li>
            <li><strong>Facebook Login data:</strong> when you connect your number through the official Facebook window, we receive your name and profile picture as you approve in that window, with no permission to post on Facebook.</li>
            <li><strong>Technical connection identifiers:</strong> Access Tokens, WhatsApp Business identifiers (WABA IDs and Phone Number IDs), and the phone numbers linked to the account.</li>
            <li><strong>Conversation data:</strong> sent and received messages, details of the customers you communicate with (such as names and numbers), exchanged media (images, documents, etc.), and your team's internal notes.</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Data</h2>
          <p>We use data only to provide the service you request: sending and receiving WhatsApp messages, the unified inbox and archive, tickets and reports, the automations you turn on, billing and support. We do not sell your data or your customers' data, and we do not use it for advertising.</p>
        </section>

        <section>
          <h2>4. Sharing with Third Parties</h2>
          <ul>
            <li><strong>Meta:</strong> our platform uses the official <strong>WhatsApp Cloud API</strong>, so sent and received messages pass through <strong>Meta's</strong> servers and are subject to Meta's own privacy policy and terms.</li>
            <li><strong>Google (Gemini):</strong> when you use AI features (conversation summary, customer stage suggestions, the AI agent), the relevant conversation text is sent to Google's Gemini service for processing. These features are optional.</li>
            <li><strong>Hosting providers:</strong> the platform's servers are hosted by <strong>Hostinger</strong> in Germany, and conversations are stored in <strong>MongoDB Atlas</strong> (on Google Cloud in India). They process data on our behalf only to run the service.</li>
            <li><strong>Integrations you set up:</strong> such as a CRM or webhook URLs receive only the data you choose to send them.</li>
          </ul>
        </section>

        <section>
          <h2>5. Storage and Security</h2>
          <p>Data is stored in the platform's protected databases and is accessible only to your account and your team members, according to the permissions you set. We keep data for as long as your subscription is active and delete it on request or when the account is closed, except what the law requires us to keep (such as invoices).</p>
        </section>

        <section id="data-deletion">
          <h2>6. Data Deletion and Revocation</h2>
          <p>As a user of the platform, you have full rights to control your data:</p>
          <ul>
            <li><strong>Request data deletion:</strong> email <a :href="`mailto:${COMPANY.email}?subject=${encodeURIComponent('Data deletion request')}`">{{ COMPANY.email }}</a> from your account's registered email with the subject "Data deletion request". We permanently delete your account, conversations and customer data from our servers within 30 days and confirm by email.</li>
            <li><strong>Revoke Facebook access:</strong> you can remove our app's access at any time from Facebook settings (Settings → Apps and Websites) or from your Meta Business Manager settings.</li>
          </ul>
        </section>

        <section id="government-requests">
          <h2>7. Requests from Public Authorities</h2>
          <p>If a government or judicial authority asks for access to user data, we:</p>
          <ul>
            <li>Review the request to confirm it is lawful and comes from a competent authority.</li>
            <li>Challenge the request if we believe it is unlawful.</li>
            <li>Disclose only the minimum data needed to answer the request, as far as the law permits.</li>
            <li>Keep a record of every request we receive and how we responded.</li>
          </ul>
        </section>

        <section>
          <h2>8. Contact Us</h2>
          <p>For any question about this policy or your data: <a :href="`mailto:${COMPANY.email}`">{{ COMPANY.email }}</a> or <a :href="`tel:${COMPANY.phone}`">{{ COMPANY.phoneDisplay }}</a></p>
        </section>
      </template>

      <div class="legal-footer">
        {{ $i18n.locale === 'ar' ? 'آخر تحديث:' : 'Last updated:' }} {{ new Date(COMPANY.privacyUpdated || COMPANY.legalUpdated).toLocaleDateString($i18n.locale === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}
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
