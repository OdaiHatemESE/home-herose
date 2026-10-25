import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-medium transition-[background,transform,box-shadow] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-plum-500 text-white shadow-[var(--shadow-soft)] hover:bg-plum-600',
        gold: 'bg-gold-400 text-plum-900 shadow-[var(--shadow-soft)] hover:bg-gold-300',
        success: 'bg-leaf-500 text-white hover:brightness-95',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-app bg-surface text-fg hover:bg-surface-2',
        ghost: 'text-fg hover:bg-surface-2',
        soft: 'bg-plum-50 text-plum-700 hover:bg-plum-100 dark:bg-plum-500/15 dark:text-plum-200 dark:hover:bg-plum-500/25',
        link: 'text-plum-600 underline-offset-4 hover:underline dark:text-plum-200 px-0',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-[0.95rem]',
        lg: 'h-13 px-6 text-base',
        xl: 'h-16 px-8 text-lg rounded-[var(--radius-card)]',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? (
          children
        ) : (
          <>
            {loading && <LoaderCircle className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
export { buttonVariants };
