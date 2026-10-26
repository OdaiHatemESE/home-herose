import * as React from 'react';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-[var(--radius-control)] border border-app bg-surface px-3.5 text-fg placeholder:text-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-plum-500/30 focus-visible:border-plum-500 disabled:opacity-60 aria-[invalid=true]:border-red-500';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(field, 'h-11', className)} {...props} />,
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(field, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />,
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(field, 'hh-select h-11 appearance-none pe-9', className)}
      {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
