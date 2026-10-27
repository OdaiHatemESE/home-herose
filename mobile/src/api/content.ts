import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { must, useAction } from './core';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

/** Generic family-scoped list for parent-managed configuration tables (RLS enforces access). */
export function useFamilyTable<T extends TableName>(table: T, familyId: string | undefined, order: string = 'created_at') {
  return useQuery({
    queryKey: [table, familyId],
    enabled: !!familyId,
    queryFn: async () =>
      must(await (supabase.from(table) as any).select('*').eq('family_id', familyId!).order(order)) as Tables[T]['Row'][],
  });
}

/** Insert or update a row by id. */
export function useSaveRow<T extends TableName>(table: T, success?: string) {
  return useAction(
    async (row: Partial<Tables[T]['Row']> & { id?: string }) => {
      const { id, ...rest } = row as { id?: string } & Record<string, unknown>;
      const q = supabase.from(table) as any;
      if (id) return must(await q.update(rest).eq('id', id).select().single()) as Tables[T]['Row'];
      return must(await q.insert(rest).select().single()) as Tables[T]['Row'];
    },
    { success },
  );
}

export function useDeleteRow<T extends TableName>(table: T, success?: string) {
  return useAction(async (id: string) => {
    must(await (supabase.from(table) as any).delete().eq('id', id));
  }, { success });
}

export function useSkillAssessments(filter: { familyId?: string; childId?: string }) {
  return useQuery({
    queryKey: ['skill_assessments', filter],
    queryFn: async () => {
      let q = supabase.from('skill_assessments').select('*').order('assessed_on', { ascending: false }).order('created_at', { ascending: false });
      if (filter.familyId) q = q.eq('family_id', filter.familyId);
      if (filter.childId) q = q.eq('child_id', filter.childId);
      return must(await q.limit(500));
    },
  });
}

export function useNotes(filter: { familyId?: string; childId?: string }) {
  return useQuery({
    queryKey: ['notes', filter],
    queryFn: async () => {
      let q = supabase.from('notes').select('*').order('created_at', { ascending: false });
      if (filter.familyId) q = q.eq('family_id', filter.familyId);
      if (filter.childId) q = q.eq('child_id', filter.childId);
      return must(await q.limit(300));
    },
  });
}

export function useEarnedAchievements(filter: { familyId?: string; childId?: string }) {
  return useQuery({
    queryKey: ['earned_achievements', filter],
    queryFn: async () => {
      let q = supabase.from('earned_achievements').select('*').order('earned_at', { ascending: false });
      if (filter.familyId) q = q.eq('family_id', filter.familyId);
      if (filter.childId) q = q.eq('child_id', filter.childId);
      return must(await q);
    },
  });
}

export function useAuditLogs(familyId: string, page: number, pageSize = 50) {
  return useQuery({
    queryKey: ['audit_logs', familyId, page],
    queryFn: async () =>
      must(
        await supabase
          .from('audit_logs')
          .select('*')
          .eq('family_id', familyId)
          .order('created_at', { ascending: false })
          .range(page * pageSize, page * pageSize + pageSize - 1),
      ),
  });
}
