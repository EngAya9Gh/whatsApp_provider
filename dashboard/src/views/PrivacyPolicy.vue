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
          <h2>1. جمع المعرفات التقنية</h2>
          <p>بمجرد إتمام عملية الربط لتشغيل الخدمة، تقوم المنصة بجمع وتخزين بعض المعرفات التقنية الأساسية لضمان عمل الخدمة بشكل صحيح، وتشمل:</p>
          <ul>
            <li>مفاتيح الربط (Access Tokens)</li>
            <li>معرفات الأعمال في واتساب (WABA IDs و Phone Number IDs)</li>
            <li>أرقام الهواتف المرتبطة بالحساب</li>
          </ul>
        </section>

        <section>
          <h2>2. مركزية التخزين</h2>
          <p>لتقديم خدمة "صندوق الوارد" (Inbox) الموحد وأرشفة الرسائل، يتم تخزين البيانات التالية في قاعدة البيانات المركزية الآمنة الخاصة بمنصتنا:</p>
          <ul>
            <li>نصوص المحادثات الصادرة والواردة</li>
            <li>بيانات العملاء (مثل الأسماء والأرقام) التي يتم التواصل معها</li>
            <li>الوسائط المتعددة المتبادلة (صور، مستندات، إلخ)</li>
          </ul>
        </section>

        <section>
          <h2>3. مشاركة البيانات مع الطرف الثالث (Meta)</h2>
          <p>تستخدم منصتنا واجهات <strong>WhatsApp Cloud API</strong> الرسمية. وعليه، فإن جميع الرسائل الصادرة والواردة تمر بالضرورة عبر خوادم شركة <strong>Meta (فيسبوك سابقاً)</strong>. تخضع هذه البيانات والمراسلات لسياسة الخصوصية وشروط الاستخدام الخاصة بشركة Meta.</p>
        </section>

        <section>
          <h2>4. حقوق الحذف وإلغاء التفويض</h2>
          <p>بصفتك مستخدماً للمنصة، تمتلك كامل الحقوق للتحكم في بياناتك:</p>
          <ul>
            <li><strong>حذف البيانات:</strong> يمكنك في أي وقت طلب حذف سجل محادثاتك وبيانات عملائك من خوادمنا بشكل نهائي عبر التواصل مع الدعم الفني.</li>
            <li><strong>إلغاء التفويض:</strong> يمكنك إزالة تفويض تطبيقنا للوصول إلى حسابك عبر الذهاب إلى إعدادات مدير الأعمال الخاص بك (Meta Business Manager) وإلغاء الربط في أي وقت.</li>
          </ul>
        </section>
      </template>

      <template v-else>
        <h1>Privacy Policy</h1>
        <p class="intro">At <strong>Wakeel</strong>, we are committed to protecting the privacy of your data and your customers' information. This policy explains how we collect, use, and store data related to our services, especially when connecting your account to the WhatsApp Cloud API.</p>
        
        <section>
          <h2>1. Technical Identifiers Collection</h2>
          <p>Once the connection is completed to operate the service, the platform collects and stores some basic technical identifiers to ensure the service functions correctly, including:</p>
          <ul>
            <li>Access Tokens</li>
            <li>WhatsApp Business Identifiers (WABA IDs and Phone Number IDs)</li>
            <li>Phone numbers associated with the account</li>
          </ul>
        </section>

        <section>
          <h2>2. Centralized Storage</h2>
          <p>To provide a unified "Inbox" service and message archiving, the following data is stored in our platform's secure centralized database:</p>
          <ul>
            <li>Sent and received chat texts</li>
            <li>Customer data (such as names and numbers) communicated with</li>
            <li>Exchanged multimedia (images, documents, etc.)</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Sharing with Third Party (Meta)</h2>
          <p>Our platform explicitly uses the official <strong>WhatsApp Cloud API</strong>. Therefore, all sent and received messages necessarily pass through <strong>Meta's</strong> servers. This data and communication are subject to Meta's own privacy policy and terms of use.</p>
        </section>

        <section>
          <h2>4. Deletion and Revocation Rights</h2>
          <p>As a user of the platform, you have full rights to control your data:</p>
          <ul>
            <li><strong>Data Deletion:</strong> You can request the permanent deletion of your chat history and customer data from our servers at any time by contacting technical support.</li>
            <li><strong>Revocation of Authorization:</strong> You can remove our application's authorization to access your account by going to your Meta Business Manager settings and unlinking it at any time.</li>
          </ul>
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
