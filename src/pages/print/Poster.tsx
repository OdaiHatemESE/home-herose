import { useTranslation } from 'react-i18next';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { useFamilyTable } from '@/api/content';
import { avatarEmoji } from '@/lib/icons';
import { TrophyMark } from '@/components/brand/Logo';
import { levelName } from '@/components/brand/LevelBadge';
import { A4Page, PrintShell } from './PrintShell';

export default function Poster() {
  const { t, i18n } = useTranslation();
  const { familyId, family } = useParent();
  const children = useChildren(familyId);
  const levels = useFamilyTable('achievement_levels', familyId, 'rank');
  const sorted = [...(levels.data ?? [])].filter((l) => l.is_active).sort((a, b) => Number(b.min_percent) - Number(a.min_percent));
  return (
    <PrintShell>
      <A4Page className="bg-[radial-gradient(120mm_90mm_at_50%_0%,#FFEFB3,transparent),radial-gradient(120mm_120mm_at_0%_100%,#E9E0FF,transparent),radial-gradient(120mm_120mm_at_100%_100%,#FDE0EE,transparent)]">
        <div className="flex min-h-[269mm] flex-col items-center justify-between text-center">
          <div className="flex flex-col items-center gap-4 pt-6">
            <div className="text-4xl tracking-[0.6em]" aria-hidden>⭐🌟⭐</div>
            <TrophyMark className="size-48" />
            <h1 className="font-display text-[5.5rem] leading-none text-[#5A2FBD]">تحدّي أبطال البيت</h1>
            <p className="font-display text-3xl text-[#C98A00]">{t('print.posterLine')}</p>
            <p className="text-xl">{family.name}</p>
          </div>
          <ul className="flex flex-wrap justify-center gap-6">
            {(children.data ?? []).map((c) => (
              <li key={c.id} className="flex flex-col items-center gap-1">
                <span className="grid size-24 place-items-center rounded-full bg-white text-6xl shadow-md">{avatarEmoji(c.avatar)}</span>
                <span className="text-2xl font-bold">{c.display_name}</span>
              </li>
            ))}
          </ul>
          <ul className="mb-4 flex flex-wrap justify-center gap-4">
            {sorted.map((l) => (
              <li key={l.id} className="rounded-2xl bg-white/80 px-5 py-3 text-center shadow-sm">
                <div className="text-4xl" aria-hidden>{l.icon}</div>
                <div className="font-display text-xl">{levelName(l, i18n.language)}</div>
                <div className="text-sm" dir="ltr">≥ {Number(l.min_percent)}%</div>
              </li>
            ))}
          </ul>
        </div>
      </A4Page>
    </PrintShell>
  );
}
