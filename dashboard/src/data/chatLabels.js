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
    descAr: 'متابعة العميل من أول تواصل حتى الدفع',
    descEn: 'Follow a lead from first contact to payment',
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
    descAr: 'للعيادات والصالونات وأي نشاط يعتمد على المواعيد',
    descEn: 'For clinics, salons and appointment-based businesses',
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
    descAr: 'ابدأ بمرحلة واحدة وأضف ما تحتاجه',
    descEn: 'Start with one stage and add what you need',
    main: [
      { ar: 'عميل جديد', en: 'New', color: '#3b82f6' }
    ],
    lost: []
  }
]
