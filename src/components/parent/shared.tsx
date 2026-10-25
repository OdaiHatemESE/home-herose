import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { Child } from '@/lib/database.types';
import { Select } from '@/components/ui/input';
import { ChildAvatar } from '@/components/brand/misc';
import { cn } from '@/lib/utils';

export function useChildMap(children: Child[] | undefined) {
  return React.useMemo(() => new Map((children ?? []).map((c) => [c.id, c])), [children]);
}

export function ChildSelect({ id, children, value, onChange, allowAll, className }: {
  id: string;
  children: Child[];
  value: string;
  onChange: (v: string) => void;
  allowAll?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {allowAll && <option value="">{t('common.all')}</option>}
      {children.map((c) => (
        <option key={c.id} value={c.id}>
          {c.display_name}
        </option>
      ))}
    </Select>
  );
}

/** Horizontal chip filter of children (avatars), with an "all" chip. */
export function ChildChips({ children, value, onChange }: { children: Child[]; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t('tasks.filterChild')} className="flex flex-wrap gap-1.5">
      <button
        type="button"
        role="radio"
        aria-checked={value === ''}
        onClick={() => onChange('')}
        className={cn('rounded-full px-3.5 py-1.5 text-sm', value === '' ? 'bg-plum-500 text-white' : 'bg-surface-2 text-fg')}
      >
        {t('common.all')}
      </button>
      {children.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          onClick={() => onChange(c.id)}
          className={cn('inline-flex items-center gap-1.5 rounded-full py-1 ps-1 pe-3.5 text-sm', value === c.id ? 'bg-plum-500 text-white' : 'bg-surface-2 text-fg')}
        >
          <ChildAvatar avatar={c.avatar} color={c.color} size="sm" className="size-7 text-sm ring-0" />
          {c.display_name}
        </button>
      ))}
    </div>
  );
}

export function ChildName({ child }: { child: Child | undefined }) {
  if (!child) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <ChildAvatar avatar={child.avatar} color={child.color} size="sm" />
      <span className="font-medium">{child.display_name}</span>
    </span>
  );
}
