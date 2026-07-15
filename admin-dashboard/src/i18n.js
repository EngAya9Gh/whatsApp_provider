import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'

const savedLang = localStorage.getItem('admin_lang') || 'en'

const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  fallbackLocale: 'en',
  messages: {
    en,
    ar
  }
})

export const setLanguage = (lang) => {
  i18n.global.locale.value = lang
  localStorage.setItem('admin_lang', lang)
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

setLanguage(savedLang)

export default i18n
