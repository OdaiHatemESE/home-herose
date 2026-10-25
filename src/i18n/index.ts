import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar';
import en from './en';

export type Lang = 'ar' | 'en';

function initialLang(): Lang {
  try {
    return localStorage.getItem('hh-lang') === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

function applyDocumentLang(lang: Lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

void i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: initialLang(),
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
  returnNull: false,
});
applyDocumentLang(i18n.language as Lang);

export function setLanguage(lang: Lang) {
  try {
    localStorage.setItem('hh-lang', lang);
  } catch {
    /* storage unavailable */
  }
  applyDocumentLang(lang);
  void i18n.changeLanguage(lang);
}

/** Picks the Arabic or English variant of a bilingual database field. */
export function pick(lang: string, ar: string | null | undefined, en: string | null | undefined): string {
  if (lang === 'en') return en || ar || '';
  return ar || en || '';
}

export default i18n;
