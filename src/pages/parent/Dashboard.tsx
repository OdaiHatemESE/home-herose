import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, Copy, Gift, Lightbulb, ListTodo, UserPlus } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { useFamilyWeek, usePendingSubmissions, useSnapshots } from '@/api/progress';
import { useInitiatives } from '@/api/initiatives';
import { useFamilyTable, useNotes } from '@/api/content';
import { useFulfillments } from '@/api/rewards';
import { formatDate, formatMoney, formatNumber, weekStartFor, addDays } from '@/lib/dates';
import { colorHex } from '@/lib/chartColors';
import type { AchievementLevel, FamilyWeekRow } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/controls';
import { ChildAvatar, EmptyState, ErrorState, PageHeader, StarTally } from '@/components/brand/misc';
import { MedalTrack } from '@/components/brand/MedalTrack';
import { LevelBadge } from '@/components/brand/LevelBadge';
import { ChildChips, useChildMap } from '@/components/parent/shared';
import { ChildTodayCard } from '@/components/parent/TodayBoard';
import { errorMessage } from '@/lib/errors';

export default function ParentDashboard() {
  const { t, i18n } = useTranslation();
  const { familyId, family, settings, profile, today, membership } = useParent();
  const lang = i18n.language;
  const weekStart = weekStartFor(today, settings.week_start_day);
  const children = useChildren(familyId);
  const childMap = useChildMap(children.data);
  const week = useFamilyWeek(familyId, weekStart);
  const levels = useFamilyTable('achievement_levels', familyId, 'rank');
  const pending = usePendingSubmissions(familyId);
  const initiatives = useInitiatives({ familyId, status: 'pending' });
  const owed = useFulfillments({ familyId, open: true });
  const notes = useNotes({ familyId });
  const [childFilter, setChildFilter] = React.useState('');

  const visibleWeek = (week.data ?? []).filter((r) => !childFilter || r.child_id === childFilter);
  const visibleChildren = (children.data ?? []).filter((c) => !childFilter || c.id === childFilter);
  const followUps = (notes.data ?? []).filter((n) => n.follow_up && !n.follow_up_done && (!n.follow_up_due || n.follow_up_due <= today));
  const unpaid = (owed.data ?? []).filter((f) => f.payment_status === 'unpaid' && f.status !== 'cancelled').reduce((s, f) => s + Number(f.amount ?? 0), 0);

  if (children.data && children.data.length === 0) {
    return (
      <>
        <PageHeader title={t('dashboard.greeting', { name: profile?.display_name ?? membership.display_name ?? '' })} />
        <EmptyState
          icon="🏆"
          title={t('dashboard.noChildren')}
          action={
            <Button asChild>
              <Link to="/parent/family"><UserPlus /> {t('dashboard.addChildren')}</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('dashboard.greeting', { name: profile?.display_name ?? membership.display_name ?? '' })}
        description={formatDate(today, lang)}
        actions={
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(family.family_code).then(() => toast.success(t('common.copied')))}
            className="inline-flex items-center gap-2 rounded-full bg-gold-100 px-4 py-2 text-sm text-gold-800 dark:bg-gold-400/15 dark:text-gold-300"
            title={t('dashboard.familyCode')}
          >
            <span>{t('dashboard.familyCode')}</span>
            <span dir="ltr" className="font-bold tracking-[0.2em]">{family.family_code}</span>
            <Copy className="size-4" aria-hidden />
          </button>
        }
      />

      {children.data && children.data.length > 1 && (
        <div className="mb-5">
          <ChildChips children={children.data} value={childFilter} onChange={setChildFilter} />
        </div>
      )}

      {/* quick counters */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickLink to="/parent/approvals" icon={<ClipboardCheck />} label={t('dashboard.awaiting')} value={pending.data?.length} tone="purple" />
        <QuickLink to="/parent/initiatives" icon={<Lightbulb />} label={t('dashboard.initiativesPending')} value={initiatives.data?.length} tone="gold" />
        <QuickLink to="/parent/rewards" icon={<Gift />} label={t('rewards.unpaidTotal')} value={owed.data ? formatMoney(unpaid, family.currency, lang) : undefined} tone="pink" />
        <QuickLink to="/parent/notes" icon={<ListTodo />} label={t('dashboard.followUps')} value={notes.data ? followUps.length : undefined} tone="blue" />
      </div>

      {/* week progress per child */}
      <section aria-labelledby="week-progress" className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="week-progress" className="text-lg font-semibold">{t('dashboard.weekProgress')}</h2>
          <Link to="/parent/week" className="text-sm text-plum-600 hover:underline dark:text-plum-200">{t('nav.week')}</Link>
        </div>
        {week.isError ? (
          <ErrorState message={errorMessage(week.error)} onRetry={() => void week.refetch()} />
        ) : week.isPending ? (
          <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleWeek.map((row) => (
              <ChildWeekCard key={row.child_id} row={row} levels={levels.data ?? []} />
            ))}
          </div>
        )}
      </section>

      {/* today */}
      <section aria-labelledby="today" className="mb-8">
        <h2 id="today" className="mb-3 text-lg font-semibold">{t('dashboard.overview')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {visibleChildren.map((c) => (
            <ChildTodayCard key={c.id} child={c} date={today} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.awaiting')}</CardTitle>
            {!!pending.data?.length && (
              <Button asChild size="sm" variant="soft"><Link to="/parent/approvals">{t('dashboard.reviewAll')}</Link></Button>
            )}
          </CardHeader>
          <CardContent>
            {pending.isPending ? (
              <Skeleton className="h-24" />
            ) : !pending.data?.length ? (
              <p className="text-sm text-muted">{t('dashboard.awaitingEmpty')}</p>
            ) : (
              <ul className="grid gap-2">
                {pending.data.slice(0, 5).map((s) => {
                  const c = childMap.get(s.child_id);
                  return (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      {c && <ChildAvatar avatar={c.avatar} color={c.color} size="sm" />}
                      <span className="flex-1">{c?.display_name}</span>
                      <span className="text-muted">{formatDate(s.for_date, lang, { weekday: 'short' })}</span>
                      <span className="font-semibold">+{formatNumber(s.claimed_points, lang)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <TrendCard familyId={familyId} weekStart={weekStart} />
      </div>

      {followUps.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>{t('dashboard.followUps')}</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {followUps.slice(0, 6).map((n) => (
                <li key={n.id} className="flex gap-2">
                  <span className="font-medium">{n.child_id ? childMap.get(n.child_id)?.display_name : t('notes.familyWide')}:</span>
                  <span className="flex-1">{n.follow_up}</span>
                  {n.follow_up_due && <span className="text-muted">{formatDate(n.follow_up_due, lang, { day: 'numeric', month: 'short' })}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function QuickLink({ to, icon, label, value, tone }: { to: string; icon: React.ReactNode; label: string; value: React.ReactNode; tone: 'purple' | 'gold' | 'pink' | 'blue' }) {
  const { i18n } = useTranslation();
  const tones = {
    purple: 'text-plum-600 bg-plum-50 dark:bg-plum-500/15 dark:text-plum-200',
    gold: 'text-gold-800 bg-gold-50 dark:bg-gold-400/10 dark:text-gold-300',
    pink: 'text-rose-500 bg-rose-100/60 dark:bg-rose-500/10',
    blue: 'text-sky-500 bg-sky-100/60 dark:bg-sky-500/10',
  };
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3 transition-transform hover:-translate-y-0.5 ${tones[tone]}`}>
      <span className="[&_svg]:size-6" aria-hidden>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xl font-bold tabular-nums">
          {value === undefined ? '…' : typeof value === 'number' ? formatNumber(value, i18n.language) : value}
        </span>
        <span className="block truncate text-xs opacity-80">{label}</span>
      </span>
    </Link>
  );
}

export function ChildWeekCard({ row, levels }: { row: FamilyWeekRow; levels: AchievementLevel[] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const indepShare = row.approved_tasks ? Math.round((row.independent_tasks / row.approved_tasks) * 100) : null;
  return (
    <article className="surface rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-soft)]">
      <header className="flex items-center gap-3">
        <ChildAvatar avatar={row.avatar} color={row.color} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{row.display_name}</h3>
          <StarTally regular={Math.max(0, row.approved_points - row.initiative_points)} golden={row.initiative_points} className="text-sm" />
        </div>
        <div className="text-end">
          <div className="text-3xl font-bold tabular-nums">{row.percent === null ? '—' : `${formatNumber(row.percent, lang, 0)}%`}</div>
          <LevelBadge level={row.level} size="sm" />
        </div>
      </header>
      <MedalTrack percent={row.percent} levels={levels} />
      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-surface-2 py-2">
          <dt className="text-xs text-muted">{t('progress.approved')}</dt>
          <dd className="font-semibold tabular-nums">{formatNumber(row.approved_points, lang)}/{formatNumber(row.max_points, lang)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 py-2">
          <dt className="text-xs text-muted">{t('progress.pending')}</dt>
          <dd className="font-semibold tabular-nums">{formatNumber(row.pending_points, lang)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 py-2" title={t('dashboard.independenceHint')}>
          <dt className="text-xs text-muted">{t('dashboard.independenceTrend')}</dt>
          <dd className="font-semibold tabular-nums">{indepShare === null ? '—' : `${formatNumber(indepShare, lang)}%`}</dd>
        </div>
      </dl>
      {row.reminders_logged > 0 && (
        <p className="mt-2 text-xs text-muted">{t('progress.remindersLogged')}: {formatNumber(row.reminders_logged, lang)}</p>
      )}
    </article>
  );
}

function TrendCard({ familyId, weekStart }: { familyId: string; weekStart: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const children = useChildren(familyId);
  const snapshots = useSnapshots({ familyId, limit: 120 });
  const current = useFamilyWeek(familyId, weekStart);
  const data = React.useMemo(() => {
    const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart, -7 * (7 - i)));
    return weeks.map((ws) => {
      const point: Record<string, string | number | null> = { week: formatDate(ws, lang, { day: 'numeric', month: 'short' }) };
      for (const c of children.data ?? []) {
        const snap = snapshots.data?.find((s) => s.child_id === c.id && s.week_start === ws);
        const live = ws === weekStart ? current.data?.find((r) => r.child_id === c.id)?.percent : null;
        point[c.display_name] = snap?.percent != null ? Number(snap.percent) : live ?? null;
      }
      return point;
    });
  }, [weekStart, children.data, snapshots.data, current.data, lang]);

  return (
    <Card>
      <CardHeader><CardTitle>{t('dashboard.trends')}</CardTitle></CardHeader>
      <CardContent>
        <div className="h-56" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--muted)' }} reversed={lang === 'ar'} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted)' }} orientation={lang === 'ar' ? 'right' : 'left'} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(children.data ?? []).map((c) => (
                <Line key={c.id} type="monotone" dataKey={c.display_name} stroke={colorHex(c.color)} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
