import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Eye, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useAuth } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { useTasks } from '@/api/tasks';
import { useDeleteRow, useFamilyTable, useNotes, useSaveRow } from '@/api/content';
import { pick } from '@/i18n';
import { formatDate, weekStartFor } from '@/lib/dates';
import { DynamicIcon, ICON_KEYS } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { FamilyRule, Note, NoteKind, NoteVisibility } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/label';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Segmented, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/controls';
import { useConfirm } from '@/components/ui/confirm';
import { EmptyState, PageHeader } from '@/components/brand/misc';
import { ChildChips, ChildName, useChildMap } from '@/components/parent/shared';

const KINDS: NoteKind[] = ['observation', 'positive', 'improvement', 'weekly_summary', 'recognition', 'incident', 'repair', 'privilege_decision', 'reflection'];
const KIND_TONE: Record<NoteKind, 'purple' | 'green' | 'gold' | 'blue' | 'pink' | 'neutral' | 'red'> = {
  observation: 'neutral', positive: 'green', improvement: 'blue', weekly_summary: 'purple', recognition: 'gold',
  incident: 'red', repair: 'pink', privilege_decision: 'purple', reflection: 'blue',
};

export default function Notes() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, settings, today } = useParent();
  const { session } = useAuth();
  const children = useChildren(familyId);
  const childMap = useChildMap(children.data);
  const notes = useNotes({ familyId });
  const tasks = useTasks(familyId);
  const skills = useFamilyTable('skills', familyId, 'sort_order');
  const rules = useFamilyTable('family_rules', familyId, 'sort_order');
  const save = useSaveRow('notes', t('notes.saved'));
  const del = useDeleteRow('notes', t('common.deleted'));
  const saveRule = useSaveRow('family_rules', t('common.saved'));
  const delRule = useDeleteRow('family_rules', t('common.deleted'));
  const confirm = useConfirm();
  const [childFilter, setChildFilter] = React.useState('');
  const [kindFilter, setKindFilter] = React.useState<'' | NoteKind>('');
  const [edit, setEdit] = React.useState<Partial<Note> | null>(null);
  const [rule, setRule] = React.useState<Partial<FamilyRule> | null>(null);

  const list = (notes.data ?? []).filter((n) => (!childFilter || n.child_id === childFilter) && (!kindFilter || n.kind === kindFilter));
  const followUps = (notes.data ?? []).filter((n) => n.follow_up).sort((a, b) => Number(a.follow_up_done) - Number(b.follow_up_done) || (a.follow_up_due ?? '9').localeCompare(b.follow_up_due ?? '9'));
  const newNote = (kind: NoteKind = 'positive'): Partial<Note> => ({
    family_id: familyId,
    child_id: childFilter || children.data?.[0]?.id || null,
    author_id: session?.user.id ?? null,
    author_role: 'parent',
    kind,
    visibility: kind === 'positive' || kind === 'recognition' ? 'child_visible' : 'parent_only',
    body: '',
    period_start: weekStartFor(today, settings.week_start_day),
  });

  const NoteCard = ({ n }: { n: Note }) => (
    <article className="surface rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-2">
        {n.child_id ? <ChildName child={childMap.get(n.child_id)} /> : <span className="text-sm font-medium">{t('notes.familyWide')}</span>}
        <Badge tone={KIND_TONE[n.kind]}>{t(`notes.kinds.${n.kind}`)}</Badge>
        <Badge tone={n.visibility === 'parent_only' ? 'neutral' : 'blue'}>
          {n.visibility === 'parent_only' ? <Lock /> : <Eye />} {n.visibility === 'parent_only' ? t('notes.parentOnly') : t('notes.childVisible')}
        </Badge>
        <span className="ms-auto text-xs text-muted">{formatDate(n.created_at.slice(0, 10), lang, { day: 'numeric', month: 'short' })}</span>
      </div>
      {n.title && <h3 className="mt-2 font-semibold">{n.title}</h3>}
      <p className="mt-1.5 whitespace-pre-line">{n.body}</p>
      {n.follow_up && (
        <p className={cn('mt-2 rounded-lg px-3 py-1.5 text-sm', n.follow_up_done ? 'bg-leaf-100 text-emerald-800 line-through dark:bg-leaf-500/15 dark:text-leaf-100' : 'bg-gold-50 dark:bg-gold-400/10')}>
          {t('notes.followUp')}: {n.follow_up} {n.follow_up_due && `(${formatDate(n.follow_up_due, lang, { day: 'numeric', month: 'short' })})`}
        </p>
      )}
      {n.author_role === 'parent' && (
        <div className="mt-2 flex justify-end gap-1">
          {n.follow_up && !n.follow_up_done && (
            <Button size="sm" variant="ghost" onClick={() => save.mutate({ id: n.id, follow_up_done: true })}><CheckCircle2 /> {t('notes.followUpDone')}</Button>
          )}
          <Button size="icon" variant="ghost" aria-label={t('common.edit')} onClick={() => setEdit(n)}><Pencil /></Button>
          <Button size="icon" variant="ghost" aria-label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('common.delete'), tone: 'danger' })) del.mutate(n.id); }}><Trash2 /></Button>
        </div>
      )}
    </article>
  );

  return (
    <>
      <PageHeader title={t('notes.title')} description={t('notes.description')} actions={<Button onClick={() => setEdit(newNote())}><Plus /> {t('notes.add')}</Button>} />
      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">{t('notes.tabsNotes')}</TabsTrigger>
          <TabsTrigger value="followups">{t('notes.tabsFollowUps')}</TabsTrigger>
          <TabsTrigger value="values">{t('notes.tabsValues')}</TabsTrigger>
        </TabsList>
        <TabsContent value="notes">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {children.data && <ChildChips children={children.data} value={childFilter} onChange={setChildFilter} />}
            <Select aria-label={t('notes.kind')} className="w-52" value={kindFilter} onChange={(e) => setKindFilter(e.target.value as NoteKind | '')}>
              <option value="">{t('common.all')}</option>
              {KINDS.map((k) => <option key={k} value={k}>{t(`notes.kinds.${k}`)}</option>)}
            </Select>
          </div>
          {list.length === 0 ? <EmptyState icon="📝" title={t('notes.empty')} /> : <div className="grid gap-3 md:grid-cols-2">{list.map((n) => <NoteCard key={n.id} n={n} />)}</div>}
        </TabsContent>
        <TabsContent value="followups">
          {followUps.length === 0 ? <EmptyState icon="✅" title={t('notes.empty')} /> : <div className="grid gap-3 md:grid-cols-2">{followUps.map((n) => <NoteCard key={n.id} n={n} />)}</div>}
        </TabsContent>
        <TabsContent value="values">
          <p className="mb-4 max-w-prose rounded-[var(--radius-card)] bg-plum-50 px-4 py-3 text-plum-700 dark:bg-plum-500/15 dark:text-plum-100">{t('notes.valuesIntro')}</p>
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            <Button variant="soft" onClick={() => setEdit(newNote('recognition'))}><Plus /> {t('notes.kinds.recognition')}</Button>
            <Button variant="soft" onClick={() => setEdit(newNote('repair'))}><Plus /> {t('notes.kinds.repair')}</Button>
            <Button variant="outline" onClick={() => setRule({ family_id: familyId, title_ar: '', title_en: '', icon: 'heart-handshake', sort_order: (rules.data?.length ?? 0) + 1, is_active: true })}><Plus /> {t('notes.rulesAdd')}</Button>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {(rules.data ?? []).map((r) => (
              <li key={r.id} className="surface flex items-start gap-3 rounded-[var(--radius-card)] p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-500 dark:bg-rose-500/15"><DynamicIcon name={r.icon} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{pick(lang, r.title_ar, r.title_en)}</p>
                  {r.description && <p className="text-sm text-muted">{r.description}</p>}
                </div>
                <Button size="icon" variant="ghost" aria-label={t('common.edit')} onClick={() => setRule(r)}><Pencil /></Button>
                <Button size="icon" variant="ghost" aria-label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('common.delete'), tone: 'danger' })) delRule.mutate(r.id); }}><Trash2 /></Button>
              </li>
            ))}
          </ol>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {(notes.data ?? []).filter((n) => ['recognition', 'incident', 'repair', 'privilege_decision'].includes(n.kind)).map((n) => <NoteCard key={n.id} n={n} />)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        {edit && (
          <DialogContent wide title={edit.id ? t('common.edit') : t('notes.add')}>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const { id, family_id, child_id, kind, visibility, title, body, task_id, skill_id, period_start, follow_up, follow_up_due, follow_up_done, author_id, author_role } = edit;
                save.mutate(
                  id
                    ? { id, child_id, kind, visibility, title, body, task_id, skill_id, period_start, follow_up, follow_up_due, follow_up_done }
                    : { family_id, child_id, kind, visibility, title, body, task_id, skill_id, period_start, follow_up, follow_up_due, author_id, author_role },
                  { onSuccess: () => setEdit(null) },
                );
              }}
            >
              <Field label={t('common.child')} htmlFor="nt-child">
                <Select id="nt-child" value={edit.child_id ?? ''} onChange={(e) => setEdit({ ...edit, child_id: e.target.value || null })}>
                  <option value="">{t('notes.familyWide')}</option>
                  {(children.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                </Select>
              </Field>
              <Field label={t('notes.kind')} htmlFor="nt-kind">
                <Select id="nt-kind" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as NoteKind })}>
                  {KINDS.filter((k) => k !== 'reflection').map((k) => <option key={k} value={k}>{t(`notes.kinds.${k}`)}</option>)}
                </Select>
              </Field>
              <div className="grid gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium">{t('notes.visibility')}</span>
                <Segmented<NoteVisibility>
                  label={t('notes.visibility')}
                  value={edit.visibility ?? 'parent_only'}
                  onChange={(v) => setEdit({ ...edit, visibility: v })}
                  options={[{ value: 'parent_only', label: <span className="inline-flex items-center gap-1"><Lock className="size-4" /> {t('notes.parentOnly')}</span> }, { value: 'child_visible', label: <span className="inline-flex items-center gap-1"><Eye className="size-4" /> {t('notes.childVisible')}</span> }]}
                />
                {edit.visibility === 'parent_only' && <p className="text-sm text-muted">{t('notes.parentOnlyHint')}</p>}
              </div>
              <Field label={t('notes.titleField')} htmlFor="nt-title" className="sm:col-span-2"><Input id="nt-title" value={edit.title ?? ''} onChange={(e) => setEdit({ ...edit, title: e.target.value || null })} /></Field>
              <Field label={t('notes.body')} htmlFor="nt-body" className="sm:col-span-2"><Textarea id="nt-body" required value={edit.body ?? ''} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
              <Field label={t('notes.linkTask')} htmlFor="nt-task">
                <Select id="nt-task" value={edit.task_id ?? ''} onChange={(e) => setEdit({ ...edit, task_id: e.target.value || null })}>
                  <option value="">{t('common.none')}</option>
                  {(tasks.data ?? []).filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{pick(lang, x.title_ar, x.title_en)}</option>)}
                </Select>
              </Field>
              <Field label={t('notes.linkSkill')} htmlFor="nt-skill">
                <Select id="nt-skill" value={edit.skill_id ?? ''} onChange={(e) => setEdit({ ...edit, skill_id: e.target.value || null })}>
                  <option value="">{t('common.none')}</option>
                  {(skills.data ?? []).map((s) => <option key={s.id} value={s.id}>{pick(lang, s.name_ar, s.name_en)}</option>)}
                </Select>
              </Field>
              <Field label={t('notes.period')} htmlFor="nt-period"><Input id="nt-period" type="date" value={edit.period_start ?? ''} onChange={(e) => setEdit({ ...edit, period_start: e.target.value || null })} /></Field>
              <span className="hidden sm:block" />
              <Field label={t('notes.followUp')} htmlFor="nt-fu"><Input id="nt-fu" value={edit.follow_up ?? ''} onChange={(e) => setEdit({ ...edit, follow_up: e.target.value || null })} /></Field>
              <Field label={t('notes.followUpDue')} htmlFor="nt-fud"><Input id="nt-fud" type="date" value={edit.follow_up_due ?? ''} onChange={(e) => setEdit({ ...edit, follow_up_due: e.target.value || null })} /></Field>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                <Button type="submit" loading={save.isPending} disabled={!edit.body?.trim()}>{t('common.save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!rule} onOpenChange={(o) => !o && setRule(null)}>
        {rule && (
          <DialogContent title={rule.id ? t('common.edit') : t('notes.rulesAdd')}>
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); saveRule.mutate(rule, { onSuccess: () => setRule(null) }); }}>
              <Field label={t('notes.ruleTitleAr')} htmlFor="rl-ar"><Input id="rl-ar" required value={rule.title_ar ?? ''} onChange={(e) => setRule({ ...rule, title_ar: e.target.value })} /></Field>
              <Field label={t('notes.ruleTitleEn')} htmlFor="rl-en"><Input id="rl-en" dir="ltr" value={rule.title_en ?? ''} onChange={(e) => setRule({ ...rule, title_en: e.target.value })} /></Field>
              <Field label={t('common.description')} htmlFor="rl-desc"><Textarea id="rl-desc" className="min-h-16" value={rule.description ?? ''} onChange={(e) => setRule({ ...rule, description: e.target.value || null })} /></Field>
              <Field label={t('common.icon')} htmlFor="rl-icon">
                <Select id="rl-icon" value={rule.icon} onChange={(e) => setRule({ ...rule, icon: e.target.value })}>{ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</Select>
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRule(null)}>{t('common.cancel')}</Button>
                <Button type="submit" loading={saveRule.isPending}>{t('common.save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
