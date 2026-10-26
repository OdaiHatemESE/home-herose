import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useParent } from '@/auth/AuthProvider';
import { useChildren } from '@/api/family';
import { useSnapshots } from '@/api/progress';
import { formatDate } from '@/lib/dates';
import { avatarEmoji } from '@/lib/icons';
import { TrophyMark } from '@/components/brand/Logo';
import { levelName } from '@/components/brand/LevelBadge';
import { ChildSelect } from '@/components/parent/shared';
import { Select } from '@/components/ui/input';
import { A4Page, PrintShell } from './PrintShell';

export default function Certificate() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const { familyId, family } = useParent();
  const children = useChildren(familyId);
  const childId = params.get('child') ?? children.data?.[0]?.id ?? '';
  const snapshots = useSnapshots({ childId: childId || undefined, limit: 52 });
  const week = params.get('week') ?? '';
  const child = children.data?.find((c) => c.id === childId);
  const snap = snapshots.data?.find((s) => s.week_start === week) ?? (week ? undefined : snapshots.data?.[0]);
  const level = snap?.level_snapshot;

  return (
    <PrintShell
      landscape
      controls={
        <>
          <ChildSelect id="ct-child" kids={children.data ?? []} value={childId} onChange={(v) => setParams({ child: v })} className="w-44" />
          <Select aria-label={t('print.selectWeek')} value={snap?.week_start ?? ''} onChange={(e) => setParams({ child: childId, week: e.target.value })} className="w-56">
            <option value="">{t('print.certificateGeneric').slice(0, 30)}…</option>
            {(snapshots.data ?? []).map((s) => (
              <option key={s.id} value={s.week_start}>
                {formatDate(s.week_start, lang, { day: 'numeric', month: 'short' })} — {levelName(s.level_snapshot, lang)}
              </option>
            ))}
          </Select>
        </>
      }
    >
      {child && (
        <A4Page landscape>
          <div className="absolute inset-[8mm] rounded-[18px] border-[6px] border-double border-[#F2B705]" aria-hidden />
          <div className="absolute inset-[13mm] rounded-[12px] border border-[#D4C3FF]" aria-hidden />
          <div className="relative flex min-h-[170mm] flex-col items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-4 text-5xl" aria-hidden>
              <span>🎗️</span>
              <TrophyMark className="size-24" />
              <span>🎗️</span>
            </div>
            <h1 className="font-display text-6xl text-[#5A2FBD]">{t('print.certificateTitle')}</h1>
            <p className="text-xl">{t('print.certificateBody')}</p>
            <p className="font-display text-7xl text-[#C98A00]">
              <span aria-hidden>{avatarEmoji(child.avatar)} </span>
              {child.display_name}
            </p>
            <p className="max-w-[60ch] text-xl">
              {snap && level
                ? t('print.certificateFor', { level: `${level.icon} ${levelName(level, lang)}`, date: formatDate(snap.week_start, lang, { day: 'numeric', month: 'long', year: 'numeric' }) })
                : t('print.certificateGeneric')}
            </p>
            <p className="mt-6 text-lg">{t('print.signedBy', { family: family.name })}</p>
            <p className="text-sm text-[#6B6386]">{t('app.tagline')}</p>
          </div>
        </A4Page>
      )}
    </PrintShell>
  );
}
