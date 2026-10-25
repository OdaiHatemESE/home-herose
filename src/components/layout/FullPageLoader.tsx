import { TrophyMark } from '@/components/brand/Logo';
import { useTranslation } from 'react-i18next';

export function FullPageLoader() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <TrophyMark className="size-14 animate-bounce motion-reduce:animate-none" />
        <span className="text-sm text-muted">{t('common.loading')}</span>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="grid gap-4" aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
      <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
    </div>
  );
}
