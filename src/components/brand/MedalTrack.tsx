import { useTranslation } from 'react-i18next';
import type { AchievementLevel } from '@/lib/database.types';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/dates';

const MEDAL_FILL: Record<string, string> = {
  gold: 'bg-gradient-to-b from-gold-300 to-gold-600 text-plum-900',
  silver: 'bg-gradient-to-b from-slate-100 to-silver-400 text-plum-900',
  bronze: 'bg-gradient-to-b from-orange-200 to-bronze-500 text-white',
};

/**
 * The signature progress element: a ribbon with medals pinned at each level's
 * threshold and a star marking where the child is this week.
 */
export function MedalTrack({
  percent,
  levels,
  size = 'md',
  className,
}: {
  percent: number | null;
  levels: Pick<AchievementLevel, 'id' | 'code' | 'name_ar' | 'name_en' | 'icon' | 'color' | 'min_percent' | 'is_active'>[];
  size?: 'md' | 'lg';
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const p = Math.max(0, Math.min(100, percent ?? 0));
  const pins = levels.filter((l) => l.is_active && Number(l.min_percent) > 0).sort((a, b) => Number(a.min_percent) - Number(b.min_percent));
  const big = size === 'lg';

  return (
    <div className={cn('relative select-none', big ? 'pt-9 pb-8' : 'pt-7 pb-7', className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p)}
        aria-label={t('progress.weekly')}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-plum-100 dark:bg-plum-900',
          big ? 'h-5' : 'h-3.5',
        )}
      >
        {/* ribbon fill with a subtle weave */}
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${p}%`,
            backgroundImage: `repeating-linear-gradient(135deg, rgb(255 255 255 / 0.2) 0 6px, transparent 6px 12px), linear-gradient(to ${
              i18n.dir() === 'rtl' ? 'left' : 'right'
            }, #6D3FD6, #F05A9B 60%, #F2B705)`,
          }}
        />
      </div>

      {/* the child's star */}
      <span
        className={cn('absolute top-0 -translate-x-1/2 transition-[inset] duration-700 ease-out rtl:translate-x-1/2', big ? 'text-3xl' : 'text-2xl')}
        style={{ insetInlineStart: `${p}%` }}
        aria-hidden
      >
        ⭐
      </span>

      {/* medals pinned at thresholds */}
      {pins.map((l) => {
        const reached = p >= Number(l.min_percent);
        return (
          <span
            key={l.id}
            className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5 rtl:translate-x-1/2"
            style={{ insetInlineStart: `${Number(l.min_percent)}%`, top: big ? '1.6rem' : '1.2rem' }}
          >
            <span
              className={cn(
                'grid place-items-center rounded-full border-2 border-white text-[0.7rem] font-bold shadow-sm dark:border-plum-950',
                big ? 'size-8' : 'size-6',
                reached ? MEDAL_FILL[l.code] ?? 'bg-plum-500 text-white' : 'bg-surface-2 text-muted grayscale',
              )}
              title={i18n.language === 'ar' ? l.name_ar : l.name_en || l.name_ar}
            >
              {l.icon && l.icon.length <= 3 ? l.icon : formatNumber(Number(l.min_percent), i18n.language)}
            </span>
            <span className={cn('text-[0.68rem] leading-none', reached ? 'font-semibold text-fg' : 'text-muted')}>
              {formatNumber(Number(l.min_percent), i18n.language)}%
            </span>
          </span>
        );
      })}
    </div>
  );
}
