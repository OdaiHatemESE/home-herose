import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, ChevronLeft, ChevronRight, FileText, PlusCircle, Trophy } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { scoreApi, useFamilyWeek } from '@/api/progress';
import { useFamilyTable } from '@/api/content';
import { useAction } from '@/api/core';
import { addDays, formatDate, formatDateTime, formatNumber, weekStartFor } from '@/lib/dates';
import { celebrate } from '@/components/brand/celebrate';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/controls';
import { useConfirm } from '@/components/ui/confirm';
import { Badge } from '@/components/ui/badge';
import { ErrorState, PageHeader } from '@/components/brand/misc';
import { AdjustPointsDialog } from '@/components/parent/AdjustPointsDialog';
import { ChildWeekCard } from './Dashboard';
import { errorMessage } from '@/lib/errors';
import type { Child } from '@/lib/database.types';

export default function WeekResults() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, family, settings, today } = useParent();
  const current = weekStartFor(today, settings.week_start_day);
  const [weekStart, setWeekStart] = React.useState(current);
  const week = useFamilyWeek(familyId, weekStart);
  const levels = useFamilyTable('achievement_levels', familyId, 'rank');
  const skills = useFamilyTable('skills', familyId, 'sort_order');
  const children = useChildren(familyId);
  const confirm = useConfirm();
  const [adjustChild, setAdjustChild] = React.useState<Child | null>(null);
  const finalize = useAction(scoreApi.finalizeWeek, {
    success: () => {
      celebrate('big');
      return t('week.finalized');
    },
  });

  const rows = week.data ?? [];
  const pendingCount = rows.reduce((s, r) => s + r.pending_tasks + r.initiatives_pending, 0);
  const allFinal = rows.length > 0 && rows.every((r) => r.snapshot);
  const isFuture = weekStart > today;

  return (
    <>
      <PageHeader
        title={t('week.title')}
        description={t('week.description')}
        actions={
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t('common.previousWeek')}>
              <ChevronRight className="ltr:rotate-180" />
            </Button>
            <span className="px-2 text-sm font-medium">{t('reports.weekOf', { date: formatDate(weekStart, lang, { day: 'numeric', month: 'long' }) })}</span>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))} disabled={weekStart >= current} aria-label={t('common.nextWeek')}>
              <ChevronLeft className="ltr:rotate-180" />
            </Button>
          </div>
        }
      />

      {pendingCount > 0 && !allFinal && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-gold-400/50 bg-gold-50 px-4 py-3 text-sm text-gold-800 dark:bg-gold-400/10 dark:text-gold-300">
          <span>{t('week.pendingWarning', { count: pendingCount })}</span>
          <Button asChild size="sm" variant="outline"><Link to="/parent/approvals">{t('week.reviewFirst')}</Link></Button>
        </div>
      )}

      {week.isError ? (
        <ErrorState message={errorMessage(week.error)} onRetry={() => void week.refetch()} />
      ) : week.isPending ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-60" /><Skeleton className="h-60" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <div key={r.child_id} className="grid gap-2">
              <ChildWeekCard row={r} levels={levels.data ?? []} />
              <div className="flex flex-wrap items-center gap-2 px-1 text-sm">
                {r.snapshot ? (
                  <Badge tone="green"><Trophy /> {t('week.alreadyFinalized', { date: formatDateTime(r.snapshot.finalized_at, lang, family.timezone) })}</Badge>
                ) : (
                  <Badge>{t('week.notFinalized')}</Badge>
                )}
                <span className="flex-1" />
                {!r.snapshot && (
                  <Button size="sm" variant="ghost" onClick={() => setAdjustChild(children.data?.find((c) => c.id === r.child_id) ?? null)}>
                    <PlusCircle /> {t('points.adjust')}
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost">
                  <Link to={`/parent/print/weekly?child=${r.child_id}&week=${weekStart}`}><FileText /> {t('week.printSheet')}</Link>
                </Button>
                {r.snapshot && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/parent/print/certificate?child=${r.child_id}&week=${weekStart}`}><Award /> {t('week.certificate')}</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!allFinal && !isFuture && rows.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button
            size="xl"
            variant="gold"
            loading={finalize.isPending}
            onClick={async () => {
              const ok = await confirm({
                title: t('week.finalizeConfirmTitle'),
                description: t('week.finalizeConfirmBody', { pending: formatNumber(pendingCount, lang) }),
                confirmLabel: t('week.finalize'),
              });
              if (ok) finalize.mutate({ familyId, weekStart });
            }}
          >
            <Trophy /> {t('week.finalize')}
          </Button>
        </div>
      )}
      <AdjustPointsDialog open={!!adjustChild} onOpenChange={(o) => !o && setAdjustChild(null)} child={adjustChild} skills={skills.data ?? []} today={today} />
    </>
  );
}
