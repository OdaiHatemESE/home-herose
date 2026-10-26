import { useTranslation } from 'react-i18next';

/** Shown only in the explicitly labelled local demo mode (npm run demo). */
export function DemoBanner() {
  const { t } = useTranslation();
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null;
  return (
    <div role="note" className="no-print sticky top-0 z-50 bg-gold-400 px-4 py-1.5 text-center text-sm font-medium text-plum-900">
      {t('demo.banner')}
    </div>
  );
}
