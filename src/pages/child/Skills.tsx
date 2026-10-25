import { useTranslation } from 'react-i18next';
import { useChildIdentity } from '@/auth/AuthProvider';
import { useFamilyTable, useSkillAssessments } from '@/api/content';
import { pick } from '@/i18n';
import { DynamicIcon, colorStyle } from '@/lib/icons';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { EmptyState, PageHeader } from '@/components/brand/misc';

export default function ChildSkills() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { child, family, settings } = useChildIdentity();
  const skills = useFamilyTable('skills', family.id, 'sort_order');
  const assessments = useSkillAssessments({ childId: child.id });
  const label = (v: number) => {
    const s = settings.skill_scale.find((x) => x.value === v);
    return s ? (lang === 'en' ? s.en : s.ar) : '';
  };
  const rated = (skills.data ?? []).filter((s) => s.is_active).map((s) => ({ skill: s, history: (assessments.data ?? []).filter((a) => a.skill_id === s.id) })).filter((x) => x.history.length);

  return (
    <>
      <PageHeader title={t('nav.mySkills')} />
      {rated.length === 0 ? (
        <EmptyState icon="🌱" title={t('skills.childEmpty')} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rated.map(({ skill, history }) => {
            const latest = history[0];
            return (
              <li key={skill.id} className="surface rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3">
                  <span className={cn('grid size-11 place-items-center rounded-[var(--radius-control)]', colorStyle(skill.color).tile)}><DynamicIcon name={skill.icon} /></span>
                  <div className="flex-1">
                    <p className="font-semibold">{pick(lang, skill.name_ar, skill.name_en)}</p>
                    <p className="text-sm text-leaf-500">{label(latest.rating)}</p>
                  </div>
                </div>
                {/* growth path, not a grade */}
                <div className="mt-3 flex items-center gap-1" aria-label={label(latest.rating)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={cn('h-2.5 flex-1 rounded-full', n <= latest.rating ? 'bg-leaf-500' : 'bg-surface-2')} />
                  ))}
                  <span className="ms-1 text-lg" aria-hidden>🌱</span>
                </div>
                {latest.observation && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">💬 {latest.observation}</p>}
                <p className="mt-2 text-xs text-muted">{formatDate(latest.assessed_on, lang, { day: 'numeric', month: 'long' })}</p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
