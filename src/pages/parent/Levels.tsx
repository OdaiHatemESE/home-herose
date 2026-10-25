import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useDeleteRow, useFamilyTable, useSaveRow } from '@/api/content';
import { pick } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/dates';
import { COLOR_KEYS } from '@/lib/icons';
import type { AchievementCriteria, AchievementDefinition, AchievementLevel } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/label';
import { Input, Select, Textarea } from '@/components/ui/input';
import { SwitchRow } from '@/components/ui/controls';
import { useConfirm } from '@/components/ui/confirm';
import { PageHeader } from '@/components/brand/misc';
import { LevelBadge } from '@/components/brand/LevelBadge';

export default function Levels() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, family } = useParent();
  const levels = useFamilyTable('achievement_levels', familyId, 'rank');
  const defs = useFamilyTable('achievement_definitions', familyId, 'threshold');
  const saveLevel = useSaveRow('achievement_levels', t('levels.saved'));
  const delLevel = useDeleteRow('achievement_levels', t('common.deleted'));
  const saveDef = useSaveRow('achievement_definitions', t('common.saved'));
  const delDef = useDeleteRow('achievement_definitions', t('common.deleted'));
  const confirm = useConfirm();
  const [level, setLevel] = React.useState<Partial<AchievementLevel> | null>(null);
  const [def, setDef] = React.useState<Partial<AchievementDefinition> | null>(null);
  const sorted = [...(levels.data ?? [])].sort((a, b) => Number(b.min_percent) - Number(a.min_percent));

  return (
    <>
      <PageHeader
        title={t('levels.title')}
        description={t('levels.description')}
        actions={<Button onClick={() => setLevel({ family_id: familyId, code: '', name_ar: '', name_en: '', icon: '🏅', color: 'purple', min_percent: 50, rank: (levels.data?.length ?? 0) + 1, money_amount: 0, is_active: true })}><Plus /> {t('levels.add')}</Button>}
      />
      <p className="mb-5 rounded-[var(--radius-card)] bg-leaf-100 px-4 py-3 text-sm text-emerald-900 dark:bg-leaf-500/15 dark:text-leaf-100">{t('levels.note')}</p>
      <ol className="grid gap-3">
        {sorted.map((l, i) => {
          const upper = i === 0 ? 100 : Number(sorted[i - 1].min_percent);
          return (
            <li key={l.id} className="surface flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)]">
              <span className="text-4xl" aria-hidden>{l.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <LevelBadge level={l} />
                  {!l.is_active && <Badge>{t('common.inactive')}</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted" dir="ltr">
                  {formatNumber(Number(l.min_percent), lang)}% – {i === 0 ? formatNumber(100, lang) : `<${formatNumber(upper, lang)}`}%
                </p>
                <p className="mt-1 text-sm">
                  {Number(l.money_amount) > 0 && <span className="font-semibold">{formatMoney(Number(l.money_amount), family.currency, lang)}</span>}
                  {Number(l.money_amount) > 0 && pick(lang, l.privilege_ar, l.privilege_en) && ' + '}
                  {pick(lang, l.privilege_ar, l.privilege_en)}
                </p>
                {pick(lang, l.message_ar, l.message_en) && <p className="mt-1 text-sm italic text-muted">{pick(lang, l.message_ar, l.message_en)}</p>}
              </div>
              <Button variant="ghost" size="icon" aria-label={t('common.edit')} onClick={() => setLevel(l)}><Pencil /></Button>
              <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('common.delete'), tone: 'danger' })) delLevel.mutate(l.id); }}><Trash2 /></Button>
            </li>
          );
        })}
      </ol>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t('levels.achievementsTitle')}</CardTitle>
          <Button variant="soft" size="sm" onClick={() => setDef({ family_id: familyId, code: `badge_${Date.now().toString(36)}`, name_ar: '', name_en: '', icon: '🏆', criteria: 'approved_tasks', threshold: 10, is_active: true })}>
            <Plus /> {t('common.add')}
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(defs.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
                <span className="text-2xl" aria-hidden>{d.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{pick(lang, d.name_ar, d.name_en)}</span>
                  <span className="block text-xs text-muted">{t(`levels.criteria.${d.criteria}`)}: {formatNumber(d.threshold, lang)}</span>
                </span>
                <Button variant="ghost" size="icon" aria-label={t('common.edit')} onClick={() => setDef(d)}><Pencil /></Button>
                <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={async () => { if (await confirm({ title: t('common.delete'), tone: 'danger' })) delDef.mutate(d.id); }}><Trash2 /></Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={!!level} onOpenChange={(o) => !o && setLevel(null)}>
        {level && (
          <DialogContent wide title={level.id ? t('common.edit') : t('levels.add')}>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveLevel.mutate(level, { onSuccess: () => setLevel(null) }); }}>
              <Field label={t('categories.nameAr')} htmlFor="lv-ar"><Input id="lv-ar" required value={level.name_ar ?? ''} onChange={(e) => setLevel({ ...level, name_ar: e.target.value })} /></Field>
              <Field label={t('categories.nameEn')} htmlFor="lv-en"><Input id="lv-en" dir="ltr" value={level.name_en ?? ''} onChange={(e) => setLevel({ ...level, name_en: e.target.value })} /></Field>
              <Field label={t('levels.code')} htmlFor="lv-code"><Input id="lv-code" dir="ltr" required pattern="[a-z0-9_]{2,24}" value={level.code ?? ''} disabled={!!level.id} onChange={(e) => setLevel({ ...level, code: e.target.value.toLowerCase() })} /></Field>
              <Field label={t('common.icon')} htmlFor="lv-icon"><Input id="lv-icon" value={level.icon ?? ''} maxLength={4} onChange={(e) => setLevel({ ...level, icon: e.target.value })} /></Field>
              <Field label={t('levels.minPercent')} htmlFor="lv-min"><Input id="lv-min" type="number" min={0} max={100} step="0.5" value={level.min_percent ?? 0} onChange={(e) => setLevel({ ...level, min_percent: Number(e.target.value) })} /></Field>
              <Field label={t('levels.rank')} htmlFor="lv-rank"><Input id="lv-rank" type="number" min={1} max={20} value={level.rank ?? 1} onChange={(e) => setLevel({ ...level, rank: Number(e.target.value) })} /></Field>
              <Field label={`${t('levels.money')} (${family.currency})`} htmlFor="lv-money"><Input id="lv-money" type="number" min={0} step="0.5" value={level.money_amount ?? 0} onChange={(e) => setLevel({ ...level, money_amount: Number(e.target.value) })} /></Field>
              <Field label={t('common.color')} htmlFor="lv-color">
                <Select id="lv-color" value={level.color} onChange={(e) => setLevel({ ...level, color: e.target.value })}>
                  {COLOR_KEYS.map((c) => <option key={c} value={c}>{t(`colors.${c}`)}</option>)}
                </Select>
              </Field>
              <Field label={`${t('levels.privilege')} (ع)`} htmlFor="lv-pa"><Input id="lv-pa" value={level.privilege_ar ?? ''} onChange={(e) => setLevel({ ...level, privilege_ar: e.target.value || null })} /></Field>
              <Field label={`${t('levels.privilege')} (EN)`} htmlFor="lv-pe"><Input id="lv-pe" dir="ltr" value={level.privilege_en ?? ''} onChange={(e) => setLevel({ ...level, privilege_en: e.target.value || null })} /></Field>
              <Field label={`${t('levels.message')} (ع)`} htmlFor="lv-ma" className="sm:col-span-2"><Textarea id="lv-ma" className="min-h-16" value={level.message_ar ?? ''} onChange={(e) => setLevel({ ...level, message_ar: e.target.value || null })} /></Field>
              <Field label={`${t('levels.message')} (EN)`} htmlFor="lv-me" className="sm:col-span-2"><Textarea id="lv-me" dir="ltr" className="min-h-16" value={level.message_en ?? ''} onChange={(e) => setLevel({ ...level, message_en: e.target.value || null })} /></Field>
              <div className="sm:col-span-2"><SwitchRow id="lv-active" label={t('common.active')} checked={level.is_active ?? true} onCheckedChange={(v) => setLevel({ ...level, is_active: v })} /></div>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setLevel(null)}>{t('common.cancel')}</Button>
                <Button type="submit" loading={saveLevel.isPending}>{t('common.save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!def} onOpenChange={(o) => !o && setDef(null)}>
        {def && (
          <DialogContent title={def.id ? t('common.edit') : t('common.add')}>
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); saveDef.mutate(def, { onSuccess: () => setDef(null) }); }}>
              <Field label={t('categories.nameAr')} htmlFor="ad-ar"><Input id="ad-ar" required value={def.name_ar ?? ''} onChange={(e) => setDef({ ...def, name_ar: e.target.value })} /></Field>
              <Field label={t('categories.nameEn')} htmlFor="ad-en"><Input id="ad-en" dir="ltr" value={def.name_en ?? ''} onChange={(e) => setDef({ ...def, name_en: e.target.value })} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t('common.icon')} htmlFor="ad-icon"><Input id="ad-icon" maxLength={4} value={def.icon ?? ''} onChange={(e) => setDef({ ...def, icon: e.target.value })} /></Field>
                <Field label={t('common.details')} htmlFor="ad-crit" className="col-span-2">
                  <Select id="ad-crit" value={def.criteria} onChange={(e) => setDef({ ...def, criteria: e.target.value as AchievementCriteria })}>
                    {(['approved_tasks', 'independent_tasks', 'approved_initiatives', 'gold_weeks', 'perfect_weeks'] as const).map((c) => <option key={c} value={c}>{t(`levels.criteria.${c}`)}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label={t('levels.threshold')} htmlFor="ad-th"><Input id="ad-th" type="number" min={1} value={def.threshold ?? 1} onChange={(e) => setDef({ ...def, threshold: Number(e.target.value) })} /></Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDef(null)}>{t('common.cancel')}</Button>
                <Button type="submit" loading={saveDef.isPending}>{t('common.save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
