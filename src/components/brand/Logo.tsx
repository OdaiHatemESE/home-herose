import { cn } from '@/lib/utils';

/** Trophy emblem with a star — the Home Heroes mark. */
export function TrophyMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-10', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id="hh-cup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD54A" />
          <stop offset="1" stopColor="#E09E00" />
        </linearGradient>
      </defs>
      <path d="M18 12h28v12c0 9-6 16-14 16s-14-7-14-16V12Z" fill="url(#hh-cup)" />
      <path d="M18 16H11c0 8 3 13 9 14M46 16h7c0 8-3 13-9 14" fill="none" stroke="#E09E00" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 40h8v8h-8z" fill="#C98A00" />
      <rect x="20" y="48" width="24" height="7" rx="3" fill="#6D3FD6" />
      <path d="m32 17 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" fill="#fff" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <TrophyMark className="size-9" />
      {!compact && (
        <span className="grid leading-none">
          <span className="font-display text-[1.45rem] text-plum-600 dark:text-plum-200">أبطال البيت</span>
          <span className="text-[0.7rem] font-medium tracking-wide text-muted">Home Heroes</span>
        </span>
      )}
    </span>
  );
}
