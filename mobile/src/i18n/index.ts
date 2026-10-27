/* eslint-disable import/no-named-as-default-member -- i18next is used through its default instance, as on the website */
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import ar from '@shared/i18n/ar';
import en from '@shared/i18n/en';
import { getPref, setPref } from '@/lib/prefs';
import { mobileAr, mobileEn } from './mobile';

export type Lang = 'ar' | 'en';

// The app reuses the website's Arabic/English strings word for word; `mobile` adds app-only phrases.
void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: { ...ar, mobile: mobileAr } },
    en: { translation: { ...en, mobile: mobileEn } },
  },
  lng: 'ar',
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export async function loadLanguage() {
  const saved = await getPref('lang');
  if (saved === 'en' && i18n.language !== 'en') await i18n.changeLanguage('en');
}

export function setLanguage(lang: Lang) {
  void setPref('lang', lang);
  void i18n.changeLanguage(lang);
}

/** Picks the Arabic or English variant of a bilingual database field. */
export function pick(lang: string, arText: string | null | undefined, enText: string | null | undefined): string {
  if (lang === 'en') return enText || arText || '';
  return arText || enText || '';
}

/**
 * Layout direction. The app mirrors its layout by hand (as قديش does) instead of relying on the
 * OS RTL switch, so changing language takes effect instantly without restarting the app.
 */
export function useDir() {
  const { i18n: inst } = useTranslation();
  const rtl = inst.language !== 'en';
  return {
    rtl,
    lang: inst.language as Lang,
    row: (rtl ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    textAlign: (rtl ? 'right' : 'left') as 'right' | 'left',
    alignStart: (rtl ? 'flex-end' : 'flex-start') as 'flex-start' | 'flex-end',
    alignEnd: (rtl ? 'flex-start' : 'flex-end') as 'flex-start' | 'flex-end',
    writingDirection: (rtl ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };
}

export default i18n;
