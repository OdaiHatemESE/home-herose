import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useParent } from '@/auth/AuthProvider';
import { useMembers } from '@/api/family';
import { useAuditLogs } from '@/api/content';
import { formatDateTime } from '@/lib/dates';
import type { Json } from '@/lib/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/controls';
import { EmptyState, PageHeader } from '@/components/brand/misc';

const HIDDEN = new Set(['updated_at', 'created_at', 'id', 'family_id', 'token_hash']);

function changedKeys(oldData: Json | null, newData: Json | null): string[] {
  const o = (oldData ?? {}) as Record<string, unknown>;
  const n = (newData ?? {}) as Record<string, unknown>;
  if (!oldData || !newData) return [];
  return Object.keys(n).filter((k) => !HIDDEN.has(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
}

function summary(data: Json | null): string {
  const d = (data ?? {}) as Record<string, unknown>;
  return String(d.title_ar ?? d.display_name ?? d.name_ar ?? d.name ?? d.title ?? d.reason ?? (d.points !== undefined ? `${d.points}` : ''));
}

export default function ActivityLog() {
  const { t, i18n } = useTranslation();
  const { familyId, family } = useParent();
  const [page, setPage] = React.useState(0);
  const logs = useAuditLogs(familyId, page);
  const members = useMembers(familyId);
  const actorName = (id: string | null) => {
    if (!id) return t('activity.system');
    const m = members.data?.find((x) => x.user_id === id);
    return m ? m.display_name ?? m.profile?.display_name ?? '—' : t('common.child');
  };

  return (
    <>
      <PageHeader title={t('activity.title')} description={t('activity.description')} />
      {logs.isPending ? (
        <Skeleton className="h-64" />
      ) : !logs.data?.length ? (
        <EmptyState icon="🗂️" title={t('activity.empty')} />
      ) : (
        <ol className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-app bg-surface">
          {logs.data.map((l) => {
            const keys = changedKeys(l.old_data, l.new_data);
            return (
              <li key={l.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[11rem_1fr]">
                <time className="text-muted" dateTime={l.created_at}>{formatDateTime(l.created_at, i18n.language, family.timezone)}</time>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{actorName(l.actor_id)}</span>
                  <Badge tone={l.action === 'delete' ? 'red' : l.action === 'insert' ? 'green' : 'purple'}>{t(`activity.actions.${l.action}`, { defaultValue: l.action })}</Badge>
                  <span>{t(`activity.tables.${l.table_name}`, { defaultValue: l.table_name })}</span>
                  {summary(l.new_data ?? l.old_data) && <span className="text-muted">«{summary(l.new_data ?? l.old_data)}»</span>}
                  {keys.length > 0 && <span className="text-xs text-muted" dir="ltr">{keys.slice(0, 5).join(', ')}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-4 flex justify-between">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronRight className="ltr:rotate-180" /> {t('common.back')}</Button>
        <Button variant="outline" size="sm" disabled={(logs.data?.length ?? 0) < 50} onClick={() => setPage((p) => p + 1)}>{t('common.next')} <ChevronLeft className="ltr:rotate-180" /></Button>
      </div>
    </>
  );
}
