export const metaTemplateLibrary = [
  {
    id: 'account_setup_en',
    title: 'Finalize account set-up',
    description: 'Utility • Account update',
    category: 'UTILITY',
    formState: {
      name: 'account_setup_final',
      language: 'en_US',
      category: 'UTILITY',
      headerType: '',
      headerText: '',
      bodyText: 'Hi {{1}},\n\nYour new account has been created successfully.\n\nPlease verify {{2}} to complete your profile.',
      bodyExamples: ['John', 'your email address'],
      footerText: '',
      buttons: [
        { type: 'URL', text: 'Verify account', url: 'https://example.com/verify' }
      ]
    }
  },
  {
    id: 'address_update_en',
    title: 'Address update',
    description: 'Utility • Address update',
    category: 'UTILITY',
    formState: {
      name: 'address_update_1',
      language: 'en_US',
      category: 'UTILITY',
      headerType: '',
      headerText: '',
      bodyText: 'Hi {{1}},\n\nYour delivery address has been successfully updated to {{2}}.\nContact {{3}} for any inquiries.',
      bodyExamples: ['John', '123 Main St', 'support@example.com'],
      footerText: '',
      buttons: []
    }
  },
  {
    id: 'appointment_canceled_en',
    title: 'Appointment canceled',
    description: 'Utility • Appointment update',
    category: 'UTILITY',
    formState: {
      name: 'appointment_canceled_1',
      language: 'en_US',
      category: 'UTILITY',
      headerType: '',
      headerText: '',
      bodyText: 'Hello {{1}},\n\nYour upcoming appointment with {{2}} on {{3}} at {{4}} has been canceled.\n\nLet us know if you have any questions or need to reschedule.',
      bodyExamples: ['John', 'Dr. Smith', 'Oct 20', '10:00 AM'],
      footerText: '',
      buttons: []
    }
  },
  {
    id: 'order_confirmation_ar',
    title: 'تأكيد الطلب',
    description: 'Utility • Order update',
    category: 'UTILITY',
    formState: {
      name: 'order_confirmation_ar',
      language: 'ar',
      category: 'UTILITY',
      headerType: '',
      headerText: '',
      bodyText: 'مرحباً {{1}}،\n\nشكراً لتسوقك معنا! لقد تم تأكيد طلبك رقم {{2}} بنجاح.\n\nسنقوم بإعلامك فور شحن الطلب.',
      bodyExamples: ['أحمد', 'ORD-12345'],
      footerText: 'نتمنى لك يوماً سعيداً',
      buttons: [
        { type: 'URL', text: 'تتبع الطلب', url: 'https://example.com/track/{{1}}' }
      ]
    }
  },
  {
    id: 'appointment_reminder_ar',
    title: 'تذكير بموعد',
    description: 'Utility • Appointment reminder',
    category: 'UTILITY',
    formState: {
      name: 'appointment_reminder_ar',
      language: 'ar',
      category: 'UTILITY',
      headerType: '',
      headerText: '',
      bodyText: 'أهلاً {{1}}،\n\nنود تذكيرك بموعدك القادم مع {{2}} يوم {{3}} الساعة {{4}}.\n\nيرجى التواصل معنا في حال رغبت بتعديل الموعد.',
      bodyExamples: ['سارة', 'عيادة الأسنان', 'الخميس', '5:00 مساءً'],
      footerText: 'نتطلع لرؤيتك',
      buttons: [
        { type: 'QUICK_REPLY', text: 'تأكيد الحضور', url: '' },
        { type: 'QUICK_REPLY', text: 'طلب تعديل', url: '' }
      ]
    }
  },
  {
    id: 'marketing_sale_ar',
    title: 'عرض ترويجي',
    description: 'Marketing • Promotions',
    category: 'MARKETING',
    formState: {
      name: 'special_offer_ar',
      language: 'ar',
      category: 'MARKETING',
      headerType: 'IMAGE',
      headerText: '',
      bodyText: 'مرحباً {{1}}! 🎉\n\nلا تفوت عروضنا الحصرية بمناسبة {{2}}. خصومات تصل إلى {{3}} على جميع منتجاتنا لفترة محدودة.\n\nتسوق الآن واستفد من العرض قبل انتهائه!',
      bodyExamples: ['أحمد', 'نهاية العام', '50%'],
      footerText: 'تطبق الشروط والأحكام',
      buttons: [
        { type: 'URL', text: 'تسوق الآن', url: 'https://example.com/sale' },
        { type: 'QUICK_REPLY', text: 'إلغاء الاشتراك', url: '' }
      ]
    }
  },
  {
    id: 'marketing_welcome_en',
    title: 'Welcome Offer',
    description: 'Marketing • Welcome',
    category: 'MARKETING',
    formState: {
      name: 'welcome_offer_en',
      language: 'en_US',
      category: 'MARKETING',
      headerType: 'IMAGE',
      headerText: '',
      bodyText: 'Welcome to {{1}}, {{2}}! 🌟\n\nAs a thank you for joining us, here is a {{3}} discount on your first purchase.\n\nUse code {{4}} at checkout.',
      bodyExamples: ['Our Store', 'John', '15%', 'WELCOME15'],
      footerText: 'Valid for 7 days',
      buttons: [
        { type: 'URL', text: 'Shop Now', url: 'https://example.com/shop' }
      ]
    }
  },

];
