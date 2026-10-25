import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BellRing, Check, CheckCheck, MessageSquareText, RotateCcw, Undo2, X } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { useTasks } from '@/api/tasks';
import { scoreApi, usePendingSubmissions, useRecentApproved } from '@/api/progress';
import { useAction } from '@/api/core';
import { supabase } from '@/lib/supabase';
import { pick } from '@/i18n';
import { formatDate, formatNumber } from '@/lib/dates';
import { DynamicIcon, colorStyle } from '@/lib/icons';
import { taskPoints } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import type { CompletionMode, TaskSubmission } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Segmented, Skeleton } from '@/components/ui/controls';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/label';
import { useConfirm } from '@/components/ui/confirm';
import { ChildChips, ChildName, useChildMap } from '@/components/parent/shared';
import { EmptyState, ErrorState, PageHeader } from '@/components/brand/misc';
import { errorMessage } from '@/lib/errors';

export default function Approvals() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId } = useParent();
  const children = useChildren(familyId, { includeInactive: true });
  const childMap = useChildMap(children.data);
  const tasks = useTasks(familyId);
  const pending = usePendingSubmissions(familyId);
  const recent = useRecentApproved(familyId);
  const confirm = useConfirm();
  const [childFilter, setChildFilter] = React.useState('');
  const bulk = useAction(async (ids: string[]) => {
    for (const id of ids) await scoreApi.review({ id, decision: 'approve' });
  }, { success: t('approvals.approved') });

  const taskMap = React.useMemo(() => new Map((tasks.data ?? []).map((x) => [x.id, x])), [tasks.data]);
  const items = (pending.data ?? []).filter((s) => !childFilter || s.child_id === childFilter);
  const plainPending = items.filter((s) => s.status === 'pending');

  return (
    <>
      <PageHeader
        title={t('approvals.title')}
        description={t('approvals.description')}
        actions={
          plainPending.length > 1 && (
            <Button
              variant="success"
              loading={bulk.isPending}
              onClick={async () => {
                if (await confirm({ title: t('approvals.approveAll'), description: t('approvals.approveAllConfirm', { count: plainPending.length }) })) {
                  bulk.mutate(plainPending.map((s) => s.id));
                }
              }}
            >
              <CheckCheck /> {t('approvals.approveAll')}
            </Button>
          )
        }
      />
      {children.data && children.data.length > 1 && (
        <div className="mb-5">
          <ChildChips children={children.data.filter((c) => c.is_active)} value={childFilter} onChange={setChildFilter} />
        </div>
      )}

      {pending.isError ? (
        <ErrorState message={errorMessage(pending.error)} onRetry={() => void pending.refetch()} />
      ) : pending.isPending ? (
        <div className="grid gap-3"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon="✅" title={t('approvals.empty')} />
      ) : (
        <ul className="grid gap-3">
          {items.map((s) => {
            const task = taskMap.get(s.task_id);
            return (
              <li key={s.id}>
                <SubmissionCard
                  submission={s}
                  childName={<ChildName child={childMap.get(s.child_id)} />}
                  title={task ? pick(lang, task.title_ar, task.title_en) : '…'}
                  icon={task?.icon}
                  color={task?.color}
                  checklist={task?.checklist ?? []}
                />
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-10" aria-labelledby="recent">
        <h2 id="recent" className="mb-3 text-lg font-semibold">{t('approvals.recent')}</h2>
        <RecentApproved
          rows={(recent.data ?? []).filter((s) => !childFilter || s.child_id === childFilter)}
          renderChild={(id) => <ChildName child={childMap.get(id)} />}
          titleOf={(id) => {
            const task = taskMap.get(id);
            return task ? pick(lang, task.title_ar, task.title_en) : '…';
          }}
        />
      </section>
    </>
  );
}

function SubmissionCard({ submission: s, childName, title, icon, color, checklist }: {
  submission: TaskSubmission;
  childName: React.ReactNode;
  title: string;
  icon?: string;
  color?: string;
  checklist: { id: string; label: string }[];
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [mode, setMode] = React.useState<CompletionMode>(s.reminder_count > 0 ? 'reminded' : s.claimed_mode);
  const [note, setNote] = React.useState('');
  const review = useAction(scoreApi.review, {
    success: (_r, v) => t(v.decision === 'approve' ? 'approvals.approved' : v.decision === 'reject' ? 'approvals.rejected' : 'approvals.returned'),
  });
  const sampled = s.status === 'approved' && s.needs_review;
  const award = taskPoints(s.base_points_snapshot, s.independence_bonus_snapshot, mode);

  return (
    <article className={cn('surface rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)] sm:p-5', sampled && 'border-gold-400')}>
      <div className="flex flex-wrap items-start gap-3">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)]', colorStyle(color).tile)}>
          <DynamicIcon name={icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {childName}
            <span>{formatDate(s.for_date, lang)}</span>
            {s.revision > 1 && <Badge tone="blue"><RotateCcw /> {formatNumber(s.revision, lang)}</Badge>}
          </div>
        </div>
        {sampled ? (
          <Badge tone="gold">{t('approvals.sampled')}</Badge>
        ) : (
          <Badge tone="purple">{t('approvals.claimed', { mode: t(s.claimed_mode === 'independent' ? 'progress.independent' : 'progress.reminded') })}</Badge>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        {s.reminder_count > 0 && (
          <p className="flex items-center gap-1.5 text-rose-500"><BellRing className="size-4" /> {t('approvals.reminders', { count: s.reminder_count })}</p>
        )}
        {checklist.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label={t('approvals.checklist')}>
            {checklist.map((c) => (
              <li key={c.id}>
                <Badge tone={s.checklist_state?.[c.id] ? 'green' : 'neutral'}>
                  {s.checklist_state?.[c.id] ? <Check /> : <X />} {c.label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {s.child_note && (
          <p className="flex items-start gap-1.5 rounded-lg bg-surface-2 px-3 py-2">
            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted" /> {s.child_note}
          </p>
        )}
      </div>

      {sampled ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="success" size="sm" onClick={() => review.mutate({ id: s.id, decision: 'approve' })} loading={review.isPending}>
            <Check /> {t('approvals.confirmSample')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => review.mutate({ id: s.id, decision: 'return', note })}>
            <Undo2 /> {t('approvals.return')}
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 border-t border-app pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label={t('approvals.mode')}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'independent', label: t('progress.independent') },
                { value: 'reminded', label: t('progress.reminded') },
              ]}
            />
            <span className="text-sm font-medium text-leaf-500">{t('approvals.awardPreview', { points: t('common.pointsCount', { count: award }) })}</span>
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('approvals.note')} aria-label={t('approvals.note')} />
          <div className="flex flex-wrap gap-2">
            <Button variant="success" onClick={() => review.mutate({ id: s.id, decision: 'approve', mode, note })} loading={review.isPending}>
              <Check /> {t('approvals.approve')}
            </Button>
            <Button variant="outline" onClick={() => review.mutate({ id: s.id, decision: 'return', note })} disabled={review.isPending}>
              <Undo2 /> {t('approvals.return')}
            </Button>
            <Button variant="ghost" className="text-red-600" onClick={() => review.mutate({ id: s.id, decision: 'reject', note })} disabled={review.isPending}>
              <X /> {t('approvals.reject')}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

function RecentApproved({ rows, renderChild, titleOf }: {
  rows: TaskSubmission[];
  renderChild: (id: string) => React.ReactNode;
  titleOf: (taskId: string) => string;
}) {
  const { t, i18n } = useTranslation();
  const [target, setTarget] = React.useState<TaskSubmission | null>(null);
  const [reason, setReason] = React.useState('');
  const events = useQuery({
    queryKey: ['points', 'for-submissions', rows.map((r) => r.id)],
    enabled: rows.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('point_events').select('id, source_id, source_revision, kind, reverses_event_id').in('source_id', rows.map((r) => r.id));
      if (error) throw error;
      return data;
    },
  });
  const reverse = useAction(scoreApi.reverse, { success: t('approvals.returned') });

  if (rows.length === 0) return <p className="text-sm text-muted">—</p>;
  const eventFor = (s: TaskSubmission) =>
    events.data?.find((e) => e.source_id === s.id && e.source_revision === s.revision && e.kind === 'task' && !events.data?.some((r) => r.reverses_event_id === e.id));

  return (
    <>
      <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-app bg-surface">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            {renderChild(s.child_id)}
            <span className="min-w-0 flex-1 truncate">{titleOf(s.task_id)}</span>
            <span className="text-muted">{formatDate(s.for_date, i18n.language, { day: 'numeric', month: 'short' })}</span>
            <Badge tone="green">+{formatNumber(s.awarded_points ?? 0, i18n.language)}</Badge>
            {eventFor(s) && (
              <Button size="sm" variant="ghost" onClick={() => { setTarget(s); setReason(''); }}>
                <Undo2 /> {t('approvals.reverse')}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent title={t('approvals.reverseTitle')} description={t('approvals.reverseBody')}>
          <Field label={t('common.reason')} htmlFor="rev-reason">
            <Textarea id="rev-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              disabled={reason.trim().length < 3}
              loading={reverse.isPending}
              onClick={() => {
                const ev = target && eventFor(target);
                if (ev) reverse.mutate({ eventId: ev.id, reason }, { onSuccess: () => setTarget(null) });
              }}
            >
              {t('approvals.reverse')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
