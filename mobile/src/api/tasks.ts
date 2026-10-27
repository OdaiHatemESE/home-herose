import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Json, Task, TaskAssignment, TaskCategory, TaskRuleVersion } from '@/lib/database.types';
import { must } from './core';

export type TaskWithMeta = Task & { versions: TaskRuleVersion[]; assignments: TaskAssignment[] };

export function useTasks(familyId: string) {
  return useQuery({
    queryKey: ['tasks', familyId],
    queryFn: async () => {
      const [tasks, versions, assignments] = await Promise.all([
        supabase.from('tasks').select('*').eq('family_id', familyId).order('created_at'),
        supabase.from('task_rule_versions').select('*').eq('family_id', familyId).order('effective_from'),
        supabase.from('task_assignments').select('*').eq('family_id', familyId),
      ]);
      const v = must(versions);
      const a = must(assignments);
      return must(tasks).map<TaskWithMeta>((t) => ({
        ...t,
        versions: v.filter((x) => x.task_id === t.id),
        assignments: a.filter((x) => x.task_id === t.id),
      }));
    },
  });
}

/** Point values effective on a date (mirrors private.task_points_on). */
export function pointsOn(versions: TaskRuleVersion[], date: string) {
  const eligible = versions.filter((v) => v.effective_from <= date).sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return eligible[0] ?? [...versions].sort((a, b) => a.effective_from.localeCompare(b.effective_from))[0] ?? null;
}

/** Children currently assigned (open-ended or ending on/after the date). */
export function activeAssignees(assignments: TaskAssignment[], date: string) {
  return [...new Set(assignments.filter((a) => !a.assigned_until || a.assigned_until >= date).map((a) => a.child_id))];
}

export function useCategories(familyId: string) {
  return useQuery({
    queryKey: ['categories', familyId],
    queryFn: async () => must(await supabase.from('task_categories').select('*').eq('family_id', familyId).order('sort_order')) as TaskCategory[],
  });
}

export const taskApi = {
  save: async (v: {
    familyId: string;
    taskId: string | null;
    data: Record<string, unknown>;
    base: number;
    bonus: number;
    childIds: string[];
    effectiveFrom: string | null;
  }) =>
    must(
      await supabase.rpc('save_task', {
        p_family: v.familyId,
        p_task_id: v.taskId,
        p_data: v.data as Json,
        p_base_points: v.base,
        p_independence_bonus: v.bonus,
        p_child_ids: v.childIds,
        p_effective_from: v.effectiveFrom,
      }),
    ),
  setActive: async (id: string, active: boolean) => must(await supabase.from('tasks').update({ is_active: active }).eq('id', id).select().single()),
  remove: async (id: string) => must(await supabase.from('tasks').delete().eq('id', id)),
};

export function useHolidays(familyId: string) {
  return useQuery({
    queryKey: ['holidays', familyId],
    queryFn: async () => must(await supabase.from('family_holidays').select('*').eq('family_id', familyId).order('holiday_date', { ascending: false })),
  });
}

export function useExemptions(familyId: string) {
  return useQuery({
    queryKey: ['exemptions', familyId],
    queryFn: async () => must(await supabase.from('task_exemptions').select('*').eq('family_id', familyId).order('exempt_date', { ascending: false }).limit(200)),
  });
}
