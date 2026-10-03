const fs = require('fs');
const path = 'src/modules/auth/auth.service.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "ticketSettings: {\n        ratingMessageText: data.ratingMessageText !== undefined ? data.ratingMessageText : (currentFeatures.ticketSettings?.ratingMessageText || 'تم إغلاق التذكرة الخاصة بك. نأمل أن نكون قد وفقنا في خدمتك! يرجى تقييم الخدمة من 1 إلى 5 (حيث 5 هو الأفضل).')\n      }",
  `ticketSettings: {
        ratingMessageText: data.ticketSettings?.ratingMessageText !== undefined ? data.ticketSettings.ratingMessageText : (currentFeatures.ticketSettings?.ratingMessageText || 'تم إغلاق التذكرة الخاصة بك. نأمل أن نكون قد وفقنا في خدمتك! يرجى تقييم الخدمة من 1 إلى 5 (حيث 5 هو الأفضل).')
      },
      aiSettings: {
        geminiKey: data.aiSettings?.geminiKey !== undefined ? data.aiSettings.geminiKey : currentFeatures.aiSettings?.geminiKey
      }`
);

fs.writeFileSync(path, content, 'utf8');
