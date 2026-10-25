import * as React from 'react';
import { DropdownMenu as M } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;
export function MenuContent({ className, ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={6}
        className={cn('z-50 min-w-48 rounded-[var(--radius-control)] border border-app bg-surface p-1 text-fg shadow-[var(--shadow-lift)]', className)}
        {...props}
      />
    </M.Portal>
  );
}
export function MenuItem({ className, ...props }: React.ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn('flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4', className)}
      {...props}
    />
  );
}
export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-[var(--border)]" />;
