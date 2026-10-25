import { useTranslation } from 'react-i18next';
import type { AchievementLevel } from '@/lib/database.types';
import { cn } from '@/lib/utils';

const TONES: Record<string, string> = {
  gold: 'bg-gradient-to-br from-gold-100 to-gold-300 text-gold-800 ring-gold-400/60',
  silver: 'bg-gradient-to-br from-slate-50 to-slate-200 text-slate-700 ring-slate-300',
  bronze: 'bg-gradient-to-br from-orange-50 to-orange-200 text-orange-800 ring-orange-300',
  growing: 'bg-gradient-to-br from-leaf-100 to-emerald-200 text-emerald-800 ring-emerald-300',
};

export function levelName(level: Pick<AchievementLevel, 'name_ar' | 'name_en'> | null | undefined, lang: string) {
  if (!level) return '';
  return lang === 'en' ? level.name_en || level.name_ar : level.name_ar;
}

export function LevelBadge({ level, size = 'md', className }: {
  level: Pick<AchievementLevel, 'code' | 'icon' | 'name_ar' | 'name_en'> | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  if (!level) {
    return <span className={cn('text-sm text-muted', className)}>{t('levels.none')}</span>;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset',
        TONES[level.code] ?? 'bg-plum-100 text-plum-700 ring-plum-200',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm font-medium',
        size === 'lg' && 'px-4 py-1.5 font-display text-xl',
        className,
      )}
    >
      <span aria-hidden>{level.icon}</span>
      {levelName(level, i18n.language)}
    </span>
  );
}
