import { useTranslation } from 'react-i18next';
import { AuthCard } from '@/components/layout/PublicLayout';

export function SetupRequired() {
  const { t } = useTranslation();
  return (
    <AuthCard title={t('setup.title')}>
      <p className="leading-relaxed text-muted">{t('setup.body')}</p>
      <pre dir="ltr" className="mt-4 overflow-x-auto rounded-[var(--radius-control)] bg-surface-2 p-3 text-start text-xs">
        {`VITE_SUPABASE_URL=https://<ref>.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}
      </pre>
    </AuthCard>
  );
}
