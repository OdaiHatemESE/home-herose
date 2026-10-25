import { useTranslation } from 'react-i18next';
import { useChildIdentity } from '@/auth/AuthProvider';
import { usePointEvents, useSnapshots } from '@/api/progress';
import { formatDate, formatNumber } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { PageHeader, StarTally } from '@/components/brand/misc';
import { LevelBadge } from '@/components/brand/LevelBadge';

export default function ChildStars() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { child } = useChildIdentity();
  const events = usePointEvents({ childId: child.id, limit: 200 });
  const snapshots = useSnapshots({ childId: child.id, limit: 30 });
  const all = events.data ?? [];
  const golden = all.filter((e) => e.source_type === 'initiative').reduce((s, e) => s + e.points, 0);
  const total = all.reduce((s, e) => s + e.points, 0);

  return (
    <>
      <PageHeader title={t('child.starsTitle')} />
      <div className="surface mb-6 flex items-center justify-center rounded-[var(--radius-hero)] p-6 shadow-[var(--shadow-soft)]">
        <StarTally regular={Math.max(0, total - golden)} golden={golden} className="text-3xl" />
      </div>

      <h2 className="mb-3 text-lg font-semibold">{t('child.weeksHistory')}</h2>
      <ul className="mb-8 grid gap-2">
        {(snapshots.data ?? []).map((s) => (
          <li key={s.id} className="surface flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3">
            <span className="flex-1">{t('reports.weekOf', { date: formatDate(s.week_start, lang, { day: 'numeric', month: 'long' }) })}</span>
            <span className="font-semibold tabular-nums">{s.percent == null ? '—' : `${formatNumber(Number(s.percent), lang)}%`}</span>
            <LevelBadge level={s.level_snapshot} size="sm" />
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-lg font-semibold">{t('child.starsHistory')}</h2>
      <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-app bg-surface">
        {all.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="w-24 text-muted">{formatDate(e.event_date, lang, { weekday: 'short', day: 'numeric' })}</span>
            <span className="flex-1">{t(`points.kinds.${e.kind}`)}{e.reason ? ` — ${e.reason}` : ''}</span>
            <span className={cn('font-semibold tabular-nums', e.points < 0 ? 'text-rose-500' : e.source_type === 'initiative' ? 'text-gold-600' : 'text-leaf-500')}>
              {e.points > 0 ? '+' : ''}{formatNumber(e.points, lang)} {e.source_type === 'initiative' ? '✦' : '⭐'}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
