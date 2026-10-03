const fs = require('fs');
const path = 'src/modules/tickets/tickets.service.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const ratingText = "تم إغلاق التذكرة الخاصة بك. نأمل أن نكون قد وفقنا في خدمتك! يرجى تقييم الخدمة من 1 إلى 5 (حيث 5 هو الأفضل).";',
  `const tenantData = await prisma.tenant.findUnique({ where: { id: tenantId } });
          const customFeatures = typeof tenantData.customFeatures === 'object' ? tenantData.customFeatures : {};
          const ratingText = customFeatures?.ticketSettings?.ratingMessageText || "تم إغلاق التذكرة الخاصة بك. نأمل أن نكون قد وفقنا في خدمتك! يرجى تقييم الخدمة من 1 إلى 5 (حيث 5 هو الأفضل).";`
);

fs.writeFileSync(path, content, 'utf8');
