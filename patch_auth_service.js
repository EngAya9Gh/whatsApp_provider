const fs = require('fs');
const path = 'src/modules/auth/auth.service.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'companyDetails: {\n        vatNumber: data.vatNumber !== undefined ? data.vatNumber : (currentFeatures.companyDetails?.vatNumber || \'\'),\n        crn: data.crn !== undefined ? data.crn : (currentFeatures.companyDetails?.crn || \'\'),\n        street: data.street !== undefined ? data.street : (currentFeatures.companyDetails?.street || \'\'),\n        district: data.district !== undefined ? data.district : (currentFeatures.companyDetails?.district || \'\'),\n        city: data.city !== undefined ? data.city : (currentFeatures.companyDetails?.city || \'\'),\n        country: data.country !== undefined ? data.country : (currentFeatures.companyDetails?.country || \'\'),\n        buildingNo: data.buildingNo !== undefined ? data.buildingNo : (currentFeatures.companyDetails?.buildingNo || \'\'),\n        postalCode: data.postalCode !== undefined ? data.postalCode : (currentFeatures.companyDetails?.postalCode || \'\')\n      }',
  `companyDetails: {
        vatNumber: data.vatNumber !== undefined ? data.vatNumber : (currentFeatures.companyDetails?.vatNumber || ''),
        crn: data.crn !== undefined ? data.crn : (currentFeatures.companyDetails?.crn || ''),
        street: data.street !== undefined ? data.street : (currentFeatures.companyDetails?.street || ''),
        district: data.district !== undefined ? data.district : (currentFeatures.companyDetails?.district || ''),
        city: data.city !== undefined ? data.city : (currentFeatures.companyDetails?.city || ''),
        country: data.country !== undefined ? data.country : (currentFeatures.companyDetails?.country || ''),
        buildingNo: data.buildingNo !== undefined ? data.buildingNo : (currentFeatures.companyDetails?.buildingNo || ''),
        postalCode: data.postalCode !== undefined ? data.postalCode : (currentFeatures.companyDetails?.postalCode || '')
      },
      ticketSettings: {
        ratingMessageText: data.ratingMessageText !== undefined ? data.ratingMessageText : (currentFeatures.ticketSettings?.ratingMessageText || 'تم إغلاق التذكرة الخاصة بك. نأمل أن نكون قد وفقنا في خدمتك! يرجى تقييم الخدمة من 1 إلى 5 (حيث 5 هو الأفضل).')
      }`
);

fs.writeFileSync(path, content, 'utf8');
