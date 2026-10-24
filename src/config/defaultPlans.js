// Single source of truth for the default plans.
// The live values are stored in the `plan_settings` table and edited from the
// admin console; these defaults are only used to seed it (prisma/seed.js and
// PlanService.initPlans when the table is empty).
// A limit of 0 means no monthly message cap (pay as you go / unlimited).

const DEFAULT_PLANS = [
  {
    planCode: 'FREE',
    name: 'Free Trial',
    nameAr: 'مجاني (Free)',
    nameEn: 'Free Plan',
    price: 0,
    limit: 10,
    features: JSON.stringify(['Quick & Easy Connection', 'Text, Image & Media support']),
    featuresAr: JSON.stringify(['ربط سريع وسهل', 'إرسال نصوص وصور وملفات']),
    featuresEn: JSON.stringify(['Quick & Easy Connection', 'Text, Image & Media support']),
    sortOrder: 2,
    isActive: true,
    isPopular: false,
    buttonTextAr: 'اشترك الآن',
    buttonTextEn: 'Subscribe Now',
    featureFlags: []
  },
  {
    planCode: 'STARTER',
    name: 'Starter',
    nameAr: 'البداية (Starter)',
    nameEn: 'Starter Plan',
    price: 19,
    limit: 5000,
    features: JSON.stringify(['All Free Features', 'Local Templates', 'Developer API Support', 'Bot Service (Keyword Auto-Responder)']),
    featuresAr: JSON.stringify(['جميع ميزات الباقة المجانية', 'دعم القوالب المحلية', 'دعم الربط البرمجي (API)', 'خدمة البوت (رد تلقائي للكلمات المفتاحية)']),
    featuresEn: JSON.stringify(['All Free Features', 'Local Templates', 'Developer API Support', 'Bot Service (Keyword Auto-Responder)']),
    sortOrder: 1,
    isActive: true,
    isPopular: false,
    buttonTextAr: 'اشترك الآن',
    buttonTextEn: 'Subscribe Now',
    featureFlags: ['TEMPLATES', 'API_ACCESS', 'AUTO_RESPONDER']
  },
  {
    planCode: 'PRO',
    name: 'Professional',
    nameAr: 'النمو (Growth)',
    nameEn: 'Growth Plan',
    price: 49,
    limit: 0, // Pay as you go
    features: JSON.stringify(['All Starter Features', 'Advanced Campaign Analytics', 'Excel/CSV bulk campaigns', 'Interaction tracking', 'Priority Technical Support', 'Advanced API Access', 'Advanced Bot Service']),
    featuresAr: JSON.stringify(['جميع ميزات باقة البداية', 'إحصائيات متقدمة للحملات', 'إرسال حملات مخصصة عبر ملفات Excel', 'تتبع تفاعلات الأزرار الوهمية', 'أولوية الدعم الفني', 'دعم الربط البرمجي (API) المتقدم', 'خدمة البوت المتقدمة']),
    featuresEn: JSON.stringify(['All Starter Features', 'Advanced Campaign Analytics', 'Excel/CSV bulk campaigns', 'Interaction tracking', 'Priority Technical Support', 'Advanced API Access', 'Advanced Bot Service']),
    sortOrder: 3,
    isActive: true,
    isPopular: true,
    buttonTextAr: 'اشترك الآن',
    buttonTextEn: 'Subscribe Now',
    featureFlags: ['TEMPLATES', 'API_ACCESS', 'AUTO_RESPONDER', 'BULK_CAMPAIGN', 'EXCEL_EXPORT']
  },
  {
    planCode: 'ENTERPRISE',
    name: 'Enterprise',
    nameAr: 'الأعمال الرسمية (Meta)',
    nameEn: 'Meta Enterprise',
    price: 0, // Custom
    limit: 0, // Unlimited
    features: JSON.stringify(['Official Meta Cloud API', '100% Stability & Ban Protection', 'Native Interactive Buttons & Lists', 'Official Meta Templates Support', 'Eligibility for Green Tick ✅', 'Official API Support']),
    featuresAr: JSON.stringify(['ربط رسمي (Meta Cloud API)', 'استقرار 100% وأمان ضد الحظر', 'أزرار وقوائم تفاعلية رسمية (Native)', 'دعم قوالب فيسبوك الرسمية', 'إمكانية التوثيق بالعلامة الخضراء ✅', 'دعم الربط البرمجي (API) الرسمي']),
    featuresEn: JSON.stringify(['Official Meta Cloud API', '100% Stability & Ban Protection', 'Native Interactive Buttons & Lists', 'Official Meta Templates Support', 'Eligibility for Green Tick ✅', 'Official API Support']),
    sortOrder: 4,
    isActive: true,
    isPopular: false,
    buttonTextAr: 'تواصل معنا',
    buttonTextEn: 'Contact Us',
    featureFlags: ['TEMPLATES', 'API_ACCESS', 'AUTO_RESPONDER', 'BULK_CAMPAIGN', 'EXCEL_EXPORT', 'META_API']
  }
];

module.exports = DEFAULT_PLANS;
