import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { must } from './core';

export function useInitiatives(filter: { familyId?: string; childId?: string; status?: 'pending' | 'approved' | 'rejected'; limit?: number }) {
  return useQuery({
    queryKey: ['initiatives', filter],
    staleTime: filter.status === 'pending' ? 0 : undefined,
    refetchOnMount: filter.status === 'pending' ? 'always' : true,
    refetchInterval: filter.status === 'pending' ? 30_000 : undefined,
    queryFn: async () => {
      let q = supabase.from('initiative_submissions').select('*').order('created_at', { ascending: false });
      if (filter.familyId) q = q.eq('family_id', filter.familyId);
      if (filter.childId) q = q.eq('child_id', filter.childId);
      if (filter.status) q = q.eq('status', filter.status);
      return must(await q.limit(filter.limit ?? 200));
    },
  });
}

export const initiativeApi = {
  submit: async (v: { title: string; description?: string | null; date?: string | null; childId?: string | null }) =>
    must(
      await supabase.rpc('submit_initiative', {
        p_title: v.title,
        p_description: v.description ?? null,
        p_for_date: v.date ?? null,
        p_child: v.childId ?? null,
      }),
    ),
  review: async (v: { id: string; decision: 'approve' | 'reject'; note?: string | null; points?: number | null }) =>
    must(await supabase.rpc('review_initiative', { p_initiative: v.id, p_decision: v.decision, p_note: v.note ?? null, p_points: v.points ?? null })),
};
