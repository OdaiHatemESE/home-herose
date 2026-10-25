import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { useChildIdentity } from '@/auth/AuthProvider';
import { rewardApi, useFulfillments, useRewardOptions } from '@/api/rewards';
import { useFamilyTable } from '@/api/content';
import { useAction } from '@/api/core';
import { pick } from '@/i18n';
import { formatMoney } from '@/lib/dates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/misc';
import { levelName } from '@/components/brand/LevelBadge';

export default function ChildRewards() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { child, family } = useChildIdentity();
  const options = useRewardOptions(child.id);
  const mine = useFulfillments({ childId: child.id });
  const levels = useFamilyTable('achievement_levels', family.id, 'rank');
  const request = useAction(rewardApi.request, { success: t('rewards.requested') });

  return (
    <>
      <PageHeader title={t('rewards.childTitle')} description={t('rewards.childIntro')} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {(options.data ?? []).filter((r) => r.is_available).map((r) => {
          const lvl = levels.data?.find((l) => l.id === r.min_level_id);
          return (
            <li key={r.id} className="surface flex items-center gap-3 rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)]">
              <span className={r.eligible ? 'text-4xl' : 'text-4xl opacity-40 grayscale'} aria-hidden>{r.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{pick(lang, r.name_ar, r.name_en)}</p>
                {!r.eligible && (
                  <p className="flex items-center gap-1 text-sm text-muted">
                    <Lock className="size-3.5" />
                    {r.block_reason === 'level' && lvl ? t('rewards.needsLevel', { level: `${lvl.icon} ${levelName(lvl, lang)}` }) : t(`errors.reason_${r.block_reason}`, { defaultValue: t('rewards.locked') })}
                  </p>
                )}
              </div>
              {r.eligible && (
                <Button variant="gold" size="sm" loading={request.isPending && request.variables === r.id} onClick={() => request.mutate(r.id)}>{t('rewards.request')}</Button>
              )}
            </li>
          );
        })}
      </ul>
      <h2 className="mt-8 mb-3 text-lg font-semibold">{t('rewards.myRewards')}</h2>
      <ul className="grid gap-2">
        {(mine.data ?? []).map((f) => (
          <li key={f.id} className="surface flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3">
            <span className="flex-1 font-medium">{f.title}</span>
            {f.amount ? <span>{formatMoney(Number(f.amount), f.currency ?? family.currency, lang)}</span> : null}
            <Badge tone={f.status === 'fulfilled' ? 'green' : f.status === 'pending' ? 'gold' : 'purple'}>{t(`status.${f.status}`)}</Badge>
          </li>
        ))}
      </ul>
    </>
  );
}
