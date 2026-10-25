-- =============================================================================
-- Home Heroes (أبطال البيت) — 001 Core schema
-- Multi-family tenant model. Every family-owned row carries family_id.
-- =============================================================================

create schema if not exists private;
grant usage on schema private to authenticated, service_role;
revoke all on schema private from anon;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'co_parent');
create type public.recurrence_type as enum ('daily', 'weekdays', 'weekly', 'one_time', 'occasional');
create type public.task_priority as enum ('low', 'normal', 'high');
create type public.submission_status as enum ('in_progress', 'pending', 'approved', 'rejected', 'returned');
create type public.completion_mode as enum ('independent', 'reminded');
create type public.initiative_status as enum ('pending', 'approved', 'rejected');
create type public.point_event_kind as enum ('task', 'initiative', 'adjustment', 'reversal', 'bonus');
create type public.note_kind as enum (
  'reflection', 'observation', 'positive', 'improvement', 'weekly_summary',
  'recognition', 'incident', 'repair', 'privilege_decision'
);
create type public.note_visibility as enum ('parent_only', 'child_visible');
create type public.reward_category as enum ('money', 'privilege', 'activity', 'certificate', 'other');
create type public.reward_status as enum ('pending', 'approved', 'fulfilled', 'cancelled');
create type public.payment_status as enum ('not_applicable', 'unpaid', 'paid');
create type public.limit_period as enum ('none', 'weekly', 'monthly');
create type public.achievement_criteria as enum (
  'approved_tasks', 'independent_tasks', 'approved_initiatives', 'gold_weeks', 'perfect_weeks'
);

-- ---------------------------------------------------------------------------
-- Families & people
-- ---------------------------------------------------------------------------
create table public.families (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 80),
  family_code  text not null unique check (family_code ~ '^[A-Z2-9]{6,10}$'),
  timezone     text not null default 'Asia/Dubai',
  currency     text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  locale       text not null default 'ar' check (locale in ('ar', 'en')),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  kind         text not null default 'parent' check (kind in ('parent', 'child')),
  locale       text not null default 'ar' check (locale in ('ar', 'en')),
  avatar       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.family_members (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         public.member_role not null default 'co_parent',
  display_name text,
  created_at   timestamptz not null default now(),
  unique (family_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id);
-- exactly one owner per family
create unique index family_members_one_owner on public.family_members (family_id) where role = 'owner';

create table public.family_invitations (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  email        text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         public.member_role not null default 'co_parent' check (role = 'co_parent'),
  token_hash   text not null unique,
  invited_by   uuid references auth.users (id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id) on delete set null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index family_invitations_family_idx on public.family_invitations (family_id);

create table public.children (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families (id) on delete cascade,
  display_name    text not null check (char_length(display_name) between 1 and 40),
  username        text not null check (username ~ '^[a-z0-9_.-]{3,24}$'),
  birth_year      smallint check (birth_year between 1990 and 2100),
  avatar          text not null default 'star',
  color           text not null default 'gold',
  ui_mode         text not null default 'standard' check (ui_mode in ('standard', 'simple')),
  household_responsibility text,
  auth_user_id    uuid unique references auth.users (id) on delete set null,
  is_active       boolean not null default true,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (family_id, username)
);
create index children_family_idx on public.children (family_id);

-- Private: login mapping, never exposed through the Data API.
create table private.child_auth (
  child_id        uuid primary key references public.children (id) on delete cascade,
  user_id         uuid not null unique,
  internal_email  text not null unique,
  credential_version integer not null default 1,
  updated_at      timestamptz not null default now()
);

create table private.login_attempts (
  id          bigint generated always as identity primary key,
  attempt_key text not null,
  ip          text,
  success     boolean not null,
  created_at  timestamptz not null default now()
);
create index login_attempts_key_idx on private.login_attempts (attempt_key, created_at desc);
create index login_attempts_ip_idx on private.login_attempts (ip, created_at desc);

create table public.family_settings (
  family_id                 uuid primary key references public.families (id) on delete cascade,
  week_start_day            smallint not null default 1 check (week_start_day between 0 and 6),
  weekend_days              smallint[] not null default '{6,0}',
  initiative_points         smallint not null default 1 check (initiative_points between 0 and 20),
  initiative_daily_cap      smallint not null default 2 check (initiative_daily_cap between 0 and 50),
  default_base_points       smallint not null default 1 check (default_base_points between 0 and 50),
  default_independence_bonus smallint not null default 1 check (default_independence_bonus between 0 and 50),
  skill_scale               jsonb not null default '[
    {"value":1,"ar":"يحتاج إلى توجيه","en":"Needs guidance"},
    {"value":2,"ar":"في طور النمو","en":"Developing"},
    {"value":3,"ar":"تقدّم جيد","en":"Good progress"},
    {"value":4,"ar":"مستقل","en":"Independent"},
    {"value":5,"ar":"ثبات متميّز","en":"Excellent consistency"}
  ]'::jsonb,
  retention_months          smallint check (retention_months is null or retention_months between 3 and 120),
  updated_at                timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tasks & scheduling
-- ---------------------------------------------------------------------------
create table public.task_categories (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  name_ar    text not null,
  name_en    text not null,
  icon       text not null default 'sparkles',
  color      text not null default 'blue',
  sort_order smallint not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index task_categories_family_idx on public.task_categories (family_id);

create table public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  family_id            uuid not null references public.families (id) on delete cascade,
  category_id          uuid references public.task_categories (id) on delete set null,
  title_ar             text not null check (char_length(title_ar) between 1 and 120),
  title_en             text not null default '',
  description          text,
  instructions         text,
  icon                 text not null default 'check-circle',
  color                text not null default 'blue',
  priority             public.task_priority not null default 'normal',
  recurrence           public.recurrence_type not null default 'daily',
  weekdays             smallint[] not null default '{}',
  one_time_date        date,
  start_date           date not null default current_date,
  end_date             date,
  school_only          boolean not null default false,
  is_religious         boolean not null default false,
  requires_verification boolean not null default true,
  auto_approve         boolean not null default false,
  review_sample_rate   numeric(3,2) not null default 0 check (review_sample_rate between 0 and 1),
  checklist            jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  min_age              smallint,
  max_age              smallint,
  is_active            boolean not null default true,
  archived_at          timestamptz,
  created_by           uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (recurrence <> 'weekdays' or cardinality(weekdays) > 0),
  check (recurrence <> 'one_time' or one_time_date is not null),
  check (weekdays <@ '{0,1,2,3,4,5,6}'::smallint[])
);
create index tasks_family_idx on public.tasks (family_id);
create index tasks_category_idx on public.tasks (category_id);

-- Point values are versioned so history is preserved when parents edit them.
create table public.task_rule_versions (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references public.families (id) on delete cascade,
  task_id            uuid not null references public.tasks (id) on delete cascade,
  effective_from     date not null,
  base_points        smallint not null check (base_points between 0 and 100),
  independence_bonus smallint not null check (independence_bonus between 0 and 100),
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  unique (task_id, effective_from)
);
create index task_rule_versions_family_idx on public.task_rule_versions (family_id);

create table public.task_assignments (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
  task_id        uuid not null references public.tasks (id) on delete cascade,
  child_id       uuid not null references public.children (id) on delete cascade,
  assigned_from  date not null default current_date,
  assigned_until date,
  created_at     timestamptz not null default now(),
  unique (task_id, child_id, assigned_from),
  check (assigned_until is null or assigned_until >= assigned_from)
);
create index task_assignments_child_idx on public.task_assignments (child_id);
create index task_assignments_family_idx on public.task_assignments (family_id);

create table public.family_holidays (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  holiday_date date not null,
  label        text,
  unique (family_id, holiday_date)
);

create table public.task_exemptions (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  child_id    uuid not null references public.children (id) on delete cascade,
  task_id     uuid references public.tasks (id) on delete cascade,  -- null = whole day
  exempt_date date not null,
  reason      text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique nulls not distinct (child_id, task_id, exempt_date)
);
create index task_exemptions_family_idx on public.task_exemptions (family_id);

create table public.task_reminders (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  child_id   uuid not null references public.children (id) on delete cascade,
  task_id    uuid not null references public.tasks (id) on delete cascade,
  for_date   date not null,
  logged_by  uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index task_reminders_lookup_idx on public.task_reminders (child_id, task_id, for_date);
create index task_reminders_family_idx on public.task_reminders (family_id);

create table public.task_submissions (
  id                  uuid primary key default gen_random_uuid(),
  family_id           uuid not null references public.families (id) on delete cascade,
  child_id            uuid not null references public.children (id) on delete cascade,
  task_id             uuid not null references public.tasks (id) on delete cascade,
  for_date            date not null,
  status              public.submission_status not null default 'pending',
  claimed_mode        public.completion_mode not null default 'independent',
  claimed_points      smallint not null default 0,
  base_points_snapshot smallint not null,
  independence_bonus_snapshot smallint not null,
  checklist_state     jsonb not null default '{}'::jsonb,
  progress            smallint not null default 100 check (progress between 0 and 100),
  child_note          text check (child_note is null or char_length(child_note) <= 500),
  submitted_by        uuid references auth.users (id) on delete set null,
  submitted_at        timestamptz not null default now(),
  reviewed_by         uuid references auth.users (id) on delete set null,
  reviewed_at         timestamptz,
  review_note         text,
  final_mode          public.completion_mode,
  reminder_count      smallint not null default 0,
  awarded_points      smallint,
  auto_approved       boolean not null default false,
  needs_review        boolean not null default false,
  revision            smallint not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (child_id, task_id, for_date)
);
create index task_submissions_family_status_idx on public.task_submissions (family_id, status);
create index task_submissions_child_date_idx on public.task_submissions (child_id, for_date);
create index task_submissions_task_idx on public.task_submissions (task_id);

create table public.initiative_submissions (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families (id) on delete cascade,
  child_id      uuid not null references public.children (id) on delete cascade,
  for_date      date not null,
  title         text not null check (char_length(title) between 2 and 120),
  description   text check (description is null or char_length(description) <= 1000),
  status        public.initiative_status not null default 'pending',
  submitted_by  uuid references auth.users (id) on delete set null,
  reviewed_by   uuid references auth.users (id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,
  points_awarded smallint,
  created_at    timestamptz not null default now()
);
create index initiative_submissions_family_idx on public.initiative_submissions (family_id, status);
create index initiative_submissions_child_idx on public.initiative_submissions (child_id, for_date);

-- ---------------------------------------------------------------------------
-- Skills & growth
-- ---------------------------------------------------------------------------
create table public.skills (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references public.families (id) on delete cascade,
  name_ar            text not null,
  name_en            text not null default '',
  description        text,
  icon               text not null default 'sprout',
  color              text not null default 'green',
  criteria           text,
  development_target text,
  target_rating      smallint not null default 4 check (target_rating between 1 and 5),
  weight             numeric(4,2) not null default 1 check (weight >= 0),
  is_active          boolean not null default true,
  sort_order         smallint not null default 0,
  created_at         timestamptz not null default now()
);
create index skills_family_idx on public.skills (family_id);

create table public.skill_assessments (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families (id) on delete cascade,
  child_id         uuid not null references public.children (id) on delete cascade,
  skill_id         uuid not null references public.skills (id) on delete cascade,
  rating           smallint not null check (rating between 1 and 5),
  assessed_on      date not null default current_date,
  observation      text,
  visible_to_child boolean not null default true,
  assessed_by      uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index skill_assessments_child_idx on public.skill_assessments (child_id, skill_id, assessed_on);
create index skill_assessments_family_idx on public.skill_assessments (family_id);

-- ---------------------------------------------------------------------------
-- Points ledger (append-only)
-- ---------------------------------------------------------------------------
create table public.point_events (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families (id) on delete cascade,
  child_id          uuid not null references public.children (id) on delete cascade,
  event_date        date not null,
  points            smallint not null check (points between -500 and 500),
  kind              public.point_event_kind not null,
  source_type       text check (source_type in ('task_submission', 'initiative', 'adjustment')),
  source_id         uuid,
  source_revision   smallint not null default 1,
  reverses_event_id uuid references public.point_events (id),
  skill_id          uuid references public.skills (id) on delete set null,
  reason            text,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  check (kind <> 'reversal' or reverses_event_id is not null),
  check (kind not in ('adjustment', 'reversal') or char_length(coalesce(reason, '')) >= 3)
);
create index point_events_child_date_idx on public.point_events (child_id, event_date);
create index point_events_family_idx on public.point_events (family_id, event_date);
-- one award per source → no duplicate points
create unique index point_events_one_per_source on public.point_events (source_type, source_id, source_revision)
  where source_id is not null and kind <> 'reversal';
-- an event can be reversed only once
create unique index point_events_one_reversal on public.point_events (reverses_event_id)
  where reverses_event_id is not null;

-- ---------------------------------------------------------------------------
-- Notes, values, levels, achievements, rewards
-- ---------------------------------------------------------------------------
create table public.notes (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families (id) on delete cascade,
  child_id        uuid references public.children (id) on delete cascade,
  author_id       uuid references auth.users (id) on delete set null,
  author_role     text not null check (author_role in ('parent', 'child')),
  kind            public.note_kind not null default 'observation',
  visibility      public.note_visibility not null default 'parent_only',
  title           text,
  body            text not null check (char_length(body) between 1 and 4000),
  task_id         uuid references public.tasks (id) on delete set null,
  skill_id        uuid references public.skills (id) on delete set null,
  period_start    date,
  follow_up       text,
  follow_up_due   date,
  follow_up_done  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index notes_family_idx on public.notes (family_id, created_at desc);
create index notes_child_idx on public.notes (child_id, visibility);

create table public.family_rules (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  title_ar    text not null,
  title_en    text not null default '',
  description text,
  icon        text not null default 'heart-handshake',
  sort_order  smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index family_rules_family_idx on public.family_rules (family_id);

create table public.achievement_levels (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families (id) on delete cascade,
  code          text not null check (code ~ '^[a-z0-9_]{2,24}$'),
  name_ar       text not null,
  name_en       text not null default '',
  icon          text not null default '🏅',
  color         text not null default 'gold',
  min_percent   numeric(5,2) not null check (min_percent between 0 and 100),
  rank          smallint not null,
  money_amount  numeric(10,2) not null default 0 check (money_amount >= 0),
  privilege_ar  text,
  privilege_en  text,
  message_ar    text,
  message_en    text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (family_id, code)
);
create index achievement_levels_family_idx on public.achievement_levels (family_id);

create table public.achievement_definitions (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
  code           text not null,
  name_ar        text not null,
  name_en        text not null default '',
  description_ar text,
  description_en text,
  icon           text not null default '🏆',
  criteria       public.achievement_criteria not null,
  threshold      integer not null check (threshold > 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (family_id, code)
);

create table public.earned_achievements (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
  child_id       uuid not null references public.children (id) on delete cascade,
  achievement_id uuid not null references public.achievement_definitions (id) on delete cascade,
  earned_at      timestamptz not null default now(),
  unique (child_id, achievement_id)
);
create index earned_achievements_family_idx on public.earned_achievements (family_id);

create table public.reward_catalog (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families (id) on delete cascade,
  name_ar       text not null,
  name_en       text not null default '',
  description   text,
  icon          text not null default '🎁',
  category      public.reward_category not null default 'privilege',
  value_amount  numeric(10,2) check (value_amount is null or value_amount >= 0),
  min_level_id  uuid references public.achievement_levels (id) on delete set null,
  min_age       smallint,
  max_age       smallint,
  is_available  boolean not null default true,
  limit_period  public.limit_period not null default 'none',
  limit_count   smallint check (limit_count is null or limit_count > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index reward_catalog_family_idx on public.reward_catalog (family_id);

create table public.weekly_snapshots (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families (id) on delete cascade,
  child_id        uuid not null references public.children (id) on delete cascade,
  week_start      date not null,
  week_end        date not null,
  approved_points integer not null,
  max_points      integer not null,
  percent         numeric(5,2),
  level_id        uuid references public.achievement_levels (id) on delete set null,
  level_snapshot  jsonb,
  details         jsonb not null default '{}'::jsonb,
  finalized_by    uuid references auth.users (id) on delete set null,
  finalized_at    timestamptz not null default now(),
  unique (child_id, week_start)
);
create index weekly_snapshots_family_idx on public.weekly_snapshots (family_id, week_start);

create table public.reward_fulfillments (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
  child_id       uuid not null references public.children (id) on delete cascade,
  reward_id      uuid references public.reward_catalog (id) on delete set null,
  snapshot_id    uuid references public.weekly_snapshots (id) on delete set null,
  source_key     text,
  title          text not null,
  amount         numeric(10,2),
  currency       text,
  status         public.reward_status not null default 'pending',
  payment_status public.payment_status not null default 'not_applicable',
  requested_by   uuid references auth.users (id) on delete set null,
  approved_by    uuid references auth.users (id) on delete set null,
  approved_at    timestamptz,
  fulfilled_at   timestamptz,
  paid_at        timestamptz,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (family_id, source_key)
);
create index reward_fulfillments_child_idx on public.reward_fulfillments (child_id, status);
create index reward_fulfillments_family_idx on public.reward_fulfillments (family_id, status);

-- Audit log has no FK on purpose: entries must survive while a family is being purged.
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  family_id   uuid not null,
  actor_id    uuid,
  action      text not null,
  table_name  text not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_family_idx on public.audit_logs (family_id, created_at desc);
