import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Award, Download, FileText, Image, Printer, ScrollText } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useParent } from '@/auth/AuthProvider';
import { useChildren, useMembers } from '@/api/family';
import { useCategories, useTasks } from '@/api/tasks';
import { useInitiatives } from '@/api/initiatives';
import { useFamilyTable, useSkillAssessments } from '@/api/content';
import { useFulfillments } from '@/api/rewards';
import { must } from '@/api/core';
import { supabase } from '@/lib/supabase';
import { pick } from '@/i18n';
import { addDays, formatDate, formatMoney, formatNumber, monthRange, weekStartFor } from '@/lib/dates';
import { colorHex } from '@/lib/chartColors';
import { toCsv } from '@/lib/csv';
import { downloadFile } from '@/lib/utils';
import type { ChildProgress } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Segmented, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/controls';
import { Table, Td, Th } from '@/components/ui/table';
import { PageHeader } from '@/components/brand/misc';
import { LevelBadge } from '@/components/brand/LevelBadge';
import { ChildChips, ChildName, useChildMap } from '@/components/parent/shared';

type RangeKey = 'week' | 'last4' | 'month' | 'custom';

export default function Reports() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, family, settings, today } = useParent();
  const ws = weekStartFor(today, settings.week_start_day);
  const [rangeKey, setRangeKey] = React.useState<RangeKey>('week');
  const [custom, setCustom] = React.useState({ from: addDays(today, -13), to: today });
  const range = rangeKey === 'week' ? { from: ws, to: ws < today ? (addDays(ws, 6) > today ? today : addDays(ws, 6)) : today }
    : rangeKey === 'last4' ? { from: addDays(ws, -21), to: today }
    : rangeKey === 'month' ? { from: monthRange(today).from, to: today }
    : custom;
  const [childFilter, setChildFilter] = React.useState('');
  const children = useChildren(familyId, { includeInactive: true });
  const childMap = useChildMap(children.data);
  const visible = (children.data ?? []).filter((c) => (!childFilter || c.id === childFilter) && c.is_active);
  const tasks = useTasks(familyId);
  const categories = useCategories(familyId);
  const members = useMembers(familyId);
  const skills = useFamilyTable('skills', familyId, 'sort_order');
  const assessments = useSkillAssessments({ familyId });
  const initiatives = useInitiatives({ familyId, limit: 500 });
  const fulfillments = useFulfillments({ familyId });

  const progress = useQueries({
    queries: visible.map((c) => ({
      queryKey: ['progress', c.id, range.from, range.to],
      queryFn: async () => must(await supabase.rpc('get_child_progress', { p_child: c.id, p_from: range.from, p_to: range.to })) as ChildProgress,
    })),
  });
  const submissions = useQuery({
    queryKey: ['report-submissions', familyId, range.from, range.to],
    queryFn: async () => must(await supabase.from('task_submissions').select('*').eq('family_id', familyId).gte('for_date', range.from).lte('for_date', range.to).order('for_date')),
  });

  const inRange = (d: string) => d >= range.from && d <= range.to;
  const subs = (submissions.data ?? []).filter((s) => !childFilter || s.child_id === childFilter);
  const taskMap = new Map((tasks.data ?? []).map((x) => [x.id, x]));
  const reviewerName = (id: string | null) => {
    if (!id) return t('activity.system');
    const m = members.data?.find((x) => x.user_id === id);
    return m?.display_name ?? m?.profile?.display_name ?? '—';
  };

  // daily approved points (stacked by child)
  const days = progress[0]?.data?.days ?? [];
  const daily = days.map((d, i) => {
    const point: Record<string, string | number> = { day: formatDate(d.date, lang, { weekday: 'short', day: 'numeric' }) };
    visible.forEach((c, ci) => {
      point[c.display_name] = progress[ci]?.data?.days[i]?.approved_points ?? 0;
    });
    return point;
  });

  // category performance
  const catRows = [...(categories.data ?? []), null].map((cat) => {
    const rows = subs.filter((s) => {
      const task = taskMap.get(s.task_id);
      return cat ? task?.category_id === cat.id : !task?.category_id;
    });
    const approved = rows.filter((s) => s.status === 'approved');
    return {
      category: cat ? pick(lang, cat.name_ar, cat.name_en) : t('tasks.noCategory'),
      approved: approved.length,
      independent: approved.filter((s) => s.final_mode === 'independent').length,
      points: approved.reduce((n, s) => n + (s.awarded_points ?? 0), 0),
    };
  }).filter((r) => r.approved > 0);

  // independence by week
  const weeks = [...new Set(subs.map((s) => weekStartFor(s.for_date, settings.week_start_day)))].sort();
  const indep = weeks.map((w) => {
    const rows = subs.filter((s) => s.status === 'approved' && weekStartFor(s.for_date, settings.week_start_day) === w);
    const independent = rows.filter((s) => s.final_mode === 'independent').length;
    return {
      week: formatDate(w, lang, { day: 'numeric', month: 'short' }),
      [t('progress.independent')]: independent,
      [t('progress.reminded')]: rows.length - independent,
    };
  });

  const exportCsv = (name: string, rows: Record<string, unknown>[]) => downloadFile(`home-heroes-${name}-${range.from}_${range.to}.csv`, toCsv(rows), 'text/csv;charset=utf-8');

  const summaryRows = visible.map((c, i) => {
    const p = progress[i]?.data;
    return {
      [t('common.child')]: c.display_name,
      [t('reports.approvedPoints')]: p?.approved_points ?? '',
      [t('reports.maxPoints')]: p?.max_points ?? '',
      [t('progress.percent')]: p?.percent ?? '',
      [t('progress.independent')]: p?.independent_tasks ?? '',
      [t('progress.reminded')]: p?.reminded_tasks ?? '',
      [t('reports.initiatives')]: p?.initiatives_approved ?? '',
      [t('progress.remindersLogged')]: p?.reminders_logged ?? '',
    };
  });

  const chartAxis = { tick: { fontSize: 11, fill: 'var(--muted)' } };
  const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 };

  return (
    <>
      <PageHeader title={t('reports.title')} description={t('reports.description')} actions={<Button variant="outline" onClick={() => window.print()} className="no-print"><Printer /> {t('reports.printReport')}</Button>} />

      <div className="no-print mb-5 grid gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Segmented<RangeKey>
            label={t('reports.range')}
            value={rangeKey}
            onChange={setRangeKey}
            options={[
              { value: 'week', label: t('common.thisWeek') },
              { value: 'last4', label: `4 × ${t('reports.weekly')}` },
              { value: 'month', label: t('common.thisMonth') },
              { value: 'custom', label: '…' },
            ]}
          />
          {rangeKey === 'custom' && (
            <>
              <Field label={t('common.from')} htmlFor="rp-from"><Input id="rp-from" type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></Field>
              <Field label={t('common.to')} htmlFor="rp-to"><Input id="rp-to" type="date" value={custom.to} min={custom.from} max={today} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></Field>
            </>
          )}
        </div>
        {children.data && <ChildChips kids={children.data.filter((c) => c.is_active)} value={childFilter} onChange={setChildFilter} />}
      </div>
      <p className="mb-4 text-sm text-muted">{formatDate(range.from, lang, { day: 'numeric', month: 'long' })} — {formatDate(range.to, lang, { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <Tabs defaultValue="summary">
        <TabsList className="no-print">
          {(['summary', 'categories', 'independence', 'initiatives', 'skills', 'rewards', 'reviews'] as const).map((k) => (
            <TabsTrigger key={k} value={k}>{t(k === 'summary' ? 'reports.child' : `reports.${k}`)}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary" className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.child')}</CardTitle>
              <Button size="sm" variant="ghost" className="no-print" onClick={() => exportCsv('summary', summaryRows)}><Download /> {t('common.exportCsv')}</Button>
            </CardHeader>
            <CardContent>
              {progress.some((p) => p.isPending) ? <Skeleton className="h-32" /> : (
                <Table>
                  <thead><tr><Th>{t('common.child')}</Th><Th>{t('reports.approvedPoints')}</Th><Th>{t('reports.maxPoints')}</Th><Th>{t('progress.percent')}</Th><Th>{t('progress.independent')}</Th><Th>{t('progress.reminded')}</Th><Th>{t('reports.initiatives')}</Th><Th /></tr></thead>
                  <tbody>
                    {visible.map((c, i) => {
                      const p = progress[i]?.data;
                      const level = rangeKey === 'week' ? p?.level : null;
                      return (
                        <tr key={c.id}>
                          <Td><ChildName child={c} /></Td>
                          <Td className="tabular-nums">{formatNumber(p?.approved_points, lang)}</Td>
                          <Td className="tabular-nums">{formatNumber(p?.max_points, lang)}</Td>
                          <Td className="font-semibold tabular-nums">{p?.percent == null ? '—' : `${formatNumber(p.percent, lang)}%`}</Td>
                          <Td className="tabular-nums">{formatNumber(p?.independent_tasks, lang)}</Td>
                          <Td className="tabular-nums">{formatNumber(p?.reminded_tasks, lang)}</Td>
                          <Td className="tabular-nums">{formatNumber(p?.initiatives_approved, lang)}</Td>
                          <Td>{level && <LevelBadge level={level} size="sm" />}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('reports.daily')}</CardTitle></CardHeader>
            <CardContent>
              {daily.length === 0 ? <p className="text-sm text-muted">{t('reports.noData')}</p> : (
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="day" {...chartAxis} reversed={lang === 'ar'} />
                      <YAxis {...chartAxis} orientation={lang === 'ar' ? 'right' : 'left'} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {visible.map((c, i) => <Bar key={c.id} dataKey={c.display_name} stackId="a" fill={colorHex(c.color, i)} radius={i === visible.length - 1 ? [6, 6, 0, 0] : 0} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.categories')}</CardTitle>
              <Button size="sm" variant="ghost" className="no-print" onClick={() => exportCsv('categories', catRows)}><Download /> {t('common.exportCsv')}</Button>
            </CardHeader>
            <CardContent>
              {catRows.length === 0 ? <p className="text-sm text-muted">{t('reports.noData')}</p> : (
                <Table>
                  <thead><tr><Th>{t('tasks.category')}</Th><Th>{t('status.approved')}</Th><Th>{t('progress.independent')}</Th><Th>{t('common.points')}</Th></tr></thead>
                  <tbody>{catRows.map((r) => <tr key={r.category}><Td>{r.category}</Td><Td>{formatNumber(r.approved, lang)}</Td><Td>{formatNumber(r.independent, lang)}</Td><Td>{formatNumber(r.points, lang)}</Td></tr>)}</tbody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="independence">
          <Card>
            <CardHeader><CardTitle>{t('reports.independence')}</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted">{t('dashboard.independenceHint')}</p>
              {indep.length === 0 ? <p className="text-sm text-muted">{t('reports.noData')}</p> : (
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={indep} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="week" {...chartAxis} reversed={lang === 'ar'} />
                      <YAxis {...chartAxis} orientation={lang === 'ar' ? 'right' : 'left'} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey={t('progress.independent')} stackId="i" fill="#1FA971" />
                      <Bar dataKey={t('progress.reminded')} stackId="i" fill="#F05A9B" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="initiatives">
          <ReportTable
            title={t('reports.initiatives')}
            onExport={(rows) => exportCsv('initiatives', rows)}
            rows={(initiatives.data ?? []).filter((x) => inRange(x.for_date) && (!childFilter || x.child_id === childFilter)).map((x) => ({
              [t('common.date')]: x.for_date,
              [t('common.child')]: childMap.get(x.child_id)?.display_name ?? '',
              [t('initiatives.whatDid')]: x.title,
              [t('common.status')]: t(`status.${x.status}`),
              [t('common.points')]: x.points_awarded ?? '',
            }))}
          />
        </TabsContent>

        <TabsContent value="skills">
          <ReportTable
            title={t('reports.skills')}
            onExport={(rows) => exportCsv('skills', rows)}
            rows={(assessments.data ?? []).filter((a) => inRange(a.assessed_on) && (!childFilter || a.child_id === childFilter)).map((a) => {
              const s = skills.data?.find((x) => x.id === a.skill_id);
              return {
                [t('common.date')]: a.assessed_on,
                [t('common.child')]: childMap.get(a.child_id)?.display_name ?? '',
                [t('nav.skills')]: s ? pick(lang, s.name_ar, s.name_en) : '',
                [t('skills.rating')]: a.rating,
                [t('skills.observation')]: a.observation ?? '',
              };
            })}
          />
        </TabsContent>

        <TabsContent value="rewards">
          <ReportTable
            title={t('reports.rewards')}
            onExport={(rows) => exportCsv('rewards', rows)}
            rows={(fulfillments.data ?? []).filter((f) => inRange(f.created_at.slice(0, 10)) && (!childFilter || f.child_id === childFilter)).map((f) => ({
              [t('common.date')]: f.created_at.slice(0, 10),
              [t('common.child')]: childMap.get(f.child_id)?.display_name ?? '',
              [t('common.name')]: f.title,
              [t('rewards.value')]: f.amount ? formatMoney(Number(f.amount), f.currency ?? family.currency, lang) : '',
              [t('common.status')]: t(`status.${f.status}`),
              [t('status.paid')]: f.payment_status === 'not_applicable' ? '' : t(`status.${f.payment_status}`),
            }))}
          />
        </TabsContent>

        <TabsContent value="reviews">
          <ReportTable
            title={t('reports.reviews')}
            onExport={(rows) => exportCsv('reviews', rows)}
            rows={subs.filter((s) => s.reviewed_at).map((s) => {
              const task = taskMap.get(s.task_id);
              return {
                [t('common.date')]: s.for_date,
                [t('common.child')]: childMap.get(s.child_id)?.display_name ?? '',
                [t('tasks.title')]: task ? pick(lang, task.title_ar, task.title_en) : '',
                [t('reports.decision')]: t(`status.${s.status}`),
                [t('approvals.mode')]: s.final_mode ? t(s.final_mode === 'independent' ? 'progress.independent' : 'progress.reminded') : '',
                [t('common.points')]: s.awarded_points ?? '',
                [t('reports.reviewer')]: s.auto_approved ? t('activity.system') : reviewerName(s.reviewed_by),
              };
            })}
          />
        </TabsContent>
      </Tabs>

      <section className="no-print mt-10" aria-labelledby="printables">
        <h2 id="printables" className="mb-3 text-lg font-semibold">{t('reports.printables')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: `/parent/print/weekly?week=${ws}`, icon: FileText, label: t('reports.printWeekly') },
            { to: `/parent/print/certificate`, icon: Award, label: t('reports.printCertificate') },
            { to: `/parent/print/poster`, icon: Image, label: t('reports.printPoster') },
            { to: `/parent/print/levels`, icon: ScrollText, label: t('reports.printLevels') },
          ].map((p) => (
            <Link key={p.to} to={p.to} className="surface flex items-center gap-3 rounded-[var(--radius-card)] p-4 hover:border-plum-400">
              <p.icon className="size-6 text-plum-500" aria-hidden />
              <span className="font-medium">{p.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function ReportTable({ title, rows, onExport }: { title: string; rows: Record<string, unknown>[]; onExport: (rows: Record<string, unknown>[]) => void }) {
  const { t } = useTranslation();
  const cols = Object.keys(rows[0] ?? {});
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {rows.length > 0 && <Button size="sm" variant="ghost" className="no-print" onClick={() => onExport(rows)}><Download /> {t('common.exportCsv')}</Button>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted">{t('reports.noData')}</p> : (
          <Table>
            <thead><tr>{cols.map((c) => <Th key={c}>{c}</Th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <Td key={c}>{String(r[c] ?? '')}</Td>)}</tr>)}</tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
