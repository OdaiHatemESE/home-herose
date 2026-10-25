import { useTranslation } from 'react-i18next';
import { BellRing, Check, CircleDashed, Clock3 } from 'lucide-react';
import type { Child, DayTask } from '@/lib/database.types';
import { pick } from '@/i18n';
import { DynamicIcon, colorStyle } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/dates';
import { scoreApi, useChildDay } from '@/api/progress';
import { useAction } from '@/api/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/controls';
import { ChildAvatar, ErrorState } from '@/components/brand/misc';
import { errorMessage } from '@/lib/errors';

export function taskState(task: DayTask): 'done' | 'pending' | 'open' | 'progress' {
  const s = task.submission?.status;
  if (s === 'approved') return 'done';
  if (s === 'pending') return 'pending';
  if (s === 'in_progress') return 'progress';
  return 'open';
}

/** One child's tasks for a day, with parent quick actions (remind / record completion). */
export function ChildTodayCard({ child, date }: { child: Child; date: string }) {
  const { t, i18n } = useTranslation();
  const day = useChildDay(child.id, date);
  const remind = useAction(scoreApi.remind, { success: t('dashboard.reminded', { count: 1 }) });
  const record = useAction(scoreApi.submit);

  const tasks = day.data?.tasks ?? [];
  const counted = tasks.filter((x) => x.counts_toward_max);
  const done = counted.filter((x) => taskState(x) === 'done').length;
  const pending = counted.filter((x) => taskState(x) === 'pending').length;

  return (
    <section className="surface rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)]" aria-label={child.display_name}>
      <header className="flex items-center gap-3">
        <ChildAvatar avatar={child.avatar} color={child.color} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{child.display_name}</h3>
          <p className="text-sm text-muted">
            {formatNumber(done, i18n.language)}/{formatNumber(counted.length, i18n.language)} {t('dashboard.todayDone')}
            {pending > 0 && ` — ${formatNumber(pending, i18n.language)} ${t('dashboard.todayPending')}`}
          </p>
        </div>
      </header>
      {day.isPending ? (
        <div className="mt-3 grid gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : day.isError ? (
        <div className="mt-3"><ErrorState message={errorMessage(day.error)} onRetry={() => void day.refetch()} /></div>
      ) : tasks.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t('child.noTasks')}</p>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {tasks.map((task) => {
            const state = taskState(task);
            const style = colorStyle(task.color);
            return (
              <li key={task.task_id} className="flex items-center gap-2.5 rounded-[var(--radius-control)] bg-surface-2 px-2.5 py-2">
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', style.tile)}>
                  <DynamicIcon name={task.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{pick(i18n.language, task.title_ar, task.title_en)}</span>
                {task.reminder_count > 0 && (
                  <Badge tone="pink" title={t('progress.remindersLogged')}>
                    <BellRing /> {formatNumber(task.reminder_count, i18n.language)}
                  </Badge>
                )}
                {state === 'done' ? (
                  <Badge tone="green"><Check /> +{formatNumber(task.submission?.awarded_points ?? 0, i18n.language)}</Badge>
                ) : state === 'pending' ? (
                  <Badge tone="gold"><Clock3 /> {t('status.pending')}</Badge>
                ) : (
                  <span className="flex items-center gap-1">
                    {state === 'progress' && <Badge tone="blue"><CircleDashed /> {task.submission?.progress}%</Badge>}
                    {!task.is_religious && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => remind.mutate({ childId: child.id, taskId: task.task_id, date })}
                        disabled={remind.isPending}
                        aria-label={`${t('dashboard.remind')} — ${pick(i18n.language, task.title_ar, task.title_en)}`}
                      >
                        <BellRing />
                        <span className="hidden sm:inline">{t('dashboard.remind')}</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="soft"
                      className="h-8 px-2"
                      onClick={() => record.mutate({ taskId: task.task_id, date, childId: child.id, mode: task.reminder_count > 0 ? 'reminded' : 'independent' })}
                      disabled={record.isPending}
                      aria-label={`${t('dashboard.markForChild')} — ${pick(i18n.language, task.title_ar, task.title_en)}`}
                    >
                      <Check />
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

