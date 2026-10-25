import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, Clock3, RotateCcw, Sparkles, Star } from 'lucide-react';
import type { CompletionMode, DayTask } from '@/lib/database.types';
import { pick } from '@/i18n';
import { DynamicIcon, colorStyle } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/dates';
import { scoreApi } from '@/api/progress';
import { useAction } from '@/api/core';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { celebrate } from '@/components/brand/celebrate';

export type ChildTaskState = 'done' | 'pending' | 'returned' | 'rejected' | 'progress' | 'open';

export function childTaskState(task: DayTask): ChildTaskState {
  switch (task.submission?.status) {
    case 'approved': return 'done';
    case 'pending': return 'pending';
    case 'returned': return 'returned';
    case 'rejected': return 'rejected';
    case 'in_progress': return 'progress';
    default: return 'open';
  }
}

/** Submits a task; the server decides the points. */
export function useCompleteTask() {
  const { t } = useTranslation();
  return useAction(scoreApi.submit, {
    success: (r) => {
      if (r.status === 'approved') {
        celebrate('small');
        return t('child.submittedAuto', { points: r.awarded_points ?? 0 });
      }
      return r.status === 'in_progress' ? t('child.progressSaved') : t('child.submitted');
    },
  });
}

/** Asks how the task was done, then submits. Tasks with a checklist open the detail page instead. */
export function CompleteSheet({ task, date, open, onOpenChange }: { task: DayTask; date: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const [note, setNote] = React.useState('');
  const complete = useCompleteTask();
  const forcedReminded = task.reminder_count > 0;
  const submit = (mode: CompletionMode) =>
    complete.mutate({ taskId: task.task_id, date, mode, note: note || null }, { onSuccess: () => { setNote(''); onOpenChange(false); } });
  const title = pick(i18n.language, task.title_ar, task.title_en);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={t('child.howDidYouDo')}>
        <div className="grid gap-3">
          {!forcedReminded && !task.is_religious && (
            <Button size="xl" variant="gold" loading={complete.isPending} onClick={() => submit('independent')}>
              <Star className="fill-current" /> {t('child.doneAlone')}
              <span className="text-sm opacity-80">+{formatNumber(task.base_points + task.independence_bonus, i18n.language)}</span>
            </Button>
          )}
          {task.is_religious ? (
            <Button size="xl" variant="gold" loading={complete.isPending} onClick={() => submit('independent')}>
              <Check /> {t('child.done')}
            </Button>
          ) : (
            <Button size="lg" variant="soft" loading={complete.isPending && forcedReminded} onClick={() => submit('reminded')}>
              {t('child.doneReminded')} <span className="text-sm opacity-80">+{formatNumber(task.base_points, i18n.language)}</span>
            </Button>
          )}
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('child.myNote')} aria-label={t('child.myNote')} maxLength={500} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatePill({ task }: { task: DayTask }) {
  const { t, i18n } = useTranslation();
  const s = childTaskState(task);
  if (s === 'done') return <span className="inline-flex items-center gap-1 rounded-full bg-leaf-500 px-2.5 py-1 text-sm font-semibold text-white">{t('child.approvedPts', { points: formatNumber(task.submission?.awarded_points ?? 0, i18n.language) })}</span>;
  if (s === 'pending') return <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1 text-sm text-gold-800 dark:bg-gold-400/15 dark:text-gold-300"><Clock3 className="size-4" /> {t('child.waiting')}</span>;
  if (s === 'returned') return <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-sm text-sky-500 dark:bg-sky-500/15"><RotateCcw className="size-4" /> {t('child.returned')}</span>;
  if (s === 'rejected') return <span className="rounded-full bg-surface-2 px-2.5 py-1 text-sm text-muted">{t('child.notApproved')}</span>;
  if (s === 'progress') return <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sm text-sky-500 dark:bg-sky-500/15">{task.submission?.progress}%</span>;
  return null;
}

export function ChildTaskRow({ task, date, readOnly }: { task: DayTask; date: string; readOnly?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const s = childTaskState(task);
  const canAct = !readOnly && (s === 'open' || s === 'returned' || s === 'rejected' || s === 'progress');
  const needsDetail = task.checklist.length > 0;
  const style = colorStyle(task.color);

  return (
    <li className={cn('surface flex items-center gap-3 rounded-[var(--radius-card)] p-3 transition-colors', s === 'done' && 'border-leaf-500/50 bg-leaf-100/40 dark:bg-leaf-500/10')}>
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-[var(--radius-control)]', style.tile)}>
        <DynamicIcon name={task.icon} className="size-6" />
      </span>
      <Link to={`/child/tasks/${task.task_id}?date=${date}`} className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{pick(i18n.language, task.title_ar, task.title_en)}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          {task.is_religious ? t('child.privateTask') : `+${formatNumber(task.base_points + task.independence_bonus, i18n.language)} ⭐`}
          {task.submission?.review_note && <span className="truncate">«{task.submission.review_note}»</span>}
        </span>
      </Link>
      <StatePill task={task} />
      {canAct && (needsDetail ? (
        <Button asChild size="icon" variant="soft" aria-label={pick(i18n.language, task.title_ar, task.title_en)}>
          <Link to={`/child/tasks/${task.task_id}?date=${date}`}><ChevronLeft className="ltr:rotate-180" /></Link>
        </Button>
      ) : (
        <Button size="md" variant="success" onClick={() => setOpen(true)} className="shrink-0">
          <Check /> {s === 'returned' || s === 'rejected' ? t('child.tryAgain') : t('child.done')}
        </Button>
      ))}
      {canAct && !needsDetail && <CompleteSheet task={task} date={date} open={open} onOpenChange={setOpen} />}
    </li>
  );
}

/** Large icon tile for young children: tap the star when finished. */
export function SimpleTaskTile({ task, date }: { task: DayTask; date: string }) {
  const { t, i18n } = useTranslation();
  const complete = useCompleteTask();
  const s = childTaskState(task);
  const done = s === 'done' || s === 'pending';
  const style = colorStyle(task.color);
  return (
    <li>
      <button
        type="button"
        disabled={done || complete.isPending}
        onClick={() => {
          if (done) return;
          complete.mutate({ taskId: task.task_id, date, mode: task.reminder_count > 0 ? 'reminded' : 'independent' });
        }}
        className={cn(
          'relative flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-hero)] p-3 text-center shadow-[var(--shadow-soft)] transition-transform active:scale-95',
          done ? 'bg-leaf-500 text-white' : cn('bg-surface', style.text),
        )}
        aria-label={`${pick(i18n.language, task.title_ar, task.title_en)} — ${done ? t('child.done') : t('child.simpleHint')}`}
      >
        <DynamicIcon name={task.icon} className="size-14" strokeWidth={1.75} />
        <span className={cn('text-base font-semibold leading-tight', done ? 'text-white' : 'text-fg')}>{pick(i18n.language, task.title_ar, task.title_en)}</span>
        <span className="absolute top-3 end-3 text-3xl" aria-hidden>
          {s === 'done' ? '⭐' : s === 'pending' ? '⏳' : '☆'}
        </span>
      </button>
    </li>
  );
}

export function InitiativeQuickLink() {
  const { t } = useTranslation();
  return (
    <Link to="/child/initiatives" className="flex items-center gap-3 rounded-[var(--radius-card)] bg-gradient-to-br from-gold-100 to-gold-300/70 p-4 text-gold-800 shadow-[var(--shadow-soft)] dark:from-gold-400/20 dark:to-gold-600/20 dark:text-gold-300">
      <Sparkles className="size-8 shrink-0" aria-hidden />
      <span className="flex-1">
        <span className="block font-semibold">{t('initiatives.childIntro')}</span>
        <span className="block text-sm opacity-80">{t('stars.golden')}</span>
      </span>
      <ChevronLeft className="size-5 ltr:rotate-180" aria-hidden />
    </Link>
  );
}

