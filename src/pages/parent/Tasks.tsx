import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, MoreVertical, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { activeAssignees, pointsOn, taskApi, useCategories, useTasks, type TaskWithMeta } from '@/api/tasks';
import { useDeleteRow, useSaveRow } from '@/api/content';
import { useAction } from '@/api/core';
import { pick } from '@/i18n';
import { DynamicIcon, colorStyle, ICON_KEYS, COLOR_KEYS } from '@/lib/icons';
import { weekdayName, formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { TaskCategory } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/controls';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { useConfirm } from '@/components/ui/confirm';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/label';
import { Input, Select } from '@/components/ui/input';
import { ChildAvatar, EmptyState, ErrorState, PageHeader } from '@/components/brand/misc';
import { ChildChips, useChildMap } from '@/components/parent/shared';
import { TaskFormDialog } from './TaskForm';
import { errorMessage } from '@/lib/errors';

export default function Tasks() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, settings, today } = useParent();
  const tasks = useTasks(familyId);
  const categories = useCategories(familyId);
  const children = useChildren(familyId);
  const childMap = useChildMap(children.data);
  const confirm = useConfirm();
  const [editing, setEditing] = React.useState<TaskWithMeta | null | 'new'>(null);
  const [childFilter, setChildFilter] = React.useState('');
  const [showArchived, setShowArchived] = React.useState(false);
  const setActive = useAction((v: { id: string; active: boolean }) => taskApi.setActive(v.id, v.active), {
    success: (_r, v) => (v.active ? t('tasks.restored') : t('tasks.archived')),
  });
  const remove = useAction(taskApi.remove, { success: t('common.deleted') });
  const defaults = React.useMemo(() => ({ base: settings.default_base_points, bonus: settings.default_independence_bonus }), [settings]);

  const list = (tasks.data ?? [])
    .filter((x) => showArchived || x.is_active)
    .filter((x) => !childFilter || activeAssignees(x.assignments, today).includes(childFilter));
  const groups = [...(categories.data ?? []), null].map((cat) => ({
    cat,
    items: list.filter((x) => (cat ? x.category_id === cat.id : !x.category_id || !categories.data?.some((c) => c.id === x.category_id))),
  }));

  const schedule = (x: TaskWithMeta) => {
    if (x.recurrence === 'weekdays') return x.weekdays.map((d) => weekdayName(d, lang, 'short')).join('، ');
    if (x.recurrence === 'one_time' && x.one_time_date) return formatDate(x.one_time_date, lang, { day: 'numeric', month: 'short' });
    return t(`recurrence.${x.recurrence}`);
  };

  return (
    <>
      <PageHeader title={t('tasks.title')} description={t('tasks.description')} actions={<Button onClick={() => setEditing('new')}><Plus /> {t('tasks.add')}</Button>} />
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">{t('nav.tasks')}</TabsTrigger>
          <TabsTrigger value="categories">{t('categories.title')}</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            {children.data && <ChildChips kids={children.data} value={childFilter} onChange={setChildFilter} />}
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} /> {t('tasks.showArchived')}
            </label>
          </div>
          {tasks.isError ? (
            <ErrorState message={errorMessage(tasks.error)} onRetry={() => void tasks.refetch()} />
          ) : tasks.isPending ? (
            <div className="grid gap-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
          ) : list.length === 0 ? (
            <EmptyState icon="📝" title={t('tasks.empty')} action={<Button onClick={() => setEditing('new')}><Plus /> {t('tasks.add')}</Button>} />
          ) : (
            <div className="grid gap-6">
              {groups.filter((g) => g.items.length).map((g) => (
                <section key={g.cat?.id ?? 'none'} aria-label={g.cat ? pick(lang, g.cat.name_ar, g.cat.name_en) : t('tasks.noCategory')}>
                  <h2 className="mb-2 flex items-center gap-2 font-semibold">
                    {g.cat && <DynamicIcon name={g.cat.icon} className={cn('size-4', colorStyle(g.cat.color).text)} />}
                    {g.cat ? pick(lang, g.cat.name_ar, g.cat.name_en) : t('tasks.noCategory')}
                  </h2>
                  <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-card)] border border-app bg-surface">
                    {g.items.map((x) => {
                      const pts = pointsOn(x.versions, today);
                      const kids = activeAssignees(x.assignments, today);
                      return (
                        <li key={x.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', !x.is_active && 'opacity-55')}>
                          <span className={cn('grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)]', colorStyle(x.color).tile)}>
                            <DynamicIcon name={x.icon} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{pick(lang, x.title_ar, x.title_en)}</p>
                            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                              <span>{schedule(x)}</span>
                              {pts && <span>{t('tasks.pointsSummary', { base: pts.base_points, bonus: pts.independence_bonus })}</span>}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {x.school_only && <Badge tone="blue">{t('tasks.schoolOnly')}</Badge>}
                              {x.is_religious && <Badge tone="gold">{t('tasks.religious')}</Badge>}
                              {x.auto_approve && !x.is_religious && <Badge tone="green">{t('tasks.autoApprove')}</Badge>}
                              {x.priority === 'high' && <Badge tone="pink">{t('priority.high')}</Badge>}
                              {!x.is_active && <Badge>{t('common.inactive')}</Badge>}
                            </div>
                          </div>
                          <div className="flex -space-x-2" aria-label={t('tasks.assignees')}>
                            {kids.map((id) => {
                              const c = childMap.get(id);
                              return c ? <ChildAvatar key={id} avatar={c.avatar} color={c.color} size="sm" /> : null;
                            })}
                          </div>
                          <Menu>
                            <MenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={t('common.actions')}><MoreVertical /></Button>
                            </MenuTrigger>
                            <MenuContent align="end">
                              <MenuItem onSelect={() => setEditing(x)}><Pencil /> {t('common.edit')}</MenuItem>
                              <MenuItem onSelect={() => setActive.mutate({ id: x.id, active: !x.is_active })}>
                                {x.is_active ? <><Archive /> {t('common.archive')}</> : <><RotateCcw /> {t('common.restore')}</>}
                              </MenuItem>
                              <MenuSeparator />
                              <MenuItem className="text-red-600" onSelect={async () => {
                                if (await confirm({ title: t('common.delete'), description: t('tasks.deleteConfirm'), tone: 'danger' })) remove.mutate(x.id);
                              }}>
                                <Trash2 /> {t('common.delete')}
                              </MenuItem>
                            </MenuContent>
                          </Menu>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesManager familyId={familyId} categories={categories.data ?? []} />
        </TabsContent>
      </Tabs>
      <TaskFormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        task={editing === 'new' ? null : editing}
        familyId={familyId}
        kids={children.data ?? []}
        categories={categories.data ?? []}
        today={today}
        defaults={defaults}
      />
    </>
  );
}

function CategoriesManager({ familyId, categories }: { familyId: string; categories: TaskCategory[] }) {
  const { t, i18n } = useTranslation();
  const [edit, setEdit] = React.useState<Partial<TaskCategory> | null>(null);
  const save = useSaveRow('task_categories', t('common.saved'));
  const del = useDeleteRow('task_categories', t('common.deleted'));
  const confirm = useConfirm();
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="soft" onClick={() => setEdit({ family_id: familyId, name_ar: '', name_en: '', icon: 'sparkles', color: 'purple', sort_order: categories.length + 1, is_active: true })}>
          <Plus /> {t('categories.add')}
        </Button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-[var(--radius-control)] border border-app bg-surface px-3 py-2">
            <span className={cn('grid size-9 place-items-center rounded-lg', colorStyle(c.color).tile)}><DynamicIcon name={c.icon} className="size-4" /></span>
            <span className="flex-1">{pick(i18n.language, c.name_ar, c.name_en)}</span>
            <Button variant="ghost" size="icon" aria-label={t('common.edit')} onClick={() => setEdit(c)}><Pencil /></Button>
            <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={async () => {
              if (await confirm({ title: t('common.delete'), tone: 'danger' })) del.mutate(c.id);
            }}><Trash2 /></Button>
          </li>
        ))}
      </ul>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        {edit && (
          <DialogContent title={edit.id ? t('common.edit') : t('categories.add')}>
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(edit, { onSuccess: () => setEdit(null) }); }}>
              <Field label={t('categories.nameAr')} htmlFor="cat-ar"><Input id="cat-ar" required value={edit.name_ar ?? ''} onChange={(e) => setEdit({ ...edit, name_ar: e.target.value })} /></Field>
              <Field label={t('categories.nameEn')} htmlFor="cat-en"><Input id="cat-en" dir="ltr" value={edit.name_en ?? ''} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('common.icon')} htmlFor="cat-icon">
                  <Select id="cat-icon" value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })}>
                    {ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </Select>
                </Field>
                <Field label={t('common.color')} htmlFor="cat-color">
                  <Select id="cat-color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })}>
                    {COLOR_KEYS.map((k) => <option key={k} value={k}>{t(`colors.${k}`)}</option>)}
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                <Button type="submit" loading={save.isPending}>{t('common.save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
