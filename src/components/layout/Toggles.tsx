import { Languages, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/i18n';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';

export function LanguageToggle({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  return (
    <Button variant="ghost" size="sm" className={className} onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')} aria-label={t('common.languageLabel')}>
      <Languages />
      {t('common.language')}
    </Button>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" className={className} onClick={toggle} aria-label={theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
