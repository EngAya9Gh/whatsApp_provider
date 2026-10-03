const fs = require('fs');
const path = 'dashboard/src/views/Settings.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const form = ref({\n  companyName: \'\',\n  vatNumber: \'\',\n  crn: \'\',\n  street: \'\',\n  district: \'\',\n  city: \'\',\n  country: \'السعودية\',\n  buildingNo: \'\',\n  postalCode: \'\'\n})',
  'const form = ref({\n  companyName: \'\',\n  vatNumber: \'\',\n  crn: \'\',\n  street: \'\',\n  district: \'\',\n  city: \'\',\n  country: \'السعودية\',\n  buildingNo: \'\',\n  postalCode: \'\',\n  ratingMessageText: \'\'\n})'
);

content = content.replace(
  'const details = data.customFeatures?.companyDetails || {}',
  'const details = data.customFeatures?.companyDetails || {}\n    const ticketSettings = data.customFeatures?.ticketSettings || {}'
);

content = content.replace(
  'postalCode: details.postalCode || \'\'\n    })',
  'postalCode: details.postalCode || \'\',\n      ratingMessageText: ticketSettings.ratingMessageText || \'\'\n    })'
);

content = content.replace(
  'tenant.customFeatures.companyDetails = { ...form.value }',
  'tenant.customFeatures.companyDetails = { ...form.value }\n    tenant.customFeatures.ticketSettings = { ratingMessageText: form.value.ratingMessageText }'
);

content = content.replace(
  '<!-- Save Button -->',
  `<!-- Ticket Settings -->
        <div class="mb-10">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div class="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <i class="fas fa-ticket-alt"></i>
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-800">{{ isAr ? 'إعدادات التذاكر' : 'Ticket Settings' }}</h2>
              <p class="text-sm text-slate-500">{{ isAr ? 'التحكم في رسالة التقييم وغيرها' : 'Control rating message and more' }}</p>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-6">
            <div class="form-group">
              <label class="form-label">{{ isAr ? 'رسالة التقييم بعد إغلاق التذكرة' : 'Rating Message after closing ticket' }}</label>
              <textarea v-model="form.ratingMessageText" class="form-control min-h-[100px]" :placeholder="isAr ? 'تم إغلاق التذكرة الخاصة بك. نأمل أن نكون قد وفقنا في خدمتك! يرجى تقييم الخدمة من 1 إلى 5 (حيث 5 هو الأفضل).' : 'Ticket is closed. Rate us 1 to 5.'"></textarea>
            </div>
          </div>
        </div>

        <!-- Save Button -->`
);

fs.writeFileSync(path, content, 'utf8');
