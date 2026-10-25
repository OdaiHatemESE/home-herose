import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useUpdateSettings } from '@/api/family';
import { formatNumber } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, Td, Th } from '@/components/ui/table';
import { PageHeader } from '@/components/brand/misc';

export default function Scoring() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, settings } = useParent();
  const update = useUpdateSettings();
  const [form, setForm] = React.useState({
    default_base_points: settings.default_base_points,
    default_independence_bonus: settings.default_independence_bonus,
    initiative_points: settings.initiative_points,
    initiative_daily_cap: settings.initiative_daily_cap,
  });
  const base = form.default_base_points;
  const bonus = form.default_independence_bonus;
  const dayTasks = 7 * (base + bonus);

  return (
    <>
      <PageHeader title={t('scoring.title')} description={t('scoring.description')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t('nav.scoring')}</CardTitle>
              <CardDescription>{t('scoring.defaultsHint')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                update.mutate({ family_id: familyId, ...form }, { onSuccess: () => undefined });
              }}
            >
              <Field label={t('scoring.defaultBase')} htmlFor="sc-base"><Input id="sc-base" type="number" min={0} max={50} value={form.default_base_points} onChange={(e) => setForm({ ...form, default_base_points: Number(e.target.value) })} /></Field>
              <Field label={t('scoring.defaultBonus')} htmlFor="sc-bonus"><Input id="sc-bonus" type="number" min={0} max={50} value={form.default_independence_bonus} onChange={(e) => setForm({ ...form, default_independence_bonus: Number(e.target.value) })} /></Field>
              <Field label={t('scoring.initiativePoints')} htmlFor="sc-ip"><Input id="sc-ip" type="number" min={0} max={20} value={form.initiative_points} onChange={(e) => setForm({ ...form, initiative_points: Number(e.target.value) })} /></Field>
              <Field label={t('scoring.initiativeCap')} htmlFor="sc-cap"><Input id="sc-cap" type="number" min={0} max={50} value={form.initiative_daily_cap} onChange={(e) => setForm({ ...form, initiative_daily_cap: Number(e.target.value) })} /></Field>
              <div className="sm:col-span-2">
                <Button type="submit" loading={update.isPending}>{t('common.save')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('scoring.rulesTable')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <thead><tr><Th>{t('common.details')}</Th><Th className="text-end">{t('common.points')}</Th></tr></thead>
              <tbody>
                <tr><Td>{t('scoring.ruleIndependent')}</Td><Td className="text-end font-semibold">+{formatNumber(base + bonus, lang)}</Td></tr>
                <tr><Td>{t('scoring.ruleReminded')}</Td><Td className="text-end font-semibold">+{formatNumber(base, lang)}</Td></tr>
                <tr><Td>{t('scoring.ruleNotDone')}</Td><Td className="text-end font-semibold">{formatNumber(0, lang)}</Td></tr>
                <tr><Td>{t('scoring.ruleInitiative')}</Td><Td className="text-end font-semibold text-gold-600">✦ +{formatNumber(form.initiative_points, lang)}</Td></tr>
                <tr><Td>{t('scoring.ruleCap')}</Td><Td className="text-end font-semibold">{formatNumber(form.initiative_daily_cap, lang)}</Td></tr>
              </tbody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="flex items-start gap-4 pt-5">
            <Calculator className="mt-1 size-7 shrink-0 text-plum-500" aria-hidden />
            <div className="grid gap-2">
              <p className="text-lg font-semibold">{t('scoring.formula')}</p>
              <p className="text-muted">{t('scoring.formulaHint')}</p>
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                {t('scoring.exampleDay', { tasks: formatNumber(dayTasks, lang), bonus: formatNumber(form.initiative_daily_cap, lang), total: formatNumber(dayTasks + form.initiative_daily_cap, lang) })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
