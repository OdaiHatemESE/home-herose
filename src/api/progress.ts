import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CompletionMode, Json } from '@/lib/database.types';
import { must } from './core';

export function useChildDay(childId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['day', childId, date],
    enabled: !!childId,
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async () => must(await supabase.rpc('get_child_day', { p_child: childId!, p_date: date })),
  });
}

export function useChildProgress(childId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ['progress', childId, from, to],
    enabled: !!childId,
    staleTime: 0,
    queryFn: async () => must(await supabase.rpc('get_child_progress', { p_child: childId!, p_from: from, p_to: to })),
  });
}

export function useFamilyWeek(familyId: string, weekStart: string) {
  return useQuery({
    queryKey: ['family-week', familyId, weekStart],
    staleTime: 0,
    queryFn: async () => must(await supabase.rpc('get_family_week', { p_family: familyId, p_week_start: weekStart })),
  });
}

export function usePendingSubmissions(familyId: string) {
  return useQuery({
    queryKey: ['submissions', 'pending', familyId],
    // review queues change because of other people (children); never serve them stale
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
    queryFn: async () =>
      must(
        await supabase
          .from('task_submissions')
          .select('*')
          .eq('family_id', familyId)
          .or('status.eq.pending,needs_review.eq.true')
          .order('for_date')
          .order('submitted_at'),
      ),
  });
}

export function useRecentApproved(familyId: string, limit = 15) {
  return useQuery({
    queryKey: ['submissions', 'recent', familyId, limit],
    queryFn: async () =>
      must(
        await supabase
          .from('task_submissions')
          .select('*')
          .eq('family_id', familyId)
          .eq('status', 'approved')
          .order('reviewed_at', { ascending: false })
          .limit(limit),
      ),
  });
}

export function usePointEvents(filter: { familyId?: string; childId?: string; from?: string; to?: string; limit?: number }) {
  return useQuery({
    queryKey: ['points', filter],
    queryFn: async () => {
      let q = supabase.from('point_events').select('*').order('event_date', { ascending: false }).order('created_at', { ascending: false });
      if (filter.familyId) q = q.eq('family_id', filter.familyId);
      if (filter.childId) q = q.eq('child_id', filter.childId);
      if (filter.from) q = q.gte('event_date', filter.from);
      if (filter.to) q = q.lte('event_date', filter.to);
      return must(await q.limit(filter.limit ?? 500));
    },
  });
}

export function useSnapshots(filter: { familyId?: string; childId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['snapshots', filter],
    queryFn: async () => {
      let q = supabase.from('weekly_snapshots').select('*').order('week_start', { ascending: false });
      if (filter.familyId) q = q.eq('family_id', filter.familyId);
      if (filter.childId) q = q.eq('child_id', filter.childId);
      return must(await q.limit(filter.limit ?? 200));
    },
  });
}

export const scoreApi = {
  submit: async (v: { taskId: string; date: string; mode?: CompletionMode; progress?: number; checklist?: Record<string, boolean>; note?: string | null; childId?: string | null }) =>
    must(
      await supabase.rpc('submit_task', {
        p_task: v.taskId,
        p_for_date: v.date,
        p_mode: v.mode ?? 'independent',
        p_progress: v.progress ?? 100,
        p_checklist: (v.checklist ?? {}) as Json,
        p_note: v.note ?? null,
        p_child: v.childId ?? null,
      }),
    ),
  review: async (v: { id: string; decision: 'approve' | 'reject' | 'return'; mode?: CompletionMode | null; note?: string | null }) =>
    must(await supabase.rpc('review_submission', { p_submission: v.id, p_decision: v.decision, p_mode: v.mode ?? null, p_note: v.note ?? null })),
  remind: async (v: { childId: string; taskId: string; date?: string }) =>
    must(await supabase.rpc('log_reminder', { p_child: v.childId, p_task: v.taskId, p_date: v.date ?? null })),
  adjust: async (v: { childId: string; points: number; reason: string; date?: string | null; skillId?: string | null; kind?: 'adjustment' | 'bonus' }) =>
    must(
      await supabase.rpc('adjust_points', {
        p_child: v.childId,
        p_points: v.points,
        p_reason: v.reason,
        p_date: v.date ?? null,
        p_skill: v.skillId ?? null,
        p_kind: v.kind ?? 'adjustment',
      }),
    ),
  reverse: async (v: { eventId: string; reason: string }) => must(await supabase.rpc('reverse_point_event', { p_event: v.eventId, p_reason: v.reason })),
  finalizeWeek: async (v: { familyId: string; weekStart: string }) =>
    must(await supabase.rpc('finalize_week', { p_family: v.familyId, p_week_start: v.weekStart })),
};
