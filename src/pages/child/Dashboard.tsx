import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, ChevronLeft } from 'lucide-react';
import { useChildIdentity } from '@/auth/AuthProvider';
import { useChildDay, useChildProgress } from '@/api/progress';
import { useEarnedAchievements, useFamilyTable } from '@/api/content';
import { addDays, dayOfWeek, formatDate, formatNumber, weekStartFor } from '@/lib/dates';
import { nextLevel } from '@/lib/scoring';
import { pick } from '@/i18n';
import { Skeleton } from '@/components/ui/controls';
import { MedalTrack } from '@/components/brand/MedalTrack';
import { LevelBadge, levelName } from '@/components/brand/LevelBadge';
import { ChildAvatar, ErrorState, StarTally } from '@/components/brand/misc';
import { celebrate } from '@/components/brand/celebrate';
import { ChildTaskRow, InitiativeQuickLink, SimpleTaskTile, childTaskState } from '@/components/child/TaskPieces';
import { errorMessage } from '@/lib/errors';

export default function ChildDashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { child, family, settings, today } = useChildIdentity();
  const simple = child.ui_mode === 'simple';
  const ws = weekStartFor(today, settings.week_start_day);
  const day = useChildDay(child.id, today);
  const week = useChildProgress(child.id, ws, addDays(ws, 6));
  const levels = useFamilyTable('achievement_levels', family.id, 'rank');
  const earned = useEarnedAchievements({ childId: child.id });
  const defs = useFamilyTable('achievement_definitions', family.id, 'threshold');

  const tasks = day.data?.tasks ?? [];
  const counted = tasks.filter((x) => x.counts_toward_max);
  const allDone = counted.length > 0 && counted.every((x) => ['done', 'pending'].includes(childTaskState(x)));
  const wasDone = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    if (!day.data) return;
    if (wasDone.current === false && allDone) celebrate('big');
    wasDone.current = allDone;
  }, [allDone, day.data]);

  const motivational = t('child.motivational', { returnObjects: true }) as unknown as string[];
  const message = Array.isArray(motivational) ? motivational[(dayOfWeek(today) + child.display_name.length) % motivational.length] : '';
  const w = week.data;
  const next = nextLevel(w?.percent ?? null, levels.data ?? []);
  const golden = w?.initiative_points ?? 0;
  const regular = Math.max(0, (w?.approved_points ?? 0) - golden);

  return (
    <div className="grid gap-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-hero)] bg-gradient-to-br from-plum-500 via-plum-600 to-plum-700 p-5 text-white shadow-[var(--shadow-lift)] sm:p-7">
        <div className="pointer-events-none absolute -top-10 -end-10 size-48 rounded-full bg-gold-400/30 blur-2xl" aria-hidden />
        <div className="relative flex items-center gap-4">
          <ChildAvatar avatar={child.avatar} color={child.color} size={simple ? 'xl' : 'lg'} className="ring-white/40" />
          <div>
            <h1 className="font-display text-[clamp(1.9rem,7vw,2.8rem)] leading-tight">{t('child.hello')}</h1>
            <p className="text-lg text-plum-100">{child.display_name}</p>
          </div>
        </div>
        <div className="relative mt-4 rounded-[var(--radius-card)] bg-white/95 p-4 text-ink dark:bg-plum-950/90 dark:text-fg">
          {week.isPending ? (
            <Skeleton className="h-20" />
          ) : week.isError ? (
            <ErrorState message={errorMessage(week.error)} />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">{t('child.level')}</p>
                  <LevelBadge level={w?.level} size="lg" />
                </div>
                <div className="text-end">
                  <p className="text-sm text-muted">{t('child.stars')}</p>
                  <StarTally regular={regular} golden={golden} className="text-xl" />
                </div>
              </div>
              <MedalTrack percent={w?.percent ?? 0} levels={levels.data ?? []} size="lg" />
              <p className="text-sm">
                {next ? t('progress.toNext', { missing: formatNumber(next.missing, lang, 1), level: levelName(next.level, lang) }) : t('progress.topLevel')}
                {!!w?.pending_points && <span className="ms-2 text-muted">— {t('child.waitingStars')}: {formatNumber(w.pending_points, lang)}</span>}
              </p>
            </>
          )}
        </div>
      </section>

      {/* today */}
      <section aria-labelledby="today">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="today" className="text-xl font-bold">{t('child.todayTasks')}</h2>
          <span className="text-sm text-muted">{formatDate(today, lang)}</span>
        </div>
        {allDone && <p className="mb-3 rounded-[var(--radius-card)] bg-leaf-100 px-4 py-3 font-semibold text-emerald-800 dark:bg-leaf-500/15 dark:text-leaf-100" role="status">{t('child.allDone')}</p>}
        {day.isPending ? (
          <div className="grid gap-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : day.isError ? (
          <ErrorState message={errorMessage(day.error)} onRetry={() => void day.refetch()} />
        ) : tasks.length === 0 ? (
          <p className="rounded-[var(--radius-card)] bg-surface p-6 text-center text-muted">{t('child.noTasks')}</p>
        ) : simple ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tasks.filter((x) => x.recurrence !== 'occasional').map((x) => <SimpleTaskTile key={x.task_id} task={x} date={today} />)}
          </ul>
        ) : (
          <ul className="grid gap-2">
            {tasks.filter((x) => x.recurrence !== 'occasional').map((x) => <ChildTaskRow key={x.task_id} task={x} date={today} readOnly={day.data?.week_finalized} />)}
          </ul>
        )}
        {!simple && tasks.some((x) => x.recurrence === 'occasional') && (
          <Link to="/child/tasks" className="mt-2 inline-flex items-center gap-1 text-sm text-plum-600 dark:text-plum-200">{t('child.occasional')} <ChevronLeft className="size-4 ltr:rotate-180" /></Link>
        )}
      </section>

      <InitiativeQuickLink />

      <section className="rounded-[var(--radius-card)] border-s-4 border-rose-500 bg-surface p-4">
        <p className="text-sm text-muted">{t('child.weeklyMessage')}</p>
        <p className="mt-1 text-lg font-medium">{pick(lang, w?.level?.message_ar, w?.level?.message_en) || message}</p>
      </section>

      {!simple && (
        <section aria-labelledby="badges">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="badges" className="text-xl font-bold">{t('child.achievementsTitle')}</h2>
            <Link to="/child/achievements" className="text-sm text-plum-600 dark:text-plum-200">{t('child.seeAll')}</Link>
          </div>
          {!earned.data?.length ? (
            <p className="flex items-center gap-2 text-muted"><Award className="size-5" /> {t('child.achievementsEmpty')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {earned.data.slice(0, 6).map((e) => {
                const d = defs.data?.find((x) => x.id === e.achievement_id);
                return d ? (
                  <li key={e.id} className="inline-flex items-center gap-2 rounded-full bg-gold-100 py-1.5 ps-2 pe-4 text-gold-800 dark:bg-gold-400/15 dark:text-gold-300">
                    <span className="text-xl" aria-hidden>{d.icon}</span> {pick(lang, d.name_ar, d.name_en)}
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
