-- =============================================================================
-- Home Heroes — 002 Security: helper functions, triggers, RLS, privileges
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Identity helpers (private schema = not reachable through the Data API)
-- ---------------------------------------------------------------------------
create or replace function private.is_parent(p_family uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = p_family and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_owner(p_family uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = p_family and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

create or replace function private.my_child_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.children c
  where c.auth_user_id = (select auth.uid()) and c.is_active
  limit 1;
$$;

create or replace function private.my_child_family_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select c.family_id from public.children c
  where c.auth_user_id = (select auth.uid()) and c.is_active
  limit 1;
$$;

create or replace function private.is_member(p_family uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.is_parent(p_family), false)
      or coalesce(private.my_child_family_id() = p_family, false);
$$;

create or replace function private.child_family(p_child uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select family_id from public.children where id = p_child;
$$;

-- Caller may act on a child: a parent of that child's family, or the child itself.
create or replace function private.can_view_child(p_child uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  -- coalesce matters: "unknown" must never be treated as "allowed" by IF NOT ... checks
  select coalesce(private.is_parent(private.child_family(p_child)), false)
      or coalesce(private.my_child_id() = p_child, false);
$$;

create or replace function private.child_task_visible(p_task uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.task_assignments a
    where a.task_id = p_task and a.child_id = private.my_child_id()
  );
$$;

create or replace function private.family_today(p_family uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce(f.timezone, 'Asia/Dubai'))::date
  from public.families f where f.id = p_family;
$$;

grant execute on all functions in schema private to authenticated, service_role;
revoke execute on all functions in schema private from anon, public;

-- ---------------------------------------------------------------------------
-- Generic triggers
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['families','profiles','children','family_settings','tasks',
                           'task_submissions','notes','reward_catalog','reward_fulfillments']
  loop
    execute format('create trigger %I_touch before update on public.%I
                    for each row execute function private.touch_updated_at()', t, t);
  end loop;
end $$;

-- Audit trail for privileged changes
create or replace function private.audit_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row  jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_family uuid;
begin
  if coalesce(current_setting('app.purging', true), '') = 'on' then
    return null;
  end if;
  v_family := coalesce((v_row ->> 'family_id')::uuid,
                       case when tg_table_name = 'families' then (v_row ->> 'id')::uuid end);
  if v_family is null then return null; end if;
  insert into public.audit_logs (family_id, actor_id, action, table_name, record_id, old_data, new_data)
  values (v_family, auth.uid(), lower(tg_op), tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'family_id'),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['families','family_settings','family_members','family_invitations','children',
                           'tasks','task_rule_versions','task_assignments','task_categories','task_exemptions',
                           'family_holidays','task_submissions','initiative_submissions','point_events',
                           'achievement_levels','achievement_definitions','reward_catalog','reward_fulfillments',
                           'weekly_snapshots','skills','family_rules']
  loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function private.audit_trigger()', t, t);
  end loop;
end $$;

-- Point ledger and weekly snapshots are append-only.
create or replace function private.forbid_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.purging', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception 'immutable_record: % rows cannot be modified', tg_table_name
    using errcode = 'P0001';
end $$;

create trigger point_events_immutable before update or delete on public.point_events
  for each row execute function private.forbid_mutation();
create trigger weekly_snapshots_immutable before update or delete on public.weekly_snapshots
  for each row execute function private.forbid_mutation();

-- Children may only belong to one family and username is always lower-case.
create or replace function private.normalize_child()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.username := lower(trim(new.username));
  return new;
end $$;
create trigger children_normalize before insert or update of username on public.children
  for each row execute function private.normalize_child();

-- Profiles are created for every auth user.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, kind, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when new.raw_app_meta_data ->> 'role' = 'child' then 'child' else 'parent' end,
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'ar' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.families               enable row level security;
alter table public.profiles               enable row level security;
alter table public.family_members         enable row level security;
alter table public.family_invitations     enable row level security;
alter table public.children               enable row level security;
alter table public.family_settings        enable row level security;
alter table public.task_categories        enable row level security;
alter table public.tasks                  enable row level security;
alter table public.task_rule_versions     enable row level security;
alter table public.task_assignments       enable row level security;
alter table public.family_holidays        enable row level security;
alter table public.task_exemptions        enable row level security;
alter table public.task_reminders         enable row level security;
alter table public.task_submissions       enable row level security;
alter table public.initiative_submissions enable row level security;
alter table public.skills                 enable row level security;
alter table public.skill_assessments      enable row level security;
alter table public.point_events           enable row level security;
alter table public.notes                  enable row level security;
alter table public.family_rules           enable row level security;
alter table public.achievement_levels     enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.earned_achievements    enable row level security;
alter table public.reward_catalog         enable row level security;
alter table public.weekly_snapshots       enable row level security;
alter table public.reward_fulfillments    enable row level security;
alter table public.audit_logs             enable row level security;
alter table private.child_auth            enable row level security;
alter table private.login_attempts        enable row level security;

-- Families
create policy families_select on public.families for select to authenticated
  using ((select private.is_member(id)));
create policy families_update on public.families for update to authenticated
  using ((select private.is_owner(id))) with check ((select private.is_owner(id)));

-- Profiles: own row; parents can read profiles of co-parents
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.family_members m
      where m.user_id = profiles.id and (select private.is_parent(m.family_id))
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Memberships & invitations: parents read; writes via RPC only
create policy family_members_select on public.family_members for select to authenticated
  using ((select private.is_parent(family_id)));
create policy family_invitations_select on public.family_invitations for select to authenticated
  using ((select private.is_parent(family_id)));

-- Children: parents read/update; a child reads only its own row
create policy children_select on public.children for select to authenticated
  using ((select private.is_parent(family_id)) or id = (select private.my_child_id()));
create policy children_update on public.children for update to authenticated
  using ((select private.is_parent(family_id))) with check ((select private.is_parent(family_id)));

-- Settings: members read, parents write
create policy family_settings_select on public.family_settings for select to authenticated
  using ((select private.is_member(family_id)));
create policy family_settings_update on public.family_settings for update to authenticated
  using ((select private.is_parent(family_id))) with check ((select private.is_parent(family_id)));

-- Parent-managed configuration tables (full CRUD by parents, read by members)
do $$
declare t text;
begin
  foreach t in array array['task_categories','skills','family_rules','achievement_levels',
                           'achievement_definitions','reward_catalog','family_holidays']
  loop
    execute format($f$
      create policy %1$s_select on public.%1$I for select to authenticated
        using ((select private.is_member(family_id)));
      create policy %1$s_insert on public.%1$I for insert to authenticated
        with check ((select private.is_parent(family_id)));
      create policy %1$s_update on public.%1$I for update to authenticated
        using ((select private.is_parent(family_id))) with check ((select private.is_parent(family_id)));
      create policy %1$s_delete on public.%1$I for delete to authenticated
        using ((select private.is_parent(family_id)));
    $f$, t);
  end loop;
end $$;

-- Tasks: parents full CRUD; children read tasks assigned to them
create policy tasks_select on public.tasks for select to authenticated
  using ((select private.is_parent(family_id)) or (select private.child_task_visible(id)));
create policy tasks_insert on public.tasks for insert to authenticated
  with check ((select private.is_parent(family_id)));
create policy tasks_update on public.tasks for update to authenticated
  using ((select private.is_parent(family_id))) with check ((select private.is_parent(family_id)));
create policy tasks_delete on public.tasks for delete to authenticated
  using ((select private.is_parent(family_id)));

create policy task_rule_versions_select on public.task_rule_versions for select to authenticated
  using ((select private.is_parent(family_id)) or (select private.child_task_visible(task_id)));
create policy task_rule_versions_insert on public.task_rule_versions for insert to authenticated
  with check ((select private.is_parent(family_id)));
create policy task_rule_versions_update on public.task_rule_versions for update to authenticated
  using ((select private.is_parent(family_id))) with check ((select private.is_parent(family_id)));
create policy task_rule_versions_delete on public.task_rule_versions for delete to authenticated
  using ((select private.is_parent(family_id)));

create policy task_assignments_select on public.task_assignments for select to authenticated
  using ((select private.is_parent(family_id)) or child_id = (select private.my_child_id()));
create policy task_assignments_insert on public.task_assignments for insert to authenticated
  with check ((select private.is_parent(family_id)) and private.child_family(child_id) = family_id);
create policy task_assignments_update on public.task_assignments for update to authenticated
  using ((select private.is_parent(family_id)))
  with check ((select private.is_parent(family_id)) and private.child_family(child_id) = family_id);
create policy task_assignments_delete on public.task_assignments for delete to authenticated
  using ((select private.is_parent(family_id)));

create policy task_exemptions_select on public.task_exemptions for select to authenticated
  using ((select private.is_parent(family_id)) or child_id = (select private.my_child_id()));
create policy task_exemptions_insert on public.task_exemptions for insert to authenticated
  with check ((select private.is_parent(family_id)) and private.child_family(child_id) = family_id);
create policy task_exemptions_delete on public.task_exemptions for delete to authenticated
  using ((select private.is_parent(family_id)));

create policy task_reminders_select on public.task_reminders for select to authenticated
  using ((select private.is_parent(family_id)) or child_id = (select private.my_child_id()));
create policy task_reminders_delete on public.task_reminders for delete to authenticated
  using ((select private.is_parent(family_id)));

-- Scoring tables: read-only through RLS; all writes go through validated RPCs
create policy task_submissions_select on public.task_submissions for select to authenticated
  using ((select private.is_parent(family_id)) or child_id = (select private.my_child_id()));
create policy initiative_submissions_select on public.initiative_submissions for select to authenticated
  using ((select private.is_parent(family_id)) or child_id = (select private.my_child_id()));
create policy point_events_select on public.point_events for select to authenticated
  using ((select private.is_parent(family_id)) or child_id = (select private.my_child_id()));
create policy weekly_snapshots_select on public.weekly_snapshots for select to authenticated
  using ((select private.is_parent(family_id)) or child_id = (select private.my_child_id()));
create policy earned_achievements_select on public.earned_achievements for select to authenticated
  using ((select private.is_parent(family_id)) or child_id = (select private.my_child_id()));
create policy reward_fulfillments_select on public.reward_fulfillments for select to authenticated
  using ((select private.is_parent(family_id)) or child_id = (select private.my_child_id()));

-- Skill assessments: parents CRUD; child reads own visible ratings
create policy skill_assessments_select on public.skill_assessments for select to authenticated
  using ((select private.is_parent(family_id))
         or (child_id = (select private.my_child_id()) and visible_to_child));
create policy skill_assessments_insert on public.skill_assessments for insert to authenticated
  with check ((select private.is_parent(family_id)) and private.child_family(child_id) = family_id);
create policy skill_assessments_update on public.skill_assessments for update to authenticated
  using ((select private.is_parent(family_id))) with check ((select private.is_parent(family_id)));
create policy skill_assessments_delete on public.skill_assessments for delete to authenticated
  using ((select private.is_parent(family_id)));

-- Notes: parent-only notes never reach a child account
create policy notes_parent_all on public.notes for all to authenticated
  using ((select private.is_parent(family_id)))
  with check ((select private.is_parent(family_id))
              and (child_id is null or private.child_family(child_id) = family_id));
create policy notes_child_select on public.notes for select to authenticated
  using (child_id = (select private.my_child_id()) and visibility = 'child_visible');
create policy notes_child_insert on public.notes for insert to authenticated
  with check (
    child_id = (select private.my_child_id())
    and family_id = (select private.my_child_family_id())
    and author_id = (select auth.uid())
    and author_role = 'child'
    and kind = 'reflection'
    and visibility = 'child_visible'
  );

create policy audit_logs_select on public.audit_logs for select to authenticated
  using ((select private.is_parent(family_id)));

-- ---------------------------------------------------------------------------
-- Table privileges (defence in depth on top of RLS)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema private from anon, authenticated;

revoke insert, update, delete, truncate on
  public.families, public.family_members, public.family_invitations,
  public.task_submissions, public.initiative_submissions, public.point_events,
  public.weekly_snapshots, public.earned_achievements, public.reward_fulfillments,
  public.audit_logs, public.task_reminders
from authenticated;
grant delete on public.task_reminders to authenticated;
grant update (name, timezone, currency, locale) on public.families to authenticated;

-- Children rows are created/deleted only by the provisioning Edge Function.
revoke insert, update, delete, truncate on public.children from authenticated;
grant update (display_name, birth_year, avatar, color, ui_mode, household_responsibility, sort_order)
  on public.children to authenticated;

-- Profiles: users edit only their display fields
revoke insert, update, delete, truncate on public.profiles from authenticated;
grant update (display_name, locale, avatar) on public.profiles to authenticated;

revoke truncate on all tables in schema public from authenticated;
