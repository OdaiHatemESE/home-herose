import * as React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Star } from 'lucide-react';
import { useChildIdentity } from '@/auth/AuthProvider';
import { useChildDay } from '@/api/progress';
import { pick } from '@/i18n';
import { DynamicIcon, colorStyle } from '@/lib/icons';
import { formatDate, formatNumber } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox, Skeleton } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { ErrorState } from '@/components/brand/misc';
import { childTaskState, useCompleteTask } from '@/components/child/TaskPieces';

export default function ChildTaskDetail() {
  const { taskId = '' } = useParams();
  const [params] = useSearchParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const { child, today } = useChildIdentity();
  const date = params.get('date') ?? today;
  const day = useChildDay(child.id, date);
  const task = day.data?.tasks.find((x) => x.task_id === taskId);
  const [checks, setChecks] = React.useState<Record<string, boolean>>({});
  const [note, setNote] = React.useState('');
  const complete = useCompleteTask();

  React.useEffect(() => {
    if (task) {
      setChecks(task.submission?.checklist_state ?? {});
      setNote(task.submission?.child_note ?? '');
    }
  }, [task]);

  if (day.isPending) return <Skeleton className="h-64" />;
  if (day.isError) return <ErrorState message={t('errors.generic')} />;
  if (!task) return <ErrorState message={t('errors.not_scheduled')} />;

  const state = childTaskState(task);
  const editable = !day.data?.week_finalized && ['open', 'returned', 'rejected', 'progress'].includes(state);
  const total = task.checklist.length;
  const checked = task.checklist.filter((c) => checks[c.id]).length;
  const progress = total ? Math.round((checked / total) * 100) : 100;
  const style = colorStyle(task.color);
  const send = (mode: 'independent' | 'reminded', p = progress) =>
    complete.mutate(
      { taskId: task.task_id, date, mode, progress: p, checklist: checks, note: note || null },
      { onSuccess: (r) => r.status !== 'in_progress' && navigate('/child', { replace: true }) },
    );

  return (
    <article className="grid gap-5">
      <Link to="/child/tasks" className="inline-flex items-center gap-1 text-sm text-muted"><ChevronRight className="size-4 ltr:rotate-180" /> {t('common.back')}</Link>
      <header className="flex items-center gap-4">
        <span className={cn('grid size-16 place-items-center rounded-[var(--radius-card)]', style.tile)}><DynamicIcon name={task.icon} className="size-8" /></span>
        <div>
          <h1 className="text-2xl font-bold">{pick(lang, task.title_ar, task.title_en)}</h1>
          <p className="text-muted">{formatDate(date, lang)}</p>
        </div>
      </header>
      {task.description && <p className="text-lg">{task.description}</p>}
      {task.instructions && <p className="rounded-[var(--radius-card)] bg-surface-2 p-4">{task.instructions}</p>}
      {task.submission?.review_note && <p className="rounded-[var(--radius-card)] border-s-4 border-sky-500 bg-surface p-4">💬 {task.submission.review_note}</p>}

      {total > 0 && (
        <section aria-label={t('tasks.checklist')} className="grid gap-2">
          {task.checklist.map((c) => (
            <label key={c.id} className={cn('flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-4 text-lg', checks[c.id] ? 'border-leaf-500 bg-leaf-100/50 dark:bg-leaf-500/10' : 'border-app bg-surface')}>
              <Checkbox className="size-7" checked={!!checks[c.id]} disabled={!editable} onCheckedChange={(v) => setChecks({ ...checks, [c.id]: v === true })} />
              {c.label}
            </label>
          ))}
          <div className="h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('approvals.progress')}>
            <div className="h-full rounded-full bg-leaf-500 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </section>
      )}

      {editable && (
        <>
          <Field label={t('child.myNote')} htmlFor="td-note"><Textarea id="td-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="grid gap-2 sm:grid-cols-2">
            {progress < 100 ? (
              <Button size="lg" variant="soft" loading={complete.isPending} onClick={() => send('independent', progress)}>{t('child.saveProgress')}</Button>
            ) : (
              <>
                {task.reminder_count === 0 && (
                  <Button size="xl" variant="gold" loading={complete.isPending} onClick={() => send('independent')}>
                    <Star className="fill-current" /> {t('child.doneAlone')} +{formatNumber(task.base_points + task.independence_bonus, lang)}
                  </Button>
                )}
                {!task.is_religious && (
                  <Button size="xl" variant="soft" loading={complete.isPending} onClick={() => send('reminded')}>
                    {t('child.doneReminded')} +{formatNumber(task.base_points, lang)}
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}
      {!editable && state !== 'open' && (
        <p className="rounded-[var(--radius-card)] bg-surface-2 p-4 text-center font-semibold">
          {state === 'done' ? t('child.approvedPts', { points: formatNumber(task.submission?.awarded_points ?? 0, lang) }) : t('child.waiting')}
        </p>
      )}
    </article>
  );
}
