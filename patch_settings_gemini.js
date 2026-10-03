const fs = require('fs');
const path = 'dashboard/src/views/Settings.vue';
let content = fs.readFileSync(path, 'utf8');

const geminiSection = `
        <!-- AI Settings -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white border-0 pt-4 pb-0">
            <h6 class="card-title mb-0">
              <i class="fas fa-robot text-[#FF6600] me-2"></i> {{ isAr ? 'إعدادات الذكاء الاصطناعي' : 'AI Settings' }}
            </h6>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">{{ isAr ? 'مفتاح Gemini API' : 'Gemini API Key' }}</label>
              <input type="text" class="form-control" v-model="settings.aiSettings.geminiKey" :placeholder="isAr ? 'أدخل مفتاح Gemini ليعمل الملخص التلقائي للتذاكر' : 'Enter Gemini API Key for ticket auto-summary'" />
              <div class="form-text">
                {{ isAr ? 'هذا المفتاح يستخدم لتوليد ملخص تلقائي للمحادثة عند إغلاق التذكرة.' : 'This key is used to generate an automatic summary of the conversation when a ticket is closed.' }}
              </div>
            </div>
          </div>
        </div>
`;

content = content.replace(
  '        <!-- Ticket Settings -->',
  geminiSection + '\n        <!-- Ticket Settings -->'
);

content = content.replace(
  '        ticketSettings: res.data.data.ticketSettings || {',
  `        aiSettings: res.data.data.aiSettings || { geminiKey: '' },
        ticketSettings: res.data.data.ticketSettings || {`
);

content = content.replace(
  '          ticketSettings: settings.value.ticketSettings',
  `          ticketSettings: settings.value.ticketSettings,
          aiSettings: settings.value.aiSettings`
);

fs.writeFileSync(path, content, 'utf8');
