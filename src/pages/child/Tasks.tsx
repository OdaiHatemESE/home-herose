import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useChildIdentity } from '@/auth/AuthProvider';
import { useChildDay } from '@/api/progress';
import { addDays, formatDate } from '@/lib/dates';
import { Segmented, Skeleton } from '@/components/ui/controls';
import { ErrorState, PageHeader } from '@/components/brand/misc';
import { ChildTaskRow, SimpleTaskTile } from '@/components/child/TaskPieces';
import { errorMessage } from '@/lib/errors';

export default function ChildTasks() {
  const { t, i18n } = useTranslation();
  const { child, today } = useChildIdentity();
  const [offset, setOffset] = React.useState<'0' | '1' | '2'>('0');
  const date = addDays(today, -Number(offset));
  const day = useChildDay(child.id, date);
  const tasks = day.data?.tasks ?? [];
  const groups = [
    { key: 'daily', title: t('child.todayTasks'), items: tasks.filter((x) => ['daily', 'weekdays', 'one_time'].includes(x.recurrence)) },
    { key: 'weekly', title: t('child.weekly'), items: tasks.filter((x) => x.recurrence === 'weekly') },
    { key: 'occasional', title: t('child.occasional'), items: tasks.filter((x) => x.recurrence === 'occasional') },
  ];
  return (
    <>
      <PageHeader title={t('nav.myTasks')} description={formatDate(date, i18n.language)} />
      <Segmented
        className="mb-5"
        label={t('common.date')}
        value={offset}
        onChange={setOffset}
        options={[
          { value: '0', label: t('common.today') },
          { value: '1', label: formatDate(addDays(today, -1), i18n.language, { weekday: 'long' }) },
          { value: '2', label: formatDate(addDays(today, -2), i18n.language, { weekday: 'long' }) },
        ]}
      />
      {day.isPending ? (
        <div className="grid gap-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : day.isError ? (
        <ErrorState message={errorMessage(day.error)} onRetry={() => void day.refetch()} />
      ) : tasks.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-6 text-center text-muted">{t('child.noTasks')}</p>
      ) : (
        <div className="grid gap-6">
          {day.data?.week_finalized && <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">{t('errors.week_finalized')}</p>}
          {groups.filter((g) => g.items.length).map((g) => (
            <section key={g.key} aria-label={g.title}>
              <h2 className="mb-2 text-lg font-semibold">{g.title}</h2>
              {child.ui_mode === 'simple' ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{g.items.map((x) => <SimpleTaskTile key={x.task_id} task={x} date={date} />)}</ul>
              ) : (
                <ul className="grid gap-2">{g.items.map((x) => <ChildTaskRow key={x.task_id} task={x} date={date} readOnly={day.data?.week_finalized} />)}</ul>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
