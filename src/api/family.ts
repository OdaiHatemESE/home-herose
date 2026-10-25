import { useQuery } from '@tanstack/react-query';
import { supabase, invokeFunction } from '@/lib/supabase';
import type { Child, FamilySettings, Json } from '@/lib/database.types';
import i18n from '@/i18n';
import { must, useAction } from './core';

export function useChildren(familyId: string | undefined, opts: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ['children', familyId, !!opts.includeInactive],
    enabled: !!familyId,
    queryFn: async () => {
      let q = supabase.from('children').select('*').eq('family_id', familyId!).order('sort_order').order('created_at');
      if (!opts.includeInactive) q = q.eq('is_active', true);
      return must(await q) as Child[];
    },
  });
}

export function useMembers(familyId: string) {
  return useQuery({
    queryKey: ['members', familyId],
    queryFn: async () => {
      const members = must(await supabase.from('family_members').select('*').eq('family_id', familyId).order('created_at'));
      const profiles = must(await supabase.from('profiles').select('id, display_name').in('id', members.map((m) => m.user_id)));
      return members.map((m) => ({ ...m, profile: profiles.find((p) => p.id === m.user_id) ?? null }));
    },
  });
}

export function useInvitations(familyId: string) {
  return useQuery({
    queryKey: ['invitations', familyId],
    queryFn: async () =>
      must(
        await supabase
          .from('family_invitations')
          .select('id, email, expires_at, created_at, accepted_at, revoked_at')
          .eq('family_id', familyId)
          .is('accepted_at', null)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ),
  });
}

export const familyApi = {
  createFamily: async (v: { name: string; timezone: string; currency: string; locale: string; parentName: string }) =>
    must(
      await supabase.rpc('create_family', {
        p_name: v.name,
        p_timezone: v.timezone,
        p_currency: v.currency,
        p_locale: v.locale,
        p_parent_name: v.parentName,
      }),
    ),
  createInvitation: async (v: { familyId: string; email?: string }) =>
    must(await supabase.rpc('create_invitation', { p_family: v.familyId, p_email: v.email || null })),
  createChild: (v: {
    familyId: string;
    displayName: string;
    username: string;
    birthYear: number | null;
    avatar: string;
    color: string;
    uiMode: 'standard' | 'simple';
    householdResponsibility: string | null;
    secret: string;
  }) => invokeFunction<{ childId: string }>('manage-child', { action: 'create', ...v }),
  createStarterTasks: async (v: { familyId: string; childIds: string[] }) =>
    must(await supabase.rpc('create_starter_tasks', { p_family: v.familyId, p_child_ids: v.childIds })),
};

export function useUpdateSettings() {
  return useAction(async (v: Partial<FamilySettings> & { family_id: string }) => {
    const { family_id, ...patch } = v;
    must(await supabase.from('family_settings').update(patch).eq('family_id', family_id).select().single());
  }, { success: i18n.t('common.saved'), invalidate: [['identity'], ['progress'], ['day'], ['family-week']] });
}

export function useUpdateFamily() {
  return useAction(async (v: { id: string; name?: string; timezone?: string; currency?: string; locale?: 'ar' | 'en' }) => {
    const { id, ...patch } = v;
    must(await supabase.from('families').update(patch).eq('id', id).select().single());
  }, { success: i18n.t('common.saved'), invalidate: [['identity']] });
}

export function useUpdateChild() {
  return useAction(async (v: Partial<Child> & { id: string }) => {
    const { id, display_name, birth_year, avatar, color, ui_mode, household_responsibility, sort_order } = v;
    const patch = Object.fromEntries(
      Object.entries({ display_name, birth_year, avatar, color, ui_mode, household_responsibility, sort_order }).filter(([, val]) => val !== undefined),
    ) as Partial<Child>;
    must(await supabase.from('children').update(patch).eq('id', id).select().single());
  });
}

export const childAccountApi = {
  resetSecret: (childId: string, secret: string) => invokeFunction('manage-child', { action: 'reset_secret', childId, secret }),
  setActive: (childId: string, active: boolean) => invokeFunction('manage-child', { action: active ? 'reactivate' : 'deactivate', childId }),
  remove: (childId: string, confirmName: string) => invokeFunction('manage-child', { action: 'delete', childId, confirmName }),
  deleteFamily: (familyId: string, confirmName: string) => invokeFunction('manage-family', { action: 'delete_family', familyId, confirmName }),
  deleteMyAccount: () => invokeFunction('manage-family', { action: 'delete_my_account' }),
};

export const privacyApi = {
  exportData: async (familyId: string) => must(await supabase.rpc('export_family_data', { p_family: familyId })) as Json,
  applyRetention: async (familyId: string) => must(await supabase.rpc('apply_retention', { p_family: familyId })),
  regenerateCode: async (familyId: string) => must(await supabase.rpc('regenerate_family_code', { p_family: familyId })),
  revokeInvitation: async (id: string) => must(await supabase.rpc('revoke_invitation', { p_invitation: id })),
  removeMember: async (id: string) => must(await supabase.rpc('remove_member', { p_member: id })),
};
