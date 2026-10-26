import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Sparkles } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { initiativeApi, useInitiatives } from '@/api/initiatives';
import { useAction } from '@/api/core';
import { formatDate, formatNumber } from '@/lib/dates';
import type { InitiativeSubmission } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/controls';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { ChildName, ChildSelect, useChildMap } from '@/components/parent/shared';
import { EmptyState, PageHeader } from '@/components/brand/misc';
import { toast } from 'sonner';

export default function ParentInitiatives() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, settings, today } = useParent();
  const children = useChildren(familyId);
  const childMap = useChildMap(children.data);
  const pending = useInitiatives({ familyId, status: 'pending' });
  const history = useInitiatives({ familyId, limit: 100 });
  const [recordOpen, setRecordOpen] = React.useState(false);

  return (
    <>
      <PageHeader
        title={t('initiatives.title')}
        description={t('initiatives.description')}
        actions={
          <Button variant="soft" onClick={() => setRecordOpen(true)}>
            <Plus /> {t('initiatives.record')}
          </Button>
        }
      />
      <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold-100 px-3 py-1 text-sm text-gold-800 dark:bg-gold-400/15 dark:text-gold-300">
        <Sparkles className="size-4" aria-hidden /> {t('initiatives.capInfo', { cap: settings.initiative_daily_cap })}
      </p>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">{t('status.pending')} ({formatNumber(pending.data?.length ?? 0, lang)})</TabsTrigger>
          <TabsTrigger value="history">{t('initiatives.history')}</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {pending.isPending ? (
            <Skeleton className="h-32" />
          ) : !pending.data?.length ? (
            <EmptyState icon="💡" title={t('initiatives.parentEmpty')} />
          ) : (
            <ul className="grid gap-3">
              {pending.data.map((i) => (
                <li key={i.id}>
                  <InitiativeReview item={i} childName={<ChildName child={childMap.get(i.child_id)} />} defaultPoints={settings.initiative_points} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="history">
          <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-app bg-surface">
            {(history.data ?? []).filter((i) => i.status !== 'pending').map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <ChildName child={childMap.get(i.child_id)} />
                <span className="min-w-0 flex-1">{i.title}</span>
                <span className="text-muted">{formatDate(i.for_date, lang, { day: 'numeric', month: 'short' })}</span>
                {i.status === 'approved' ? (
                  <Badge tone="gold">✦ +{formatNumber(i.points_awarded ?? 0, lang)}</Badge>
                ) : (
                  <Badge>{t('status.rejected')}</Badge>
                )}
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
      <RecordInitiativeDialog open={recordOpen} onOpenChange={setRecordOpen} kids={children.data ?? []} today={today} />
    </>
  );
}

function InitiativeReview({ item, childName, defaultPoints }: { item: InitiativeSubmission; childName: React.ReactNode; defaultPoints: number }) {
  const { t, i18n } = useTranslation();
  const [points, setPoints] = React.useState(defaultPoints);
  const [note, setNote] = React.useState('');
  const review = useAction(initiativeApi.review, {
    success: (r, v) => (v.decision === 'reject' ? t('initiatives.rejected') : r.capped ? t('initiatives.approvedCapped') : t('initiatives.approved', { points: r.points_awarded ?? 0 })),
  });
  return (
    <article className="surface rounded-[var(--radius-card)] border-s-4 border-s-gold-400 p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        {childName}
        <span>{formatDate(item.for_date, i18n.language)}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
      {item.description && <p className="mt-1 text-muted">{item.description}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Field label={t('initiatives.points')} htmlFor={`p-${item.id}`}>
          <Input id={`p-${item.id}`} type="number" min={0} max={20} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
        </Field>
        <Field label={t('approvals.note')} htmlFor={`n-${item.id}`}>
          <Input id={`n-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="gold" loading={review.isPending} onClick={() => review.mutate({ id: item.id, decision: 'approve', points, note })}>
          <Check /> {t('initiatives.approve')}
        </Button>
        <Button variant="ghost" disabled={review.isPending} onClick={() => review.mutate({ id: item.id, decision: 'reject', note })}>
          {t('initiatives.reject')}
        </Button>
      </div>
    </article>
  );
}

function RecordInitiativeDialog({ open, onOpenChange, kids, today }: { open: boolean; onOpenChange: (o: boolean) => void; kids: import('@/lib/database.types').Child[]; today: string }) {
  const { t } = useTranslation();
  const [childId, setChildId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [date, setDate] = React.useState(today);
  const submit = useAction(initiativeApi.submit);
  React.useEffect(() => {
    if (open) {
      setChildId(kids[0]?.id ?? '');
      setTitle('');
      setDescription('');
      setDate(today);
    }
  }, [open, kids, today]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('initiatives.record')} description={t('initiatives.examples')}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate({ childId, title, description, date }, { onSuccess: () => { toast.success(t('common.saved')); onOpenChange(false); } });
          }}
        >
          <Field label={t('common.child')} htmlFor="ri-child">
            <ChildSelect id="ri-child" kids={kids} value={childId} onChange={setChildId} />
          </Field>
          <Field label={t('initiatives.whatDid')} htmlFor="ri-title">
            <Input id="ri-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
          </Field>
          <Field label={t('initiatives.moreDetails')} htmlFor="ri-desc">
            <Textarea id="ri-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label={t('common.date')} htmlFor="ri-date">
            <Input id="ri-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={submit.isPending} disabled={!childId || title.trim().length < 2}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
