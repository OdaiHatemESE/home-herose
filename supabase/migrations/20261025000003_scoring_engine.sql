-- =============================================================================
-- Home Heroes — 003 Scoring engine
-- All point calculations happen here, server-side. Browsers never send totals.
-- =============================================================================

-- Deactivating a task archives it from that moment; history before it is preserved.
create or replace function private.task_archive_sync()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_active and new.archived_at is not null then
    new.archived_at := null;
  elsif not new.is_active and new.archived_at is null then
    new.archived_at := now();
  end if;
  return new;
end $$;
create trigger tasks_archive_sync before insert or update of is_active on public.tasks
  for each row execute function private.task_archive_sync();

-- ---------------------------------------------------------------------------
-- Calendar helpers
-- ---------------------------------------------------------------------------
create or replace function private.week_start_for(p_family uuid, p_date date)
returns date language sql stable security definer set search_path = '' as $$
  select p_date - ((extract(dow from p_date)::int - s.week_start_day + 7) % 7)
  from public.family_settings s where s.family_id = p_family;
$$;

create or replace function private.task_points_on(p_task uuid, p_date date,
  out base_points integer, out independence_bonus integer)
language sql stable security definer set search_path = '' as $$
  select v.base_points::int, v.independence_bonus::int
  from public.task_rule_versions v
  where v.task_id = p_task
  order by (v.effective_from <= p_date) desc,
           case when v.effective_from <= p_date then v.effective_from end desc nulls last,
           v.effective_from asc
  limit 1;
$$;

-- Task is assigned, active, within its date window, and not marked not-applicable.
create or replace function private.task_live_on(p_task uuid, p_child uuid, p_date date)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.tasks t
    join public.task_assignments a on a.task_id = t.id and a.child_id = p_child
    where t.id = p_task
      and t.start_date <= p_date and (t.end_date is null or p_date <= t.end_date)
      and (t.archived_at is null or p_date < t.archived_at::date)
      and a.assigned_from <= p_date and (a.assigned_until is null or p_date <= a.assigned_until)
  )
  and not exists (
    select 1 from public.task_exemptions e
    where e.child_id = p_child and e.exempt_date = p_date
      and (e.task_id is null or e.task_id = p_task)
  );
$$;

-- Task is due on this specific day (daily / weekdays / one-time), honouring
-- school-only exclusions on weekends and holidays.
create or replace function private.task_due_on(p_task uuid, p_child uuid, p_date date)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.task_live_on(p_task, p_child, p_date) and exists (
    select 1
    from public.tasks t
    join public.family_settings s on s.family_id = t.family_id
    where t.id = p_task
      and case t.recurrence
            when 'daily' then true
            when 'weekdays' then extract(dow from p_date)::smallint = any (t.weekdays)
            when 'one_time' then t.one_time_date = p_date
            else false
          end
      and (
        not t.school_only
        or (
          not (extract(dow from p_date)::smallint = any (s.weekend_days))
          and not exists (
            select 1 from public.family_holidays h
            where h.family_id = t.family_id and h.holiday_date = p_date
          )
        )
      )
  );
$$;

create or replace function private.assert_week_open(p_child uuid, p_date date)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.weekly_snapshots w
    where w.child_id = p_child
      and w.week_start = private.week_start_for(private.child_family(p_child), p_date)
  ) then
    raise exception 'week_finalized' using errcode = 'P0001';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Eligible maximum & period statistics
-- ---------------------------------------------------------------------------
create or replace function private.child_range_stats(p_child uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_family uuid := private.child_family(p_child);
  v_set public.family_settings;
  d date;
  v_day_max int;
  v_day_count int;
  v_task_max int := 0;
  v_init_max int := 0;
  v_eligible_days int := 0;
  v_weekly_seen text[] := '{}';
  v_weekly_max int := 0;
  v_occasional_max int := 0;
  r record;
  v_days jsonb := '[]'::jsonb;
  v_approved int;
  v_pending int;
  v_self int;
  v_counts record;
  v_init record;
  v_reminders int;
  v_day_points int;
begin
  select * into v_set from public.family_settings where family_id = v_family;
  if v_set.family_id is null then
    raise exception 'family_settings_missing';
  end if;

  for d in select generate_series(p_from, p_to, interval '1 day')::date loop
    select coalesce(sum(p.base_points + p.independence_bonus), 0), count(*)
      into v_day_max, v_day_count
    from public.tasks t
    cross join lateral private.task_points_on(t.id, d) p
    where t.family_id = v_family
      and t.recurrence in ('daily', 'weekdays', 'one_time')
      and private.task_due_on(t.id, p_child, d);

    -- weekly tasks count once per week, on the first live day inside the range
    for r in
      select t.id, p.base_points, p.independence_bonus
      from public.tasks t
      cross join lateral private.task_points_on(t.id, d) p
      where t.family_id = v_family and t.recurrence = 'weekly'
        and private.task_live_on(t.id, p_child, d)
    loop
      if not (r.id::text || ':' || private.week_start_for(v_family, d)::text = any (v_weekly_seen)) then
        v_weekly_seen := v_weekly_seen || (r.id::text || ':' || private.week_start_for(v_family, d)::text);
        v_weekly_max := v_weekly_max + r.base_points + r.independence_bonus;
        v_day_count := v_day_count + 1;
        v_day_max := v_day_max + r.base_points + r.independence_bonus;
      end if;
    end loop;

    select coalesce(sum(pe.points), 0) into v_day_points
    from public.point_events pe where pe.child_id = p_child and pe.event_date = d;

    if v_day_count > 0 then
      v_eligible_days := v_eligible_days + 1;
      v_init_max := v_init_max + v_set.initiative_daily_cap;
    end if;
    v_task_max := v_task_max + v_day_max;

    v_days := v_days || jsonb_build_object(
      'date', d,
      'scheduled', v_day_count,
      'max_points', v_day_max + case when v_day_count > 0 then v_set.initiative_daily_cap else 0 end,
      'approved_points', v_day_points
    );
  end loop;

  -- occasional tasks enlarge the denominator only once approved (never penalise)
  select coalesce(sum(s.base_points_snapshot + s.independence_bonus_snapshot), 0)
    into v_occasional_max
  from public.task_submissions s
  join public.tasks t on t.id = s.task_id
  where s.child_id = p_child and s.status = 'approved' and t.recurrence = 'occasional'
    and s.for_date between p_from and p_to;

  select coalesce(sum(points), 0) into v_approved
  from public.point_events where child_id = p_child and event_date between p_from and p_to;

  select coalesce(sum(claimed_points) filter (where status = 'pending'), 0),
         coalesce(sum(claimed_points) filter (where status in ('pending', 'approved', 'returned')), 0)
    into v_pending, v_self
  from public.task_submissions where child_id = p_child and for_date between p_from and p_to;

  select count(*) filter (where status = 'approved') as approved,
         count(*) filter (where status = 'approved' and final_mode = 'independent') as independent,
         count(*) filter (where status = 'approved' and final_mode = 'reminded') as reminded,
         count(*) filter (where status = 'pending') as pending,
         count(*) filter (where status = 'rejected') as rejected
    into v_counts
  from public.task_submissions where child_id = p_child and for_date between p_from and p_to;

  select count(*) filter (where status = 'approved') as approved,
         count(*) filter (where status = 'pending') as pending,
         coalesce(sum(points_awarded) filter (where status = 'approved'), 0) as points
    into v_init
  from public.initiative_submissions where child_id = p_child and for_date between p_from and p_to;

  select count(*) into v_reminders
  from public.task_reminders where child_id = p_child and for_date between p_from and p_to;

  v_pending := v_pending + v_init.pending * v_set.initiative_points;
  v_self := v_self + (v_init.pending + v_init.approved) * v_set.initiative_points;

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'task_max_points', v_task_max + v_occasional_max,
    'initiative_max_points', v_init_max,
    'max_points', v_task_max + v_occasional_max + v_init_max,
    'eligible_days', v_eligible_days,
    'approved_points', v_approved,
    'pending_points', v_pending,
    'self_reported_points', v_self,
    'approved_tasks', v_counts.approved,
    'independent_tasks', v_counts.independent,
    'reminded_tasks', v_counts.reminded,
    'pending_tasks', v_counts.pending,
    'rejected_tasks', v_counts.rejected,
    'initiatives_approved', v_init.approved,
    'initiatives_pending', v_init.pending,
    'initiative_points', v_init.points,
    'reminders_logged', v_reminders,
    'percent', case when v_task_max + v_occasional_max + v_init_max > 0
                    then least(100, round(greatest(v_approved, 0) * 100.0
                               / (v_task_max + v_occasional_max + v_init_max), 2))
               end,
    'days', v_days
  );
end $$;

create or replace function private.level_for(p_family uuid, p_percent numeric)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(l) from public.achievement_levels l
  where l.family_id = p_family and l.is_active and coalesce(p_percent, 0) >= l.min_percent
  order by l.min_percent desc, l.rank desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
create or replace function private.evaluate_achievements(p_child uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_family uuid := private.child_family(p_child);
  d public.achievement_definitions;
  v_metric int;
begin
  for d in select * from public.achievement_definitions
           where family_id = v_family and is_active loop
    v_metric := case d.criteria
      when 'approved_tasks' then
        (select count(*) from public.task_submissions where child_id = p_child and status = 'approved')
      when 'independent_tasks' then
        (select count(*) from public.task_submissions
          where child_id = p_child and status = 'approved' and final_mode = 'independent')
      when 'approved_initiatives' then
        (select count(*) from public.initiative_submissions where child_id = p_child and status = 'approved')
      when 'gold_weeks' then
        (select count(*) from public.weekly_snapshots
          where child_id = p_child and level_snapshot ->> 'code' = 'gold')
      when 'perfect_weeks' then
        (select count(*) from public.weekly_snapshots where child_id = p_child and percent >= 100)
    end;
    if v_metric >= d.threshold then
      insert into public.earned_achievements (family_id, child_id, achievement_id)
      values (v_family, p_child, d.id)
      on conflict (child_id, achievement_id) do nothing;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Actor resolution: the calling child, or a parent acting for a child
-- ---------------------------------------------------------------------------
create or replace function private.resolve_actor_child(p_child uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_me uuid := private.my_child_id();
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_me is not null then
    if p_child is not null and p_child <> v_me then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    return v_me;
  end if;
  if p_child is null or not private.is_parent(private.child_family(p_child)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return p_child;
end $$;

create or replace function private.assert_parent_of_child(p_child uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_family uuid := private.child_family(p_child);
begin
  if v_family is null or not private.is_parent(v_family) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_family;
end $$;

-- ---------------------------------------------------------------------------
-- Public read RPCs
-- ---------------------------------------------------------------------------
create or replace function public.get_child_progress(p_child uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_stats jsonb;
  v_family uuid := private.child_family(p_child);
  v_snapshot jsonb;
begin
  if not private.can_view_child(p_child) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 400 then
    raise exception 'invalid_range';
  end if;
  v_stats := private.child_range_stats(p_child, p_from, p_to);
  select to_jsonb(w) into v_snapshot from public.weekly_snapshots w
  where w.child_id = p_child and w.week_start = p_from and w.week_end = p_to;
  return v_stats || jsonb_build_object(
    'child_id', p_child,
    'level', coalesce(v_snapshot -> 'level_snapshot',
                      private.level_for(v_family, (v_stats ->> 'percent')::numeric)),
    'snapshot', v_snapshot
  );
end $$;

create or replace function public.get_child_day(p_child uuid, p_date date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_family uuid := private.child_family(p_child);
  v_ws date;
  v_result jsonb;
begin
  if not private.can_view_child(p_child) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_ws := private.week_start_for(v_family, p_date);

  select coalesce(jsonb_agg(item order by (item ->> 'sort')::int, item ->> 'title_ar'), '[]'::jsonb)
    into v_result
  from (
    select jsonb_build_object(
      'task_id', t.id,
      'title_ar', t.title_ar,
      'title_en', t.title_en,
      'description', t.description,
      'instructions', t.instructions,
      'icon', t.icon,
      'color', t.color,
      'category_id', t.category_id,
      'recurrence', t.recurrence,
      'priority', t.priority,
      'is_religious', t.is_religious,
      'checklist', t.checklist,
      'requires_verification', t.requires_verification and not t.auto_approve and not t.is_religious,
      'base_points', p.base_points,
      'independence_bonus', p.independence_bonus,
      'counts_toward_max', t.recurrence <> 'occasional',
      'sort', case t.recurrence when 'occasional' then 2 when 'weekly' then 1 else 0 end,
      'reminder_count', (
        select count(*) from public.task_reminders r
        where r.child_id = p_child and r.task_id = t.id
          and (case when t.recurrence = 'weekly' then r.for_date between v_ws and v_ws + 6
                    else r.for_date = p_date end)
      ),
      'submission', (
        select to_jsonb(s) - 'family_id' from public.task_submissions s
        where s.child_id = p_child and s.task_id = t.id
          and (case when t.recurrence = 'weekly' then s.for_date between v_ws and v_ws + 6
                    else s.for_date = p_date end)
        order by s.for_date desc limit 1
      )
    ) as item
    from public.tasks t
    cross join lateral private.task_points_on(t.id, p_date) p
    where t.family_id = v_family
      and (
        (t.recurrence in ('daily', 'weekdays', 'one_time') and private.task_due_on(t.id, p_child, p_date))
        or (t.recurrence in ('weekly', 'occasional') and private.task_live_on(t.id, p_child, p_date))
      )
  ) x;

  return jsonb_build_object(
    'date', p_date,
    'week_start', v_ws,
    'week_finalized', exists (select 1 from public.weekly_snapshots w
                              where w.child_id = p_child and w.week_start = v_ws),
    'tasks', v_result
  );
end $$;

create or replace function public.get_family_week(p_family uuid, p_week_start date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_out jsonb;
begin
  if not private.is_parent(p_family) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if private.week_start_for(p_family, p_week_start) <> p_week_start then
    raise exception 'invalid_week_start';
  end if;
  select coalesce(jsonb_agg(
           public.get_child_progress(c.id, p_week_start, p_week_start + 6)
             || jsonb_build_object('display_name', c.display_name, 'avatar', c.avatar,
                                   'color', c.color, 'ui_mode', c.ui_mode)
           order by c.sort_order, c.display_name), '[]'::jsonb)
    into v_out
  from public.children c where c.family_id = p_family and c.is_active;
  return v_out;
end $$;

-- ---------------------------------------------------------------------------
-- Child submissions
-- ---------------------------------------------------------------------------
create or replace function public.submit_task(
  p_task uuid,
  p_for_date date,
  p_mode public.completion_mode default 'independent',
  p_progress integer default 100,
  p_checklist jsonb default '{}'::jsonb,
  p_note text default null,
  p_child uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_child uuid := private.resolve_actor_child(p_child);
  v_is_child boolean := private.my_child_id() is not null;
  v_task public.tasks;
  v_today date;
  v_ws date;
  v_sub public.task_submissions;
  v_reminders int;
  v_mode public.completion_mode;
  v_pts record;
  v_claimed int;
  v_status public.submission_status;
begin
  select * into v_task from public.tasks where id = p_task;
  if v_task.id is null or v_task.family_id <> private.child_family(v_child) then
    raise exception 'task_not_found' using errcode = 'P0002';
  end if;

  v_today := private.family_today(v_task.family_id);
  if p_for_date > v_today then
    raise exception 'future_date';
  end if;
  if p_for_date < v_today - (case when v_is_child then 2 else 31 end) then
    raise exception 'date_too_old';
  end if;
  perform private.assert_week_open(v_child, p_for_date);

  if v_task.recurrence in ('daily', 'weekdays', 'one_time') then
    if not private.task_due_on(p_task, v_child, p_for_date) then
      raise exception 'not_scheduled';
    end if;
  elsif not private.task_live_on(p_task, v_child, p_for_date) then
    raise exception 'not_scheduled';
  end if;

  if p_progress is null or p_progress not between 0 and 100 then
    raise exception 'invalid_progress';
  end if;
  if p_checklist is null or jsonb_typeof(p_checklist) <> 'object' then
    p_checklist := '{}'::jsonb;
  end if;

  v_ws := private.week_start_for(v_task.family_id, p_for_date);

  -- existing submission for this slot (one per day, or one per week for weekly tasks)
  select * into v_sub from public.task_submissions s
  where s.child_id = v_child and s.task_id = p_task
    and (case when v_task.recurrence = 'weekly' then s.for_date between v_ws and v_ws + 6
              else s.for_date = p_for_date end)
  order by s.for_date desc limit 1
  for update;

  if v_sub.id is not null and v_sub.status = 'approved' then
    raise exception 'already_approved';
  end if;

  select count(*) into v_reminders from public.task_reminders r
  where r.child_id = v_child and r.task_id = p_task
    and (case when v_task.recurrence = 'weekly' then r.for_date between v_ws and v_ws + 6
              else r.for_date = p_for_date end);

  v_mode := case when v_reminders > 0 then 'reminded'::public.completion_mode
                 else coalesce(p_mode, 'independent') end;
  select * into v_pts from private.task_points_on(p_task, p_for_date);
  if v_pts.base_points is null then
    raise exception 'task_has_no_points';
  end if;
  v_claimed := v_pts.base_points + case when v_mode = 'independent' then v_pts.independence_bonus else 0 end;
  v_status := case when p_progress < 100 then 'in_progress' else 'pending' end;

  if v_sub.id is null then
    insert into public.task_submissions (
      family_id, child_id, task_id, for_date, status, claimed_mode, claimed_points,
      base_points_snapshot, independence_bonus_snapshot, checklist_state, progress,
      child_note, submitted_by, reminder_count
    ) values (
      v_task.family_id, v_child, p_task, p_for_date, v_status, v_mode, v_claimed,
      v_pts.base_points, v_pts.independence_bonus, p_checklist, p_progress,
      nullif(trim(p_note), ''), auth.uid(), v_reminders
    ) returning * into v_sub;
  else
    update public.task_submissions set
      status = v_status,
      claimed_mode = v_mode,
      claimed_points = v_claimed,
      base_points_snapshot = v_pts.base_points,
      independence_bonus_snapshot = v_pts.independence_bonus,
      checklist_state = p_checklist,
      progress = p_progress,
      child_note = nullif(trim(p_note), ''),
      submitted_by = auth.uid(),
      submitted_at = now(),
      reminder_count = v_reminders,
      revision = case when v_sub.status in ('returned', 'rejected') then v_sub.revision + 1 else v_sub.revision end,
      reviewed_by = null, reviewed_at = null, final_mode = null, awarded_points = null
    where id = v_sub.id
    returning * into v_sub;
  end if;

  -- low-risk tasks can be accepted automatically (with optional random sampling);
  -- worship is respectful self-reporting and is never verified or sampled
  if v_status = 'pending' and (v_task.auto_approve or not v_task.requires_verification or v_task.is_religious) then
    update public.task_submissions set
      status = 'approved',
      final_mode = v_mode,
      awarded_points = v_claimed,
      auto_approved = true,
      needs_review = not v_task.is_religious and random() < v_task.review_sample_rate,
      reviewed_at = now()
    where id = v_sub.id
    returning * into v_sub;

    insert into public.point_events (family_id, child_id, event_date, points, kind,
                                     source_type, source_id, source_revision, created_by)
    values (v_sub.family_id, v_child, v_sub.for_date, v_claimed, 'task',
            'task_submission', v_sub.id, v_sub.revision, auth.uid())
    on conflict (source_type, source_id, source_revision)
      where source_id is not null and kind <> 'reversal' do nothing;

    perform private.evaluate_achievements(v_child);
  end if;

  return to_jsonb(v_sub);
end $$;

-- ---------------------------------------------------------------------------
-- Parent review
-- ---------------------------------------------------------------------------
create or replace function public.review_submission(
  p_submission uuid,
  p_decision text,
  p_mode public.completion_mode default null,
  p_note text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_sub public.task_submissions;
  v_mode public.completion_mode;
  v_points int;
  v_reminders int;
  v_event uuid;
begin
  select * into v_sub from public.task_submissions where id = p_submission for update;
  if v_sub.id is null or not private.is_parent(v_sub.family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'reject', 'return') then
    raise exception 'invalid_decision';
  end if;
  perform private.assert_week_open(v_sub.child_id, v_sub.for_date);

  -- confirming / overturning an auto-approved sampled submission
  if v_sub.status = 'approved' and v_sub.auto_approved then
    if p_decision = 'approve' then
      update public.task_submissions set needs_review = false, reviewed_by = auth.uid(),
        reviewed_at = now(), review_note = coalesce(nullif(trim(p_note), ''), review_note)
      where id = v_sub.id returning * into v_sub;
      return to_jsonb(v_sub);
    end if;
    select id into v_event from public.point_events
    where source_type = 'task_submission' and source_id = v_sub.id
      and source_revision = v_sub.revision and kind = 'task';
    if v_event is not null then
      perform public.reverse_point_event(v_event, coalesce(nullif(trim(p_note), ''), 'review'));
    end if;
    update public.task_submissions set
      status = case when p_decision = 'reject' then 'rejected' else 'returned' end::public.submission_status,
      needs_review = false, reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
    where id = v_sub.id returning * into v_sub;
    return to_jsonb(v_sub);
  end if;

  if v_sub.status <> 'pending' then
    raise exception 'not_pending';
  end if;

  if p_decision = 'approve' then
    select count(*) into v_reminders from public.task_reminders r
    where r.child_id = v_sub.child_id and r.task_id = v_sub.task_id and r.for_date = v_sub.for_date;
    v_reminders := greatest(v_reminders, v_sub.reminder_count);
    v_mode := coalesce(p_mode,
                       case when v_reminders > 0 then 'reminded'::public.completion_mode
                            else v_sub.claimed_mode end);
    v_points := v_sub.base_points_snapshot
                + case when v_mode = 'independent' then v_sub.independence_bonus_snapshot else 0 end;

    update public.task_submissions set
      status = 'approved', final_mode = v_mode, awarded_points = v_points,
      reminder_count = v_reminders, reviewed_by = auth.uid(), reviewed_at = now(),
      review_note = nullif(trim(p_note), '')
    where id = v_sub.id returning * into v_sub;

    insert into public.point_events (family_id, child_id, event_date, points, kind,
                                     source_type, source_id, source_revision, created_by)
    values (v_sub.family_id, v_sub.child_id, v_sub.for_date, v_points, 'task',
            'task_submission', v_sub.id, v_sub.revision, auth.uid())
    on conflict (source_type, source_id, source_revision)
      where source_id is not null and kind <> 'reversal' do nothing;

    perform private.evaluate_achievements(v_sub.child_id);
  else
    update public.task_submissions set
      status = case when p_decision = 'reject' then 'rejected' else 'returned' end::public.submission_status,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_note), '')
    where id = v_sub.id returning * into v_sub;
  end if;

  return to_jsonb(v_sub);
end $$;

create or replace function public.reverse_point_event(p_event uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_ev public.point_events;
  v_rev public.point_events;
begin
  select * into v_ev from public.point_events where id = p_event for update;
  if v_ev.id is null or not private.is_parent(v_ev.family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_ev.kind = 'reversal' then
    raise exception 'cannot_reverse_reversal';
  end if;
  if char_length(coalesce(trim(p_reason), '')) < 3 then
    raise exception 'reason_required';
  end if;
  perform private.assert_week_open(v_ev.child_id, v_ev.event_date);

  insert into public.point_events (family_id, child_id, event_date, points, kind, source_type,
                                   source_id, source_revision, reverses_event_id, reason, created_by)
  values (v_ev.family_id, v_ev.child_id, v_ev.event_date, -v_ev.points, 'reversal', v_ev.source_type,
          v_ev.source_id, v_ev.source_revision, v_ev.id, trim(p_reason), auth.uid())
  returning * into v_rev;

  if v_ev.source_type = 'task_submission' then
    update public.task_submissions set status = 'returned', awarded_points = null,
      review_note = trim(p_reason), reviewed_by = auth.uid(), reviewed_at = now()
    where id = v_ev.source_id and status = 'approved';
  elsif v_ev.source_type = 'initiative' then
    update public.initiative_submissions set status = 'rejected', points_awarded = 0,
      review_note = trim(p_reason), reviewed_by = auth.uid(), reviewed_at = now()
    where id = v_ev.source_id;
  end if;

  return to_jsonb(v_rev);
end $$;

create or replace function public.log_reminder(p_child uuid, p_task uuid, p_date date default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_family uuid := private.assert_parent_of_child(p_child);
  v_date date := coalesce(p_date, private.family_today(v_family));
  v_count int;
begin
  if not exists (select 1 from public.task_assignments where task_id = p_task and child_id = p_child) then
    raise exception 'task_not_assigned';
  end if;
  perform private.assert_week_open(p_child, v_date);
  insert into public.task_reminders (family_id, child_id, task_id, for_date, logged_by)
  values (v_family, p_child, p_task, v_date, auth.uid());

  select count(*) into v_count from public.task_reminders
  where child_id = p_child and task_id = p_task and for_date = v_date;

  -- a pending claim of independence is downgraded to "after a reminder"
  update public.task_submissions
     set reminder_count = v_count, claimed_mode = 'reminded', claimed_points = base_points_snapshot
   where child_id = p_child and task_id = p_task and for_date = v_date
     and status in ('pending', 'in_progress', 'returned');
  return v_count;
end $$;

create or replace function public.adjust_points(
  p_child uuid, p_points integer, p_reason text,
  p_date date default null, p_skill uuid default null, p_kind public.point_event_kind default 'adjustment'
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_family uuid := private.assert_parent_of_child(p_child);
  v_date date := coalesce(p_date, private.family_today(v_family));
  v_ev public.point_events;
begin
  if p_kind not in ('adjustment', 'bonus') then
    raise exception 'invalid_kind';
  end if;
  if p_points is null or p_points = 0 or abs(p_points) > 100 then
    raise exception 'invalid_points';
  end if;
  if char_length(coalesce(trim(p_reason), '')) < 3 then
    raise exception 'reason_required';
  end if;
  if p_skill is not null and not exists (select 1 from public.skills where id = p_skill and family_id = v_family) then
    raise exception 'skill_not_found';
  end if;
  perform private.assert_week_open(p_child, v_date);
  insert into public.point_events (family_id, child_id, event_date, points, kind, source_type,
                                   reason, skill_id, created_by)
  values (v_family, p_child, v_date, p_points, p_kind, 'adjustment', trim(p_reason), p_skill, auth.uid())
  returning * into v_ev;
  return to_jsonb(v_ev);
end $$;

-- ---------------------------------------------------------------------------
-- Initiatives
-- ---------------------------------------------------------------------------
create or replace function public.submit_initiative(
  p_title text, p_description text default null, p_for_date date default null, p_child uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_child uuid := private.resolve_actor_child(p_child);
  v_family uuid := private.child_family(v_child);
  v_today date := private.family_today(v_family);
  v_date date := coalesce(p_for_date, v_today);
  v_row public.initiative_submissions;
begin
  if v_date > v_today then raise exception 'future_date'; end if;
  if v_date < v_today - 7 then raise exception 'date_too_old'; end if;
  perform private.assert_week_open(v_child, v_date);
  if (select count(*) from public.initiative_submissions
      where child_id = v_child and for_date = v_date and status = 'pending') >= 5 then
    raise exception 'too_many_pending';
  end if;
  insert into public.initiative_submissions (family_id, child_id, for_date, title, description, submitted_by)
  values (v_family, v_child, v_date, trim(p_title), nullif(trim(p_description), ''), auth.uid())
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.review_initiative(
  p_initiative uuid, p_decision text, p_note text default null, p_points integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_row public.initiative_submissions;
  v_set public.family_settings;
  v_used int;
  v_award int := 0;
  v_requested int;
begin
  select * into v_row from public.initiative_submissions where id = p_initiative for update;
  if v_row.id is null or not private.is_parent(v_row.family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then raise exception 'not_pending'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'invalid_decision'; end if;
  perform private.assert_week_open(v_row.child_id, v_row.for_date);

  if p_decision = 'approve' then
    select * into v_set from public.family_settings where family_id = v_row.family_id;
    -- serialise approvals for the same child/day so the cap cannot be raced
    perform pg_advisory_xact_lock(hashtextextended(v_row.child_id::text || v_row.for_date::text, 0));
    select coalesce(sum(points), 0) into v_used from public.point_events
    where child_id = v_row.child_id and event_date = v_row.for_date
      and source_type = 'initiative';
    v_requested := coalesce(p_points, v_set.initiative_points);
    if v_requested < 0 then raise exception 'invalid_points'; end if;
    v_award := greatest(0, least(v_requested, v_set.initiative_daily_cap - v_used));

    update public.initiative_submissions set status = 'approved', points_awarded = v_award,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_note), '')
    where id = v_row.id returning * into v_row;

    if v_award > 0 then
      insert into public.point_events (family_id, child_id, event_date, points, kind,
                                       source_type, source_id, created_by)
      values (v_row.family_id, v_row.child_id, v_row.for_date, v_award, 'initiative',
              'initiative', v_row.id, auth.uid());
    end if;
    perform private.evaluate_achievements(v_row.child_id);
  else
    update public.initiative_submissions set status = 'rejected', points_awarded = 0,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_note), '')
    where id = v_row.id returning * into v_row;
  end if;

  return to_jsonb(v_row) || jsonb_build_object(
    'capped', p_decision = 'approve' and v_award < coalesce(v_requested, 0));
end $$;

-- ---------------------------------------------------------------------------
-- Weekly finalisation (stable, auditable snapshots)
-- ---------------------------------------------------------------------------
create or replace function public.finalize_week(
  p_family uuid, p_week_start date, p_child_ids uuid[] default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_family public.families;
  c public.children;
  v_stats jsonb;
  v_level jsonb;
  v_snap public.weekly_snapshots;
  v_out jsonb := '[]'::jsonb;
  v_amount numeric;
begin
  if not private.is_parent(p_family) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if private.week_start_for(p_family, p_week_start) <> p_week_start then
    raise exception 'invalid_week_start';
  end if;
  if p_week_start > private.family_today(p_family) then
    raise exception 'week_not_started';
  end if;
  select * into v_family from public.families where id = p_family;
  perform pg_advisory_xact_lock(hashtextextended(p_family::text || p_week_start::text, 1));

  for c in select * from public.children
           where family_id = p_family and is_active
             and (p_child_ids is null or id = any (p_child_ids))
           order by sort_order, display_name
  loop
    select * into v_snap from public.weekly_snapshots
    where child_id = c.id and week_start = p_week_start;

    if v_snap.id is null then
      v_stats := private.child_range_stats(c.id, p_week_start, p_week_start + 6);
      v_level := private.level_for(p_family, (v_stats ->> 'percent')::numeric);

      insert into public.weekly_snapshots (family_id, child_id, week_start, week_end, approved_points,
        max_points, percent, level_id, level_snapshot, details, finalized_by)
      values (p_family, c.id, p_week_start, p_week_start + 6,
              (v_stats ->> 'approved_points')::int, (v_stats ->> 'max_points')::int,
              (v_stats ->> 'percent')::numeric, (v_level ->> 'id')::uuid, v_level, v_stats, auth.uid())
      returning * into v_snap;

      v_amount := coalesce((v_level ->> 'money_amount')::numeric, 0);
      if v_amount > 0 then
        insert into public.reward_fulfillments (family_id, child_id, snapshot_id, source_key, title, amount,
          currency, status, payment_status, approved_by, approved_at)
        values (p_family, c.id, v_snap.id, 'week:' || v_snap.id || ':money',
                coalesce(v_level ->> 'name_ar', '') || ' — ' || v_amount || ' ' || v_family.currency,
                v_amount, v_family.currency, 'approved', 'unpaid', auth.uid(), now())
        on conflict (family_id, source_key) do nothing;
      end if;
      if nullif(trim(v_level ->> 'privilege_ar'), '') is not null then
        insert into public.reward_fulfillments (family_id, child_id, snapshot_id, source_key, title,
          status, payment_status, approved_by, approved_at)
        values (p_family, c.id, v_snap.id, 'week:' || v_snap.id || ':privilege',
                v_level ->> 'privilege_ar', 'approved', 'not_applicable', auth.uid(), now())
        on conflict (family_id, source_key) do nothing;
      end if;
      perform private.evaluate_achievements(c.id);
    end if;

    v_out := v_out || (to_jsonb(v_snap) || jsonb_build_object('display_name', c.display_name));
  end loop;
  return v_out;
end $$;

-- ---------------------------------------------------------------------------
-- Rewards
-- ---------------------------------------------------------------------------
create or replace function private.reward_block_reason(p_child uuid, p_reward uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  r public.reward_catalog;
  c public.children;
  v_age int;
  v_min_rank int;
  v_best_rank int;
  v_today date;
  v_used int;
begin
  select * into r from public.reward_catalog where id = p_reward;
  select * into c from public.children where id = p_child;
  if r.id is null or c.id is null or r.family_id <> c.family_id then return 'not_found'; end if;
  if not r.is_available then return 'unavailable'; end if;
  v_age := case when c.birth_year is not null
                then extract(year from private.family_today(c.family_id))::int - c.birth_year end;
  if v_age is not null and ((r.min_age is not null and v_age < r.min_age)
                            or (r.max_age is not null and v_age > r.max_age)) then
    return 'age';
  end if;
  if r.min_level_id is not null then
    select rank into v_min_rank from public.achievement_levels where id = r.min_level_id;
    select (w.level_snapshot ->> 'rank')::int into v_best_rank from public.weekly_snapshots w
    where w.child_id = p_child order by w.week_start desc limit 1;
    if v_best_rank is null or v_best_rank < v_min_rank then return 'level'; end if;
  end if;
  if r.limit_period <> 'none' and r.limit_count is not null then
    v_today := private.family_today(c.family_id);
    select count(*) into v_used from public.reward_fulfillments f
    where f.child_id = p_child and f.reward_id = p_reward and f.status <> 'cancelled'
      and f.created_at >= case r.limit_period
            when 'weekly' then private.week_start_for(c.family_id, v_today)::timestamptz
            else date_trunc('month', v_today)::timestamptz end;
    if v_used >= r.limit_count then return 'limit'; end if;
  end if;
  return null;
end $$;

create or replace function public.get_reward_options(p_child uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_out jsonb;
begin
  if not private.can_view_child(p_child) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object(
           'block_reason', private.reward_block_reason(p_child, r.id),
           'eligible', private.reward_block_reason(p_child, r.id) is null)
         order by r.created_at), '[]'::jsonb)
    into v_out
  from public.reward_catalog r where r.family_id = private.child_family(p_child);
  return v_out;
end $$;

create or replace function public.request_reward(p_reward uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_child uuid := private.my_child_id();
  v_reason text;
  r public.reward_catalog;
  v_row public.reward_fulfillments;
begin
  if v_child is null then raise exception 'forbidden' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_child::text || p_reward::text, 2));
  v_reason := private.reward_block_reason(v_child, p_reward);
  if v_reason is not null then raise exception 'not_eligible:%', v_reason; end if;
  select * into r from public.reward_catalog where id = p_reward;
  insert into public.reward_fulfillments (family_id, child_id, reward_id, title, amount, currency,
    status, payment_status, requested_by, note)
  values (r.family_id, v_child, r.id, r.name_ar, r.value_amount,
          (select currency from public.families where id = r.family_id),
          'pending', case when coalesce(r.value_amount, 0) > 0 then 'unpaid' else 'not_applicable' end::public.payment_status,
          auth.uid(), nullif(trim(p_note), ''))
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.grant_reward(
  p_child uuid, p_reward uuid default null, p_title text default null,
  p_amount numeric default null, p_note text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_family uuid := private.assert_parent_of_child(p_child);
  r public.reward_catalog;
  v_row public.reward_fulfillments;
  v_amount numeric;
begin
  if p_reward is not null then
    select * into r from public.reward_catalog where id = p_reward and family_id = v_family;
    if r.id is null then raise exception 'reward_not_found'; end if;
  elsif char_length(coalesce(trim(p_title), '')) < 2 then
    raise exception 'title_required';
  end if;
  v_amount := coalesce(p_amount, r.value_amount);
  if v_amount is not null and v_amount < 0 then raise exception 'invalid_amount'; end if;
  insert into public.reward_fulfillments (family_id, child_id, reward_id, title, amount, currency,
    status, payment_status, requested_by, approved_by, approved_at, note)
  values (v_family, p_child, r.id, coalesce(nullif(trim(p_title), ''), r.name_ar), v_amount,
          (select currency from public.families where id = v_family), 'approved',
          case when coalesce(v_amount, 0) > 0 then 'unpaid' else 'not_applicable' end::public.payment_status,
          auth.uid(), auth.uid(), now(), nullif(trim(p_note), ''))
  returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.update_fulfillment(
  p_fulfillment uuid, p_status public.reward_status default null,
  p_payment public.payment_status default null, p_note text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.reward_fulfillments;
begin
  select * into v_row from public.reward_fulfillments where id = p_fulfillment for update;
  if v_row.id is null or not private.is_parent(v_row.family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_payment = 'paid' and coalesce(v_row.amount, 0) <= 0 then
    raise exception 'not_monetary';
  end if;
  update public.reward_fulfillments set
    status = coalesce(p_status, status),
    payment_status = coalesce(p_payment, payment_status),
    approved_by = case when p_status = 'approved' then auth.uid() else approved_by end,
    approved_at = case when p_status = 'approved' then now() else approved_at end,
    fulfilled_at = case when p_status = 'fulfilled' then now() else fulfilled_at end,
    paid_at = case when p_payment = 'paid' then now() when p_payment = 'unpaid' then null else paid_at end,
    note = coalesce(nullif(trim(p_note), ''), note)
  where id = v_row.id returning * into v_row;
  return to_jsonb(v_row);
end $$;
