import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PaymentStatus, RewardStatus } from '@/lib/database.types';
import { must } from './core';

export function useFulfillments(filter: { familyId?: string; childId?: string; open?: boolean }) {
  return useQuery({
    queryKey: ['fulfillments', filter],
    queryFn: async () => {
      let q = supabase.from('reward_fulfillments').select('*').order('created_at', { ascending: false });
      if (filter.familyId) q = q.eq('family_id', filter.familyId);
      if (filter.childId) q = q.eq('child_id', filter.childId);
      if (filter.open) q = q.or('status.in.(pending,approved),payment_status.eq.unpaid');
      return must(await q.limit(300));
    },
  });
}

export function useRewardOptions(childId: string | undefined) {
  return useQuery({
    queryKey: ['reward-options', childId],
    enabled: !!childId,
    queryFn: async () => must(await supabase.rpc('get_reward_options', { p_child: childId! })),
  });
}

export const rewardApi = {
  request: async (rewardId: string) => must(await supabase.rpc('request_reward', { p_reward: rewardId })),
  grant: async (v: { childId: string; rewardId?: string | null; title?: string | null; amount?: number | null; note?: string | null }) =>
    must(
      await supabase.rpc('grant_reward', {
        p_child: v.childId,
        p_reward: v.rewardId ?? null,
        p_title: v.title ?? null,
        p_amount: v.amount ?? null,
        p_note: v.note ?? null,
      }),
    ),
  update: async (v: { id: string; status?: RewardStatus | null; payment?: PaymentStatus | null; note?: string | null }) =>
    must(await supabase.rpc('update_fulfillment', { p_fulfillment: v.id, p_status: v.status ?? null, p_payment: v.payment ?? null, p_note: v.note ?? null })),
};
