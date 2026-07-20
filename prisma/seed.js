const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = [
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
      buttonTextEn: 'Subscribe Now'
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
      buttonTextEn: 'Subscribe Now'
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
      buttonTextEn: 'Subscribe Now'
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
      buttonTextEn: 'Contact Us'
    }
  ];

  for (const p of plans) {
    await prisma.planSetting.upsert({
      where: { planCode: p.planCode },
      update: p,
      create: p
    });
  }
  
  // Clean up any old unused plans if they exist
  try { await prisma.planSetting.delete({ where: { planCode: 'ADVANCED' } }); } catch(e) {}

  console.log('Database seeded with standard plans.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
