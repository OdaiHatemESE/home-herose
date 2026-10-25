/**
 * Typed Supabase schema for Home Heroes.
 *
 * Mirrors supabase/migrations. After deploying, you can regenerate the exact
 * file with:  npx supabase gen types typescript --project-id <ref> > src/lib/database.generated.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MemberRole = 'owner' | 'co_parent';
export type RecurrenceType = 'daily' | 'weekdays' | 'weekly' | 'one_time' | 'occasional';
export type TaskPriority = 'low' | 'normal' | 'high';
export type SubmissionStatus = 'in_progress' | 'pending' | 'approved' | 'rejected' | 'returned';
export type CompletionMode = 'independent' | 'reminded';
export type InitiativeStatus = 'pending' | 'approved' | 'rejected';
export type PointEventKind = 'task' | 'initiative' | 'adjustment' | 'reversal' | 'bonus';
export type NoteKind =
  | 'reflection'
  | 'observation'
  | 'positive'
  | 'improvement'
  | 'weekly_summary'
  | 'recognition'
  | 'incident'
  | 'repair'
  | 'privilege_decision';
export type NoteVisibility = 'parent_only' | 'child_visible';
export type RewardCategory = 'money' | 'privilege' | 'activity' | 'certificate' | 'other';
export type RewardStatus = 'pending' | 'approved' | 'fulfilled' | 'cancelled';
export type PaymentStatus = 'not_applicable' | 'unpaid' | 'paid';
export type LimitPeriod = 'none' | 'weekly' | 'monthly';
export type AchievementCriteria =
  | 'approved_tasks'
  | 'independent_tasks'
  | 'approved_initiatives'
  | 'gold_weeks'
  | 'perfect_weeks';

export type Family = {
  id: string;
  name: string;
  family_code: string;
  timezone: string;
  currency: string;
  locale: 'ar' | 'en';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
export type Profile = {
  id: string;
  display_name: string | null;
  kind: 'parent' | 'child';
  locale: 'ar' | 'en';
  avatar: string | null;
  created_at: string;
  updated_at: string;
}
export type FamilyMember = {
  id: string;
  family_id: string;
  user_id: string;
  role: MemberRole;
  display_name: string | null;
  created_at: string;
}
export type FamilyInvitation = {
  id: string;
  family_id: string;
  email: string | null;
  role: MemberRole;
  token_hash: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  created_at: string;
}
export type Child = {
  id: string;
  family_id: string;
  display_name: string;
  username: string;
  birth_year: number | null;
  avatar: string;
  color: string;
  ui_mode: 'standard' | 'simple';
  household_responsibility: string | null;
  auth_user_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export type FamilySettings = {
  family_id: string;
  week_start_day: number;
  weekend_days: number[];
  initiative_points: number;
  initiative_daily_cap: number;
  default_base_points: number;
  default_independence_bonus: number;
  skill_scale: { value: number; ar: string; en: string }[];
  retention_months: number | null;
  updated_at: string;
}
export type TaskCategory = {
  id: string;
  family_id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
export type ChecklistItem = {
  id: string;
  label: string;
}
export type Task = {
  id: string;
  family_id: string;
  category_id: string | null;
  title_ar: string;
  title_en: string;
  description: string | null;
  instructions: string | null;
  icon: string;
  color: string;
  priority: TaskPriority;
  recurrence: RecurrenceType;
  weekdays: number[];
  one_time_date: string | null;
  start_date: string;
  end_date: string | null;
  school_only: boolean;
  is_religious: boolean;
  requires_verification: boolean;
  auto_approve: boolean;
  review_sample_rate: number;
  checklist: ChecklistItem[];
  min_age: number | null;
  max_age: number | null;
  is_active: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
export type TaskRuleVersion = {
  id: string;
  family_id: string;
  task_id: string;
  effective_from: string;
  base_points: number;
  independence_bonus: number;
  created_by: string | null;
  created_at: string;
}
export type TaskAssignment = {
  id: string;
  family_id: string;
  task_id: string;
  child_id: string;
  assigned_from: string;
  assigned_until: string | null;
  created_at: string;
}
export type FamilyHoliday = {
  id: string;
  family_id: string;
  holiday_date: string;
  label: string | null;
}
export type TaskExemption = {
  id: string;
  family_id: string;
  child_id: string;
  task_id: string | null;
  exempt_date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}
export type TaskReminder = {
  id: string;
  family_id: string;
  child_id: string;
  task_id: string;
  for_date: string;
  logged_by: string | null;
  created_at: string;
}
export type TaskSubmission = {
  id: string;
  family_id: string;
  child_id: string;
  task_id: string;
  for_date: string;
  status: SubmissionStatus;
  claimed_mode: CompletionMode;
  claimed_points: number;
  base_points_snapshot: number;
  independence_bonus_snapshot: number;
  checklist_state: Record<string, boolean>;
  progress: number;
  child_note: string | null;
  submitted_by: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  final_mode: CompletionMode | null;
  reminder_count: number;
  awarded_points: number | null;
  auto_approved: boolean;
  needs_review: boolean;
  revision: number;
  created_at: string;
  updated_at: string;
}
export type InitiativeSubmission = {
  id: string;
  family_id: string;
  child_id: string;
  for_date: string;
  title: string;
  description: string | null;
  status: InitiativeStatus;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  points_awarded: number | null;
  created_at: string;
}
export type Skill = {
  id: string;
  family_id: string;
  name_ar: string;
  name_en: string;
  description: string | null;
  icon: string;
  color: string;
  criteria: string | null;
  development_target: string | null;
  target_rating: number;
  weight: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}
export type SkillAssessment = {
  id: string;
  family_id: string;
  child_id: string;
  skill_id: string;
  rating: number;
  assessed_on: string;
  observation: string | null;
  visible_to_child: boolean;
  assessed_by: string | null;
  created_at: string;
}
export type PointEvent = {
  id: string;
  family_id: string;
  child_id: string;
  event_date: string;
  points: number;
  kind: PointEventKind;
  source_type: 'task_submission' | 'initiative' | 'adjustment' | null;
  source_id: string | null;
  source_revision: number;
  reverses_event_id: string | null;
  skill_id: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}
export type Note = {
  id: string;
  family_id: string;
  child_id: string | null;
  author_id: string | null;
  author_role: 'parent' | 'child';
  kind: NoteKind;
  visibility: NoteVisibility;
  title: string | null;
  body: string;
  task_id: string | null;
  skill_id: string | null;
  period_start: string | null;
  follow_up: string | null;
  follow_up_due: string | null;
  follow_up_done: boolean;
  created_at: string;
  updated_at: string;
}
export type FamilyRule = {
  id: string;
  family_id: string;
  title_ar: string;
  title_en: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
export type AchievementLevel = {
  id: string;
  family_id: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon: string;
  color: string;
  min_percent: number;
  rank: number;
  money_amount: number;
  privilege_ar: string | null;
  privilege_en: string | null;
  message_ar: string | null;
  message_en: string | null;
  is_active: boolean;
  created_at: string;
}
export type AchievementDefinition = {
  id: string;
  family_id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string;
  criteria: AchievementCriteria;
  threshold: number;
  is_active: boolean;
  created_at: string;
}
export type EarnedAchievement = {
  id: string;
  family_id: string;
  child_id: string;
  achievement_id: string;
  earned_at: string;
}
export type RewardCatalogItem = {
  id: string;
  family_id: string;
  name_ar: string;
  name_en: string;
  description: string | null;
  icon: string;
  category: RewardCategory;
  value_amount: number | null;
  min_level_id: string | null;
  min_age: number | null;
  max_age: number | null;
  is_available: boolean;
  limit_period: LimitPeriod;
  limit_count: number | null;
  created_at: string;
  updated_at: string;
}
export type WeeklySnapshot = {
  id: string;
  family_id: string;
  child_id: string;
  week_start: string;
  week_end: string;
  approved_points: number;
  max_points: number;
  percent: number | null;
  level_id: string | null;
  level_snapshot: AchievementLevel | null;
  details: ProgressStats;
  finalized_by: string | null;
  finalized_at: string;
}
export type RewardFulfillment = {
  id: string;
  family_id: string;
  child_id: string;
  reward_id: string | null;
  snapshot_id: string | null;
  source_key: string | null;
  title: string;
  amount: number | null;
  currency: string | null;
  status: RewardStatus;
  payment_status: PaymentStatus;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  fulfilled_at: string | null;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}
export type AuditLog = {
  id: number;
  family_id: string;
  actor_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  created_at: string;
}

/* ----- RPC payloads ----- */
export type DayStat = {
  date: string;
  scheduled: number;
  max_points: number;
  approved_points: number;
}
export type ProgressStats = {
  from: string;
  to: string;
  task_max_points: number;
  initiative_max_points: number;
  max_points: number;
  eligible_days: number;
  approved_points: number;
  pending_points: number;
  self_reported_points: number;
  approved_tasks: number;
  independent_tasks: number;
  reminded_tasks: number;
  pending_tasks: number;
  rejected_tasks: number;
  initiatives_approved: number;
  initiatives_pending: number;
  initiative_points: number;
  reminders_logged: number;
  percent: number | null;
  days: DayStat[];
}
export type ChildProgress = ProgressStats & {
  child_id: string;
  level: AchievementLevel | null;
  snapshot: WeeklySnapshot | null;
}
export type FamilyWeekRow = ChildProgress & {
  display_name: string;
  avatar: string;
  color: string;
  ui_mode: 'standard' | 'simple';
}
export type DayTask = {
  task_id: string;
  title_ar: string;
  title_en: string;
  description: string | null;
  instructions: string | null;
  icon: string;
  color: string;
  category_id: string | null;
  recurrence: RecurrenceType;
  priority: TaskPriority;
  is_religious: boolean;
  checklist: ChecklistItem[];
  requires_verification: boolean;
  base_points: number;
  independence_bonus: number;
  counts_toward_max: boolean;
  reminder_count: number;
  submission: Omit<TaskSubmission, 'family_id'> | null;
}
export type ChildDay = {
  date: string;
  week_start: string;
  week_finalized: boolean;
  tasks: DayTask[];
}
export type RewardOption = RewardCatalogItem & {
  eligible: boolean;
  block_reason: 'not_found' | 'unavailable' | 'age' | 'level' | 'limit' | null;
}

type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };
type Fn<A, R> = { Args: A; Returns: R };

export type Database = {
  public: {
    Tables: {
      families: Table<Family>;
      profiles: Table<Profile>;
      family_members: Table<FamilyMember>;
      family_invitations: Table<FamilyInvitation>;
      children: Table<Child>;
      family_settings: Table<FamilySettings>;
      task_categories: Table<TaskCategory>;
      tasks: Table<Task>;
      task_rule_versions: Table<TaskRuleVersion>;
      task_assignments: Table<TaskAssignment>;
      family_holidays: Table<FamilyHoliday>;
      task_exemptions: Table<TaskExemption>;
      task_reminders: Table<TaskReminder>;
      task_submissions: Table<TaskSubmission>;
      initiative_submissions: Table<InitiativeSubmission>;
      skills: Table<Skill>;
      skill_assessments: Table<SkillAssessment>;
      point_events: Table<PointEvent>;
      notes: Table<Note>;
      family_rules: Table<FamilyRule>;
      achievement_levels: Table<AchievementLevel>;
      achievement_definitions: Table<AchievementDefinition>;
      earned_achievements: Table<EarnedAchievement>;
      reward_catalog: Table<RewardCatalogItem>;
      weekly_snapshots: Table<WeeklySnapshot>;
      reward_fulfillments: Table<RewardFulfillment>;
      audit_logs: Table<AuditLog>;
    };
    Views: Record<string, never>;
    Functions: {
      create_family: Fn<{ p_name: string; p_timezone?: string; p_currency?: string; p_locale?: string; p_parent_name?: string | null }, string>;
      regenerate_family_code: Fn<{ p_family: string }, string>;
      save_task: Fn<
        {
          p_family: string;
          p_task_id: string | null;
          p_data: Json;
          p_base_points: number;
          p_independence_bonus: number;
          p_child_ids: string[] | null;
          p_effective_from?: string | null;
        },
        string
      >;
      create_starter_tasks: Fn<{ p_family: string; p_child_ids: string[] }, number>;
      create_invitation: Fn<{ p_family: string; p_email?: string | null }, { id: string; token: string; expires_at: string }>;
      revoke_invitation: Fn<{ p_invitation: string }, undefined>;
      get_invitation: Fn<
        { p_token: string },
        { valid: boolean; family_name?: string; inviter_name?: string | null; email?: string | null; expires_at?: string }
      >;
      accept_invitation: Fn<{ p_token: string; p_display_name?: string | null }, string>;
      remove_member: Fn<{ p_member: string }, undefined>;
      export_family_data: Fn<{ p_family: string }, Json>;
      apply_retention: Fn<{ p_family: string }, Json>;
      get_child_progress: Fn<{ p_child: string; p_from: string; p_to: string }, ChildProgress>;
      get_child_day: Fn<{ p_child: string; p_date: string }, ChildDay>;
      get_family_week: Fn<{ p_family: string; p_week_start: string }, FamilyWeekRow[]>;
      submit_task: Fn<
        {
          p_task: string;
          p_for_date: string;
          p_mode?: CompletionMode;
          p_progress?: number;
          p_checklist?: Json;
          p_note?: string | null;
          p_child?: string | null;
        },
        TaskSubmission
      >;
      review_submission: Fn<
        { p_submission: string; p_decision: 'approve' | 'reject' | 'return'; p_mode?: CompletionMode | null; p_note?: string | null },
        TaskSubmission
      >;
      reverse_point_event: Fn<{ p_event: string; p_reason: string }, PointEvent>;
      log_reminder: Fn<{ p_child: string; p_task: string; p_date?: string | null }, number>;
      adjust_points: Fn<
        { p_child: string; p_points: number; p_reason: string; p_date?: string | null; p_skill?: string | null; p_kind?: PointEventKind },
        PointEvent
      >;
      submit_initiative: Fn<
        { p_title: string; p_description?: string | null; p_for_date?: string | null; p_child?: string | null },
        InitiativeSubmission
      >;
      review_initiative: Fn<
        { p_initiative: string; p_decision: 'approve' | 'reject'; p_note?: string | null; p_points?: number | null },
        InitiativeSubmission & { capped: boolean }
      >;
      finalize_week: Fn<
        { p_family: string; p_week_start: string; p_child_ids?: string[] | null },
        (WeeklySnapshot & { display_name: string })[]
      >;
      get_reward_options: Fn<{ p_child: string }, RewardOption[]>;
      request_reward: Fn<{ p_reward: string; p_note?: string | null }, RewardFulfillment>;
      grant_reward: Fn<
        { p_child: string; p_reward?: string | null; p_title?: string | null; p_amount?: number | null; p_note?: string | null },
        RewardFulfillment
      >;
      update_fulfillment: Fn<
        { p_fulfillment: string; p_status?: RewardStatus | null; p_payment?: PaymentStatus | null; p_note?: string | null },
        RewardFulfillment
      >;
    };
    Enums: {
      member_role: MemberRole;
      recurrence_type: RecurrenceType;
      task_priority: TaskPriority;
      submission_status: SubmissionStatus;
      completion_mode: CompletionMode;
      initiative_status: InitiativeStatus;
      point_event_kind: PointEventKind;
      note_kind: NoteKind;
      note_visibility: NoteVisibility;
      reward_category: RewardCategory;
      reward_status: RewardStatus;
      payment_status: PaymentStatus;
      limit_period: LimitPeriod;
      achievement_criteria: AchievementCriteria;
    };
    CompositeTypes: Record<string, never>;
  };
}
