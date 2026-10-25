import { useTranslation } from 'react-i18next';
import { useParent } from '@/auth/AuthProvider';
import { useFamilyTable } from '@/api/content';
import { pick } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/dates';
import { TrophyMark } from '@/components/brand/Logo';
import { levelName } from '@/components/brand/LevelBadge';
import { A4Page, PrintShell } from './PrintShell';

export default function LevelsGuide() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { familyId, family, settings } = useParent();
  const levels = useFamilyTable('achievement_levels', familyId, 'rank');
  const rewards = useFamilyTable('reward_catalog', familyId);
  const rules = useFamilyTable('family_rules', familyId, 'sort_order');
  const sorted = [...(levels.data ?? [])].filter((l) => l.is_active).sort((a, b) => Number(b.min_percent) - Number(a.min_percent));
  const base = settings.default_base_points;
  const bonus = settings.default_independence_bonus;

  return (
    <PrintShell>
      <A4Page>
        <header className="flex items-center gap-4 border-b-4 border-[#F2B705] pb-4">
          <TrophyMark className="size-16" />
          <div>
            <h1 className="font-display text-4xl text-[#5A2FBD]">{t('print.levelsGuide')}</h1>
            <p>{family.name}</p>
          </div>
        </header>

        <h2 className="mt-6 mb-3 text-xl font-bold">{t('print.howPoints')}</h2>
        <table className="w-full border-collapse text-base">
          <tbody>
            {[
              [t('scoring.ruleIndependent'), `+${base + bonus} ★★`],
              [t('scoring.ruleReminded'), `+${base} ★`],
              [t('scoring.ruleNotDone'), '0'],
              [t('scoring.ruleInitiative'), `+${settings.initiative_points} ✦`],
              [t('scoring.ruleCap'), String(settings.initiative_daily_cap)],
            ].map(([a, b]) => (
              <tr key={a}><td className="border border-[#D4C3FF] px-3 py-2">{a}</td><td className="w-32 border border-[#D4C3FF] px-3 py-2 text-center font-bold">{b}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm">{t('scoring.formula')}</p>

        <h2 className="mt-6 mb-3 text-xl font-bold">{t('nav.levels')}</h2>
        <div className="grid gap-3">
          {sorted.map((l, i) => (
            <div key={l.id} className="flex items-center gap-4 rounded-2xl border-2 border-[#E9E0FF] px-4 py-3">
              <span className="text-5xl" aria-hidden>{l.icon}</span>
              <div className="flex-1">
                <p className="font-display text-2xl">{levelName(l, lang)}</p>
                <p className="text-sm" dir="ltr">{formatNumber(Number(l.min_percent), 'en')}% – {i === 0 ? '100' : `<${formatNumber(Number(sorted[i - 1].min_percent), 'en')}`}%</p>
              </div>
              <div className="text-end">
                {Number(l.money_amount) > 0 && <p className="font-bold">{formatMoney(Number(l.money_amount), family.currency, lang)}</p>}
                <p>{pick(lang, l.privilege_ar, l.privilege_en) || pick(lang, l.message_ar, l.message_en)}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-6 mb-3 text-xl font-bold">{t('rewards.catalog')}</h2>
        <ul className="grid grid-cols-2 gap-2">
          {(rewards.data ?? []).filter((r) => r.is_available).map((r) => {
            const l = levels.data?.find((x) => x.id === r.min_level_id);
            return (
              <li key={r.id} className="flex items-center gap-2 rounded-xl bg-[#F4EFFF] px-3 py-2">
                <span className="text-2xl" aria-hidden>{r.icon}</span>
                <span className="flex-1">{pick(lang, r.name_ar, r.name_en)}</span>
                {l && <span aria-label={levelName(l, lang)}>{l.icon}</span>}
              </li>
            );
          })}
        </ul>

        <h2 className="mt-6 mb-3 text-xl font-bold">{t('notes.tabsValues')}</h2>
        <ul className="grid gap-1.5">
          {(rules.data ?? []).filter((r) => r.is_active).map((r) => <li key={r.id}>♥ {pick(lang, r.title_ar, r.title_en)}</li>)}
        </ul>
        <p className="mt-6 rounded-xl bg-[#FDE0EE] px-4 py-3 text-sm">{t('rewards.principle')}</p>
      </A4Page>
    </PrintShell>
  );
}
