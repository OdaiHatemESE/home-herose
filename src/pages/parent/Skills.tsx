import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { useDeleteRow, useFamilyTable, useSaveRow, useSkillAssessments } from '@/api/content';
import { pick } from '@/i18n';
import { DynamicIcon, ICON_KEYS, COLOR_KEYS, colorStyle } from '@/lib/icons';
import { formatDate, formatNumber } from '@/lib/dates';
import { colorHex } from '@/lib/chartColors';
import { cn } from '@/lib/utils';
import type { Child, Skill } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/label';
import { Input, Select, Textarea } from '@/components/ui/input';
import { SwitchRow } from '@/components/ui/controls';
import { useConfirm } from '@/components/ui/confirm';
import { ChildAvatar, PageHeader } from '@/components/brand/misc';
import { ChildSelect } from '@/components/parent/shared';

export default function Skills() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, settings, today } = useParent();
  const skills = useFamilyTable('skills', familyId, 'sort_order');
  const children = useChildren(familyId);
  const assessments = useSkillAssessments({ familyId });
  const saveSkill = useSaveRow('skills', t('common.saved'));
  const delSkill = useDeleteRow('skills', t('common.deleted'));
  const confirm = useConfirm();
  const [edit, setEdit] = React.useState<Partial<Skill> | null>(null);
  const [assess, setAssess] = React.useState<{ child: Child; skill: Skill } | null>(null);
  const [historyChild, setHistoryChild] = React.useState('');
  const scale = settings.skill_scale;
  const label = (v: number) => {
    const s = scale.find((x) => x.value === v);
    return s ? (lang === 'en' ? s.en : s.ar) : String(v);
  };
  const active = (skills.data ?? []).filter((s) => s.is_active);
  const latest = (childId: string, skillId: string) => assessments.data?.find((a) => a.child_id === childId && a.skill_id === skillId);
  const chosen = historyChild || children.data?.[0]?.id || '';

  const chartData = React.useMemo(() => {
    const rows = (assessments.data ?? []).filter((a) => a.child_id === chosen).sort((a, b) => a.assessed_on.localeCompare(b.assessed_on));
    const dates = [...new Set(rows.map((r) => r.assessed_on))];
    return dates.map((d) => {
      const point: Record<string, string | number> = { date: formatDate(d, lang, { day: 'numeric', month: 'short' }) };
      for (const s of active) {
        const r = rows.filter((x) => x.skill_id === s.id && x.assessed_on <= d).pop();
        if (r) point[pick(lang, s.name_ar, s.name_en)] = r.rating;
      }
      return point;
    });
  }, [assessments.data, chosen, active, lang]);

  return (
    <>
      <PageHeader
        title={t('skills.title')}
        description={t('skills.description')}
        actions={<Button onClick={() => setEdit({ family_id: familyId, name_ar: '', name_en: '', icon: 'sprout', color: 'green', target_rating: 4, weight: 1, is_active: true, sort_order: (skills.data?.length ?? 0) + 1 })}><Plus /> {t('skills.add')}</Button>}
      />

      <Card className="mb-6">
        <CardHeader><CardTitle>{t('skills.scale')}</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-wrap gap-2">
            {scale.map((s) => (
              <li key={s.value} className="inline-flex items-center gap-2 rounded-full bg-surface-2 py-1 ps-1 pe-3 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-leaf-500 text-xs font-bold text-white">{formatNumber(s.value, lang)}</span>
                {lang === 'en' ? s.en : s.ar}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* growth matrix */}
      <div className="surface mb-6 overflow-x-auto rounded-[var(--radius-card)]">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky start-0 bg-surface px-3 py-3 text-start font-medium text-muted">{t('nav.skills')}</th>
              {(children.data ?? []).map((c) => (
                <th key={c.id} className="px-3 py-3 font-medium">
                  <span className="inline-flex flex-col items-center gap-1">
                    <ChildAvatar avatar={c.avatar} color={c.color} size="sm" />
                    {c.display_name}
                  </span>
                </th>
              ))}
              <th className="w-24"><span className="sr-only">{t('common.actions')}</span></th>
            </tr>
          </thead>
          <tbody>
            {active.map((s) => (
              <tr key={s.id} className="border-t border-app">
                <th scope="row" className="sticky start-0 bg-surface px-3 py-2 text-start font-normal">
                  <span className="flex items-center gap-2">
                    <span className={cn('grid size-8 place-items-center rounded-lg', colorStyle(s.color).tile)}><DynamicIcon name={s.icon} className="size-4" /></span>
                    <span className="font-medium">{pick(lang, s.name_ar, s.name_en)}</span>
                  </span>
                </th>
                {(children.data ?? []).map((c) => {
                  const a = latest(c.id, s.id);
                  return (
                    <td key={c.id} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setAssess({ child: c, skill: s })}
                        className="group inline-flex flex-col items-center gap-1 rounded-lg px-2 py-1 hover:bg-surface-2"
                        aria-label={t('skills.assessTitle', { skill: pick(lang, s.name_ar, s.name_en), child: c.display_name })}
                      >
                        <span className="flex gap-0.5" aria-hidden>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className={cn('h-2 w-3 rounded-full', a && n <= a.rating ? 'bg-leaf-500' : 'bg-plum-100 dark:bg-plum-900', n === s.target_rating && 'outline outline-1 outline-gold-400')} />
                          ))}
                        </span>
                        <span className="text-xs text-muted group-hover:text-fg">{a ? label(a.rating) : t('skills.assess')}</span>
                      </button>
                    </td>
                  );
                })}
                <td className="px-2 text-end">
                  <Button variant="ghost" size="icon" aria-label={t('common.edit')} onClick={() => setEdit(s)}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('common.delete'), tone: 'danger' })) delSkill.mutate(s.id); }}><Trash2 /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('skills.history')}</CardTitle>
          <ChildSelect id="sk-hist" kids={children.data ?? []} value={chosen} onChange={setHistoryChild} className="w-44" />
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted">{t('skills.noAssessments')}</p>
          ) : (
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} reversed={lang === 'ar'} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: 'var(--muted)' }} orientation={lang === 'ar' ? 'right' : 'left'} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }} formatter={(v) => label(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {active.map((s, i) => (
                    <Line key={s.id} type="monotone" dataKey={pick(lang, s.name_ar, s.name_en)} stroke={colorHex(s.color, i)} strokeWidth={2} connectNulls dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <AssessDialog target={assess} onClose={() => setAssess(null)} today={today} scale={scale} familyId={familyId} />

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        {edit && (
          <DialogContent wide title={edit.id ? t('skills.edit') : t('skills.add')}>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveSkill.mutate(edit, { onSuccess: () => setEdit(null) }); }}>
              <Field label={t('skills.nameAr')} htmlFor="sk-ar"><Input id="sk-ar" required value={edit.name_ar ?? ''} onChange={(e) => setEdit({ ...edit, name_ar: e.target.value })} /></Field>
              <Field label={t('skills.nameEn')} htmlFor="sk-en"><Input id="sk-en" dir="ltr" value={edit.name_en ?? ''} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} /></Field>
              <Field label={t('common.description')} htmlFor="sk-desc" className="sm:col-span-2"><Textarea id="sk-desc" className="min-h-16" value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value || null })} /></Field>
              <Field label={t('skills.criteria')} htmlFor="sk-crit" className="sm:col-span-2"><Textarea id="sk-crit" className="min-h-16" value={edit.criteria ?? ''} onChange={(e) => setEdit({ ...edit, criteria: e.target.value || null })} /></Field>
              <Field label={t('skills.target')} htmlFor="sk-target" className="sm:col-span-2"><Input id="sk-target" value={edit.development_target ?? ''} onChange={(e) => setEdit({ ...edit, development_target: e.target.value || null })} /></Field>
              <Field label={t('skills.targetRating')} htmlFor="sk-tr">
                <Select id="sk-tr" value={edit.target_rating ?? 4} onChange={(e) => setEdit({ ...edit, target_rating: Number(e.target.value) })}>
                  {scale.map((s) => <option key={s.value} value={s.value}>{s.value} — {lang === 'en' ? s.en : s.ar}</option>)}
                </Select>
              </Field>
              <Field label={t('skills.weight')} htmlFor="sk-w"><Input id="sk-w" type="number" min={0} step="0.5" value={edit.weight ?? 1} onChange={(e) => setEdit({ ...edit, weight: Number(e.target.value) })} /></Field>
              <Field label={t('common.icon')} htmlFor="sk-icon">
                <Select id="sk-icon" value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })}>{ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</Select>
              </Field>
              <Field label={t('common.color')} htmlFor="sk-color">
                <Select id="sk-color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })}>{COLOR_KEYS.map((k) => <option key={k} value={k}>{t(`colors.${k}`)}</option>)}</Select>
              </Field>
              <div className="sm:col-span-2"><SwitchRow id="sk-act" label={t('common.active')} checked={edit.is_active ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} /></div>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
                <Button type="submit" loading={saveSkill.isPending}>{t('common.save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function AssessDialog({ target, onClose, today, scale, familyId }: {
  target: { child: Child; skill: Skill } | null;
  onClose: () => void;
  today: string;
  scale: { value: number; ar: string; en: string }[];
  familyId: string;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const save = useSaveRow('skill_assessments', t('skills.assessed'));
  const history = useSkillAssessments({ childId: target?.child.id });
  const [rating, setRating] = React.useState(3);
  const [observation, setObservation] = React.useState('');
  const [visible, setVisible] = React.useState(true);
  const [date, setDate] = React.useState(today);
  React.useEffect(() => {
    if (target) {
      setRating(3);
      setObservation('');
      setVisible(true);
      setDate(today);
    }
  }, [target, today]);
  if (!target) return null;
  const past = (history.data ?? []).filter((a) => a.skill_id === target.skill.id).slice(0, 5);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t('skills.assessTitle', { skill: pick(lang, target.skill.name_ar, target.skill.name_en), child: target.child.display_name })} description={target.skill.criteria ?? undefined}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(
              { family_id: familyId, child_id: target.child.id, skill_id: target.skill.id, rating, assessed_on: date, observation: observation || null, visible_to_child: visible },
              { onSuccess: onClose },
            );
          }}
        >
          <div role="radiogroup" aria-label={t('skills.rating')} className="grid gap-1.5">
            {scale.map((s) => (
              <button key={s.value} type="button" role="radio" aria-checked={rating === s.value} onClick={() => setRating(s.value)}
                className={cn('flex items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2 text-start', rating === s.value ? 'border-leaf-500 bg-leaf-100 dark:bg-leaf-500/15' : 'border-app')}>
                <span className="grid size-7 place-items-center rounded-full bg-leaf-500 text-sm font-bold text-white">{formatNumber(s.value, lang)}</span>
                {lang === 'en' ? s.en : s.ar}
              </button>
            ))}
          </div>
          <Field label={t('skills.observation')} htmlFor="as-obs"><Textarea id="as-obs" value={observation} onChange={(e) => setObservation(e.target.value)} /></Field>
          <Field label={t('common.date')} htmlFor="as-date"><Input id="as-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <SwitchRow id="as-vis" label={t('skills.visibleToChild')} checked={visible} onCheckedChange={setVisible} />
          {past.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium">{t('skills.history')}</p>
              <ul className="grid gap-1 text-sm">
                {past.map((a) => (
                  <li key={a.id} className="flex gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5">
                    <span className="text-muted">{formatDate(a.assessed_on, lang, { day: 'numeric', month: 'short' })}</span>
                    <span className="font-medium">{formatNumber(a.rating, lang)}</span>
                    <span className="flex-1 truncate">{a.observation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" loading={save.isPending}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
