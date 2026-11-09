// Shared palette + ready-made customer stage presets for tags & stages

export const LABEL_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#64748b'  // slate
]

export const STAGE_PRESETS = [
  {
    key: 'sales',
    icon: 'fas fa-hand-holding-dollar',
    nameAr: 'مبيعات',
    nameEn: 'Sales',
    descAr: 'اختره إذا كنت تبيع منتجات أو خدمات، وتريد أن تعرف مَن اشترى ومَن ما زال يفكر.',
    descEn: 'Pick it if you sell products or services and want to know who bought and who is still deciding.',
    recommended: true,
    main: [
      { ar: 'عميل جديد', en: 'New lead', color: '#3b82f6' },
      { ar: 'عميل مهتم', en: 'Interested', color: '#f59e0b' },
      { ar: 'تم الدفع', en: 'Paid', color: '#10b981' }
    ],
    lost: [
      { ar: 'عميل بارد', en: 'Cold', color: '#64748b' },
      { ar: 'غير مهتم', en: 'Not interested', color: '#f97316' },
      { ar: 'عميل مفقود', en: 'Lost', color: '#ef4444' }
    ]
  },
  {
    key: 'bookings',
    icon: 'fas fa-calendar-check',
    nameAr: 'حجوزات ومواعيد',
    nameEn: 'Bookings',
    descAr: 'اختره إذا كان عملك بالمواعيد: عيادة، صالون، مركز تدريب.',
    descEn: 'Pick it if you work by appointment: a clinic, a salon, a training centre.',
    main: [
      { ar: 'استفسار', en: 'Inquiry', color: '#3b82f6' },
      { ar: 'تم الحجز', en: 'Booked', color: '#8b5cf6' },
      { ar: 'تمت الزيارة', en: 'Visited', color: '#10b981' }
    ],
    lost: [
      { ar: 'ألغى الحجز', en: 'Cancelled', color: '#f97316' },
      { ar: 'لم يحضر', en: 'No-show', color: '#ef4444' }
    ]
  },
  {
    key: 'custom',
    icon: 'fas fa-sliders',
    nameAr: 'مخصص',
    nameEn: 'Custom',
    descAr: 'اختره إذا أردت أن تكتب مراحلك بنفسك: نبدأ بمرحلة واحدة وتضيف ما تحتاجه.',
    descEn: 'Pick it to write your own stages: we start with one and you add what you need.',
    main: [
      { ar: 'عميل جديد', en: 'New', color: '#3b82f6' }
    ],
    lost: []
  }
]

// Common tags, offered with one click on the Tags page
export const TAG_SUGGESTIONS = [
  { ar: 'VIP', en: 'VIP', color: '#f59e0b', pinned: true, whyAr: 'عملاء مهمون تخدمهم أولاً', whyEn: 'Important customers you serve first' },
  { ar: 'شكوى', en: 'Complaint', color: '#ef4444', pinned: true, whyAr: 'مشكلة تحتاج متابعة سريعة', whyEn: 'A problem that needs a quick follow-up' },
  { ar: 'مبيعات', en: 'Sales', color: '#10b981', pinned: true, whyAr: 'عميل يريد الشراء', whyEn: 'A customer who wants to buy' },
  { ar: 'متابعة لاحقاً', en: 'Follow up', color: '#3b82f6', whyAr: 'تذكير بالرجوع للعميل', whyEn: 'A reminder to get back to them' },
  { ar: 'عميل جملة', en: 'Wholesale', color: '#8b5cf6', whyAr: 'طلبات بكميات كبيرة', whyEn: 'Orders in large quantities' },
  { ar: 'استفسار', en: 'Inquiry', color: '#64748b', whyAr: 'سؤال عام بدون شراء بعد', whyEn: 'A general question, no purchase yet' }
]
