import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'

const savedLang = localStorage.getItem('app_lang') || 'ar'

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
  localStorage.setItem('app_lang', lang)
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

// Initial setup
setLanguage(savedLang)

export default i18n
