import * as React from 'react';
import { Switch as S, Checkbox as C, Tabs as T, Progress as P } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-plum-200 transition-colors data-[state=checked]:bg-leaf-500 disabled:opacity-50 dark:bg-plum-700',
        className,
      )}
      {...props}
    >
      <S.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow transition-transform ltr:data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5" />
    </S.Root>
  );
}

export function SwitchRow({ id, label, hint, checked, onCheckedChange, disabled }: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <label htmlFor={id} className="grid gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-md border-2 border-plum-200 bg-surface data-[state=checked]:border-leaf-500 data-[state=checked]:bg-leaf-500 dark:border-plum-700',
        className,
      )}
      {...props}
    >
      <C.Indicator>
        <Check className="size-3.5 text-white" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}

export const Tabs = T.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-2 p-1', className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium text-muted transition-colors data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}
export function TabsContent({ className, ...props }: React.ComponentProps<typeof T.Content>) {
  return <T.Content className={cn('mt-4 focus-visible:outline-none', className)} {...props} />;
}

export function Progress({ value, className, indicatorClassName, label }: { value: number; className?: string; indicatorClassName?: string; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <P.Root value={v} aria-label={label} className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <P.Indicator
        className={cn('h-full rounded-full bg-plum-500 transition-[width] duration-500', indicatorClassName)}
        style={{ width: `${v}%` }}
      />
    </P.Root>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-[var(--radius-control)] bg-surface-2', className)} />;
}

/** Compact segmented choice used for filters and modes. */
export function Segmented<T extends string>({ value, onChange, options, label, className }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-muted transition-colors',
            value === o.value && 'bg-surface text-fg shadow-sm',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
