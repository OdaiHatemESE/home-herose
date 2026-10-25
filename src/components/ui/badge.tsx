import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-muted',
      purple: 'bg-plum-100 text-plum-700 dark:bg-plum-500/20 dark:text-plum-200',
      gold: 'bg-gold-100 text-gold-800 dark:bg-gold-400/20 dark:text-gold-300',
      green: 'bg-leaf-100 text-leaf-500 dark:bg-leaf-500/20 dark:text-leaf-100',
      blue: 'bg-sky-100 text-sky-500 dark:bg-sky-500/20 dark:text-sky-100',
      pink: 'bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-100',
      red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
