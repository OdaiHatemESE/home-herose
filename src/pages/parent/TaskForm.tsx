import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type { Child, RecurrenceType, TaskCategory, TaskPriority } from '@/lib/database.types';
import { pick } from '@/i18n';
import { ICON_KEYS, DynamicIcon, COLOR_KEYS, colorStyle } from '@/lib/icons';
import { weekdayName } from '@/lib/dates';
import { cn, uid } from '@/lib/utils';
import { taskApi, activeAssignees, pointsOn, type TaskWithMeta } from '@/api/tasks';
import { useAction } from '@/api/core';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Checkbox, SwitchRow } from '@/components/ui/controls';
import { ChildAvatar } from '@/components/brand/misc';

type FormState = {
  title_ar: string;
  title_en: string;
  description: string;
  instructions: string;
  category_id: string;
  icon: string;
  color: string;
  priority: TaskPriority;
  recurrence: RecurrenceType;
  weekdays: number[];
  one_time_date: string;
  start_date: string;
  end_date: string;
  school_only: boolean;
  is_religious: boolean;
  requires_verification: boolean;
  auto_approve: boolean;
  review_sample_rate: number;
  checklist: { id: string; label: string }[];
  min_age: string;
  max_age: string;
  base: number;
  bonus: number;
  effective_from: string;
  childIds: string[];
};

function fromTask(task: TaskWithMeta | null, today: string, defaults: { base: number; bonus: number }): FormState {
  const pts = task ? pointsOn(task.versions, today) : null;
  return {
    title_ar: task?.title_ar ?? '',
    title_en: task?.title_en ?? '',
    description: task?.description ?? '',
    instructions: task?.instructions ?? '',
    category_id: task?.category_id ?? '',
    icon: task?.icon ?? 'check-circle',
    color: task?.color ?? 'blue',
    priority: task?.priority ?? 'normal',
    recurrence: task?.recurrence ?? 'daily',
    weekdays: task?.weekdays ?? [],
    one_time_date: task?.one_time_date ?? today,
    start_date: task?.start_date ?? today,
    end_date: task?.end_date ?? '',
    school_only: task?.school_only ?? false,
    is_religious: task?.is_religious ?? false,
    requires_verification: task?.requires_verification ?? true,
    auto_approve: task?.auto_approve ?? false,
    review_sample_rate: Number(task?.review_sample_rate ?? 0),
    checklist: task?.checklist ?? [],
    min_age: task?.min_age != null ? String(task.min_age) : '',
    max_age: task?.max_age != null ? String(task.max_age) : '',
    base: pts?.base_points ?? defaults.base,
    bonus: pts?.independence_bonus ?? defaults.bonus,
    effective_from: today,
    childIds: task ? activeAssignees(task.assignments, today) : [],
  };
}

export function TaskFormDialog({ open, onOpenChange, task, familyId, children, categories, today, defaults }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: TaskWithMeta | null;
  familyId: string;
  children: Child[];
  categories: TaskCategory[];
  today: string;
  defaults: { base: number; bonus: number };
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [f, setF] = React.useState<FormState>(() => fromTask(task, today, defaults));
  const save = useAction(taskApi.save, { success: t('tasks.saved') });
  React.useEffect(() => {
    if (open) setF(fromTask(task, today, defaults));
  }, [open, task, today, defaults]);
  const set = (p: Partial<FormState>) => setF((prev) => ({ ...prev, ...p }));
  const original = task ? pointsOn(task.versions, today) : null;
  const pointsChanged = !!task && (original?.base_points !== f.base || original?.independence_bonus !== f.bonus);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title_ar: f.title_ar.trim(),
      title_en: f.title_en.trim(),
      description: f.description.trim() || null,
      instructions: f.instructions.trim() || null,
      category_id: f.category_id || null,
      icon: f.icon,
      color: f.color,
      priority: f.priority,
      recurrence: f.recurrence,
      weekdays: f.recurrence === 'weekdays' ? f.weekdays : [],
      one_time_date: f.recurrence === 'one_time' ? f.one_time_date : null,
      start_date: f.start_date,
      end_date: f.end_date || null,
      school_only: f.school_only,
      is_religious: f.is_religious,
      requires_verification: f.requires_verification,
      auto_approve: f.auto_approve,
      review_sample_rate: f.auto_approve ? f.review_sample_rate : 0,
      checklist: f.checklist.filter((c) => c.label.trim()),
      min_age: f.min_age ? Number(f.min_age) : null,
      max_age: f.max_age ? Number(f.max_age) : null,
    };
    save.mutate(
      { familyId, taskId: task?.id ?? null, data, base: f.base, bonus: f.bonus, childIds: f.childIds, effectiveFrom: task ? f.effective_from : null },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide title={task ? t('tasks.edit') : t('tasks.add')}>
        <form onSubmit={submit} className="grid gap-6">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">{t('tasks.sections.basics')}</legend>
            <Field label={t('tasks.titleAr')} htmlFor="tf-ar">
              <Input id="tf-ar" dir="rtl" required value={f.title_ar} onChange={(e) => set({ title_ar: e.target.value })} />
            </Field>
            <Field label={t('tasks.titleEn')} htmlFor="tf-en">
              <Input id="tf-en" dir="ltr" value={f.title_en} onChange={(e) => set({ title_en: e.target.value })} />
            </Field>
            <Field label={t('common.description')} htmlFor="tf-desc" className="sm:col-span-2">
              <Textarea id="tf-desc" className="min-h-16" value={f.description} onChange={(e) => set({ description: e.target.value })} />
            </Field>
            <Field label={t('tasks.instructions')} htmlFor="tf-ins" className="sm:col-span-2">
              <Textarea id="tf-ins" className="min-h-16" value={f.instructions} onChange={(e) => set({ instructions: e.target.value })} />
            </Field>
            <Field label={t('tasks.category')} htmlFor="tf-cat">
              <Select id="tf-cat" value={f.category_id} onChange={(e) => set({ category_id: e.target.value })}>
                <option value="">{t('tasks.noCategory')}</option>
                {categories.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>{pick(lang, c.name_ar, c.name_en)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('tasks.priority')} htmlFor="tf-pri">
              <Select id="tf-pri" value={f.priority} onChange={(e) => set({ priority: e.target.value as TaskPriority })}>
                {(['low', 'normal', 'high'] as const).map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
              </Select>
            </Field>
            <div className="grid gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium">{t('common.icon')}</span>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t('common.icon')}>
                {ICON_KEYS.map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={f.icon === k} aria-label={k} onClick={() => set({ icon: k })}
                    className={cn('grid size-9 place-items-center rounded-lg', f.icon === k ? cn(colorStyle(f.color).tile, 'ring-2 ring-plum-500') : 'hover:bg-surface-2')}>
                    <DynamicIcon name={k} className="size-[1.1rem]" />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium">{t('common.color')}</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('common.color')}>
                {COLOR_KEYS.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={f.color === c} aria-label={t(`colors.${c}`)} onClick={() => set({ color: c })}
                    className={cn('size-8 rounded-full', colorStyle(c).solid, f.color === c && 'ring-3 ring-offset-2 ring-plum-500 ring-offset-[var(--surface)]')} />
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">{t('tasks.sections.schedule')}</legend>
            <div className="grid gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium">{t('tasks.assignees')}</span>
              <div className="flex flex-wrap gap-2">
                {children.map((c) => {
                  const checked = f.childIds.includes(c.id);
                  return (
                    <label key={c.id} className={cn('inline-flex cursor-pointer items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-sm', checked ? 'border-plum-500 bg-plum-50 dark:bg-plum-500/15' : 'border-app')}>
                      <Checkbox className="sr-only" checked={checked} onCheckedChange={(v) => set({ childIds: v ? [...f.childIds, c.id] : f.childIds.filter((x) => x !== c.id) })} />
                      <ChildAvatar avatar={c.avatar} color={c.color} size="sm" className="ring-0" />
                      {c.display_name}
                    </label>
                  );
                })}
              </div>
            </div>
            <Field label={t('tasks.recurrence')} htmlFor="tf-rec">
              <Select id="tf-rec" value={f.recurrence} onChange={(e) => set({ recurrence: e.target.value as RecurrenceType })}>
                {(['daily', 'weekdays', 'weekly', 'one_time', 'occasional'] as const).map((r) => <option key={r} value={r}>{t(`recurrence.${r}`)}</option>)}
              </Select>
            </Field>
            {f.recurrence === 'one_time' ? (
              <Field label={t('tasks.oneTimeDate')} htmlFor="tf-otd">
                <Input id="tf-otd" type="date" value={f.one_time_date} onChange={(e) => set({ one_time_date: e.target.value })} />
              </Field>
            ) : <span className="hidden sm:block" />}
            {f.recurrence === 'weekdays' && (
              <div className="grid gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium">{t('tasks.weekdays')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const on = f.weekdays.includes(d);
                    return (
                      <button key={d} type="button" aria-pressed={on} onClick={() => set({ weekdays: on ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort() })}
                        className={cn('rounded-full px-3 py-1.5 text-sm', on ? 'bg-plum-500 text-white' : 'bg-surface-2')}>
                        {weekdayName(d, lang, 'short')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <Field label={t('tasks.startDate')} htmlFor="tf-sd">
              <Input id="tf-sd" type="date" value={f.start_date} onChange={(e) => set({ start_date: e.target.value })} />
            </Field>
            <Field label={t('tasks.endDate')} htmlFor="tf-ed" hint={t('common.optional')}>
              <Input id="tf-ed" type="date" min={f.start_date} value={f.end_date} onChange={(e) => set({ end_date: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <SwitchRow id="tf-school" label={t('tasks.schoolOnly')} hint={t('tasks.schoolOnlyHint')} checked={f.school_only} onCheckedChange={(v) => set({ school_only: v })} />
              <SwitchRow id="tf-rel" label={t('tasks.religious')} hint={t('tasks.religiousHint')} checked={f.is_religious} onCheckedChange={(v) => set({ is_religious: v })} />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">{t('tasks.sections.points')}</legend>
            <Field label={t('tasks.basePoints')} htmlFor="tf-base">
              <Input id="tf-base" type="number" min={0} max={100} value={f.base} onChange={(e) => set({ base: Number(e.target.value) })} />
            </Field>
            <Field label={t('tasks.independenceBonus')} htmlFor="tf-bonus">
              <Input id="tf-bonus" type="number" min={0} max={100} value={f.bonus} onChange={(e) => set({ bonus: Number(e.target.value) })} />
            </Field>
            {pointsChanged && (
              <Field label={t('tasks.effectiveFrom')} htmlFor="tf-eff" hint={t('tasks.effectiveHint')} className="sm:col-span-2">
                <Input id="tf-eff" type="date" value={f.effective_from} onChange={(e) => set({ effective_from: e.target.value })} />
              </Field>
            )}
            <div className="sm:col-span-2">
              <SwitchRow id="tf-ver" label={t('tasks.verification')} checked={f.requires_verification && !f.is_religious} disabled={f.is_religious}
                onCheckedChange={(v) => set({ requires_verification: v, auto_approve: v ? f.auto_approve : true })} />
              <SwitchRow id="tf-auto" label={t('tasks.autoApprove')} checked={f.auto_approve} disabled={f.is_religious} onCheckedChange={(v) => set({ auto_approve: v })} />
            </div>
            {f.auto_approve && !f.is_religious && (
              <Field label={`${t('tasks.sampleRate')} — ${Math.round(f.review_sample_rate * 100)}%`} htmlFor="tf-sample" hint={t('tasks.sampleRateHint')} className="sm:col-span-2">
                <input id="tf-sample" type="range" min={0} max={1} step={0.05} value={f.review_sample_rate} onChange={(e) => set({ review_sample_rate: Number(e.target.value) })} className="accent-plum-500" />
              </Field>
            )}
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">{t('tasks.sections.extra')}</legend>
            <div className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium">{t('tasks.checklist')}</span>
              {f.checklist.map((c, i) => (
                <div key={c.id} className="flex gap-2">
                  <Input aria-label={`${t('tasks.checklistItem')} ${i + 1}`} value={c.label} onChange={(e) => set({ checklist: f.checklist.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) })} />
                  <Button type="button" variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => set({ checklist: f.checklist.filter((x) => x.id !== c.id) })}><Trash2 /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set({ checklist: [...f.checklist, { id: uid(), label: '' }] })}>
                <Plus /> {t('tasks.checklistAdd')}
              </Button>
            </div>
            <Field label={t('tasks.minAge')} htmlFor="tf-min">
              <Input id="tf-min" inputMode="numeric" value={f.min_age} onChange={(e) => set({ min_age: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label={t('tasks.maxAge')} htmlFor="tf-max">
              <Input id="tf-max" inputMode="numeric" value={f.max_age} onChange={(e) => set({ max_age: e.target.value.replace(/\D/g, '') })} />
            </Field>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={save.isPending} disabled={!f.title_ar.trim() || (f.recurrence === 'weekdays' && f.weekdays.length === 0)}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
