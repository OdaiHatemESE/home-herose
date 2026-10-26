import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useChildren, useUpdateSettings } from '@/api/family';
import { useExemptions, useHolidays, useTasks } from '@/api/tasks';
import { useDeleteRow, useSaveRow } from '@/api/content';
import { pick } from '@/i18n';
import { formatDate, weekdayName } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/label';
import { Input, Select } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/brand/misc';
import { ChildName, ChildSelect, useChildMap } from '@/components/parent/shared';

export default function Schedule() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, settings, today } = useParent();
  const updateSettings = useUpdateSettings();
  const holidays = useHolidays(familyId);
  const exemptions = useExemptions(familyId);
  const children = useChildren(familyId);
  const childMap = useChildMap(children.data);
  const tasks = useTasks(familyId);
  const saveHoliday = useSaveRow('family_holidays', t('common.saved'));
  const delHoliday = useDeleteRow('family_holidays', t('common.deleted'));
  const saveExemption = useSaveRow('task_exemptions', t('common.saved'));
  const delExemption = useDeleteRow('task_exemptions', t('common.deleted'));
  const [holiday, setHoliday] = React.useState({ date: today, label: '' });
  const [exOpen, setExOpen] = React.useState(false);
  const [ex, setEx] = React.useState({ child: '', task: '', date: today, reason: '' });

  const toggleWeekend = (d: number) => {
    const next = settings.weekend_days.includes(d) ? settings.weekend_days.filter((x) => x !== d) : [...settings.weekend_days, d];
    updateSettings.mutate({ family_id: familyId, weekend_days: next }, { onSuccess: () => undefined });
  };

  return (
    <>
      <PageHeader title={t('schedule.title')} description={t('schedule.description')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('schedule.weekStart')}</CardTitle></CardHeader>
          <CardContent className="grid gap-5">
            <Select aria-label={t('schedule.weekStart')} value={settings.week_start_day} onChange={(e) => updateSettings.mutate({ family_id: familyId, week_start_day: Number(e.target.value) })}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{weekdayName(d, lang)}</option>)}
            </Select>
            <div>
              <p className="font-medium">{t('schedule.weekend')}</p>
              <p className="mb-2 text-sm text-muted">{t('schedule.weekendHint')}</p>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                  const on = settings.weekend_days.includes(d);
                  return (
                    <button key={d} type="button" aria-pressed={on} onClick={() => toggleWeekend(d)} className={cn('rounded-full px-3 py-1.5 text-sm', on ? 'bg-sky-500 text-white' : 'bg-surface-2')}>
                      {weekdayName(d, lang, 'short')}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('schedule.holidays')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveHoliday.mutate({ family_id: familyId, holiday_date: holiday.date, label: holiday.label || null }, { onSuccess: () => setHoliday({ date: today, label: '' }) });
              }}
            >
              <Field label={t('common.date')} htmlFor="h-date"><Input id="h-date" type="date" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} required /></Field>
              <Field label={t('schedule.holidayLabel')} htmlFor="h-label" className="flex-1"><Input id="h-label" value={holiday.label} onChange={(e) => setHoliday({ ...holiday, label: e.target.value })} /></Field>
              <Button type="submit" loading={saveHoliday.isPending}><Plus /> {t('common.add')}</Button>
            </form>
            {!holidays.data?.length ? (
              <p className="text-sm text-muted">{t('schedule.holidaysEmpty')}</p>
            ) : (
              <ul className="grid gap-1.5">
                {holidays.data.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-1.5 text-sm">
                    <span className="font-medium">{formatDate(h.holiday_date, lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="flex-1 text-muted">{h.label}</span>
                    <Button size="icon" variant="ghost" aria-label={t('common.delete')} onClick={() => delHoliday.mutate(h.id)}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{t('schedule.exemptions')}</CardTitle>
              <CardDescription>{t('schedule.exemptionsHint')}</CardDescription>
            </div>
            <Button variant="soft" onClick={() => { setEx({ child: children.data?.[0]?.id ?? '', task: '', date: today, reason: '' }); setExOpen(true); }}>
              <Plus /> {t('schedule.exemptionAdd')}
            </Button>
          </CardHeader>
          <CardContent>
            {!exemptions.data?.length ? (
              <p className="text-sm text-muted">{t('schedule.exemptionsEmpty')}</p>
            ) : (
              <ul className="grid gap-1.5">
                {exemptions.data.map((e) => {
                  const task = tasks.data?.find((x) => x.id === e.task_id);
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                      <ChildName child={childMap.get(e.child_id)} />
                      <span>{formatDate(e.exempt_date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="font-medium">{task ? pick(lang, task.title_ar, task.title_en) : t('schedule.wholeDay')}</span>
                      <span className="flex-1 text-muted">{e.reason}</span>
                      <Button size="icon" variant="ghost" aria-label={t('common.delete')} onClick={() => delExemption.mutate(e.id)}><Trash2 /></Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={exOpen} onOpenChange={setExOpen}>
        <DialogContent title={t('schedule.exemptionAdd')} description={t('schedule.exemptionsHint')}>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveExemption.mutate(
                { family_id: familyId, child_id: ex.child, task_id: ex.task || null, exempt_date: ex.date, reason: ex.reason || null },
                { onSuccess: () => setExOpen(false) },
              );
            }}
          >
            <Field label={t('common.child')} htmlFor="ex-child"><ChildSelect id="ex-child" kids={children.data ?? []} value={ex.child} onChange={(v) => setEx({ ...ex, child: v })} /></Field>
            <Field label={t('tasks.title')} htmlFor="ex-task">
              <Select id="ex-task" value={ex.task} onChange={(e) => setEx({ ...ex, task: e.target.value })}>
                <option value="">{t('schedule.wholeDay')}</option>
                {(tasks.data ?? []).filter((x) => x.is_active && x.assignments.some((a) => a.child_id === ex.child)).map((x) => (
                  <option key={x.id} value={x.id}>{pick(lang, x.title_ar, x.title_en)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('common.date')} htmlFor="ex-date"><Input id="ex-date" type="date" value={ex.date} onChange={(e) => setEx({ ...ex, date: e.target.value })} required /></Field>
            <Field label={t('common.reason')} htmlFor="ex-reason"><Input id="ex-reason" value={ex.reason} onChange={(e) => setEx({ ...ex, reason: e.target.value })} /></Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" loading={saveExemption.isPending} disabled={!ex.child}>{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
