import { useTranslation } from 'react-i18next';
import { useChildIdentity } from '@/auth/AuthProvider';
import { useEarnedAchievements, useFamilyTable } from '@/api/content';
import { pick } from '@/i18n';
import { formatDate, formatNumber } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/brand/misc';

export default function ChildAchievements() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { child, family } = useChildIdentity();
  const defs = useFamilyTable('achievement_definitions', family.id, 'threshold');
  const earned = useEarnedAchievements({ childId: child.id });
  return (
    <>
      <PageHeader title={t('child.achievementsTitle')} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(defs.data ?? []).filter((d) => d.is_active).map((d) => {
          const e = earned.data?.find((x) => x.achievement_id === d.id);
          return (
            <li key={d.id} className={cn('flex flex-col items-center gap-2 rounded-[var(--radius-card)] p-4 text-center', e ? 'bg-gradient-to-b from-gold-100 to-gold-50 shadow-[var(--shadow-soft)] dark:from-gold-400/20 dark:to-transparent' : 'bg-surface-2')}>
              <span className={cn('text-5xl', !e && 'opacity-30 grayscale')} aria-hidden>{d.icon}</span>
              <span className="font-semibold">{pick(lang, d.name_ar, d.name_en)}</span>
              <span className="text-xs text-muted">{t(`levels.criteria.${d.criteria}`)}: {formatNumber(d.threshold, lang)}</span>
              <span className="text-xs">{e ? formatDate(e.earned_at.slice(0, 10), lang, { day: 'numeric', month: 'short' }) : t('child.lockedBadge')}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
