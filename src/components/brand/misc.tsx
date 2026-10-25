import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { avatarEmoji, colorStyle } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/dates';

export function ChildAvatar({ avatar, color, size = 'md', className }: { avatar: string; color: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full ring-2 ring-white dark:ring-plum-950',
        colorStyle(color).tile,
        size === 'sm' && 'size-8 text-base',
        size === 'md' && 'size-11 text-xl',
        size === 'lg' && 'size-16 text-3xl',
        size === 'xl' && 'size-24 text-5xl',
        className,
      )}
    >
      {avatarEmoji(avatar)}
    </span>
  );
}

export function StarTally({ regular, golden, className }: { regular: number; golden?: number; className?: string }) {
  const { t, i18n } = useTranslation();
  return (
    <span className={cn('inline-flex items-center gap-3', className)} aria-label={t('stars.tally', { regular, golden: golden ?? 0 })}>
      <span className="inline-flex items-center gap-1 font-semibold">
        <Star className="size-5 fill-plum-400 text-plum-400" aria-hidden />
        {formatNumber(regular, i18n.language)}
      </span>
      {golden ? (
        <span className="inline-flex items-center gap-1 font-semibold text-gold-600 dark:text-gold-300">
          <Star className="size-5 fill-gold-400 text-gold-400" aria-hidden />
          {formatNumber(golden, i18n.language)}
        </span>
      ) : null}
    </span>
  );
}

export function PageHeader({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-[65ch] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-app px-6 py-10 text-center', className)}>
      {icon && <div className="text-4xl" aria-hidden>{icon}</div>}
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 font-medium underline">
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[var(--radius-control)] bg-surface-2 px-3.5 py-3', className)}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
