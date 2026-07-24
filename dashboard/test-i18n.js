const { createI18n } = require('vue-i18n');
try {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} } });
  i18n.global.t('test', 'fallback string');
  console.log("Success");
} catch(e) {
  console.error("Error:", e.message);
}
