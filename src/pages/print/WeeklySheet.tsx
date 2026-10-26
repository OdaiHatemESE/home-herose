import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { activeAssignees, pointsOn, useTasks } from '@/api/tasks';
import { useHolidays } from '@/api/tasks';
import { must } from '@/api/core';
import { supabase } from '@/lib/supabase';
import { pick } from '@/i18n';
import { dayOfWeek, formatDate, weekDates, weekStartFor } from '@/lib/dates';
import { avatarEmoji } from '@/lib/icons';
import { Input } from '@/components/ui/input';
import { TrophyMark } from '@/components/brand/Logo';
import { ChildSelect } from '@/components/parent/shared';
import { A4Page, PrintShell } from './PrintShell';
import type { TaskWithMeta } from '@/api/tasks';

export default function WeeklySheet() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const { familyId, family, settings, today } = useParent();
  const week = weekStartFor(params.get('week') ?? today, settings.week_start_day);
  const childParam = params.get('child') ?? '';
  const children = useChildren(familyId);
  const tasks = useTasks(familyId);
  const holidays = useHolidays(familyId);
  const days = weekDates(week);
  const subs = useQuery({
    queryKey: ['sheet-subs', familyId, week],
    queryFn: async () => must(await supabase.from('task_submissions').select('child_id, task_id, for_date, status, final_mode').eq('family_id', familyId).gte('for_date', days[0]).lte('for_date', days[6])),
  });
  const kids = (children.data ?? []).filter((c) => !childParam || c.id === childParam);
  const isHoliday = (d: string) => holidays.data?.some((h) => h.holiday_date === d);

  const scheduled = (task: TaskWithMeta, d: string) => {
    if (task.start_date > d || (task.end_date && task.end_date < d)) return false;
    if (task.archived_at && task.archived_at.slice(0, 10) <= d) return false;
    if (task.school_only && (settings.weekend_days.includes(dayOfWeek(d)) || isHoliday(d))) return false;
    if (task.recurrence === 'daily') return true;
    if (task.recurrence === 'weekdays') return task.weekdays.includes(dayOfWeek(d));
    if (task.recurrence === 'one_time') return task.one_time_date === d;
    return false;
  };

  return (
    <PrintShell
      landscape
      controls={
        <>
          <ChildSelect id="ws-child" allowAll kids={children.data ?? []} value={childParam} onChange={(v) => setParams({ week, ...(v ? { child: v } : {}) })} className="w-44" />
          <Input type="date" aria-label={t('print.selectWeek')} value={week} onChange={(e) => setParams({ week: e.target.value, ...(childParam ? { child: childParam } : {}) })} className="w-44" />
        </>
      }
    >
      {kids.map((c) => {
        const list = (tasks.data ?? []).filter((x) => x.is_active && activeAssignees(x.assignments, days[0]).includes(c.id) && x.recurrence !== 'occasional');
        const mark = (taskId: string, d: string) => {
          const s = subs.data?.find((x) => x.child_id === c.id && x.task_id === taskId && x.for_date === d && x.status === 'approved');
          return s ? (s.final_mode === 'independent' ? '★★' : '★') : '';
        };
        return (
          <A4Page key={c.id} landscape>
            <header className="flex items-center justify-between border-b-4 border-[#F2B705] pb-3">
              <div className="flex items-center gap-3">
                <TrophyMark className="size-14" />
                <div>
                  <h1 className="font-display text-3xl text-[#5A2FBD]">{t('print.weeklySheetTitle')}</h1>
                  <p className="text-sm">{family.name} — {t('reports.weekOf', { date: formatDate(week, lang, { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-2xl font-bold">
                <span className="text-4xl" aria-hidden>{avatarEmoji(c.avatar)}</span>
                {c.display_name}
              </div>
            </header>
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-[#D4C3FF] bg-[#F4EFFF] px-2 py-2 text-start">{t('print.task')}</th>
                  {days.map((d) => (
                    <th key={d} className="border border-[#D4C3FF] bg-[#F4EFFF] px-1 py-2 text-center">
                      {formatDate(d, lang, { weekday: 'short' })}
                      <div className="text-xs font-normal">{formatDate(d, lang, { day: 'numeric', month: 'numeric' })}</div>
                    </th>
                  ))}
                  <th className="border border-[#D4C3FF] bg-[#F4EFFF] px-2 py-2">{t('common.points')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((task) => {
                  const pts = pointsOn(task.versions, days[0]);
                  return (
                    <tr key={task.id}>
                      <td className="border border-[#D4C3FF] px-2 py-2.5 font-medium">{pick(lang, task.title_ar, task.title_en)}</td>
                      {days.map((d) => (
                        <td key={d} className={`border border-[#D4C3FF] text-center text-lg text-[#C98A00] ${scheduled(task, d) ? '' : 'bg-[repeating-linear-gradient(135deg,#f1edf9_0_4px,#fff_4px_8px)]'}`}>
                          {scheduled(task, d) ? mark(task.id, d) : ''}
                        </td>
                      ))}
                      <td className="border border-[#D4C3FF] text-center text-xs">{pts ? `${pts.base_points}+${pts.independence_bonus}` : ''}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="border border-[#D4C3FF] bg-[#FFF8E1] px-2 py-2.5 font-medium">✦ {t('nav.initiatives')}</td>
                  {days.map((d) => <td key={d} className="border border-[#D4C3FF] bg-[#FFF8E1]" />)}
                  <td className="border border-[#D4C3FF] bg-[#FFF8E1] text-center text-xs">≤ {settings.initiative_daily_cap}</td>
                </tr>
                <tr>
                  <td className="border border-[#D4C3FF] px-2 py-2.5 font-bold">{t('print.total')}</td>
                  {days.map((d) => <td key={d} className="border border-[#D4C3FF]" />)}
                  <td className="border border-[#D4C3FF]" />
                </tr>
              </tbody>
            </table>
            <footer className="mt-5 flex items-end justify-between text-sm">
              <p>{t('print.legend')}</p>
              <p className="w-64 border-t border-dashed border-[#241B3D] pt-1 text-center">{t('print.signature')}</p>
            </footer>
          </A4Page>
        );
      })}
    </PrintShell>
  );
}
