-- =============================================================================
-- Home Heroes — 004 Family management, onboarding, invitations, privacy ops
-- =============================================================================

create or replace function private.random_code(p_len int default 8)
returns text language plpgsql volatile set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_out text := '';
begin
  for i in 1..p_len loop
    v_out := v_out || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;
  return v_out;
end $$;

create or replace function private.random_token()
returns text language sql volatile set search_path = '' as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

create or replace function private.hash_token(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- Default configuration seeded for every new family
-- ---------------------------------------------------------------------------
create or replace function private.seed_family_defaults(p_family uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_gold uuid;
  v_silver uuid;
  v_bronze uuid;
begin
  insert into public.task_categories (family_id, name_ar, name_en, icon, color, sort_order) values
    (p_family, 'الغرفة والترتيب', 'Room & tidying', 'bed', 'purple', 1),
    (p_family, 'المدرسة والدراسة', 'School & study', 'book-open', 'blue', 2),
    (p_family, 'مسؤوليات المنزل', 'Household', 'home', 'green', 3),
    (p_family, 'العبادات', 'Worship', 'moon-star', 'gold', 4),
    (p_family, 'النظافة الشخصية', 'Personal hygiene', 'sparkles', 'pink', 5),
    (p_family, 'الاستعداد للغد', 'Preparing for tomorrow', 'backpack', 'blue', 6);

  insert into public.achievement_levels (family_id, code, name_ar, name_en, icon, color, min_percent, rank,
                                         money_amount, privilege_ar, privilege_en, message_ar, message_en)
  values
    (p_family, 'gold', 'الذهبي', 'Gold', '🥇', 'gold', 90, 4, 10, 'امتياز مميّز من اختيارك',
     'A premium privilege of your choice', 'أداء ذهبي! أنت بطل حقيقي', 'Golden week! You are a true hero')
    returning id into v_gold;
  insert into public.achievement_levels (family_id, code, name_ar, name_en, icon, color, min_percent, rank,
                                         money_amount, message_ar, message_en)
  values (p_family, 'silver', 'الفضي', 'Silver', '🥈', 'silver', 75, 3, 5,
          'أسبوع رائع، الذهبي قريب منك!', 'Great week — gold is within reach!')
    returning id into v_silver;
  insert into public.achievement_levels (family_id, code, name_ar, name_en, icon, color, min_percent, rank,
                                         money_amount, privilege_ar, privilege_en, message_ar, message_en)
  values (p_family, 'bronze', 'البرونزي', 'Bronze', '🥉', 'bronze', 60, 2, 0, 'امتياز صغير',
          'A small privilege', 'بداية جميلة، واصل التقدّم!', 'Nice start — keep going!')
    returning id into v_bronze;
  insert into public.achievement_levels (family_id, code, name_ar, name_en, icon, color, min_percent, rank,
                                         money_amount, message_ar, message_en)
  values (p_family, 'growing', 'في طريق التميّز', 'Growing', '🌱', 'green', 0, 1, 0,
          'كل يوم فرصة جديدة، ونحن معك بخطة تحسين لطيفة', 'Every day is a fresh start — we will grow together');

  insert into public.reward_catalog (family_id, name_ar, name_en, icon, category, min_level_id, limit_period, limit_count) values
    (p_family, 'اختيار فيلم العائلة', 'Choose the family movie', '🎬', 'privilege', v_silver, 'weekly', 1),
    (p_family, 'اختيار نشاط عائلي', 'Choose a family activity', '🎡', 'activity', v_gold, 'weekly', 1),
    (p_family, 'اختيار وجبة نهاية الأسبوع', 'Pick the weekend meal', '🍕', 'privilege', v_silver, 'weekly', 1),
    (p_family, 'نشاط ترفيهي إضافي متفق عليه', 'Extra agreed recreational time', '🎮', 'activity', v_bronze, 'weekly', 1),
    (p_family, 'اختيار ليلة ألعاب عائلية', 'Choose a family game night', '🎲', 'activity', v_silver, 'monthly', 2),
    (p_family, 'شهادة إنجاز مميّزة', 'Special achievement certificate', '📜', 'certificate', v_bronze, 'none', null);

  insert into public.skills (family_id, name_ar, name_en, icon, color, sort_order, criteria) values
    (p_family, 'المسؤولية', 'Responsibility', 'shield-check', 'blue', 1, 'يلتزم بمهامه ويتحمّل نتائج اختياراته'),
    (p_family, 'الاستقلالية', 'Independence', 'rocket', 'purple', 2, 'ينجز دون الحاجة إلى تذكير'),
    (p_family, 'التنظيم', 'Organization', 'layout-grid', 'green', 3, 'يحافظ على ترتيب أغراضه ومساحته'),
    (p_family, 'إدارة الوقت', 'Time management', 'clock', 'blue', 4, 'ينجز في الوقت المناسب'),
    (p_family, 'المبادرة', 'Initiative', 'lightbulb', 'gold', 5, 'يبادر بالمساعدة دون طلب'),
    (p_family, 'التعاون', 'Cooperation', 'users', 'pink', 6, 'يعمل مع إخوته وأسرته بروح الفريق'),
    (p_family, 'التواصل', 'Communication', 'message-circle', 'purple', 7, 'يعبّر عن نفسه باحترام ووضوح'),
    (p_family, 'تنظيم المشاعر', 'Emotional regulation', 'heart', 'pink', 8, 'يهدأ ويعبّر عن مشاعره بطريقة مناسبة'),
    (p_family, 'الصدق', 'Honesty', 'badge-check', 'green', 9, 'يقول الحقيقة ويعترف بالخطأ'),
    (p_family, 'حل المشكلات', 'Problem-solving', 'puzzle', 'blue', 10, 'يبحث عن حلول بهدوء'),
    (p_family, 'التنظيم المدرسي', 'School organization', 'backpack', 'purple', 11, 'يجهّز أدواته ويتابع واجباته'),
    (p_family, 'النظافة الشخصية', 'Personal hygiene', 'sparkles', 'green', 12, 'يحافظ على روتين النظافة');

  insert into public.family_rules (family_id, title_ar, title_en, description, icon, sort_order) values
    (p_family, 'نتحدّث باحترام ولطف', 'We speak with respect and kindness', 'الاختلاف طبيعي، والاحترام أساس', 'message-heart', 1),
    (p_family, 'نساعد بعضنا', 'We help each other', 'العائلة فريق واحد', 'handshake', 2),
    (p_family, 'نعتذر ونصلح أخطاءنا', 'We apologise and repair mistakes', 'الخطأ فرصة للتعلّم', 'heart-handshake', 3),
    (p_family, 'نحافظ على بيتنا', 'We look after our home', 'كل واحد منا مسؤول', 'home', 4);

  insert into public.achievement_definitions (family_id, code, name_ar, name_en, description_ar, icon, criteria, threshold) values
    (p_family, 'first_task', 'الخطوة الأولى', 'First step', 'أول مهمة معتمدة', '⭐', 'approved_tasks', 1),
    (p_family, 'tasks_50', 'نجم المهام', 'Task star', '50 مهمة معتمدة', '🌟', 'approved_tasks', 50),
    (p_family, 'independent_10', 'بطل الاستقلالية', 'Independence hero', '10 مهام دون تذكير', '🚀', 'independent_tasks', 10),
    (p_family, 'initiative_5', 'صاحب المبادرة', 'Initiative maker', '5 مبادرات معتمدة', '💡', 'approved_initiatives', 5),
    (p_family, 'gold_week', 'الأسبوع الذهبي', 'Golden week', 'أول أسبوع ذهبي', '🏆', 'gold_weeks', 1),
    (p_family, 'gold_4', 'البطل الذهبي', 'Golden champion', '4 أسابيع ذهبية', '👑', 'gold_weeks', 4);
end $$;

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------
create or replace function public.create_family(
  p_name text,
  p_timezone text default 'Asia/Dubai',
  p_currency text default 'AED',
  p_locale text default 'ar',
  p_parent_name text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_family uuid;
  v_code text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if exists (select 1 from public.children where auth_user_id = v_uid)
     or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'child' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.family_members where user_id = v_uid and role = 'owner') then
    raise exception 'already_owns_family';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'invalid_timezone';
  end if;

  loop
    v_code := private.random_code(8);
    exit when not exists (select 1 from public.families where family_code = v_code);
  end loop;

  insert into public.families (name, family_code, timezone, currency, locale, created_by)
  values (trim(p_name), v_code, p_timezone, upper(p_currency), coalesce(p_locale, 'ar'), v_uid)
  returning id into v_family;

  insert into public.family_members (family_id, user_id, role, display_name)
  values (v_family, v_uid, 'owner', nullif(trim(p_parent_name), ''));
  insert into public.family_settings (family_id) values (v_family);

  if nullif(trim(p_parent_name), '') is not null then
    update public.profiles set display_name = trim(p_parent_name) where id = v_uid;
  end if;

  perform private.seed_family_defaults(v_family);
  return v_family;
end $$;

create or replace function public.regenerate_family_code(p_family uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if not private.is_owner(p_family) then raise exception 'forbidden' using errcode = '42501'; end if;
  loop
    v_code := private.random_code(8);
    exit when not exists (select 1 from public.families where family_code = v_code);
  end loop;
  update public.families set family_code = v_code where id = p_family;
  return v_code;
end $$;

-- Create or update a task with versioned points and child assignments, atomically.
create or replace function public.save_task(
  p_family uuid,
  p_task_id uuid,
  p_data jsonb,
  p_base_points integer,
  p_independence_bonus integer,
  p_child_ids uuid[],
  p_effective_from date default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_task uuid := p_task_id;
  v_eff date := coalesce(p_effective_from, private.family_today(p_family));
  v_child uuid;
  v_weekdays smallint[];
begin
  if not private.is_parent(p_family) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_base_points not between 0 and 100 or p_independence_bonus not between 0 and 100 then
    raise exception 'invalid_points';
  end if;
  if p_child_ids is not null and exists (
       select 1 from unnest(p_child_ids) x(id)
       where not exists (select 1 from public.children c where c.id = x.id and c.family_id = p_family)) then
    raise exception 'child_not_in_family';
  end if;
  if (p_data ->> 'category_id') is not null and not exists (
       select 1 from public.task_categories where id = (p_data ->> 'category_id')::uuid and family_id = p_family) then
    raise exception 'category_not_in_family';
  end if;
  v_weekdays := coalesce(array(select jsonb_array_elements_text(p_data -> 'weekdays'))::smallint[], '{}');

  if v_task is null then
    insert into public.tasks (family_id, category_id, title_ar, title_en, description, instructions, icon, color,
      priority, recurrence, weekdays, one_time_date, start_date, end_date, school_only, is_religious,
      requires_verification, auto_approve, review_sample_rate, checklist, min_age, max_age, is_active, created_by)
    values (p_family, (p_data ->> 'category_id')::uuid, p_data ->> 'title_ar', coalesce(p_data ->> 'title_en', ''),
      p_data ->> 'description', p_data ->> 'instructions', coalesce(p_data ->> 'icon', 'check-circle'),
      coalesce(p_data ->> 'color', 'blue'), coalesce((p_data ->> 'priority')::public.task_priority, 'normal'),
      coalesce((p_data ->> 'recurrence')::public.recurrence_type, 'daily'), v_weekdays,
      (p_data ->> 'one_time_date')::date, coalesce((p_data ->> 'start_date')::date, v_eff),
      (p_data ->> 'end_date')::date, coalesce((p_data ->> 'school_only')::boolean, false),
      coalesce((p_data ->> 'is_religious')::boolean, false),
      coalesce((p_data ->> 'requires_verification')::boolean, true),
      coalesce((p_data ->> 'auto_approve')::boolean, false),
      coalesce((p_data ->> 'review_sample_rate')::numeric, 0), coalesce(p_data -> 'checklist', '[]'::jsonb),
      (p_data ->> 'min_age')::smallint, (p_data ->> 'max_age')::smallint,
      coalesce((p_data ->> 'is_active')::boolean, true), auth.uid())
    returning id into v_task;
    -- first version applies from the task's start date so history is consistent
    insert into public.task_rule_versions (family_id, task_id, effective_from, base_points, independence_bonus, created_by)
    select p_family, v_task, least(t.start_date, v_eff), p_base_points, p_independence_bonus, auth.uid()
    from public.tasks t where t.id = v_task;
  else
    if not exists (select 1 from public.tasks where id = v_task and family_id = p_family) then
      raise exception 'task_not_found';
    end if;
    update public.tasks set
      category_id = (p_data ->> 'category_id')::uuid,
      title_ar = p_data ->> 'title_ar',
      title_en = coalesce(p_data ->> 'title_en', ''),
      description = p_data ->> 'description',
      instructions = p_data ->> 'instructions',
      icon = coalesce(p_data ->> 'icon', icon),
      color = coalesce(p_data ->> 'color', color),
      priority = coalesce((p_data ->> 'priority')::public.task_priority, priority),
      recurrence = coalesce((p_data ->> 'recurrence')::public.recurrence_type, recurrence),
      weekdays = v_weekdays,
      one_time_date = (p_data ->> 'one_time_date')::date,
      start_date = coalesce((p_data ->> 'start_date')::date, start_date),
      end_date = (p_data ->> 'end_date')::date,
      school_only = coalesce((p_data ->> 'school_only')::boolean, school_only),
      is_religious = coalesce((p_data ->> 'is_religious')::boolean, is_religious),
      requires_verification = coalesce((p_data ->> 'requires_verification')::boolean, requires_verification),
      auto_approve = coalesce((p_data ->> 'auto_approve')::boolean, auto_approve),
      review_sample_rate = coalesce((p_data ->> 'review_sample_rate')::numeric, review_sample_rate),
      checklist = coalesce(p_data -> 'checklist', checklist),
      min_age = (p_data ->> 'min_age')::smallint,
      max_age = (p_data ->> 'max_age')::smallint,
      is_active = coalesce((p_data ->> 'is_active')::boolean, is_active)
    where id = v_task;

    -- new point values take effect from the chosen date; past days keep old values
    if not exists (
      select 1 from private.task_points_on(v_task, v_eff) p
      where p.base_points = p_base_points and p.independence_bonus = p_independence_bonus
    ) then
      insert into public.task_rule_versions (family_id, task_id, effective_from, base_points, independence_bonus, created_by)
      values (p_family, v_task, v_eff, p_base_points, p_independence_bonus, auth.uid())
      on conflict (task_id, effective_from) do update
        set base_points = excluded.base_points, independence_bonus = excluded.independence_bonus;
    end if;
  end if;

  if p_child_ids is not null then
    -- end assignments for removed children (keeping history before the effective date)
    delete from public.task_assignments a
     where a.task_id = v_task and not (a.child_id = any (p_child_ids)) and a.assigned_from >= v_eff;
    update public.task_assignments a set assigned_until = v_eff - 1
     where a.task_id = v_task and not (a.child_id = any (p_child_ids))
       and (a.assigned_until is null or a.assigned_until >= v_eff);
    foreach v_child in array p_child_ids loop
      if not exists (select 1 from public.task_assignments a
                     where a.task_id = v_task and a.child_id = v_child
                       and (a.assigned_until is null or a.assigned_until >= v_eff)) then
        insert into public.task_assignments (family_id, task_id, child_id, assigned_from)
        select p_family, v_task, v_child, greatest(v_eff, t.start_date) from public.tasks t where t.id = v_task
        on conflict (task_id, child_id, assigned_from) do update set assigned_until = null;
      end if;
    end loop;
  end if;
  return v_task;
end $$;

-- Starter responsibilities (the seven default daily responsibilities + each child's household chore)
create or replace function public.create_starter_tasks(p_family uuid, p_child_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_set public.family_settings;
  v_cat jsonb;
  v_count int := 0;
  c record;
  v_children uuid[];
begin
  if not private.is_parent(p_family) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_set from public.family_settings where family_id = p_family;
  select jsonb_object_agg(name_en, id) into v_cat from public.task_categories where family_id = p_family;
  select array_agg(id) into v_children from public.children
   where family_id = p_family and id = any (coalesce(p_child_ids, '{}'));
  if v_children is null then raise exception 'no_children'; end if;

  perform public.save_task(p_family, null, jsonb_build_object(
    'title_ar', 'ترتيب الغرفة والملابس', 'title_en', 'Bedroom and clothes', 'icon', 'bed', 'color', 'purple',
    'description', 'ترتيب الغرفة والملابس والأغراض الشخصية', 'category_id', v_cat ->> 'Room & tidying',
    'checklist', '[{"id":"bed","label":"ترتيب السرير"},{"id":"clothes","label":"ترتيب الملابس"},{"id":"floor","label":"أرضية نظيفة"}]'::jsonb),
    v_set.default_base_points, v_set.default_independence_bonus, v_children);
  perform public.save_task(p_family, null, jsonb_build_object(
    'title_ar', 'المدرسة والواجبات', 'title_en', 'School and homework', 'icon', 'book-open', 'color', 'blue',
    'description', 'إنجاز الواجبات المدرسية ومراجعة الدروس', 'school_only', true,
    'category_id', v_cat ->> 'School & study'),
    v_set.default_base_points, v_set.default_independence_bonus, v_children);
  perform public.save_task(p_family, null, jsonb_build_object(
    'title_ar', 'الصلوات', 'title_en', 'Prayers', 'icon', 'moon-star', 'color', 'gold', 'is_religious', true,
    'description', 'تسجيل ذاتي للصلوات الخمس باحترام وخصوصية', 'category_id', v_cat ->> 'Worship',
    'checklist', '[{"id":"fajr","label":"الفجر"},{"id":"dhuhr","label":"الظهر"},{"id":"asr","label":"العصر"},{"id":"maghrib","label":"المغرب"},{"id":"isha","label":"العشاء"}]'::jsonb),
    v_set.default_base_points, v_set.default_independence_bonus, v_children);
  perform public.save_task(p_family, null, jsonb_build_object(
    'title_ar', 'مراجعة القرآن', 'title_en', 'Quran revision', 'icon', 'book-heart', 'color', 'green', 'is_religious', true,
    'description', 'القراءة أو المراجعة المتفق عليها', 'category_id', v_cat ->> 'Worship'),
    v_set.default_base_points, v_set.default_independence_bonus, v_children);
  perform public.save_task(p_family, null, jsonb_build_object(
    'title_ar', 'النظافة الشخصية', 'title_en', 'Personal hygiene', 'icon', 'sparkles', 'color', 'pink',
    'description', 'تفريش الأسنان صباحًا ومساءً وروتين النظافة المناسب للعمر', 'category_id', v_cat ->> 'Personal hygiene',
    'checklist', '[{"id":"am","label":"تفريش الأسنان صباحًا"},{"id":"pm","label":"تفريش الأسنان مساءً"}]'::jsonb),
    v_set.default_base_points, v_set.default_independence_bonus, v_children);
  perform public.save_task(p_family, null, jsonb_build_object(
    'title_ar', 'الاستعداد للغد', 'title_en', 'Preparing for tomorrow', 'icon', 'backpack', 'color', 'blue',
    'description', 'تجهيز الملابس والحقيبة وروتين النوم', 'category_id', v_cat ->> 'Preparing for tomorrow'),
    v_set.default_base_points, v_set.default_independence_bonus, v_children);
  v_count := 6;

  -- the household responsibility is personal to each child
  for c in select id, display_name, household_responsibility from public.children where id = any (v_children) loop
    perform public.save_task(p_family, null, jsonb_build_object(
      'title_ar', coalesce(nullif(trim(c.household_responsibility), ''), 'مسؤولية منزلية'),
      'title_en', 'Household responsibility', 'icon', 'home', 'color', 'green',
      'description', 'المسؤولية المنزلية الخاصة بـ ' || c.display_name, 'category_id', v_cat ->> 'Household'),
      v_set.default_base_points, v_set.default_independence_bonus, array[c.id]);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- Co-parent invitations (secure, expiring, revocable)
-- ---------------------------------------------------------------------------
create or replace function public.create_invitation(p_family uuid, p_email text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_token text := private.random_token();
  v_row public.family_invitations;
begin
  if not private.is_parent(p_family) then raise exception 'forbidden' using errcode = '42501'; end if;
  if (select count(*) from public.family_invitations
      where family_id = p_family and accepted_at is null and revoked_at is null and expires_at > now()) >= 5 then
    raise exception 'too_many_invitations';
  end if;
  insert into public.family_invitations (family_id, email, token_hash, invited_by)
  values (p_family, nullif(lower(trim(p_email)), ''), private.hash_token(v_token), auth.uid())
  returning * into v_row;
  -- the raw token is returned exactly once and never stored
  return jsonb_build_object('id', v_row.id, 'token', v_token, 'expires_at', v_row.expires_at);
end $$;

create or replace function public.revoke_invitation(p_invitation uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_family uuid;
begin
  select family_id into v_family from public.family_invitations where id = p_invitation;
  if v_family is null or not private.is_parent(v_family) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.family_invitations set revoked_at = now()
  where id = p_invitation and accepted_at is null and revoked_at is null;
end $$;

create or replace function public.get_invitation(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_out jsonb;
begin
  select jsonb_build_object(
           'family_name', f.name,
           'inviter_name', coalesce(m.display_name, p.display_name),
           'email', i.email,
           'expires_at', i.expires_at,
           'valid', i.accepted_at is null and i.revoked_at is null and i.expires_at > now())
    into v_out
  from public.family_invitations i
  join public.families f on f.id = i.family_id
  left join public.family_members m on m.family_id = i.family_id and m.user_id = i.invited_by
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = private.hash_token(p_token);
  return coalesce(v_out, jsonb_build_object('valid', false));
end $$;

create or replace function public.accept_invitation(p_token text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.family_invitations;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if exists (select 1 from public.children where auth_user_id = v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_inv from public.family_invitations where token_hash = private.hash_token(p_token) for update;
  if v_inv.id is null or v_inv.revoked_at is not null or v_inv.accepted_at is not null
     or v_inv.expires_at <= now() then
    raise exception 'invitation_invalid';
  end if;
  if v_inv.email is not null and lower(coalesce(auth.jwt() ->> 'email', '')) <> v_inv.email then
    raise exception 'invitation_email_mismatch';
  end if;
  insert into public.family_members (family_id, user_id, role, display_name)
  values (v_inv.family_id, v_uid, 'co_parent', nullif(trim(p_display_name), ''))
  on conflict (family_id, user_id) do nothing;
  update public.family_invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  return v_inv.family_id;
end $$;

create or replace function public.remove_member(p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_m public.family_members;
begin
  select * into v_m from public.family_members where id = p_member;
  if v_m.id is null then raise exception 'not_found'; end if;
  -- owners may remove co-parents; a co-parent may leave by removing themselves
  if not (private.is_owner(v_m.family_id) or v_m.user_id = auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_m.role = 'owner' then raise exception 'cannot_remove_owner'; end if;
  delete from public.family_members where id = p_member;
end $$;

-- ---------------------------------------------------------------------------
-- Privacy: export, retention, purge
-- ---------------------------------------------------------------------------
create or replace function public.export_family_data(p_family uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_out jsonb;
  v_part jsonb;
  t text;
begin
  if not private.is_parent(p_family) then raise exception 'forbidden' using errcode = '42501'; end if;
  v_out := jsonb_build_object('exported_at', now(),
    'family', (select to_jsonb(f) from public.families f where f.id = p_family));
  foreach t in array array['family_settings','family_members','children','task_categories','tasks',
    'task_rule_versions','task_assignments','family_holidays','task_exemptions','task_reminders',
    'task_submissions','initiative_submissions','point_events','skills','skill_assessments','notes',
    'family_rules','achievement_levels','achievement_definitions','earned_achievements','reward_catalog',
    'weekly_snapshots','reward_fulfillments'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.family_id = $1', t)
      using p_family into v_part;
    v_out := v_out || jsonb_build_object(t, v_part);
  end loop;
  return v_out;
end $$;

-- Deletes detailed activity older than the family's retention window.
-- Weekly snapshots (aggregated, audited results) are kept.
create or replace function public.apply_retention(p_family uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_months int;
  v_cutoff date;
  v_counts jsonb := '{}'::jsonb;
  n int;
begin
  if not private.is_owner(p_family) then raise exception 'forbidden' using errcode = '42501'; end if;
  select retention_months into v_months from public.family_settings where family_id = p_family;
  if v_months is null then return jsonb_build_object('skipped', true); end if;
  v_cutoff := private.family_today(p_family) - make_interval(months => v_months);
  perform set_config('app.purging', 'on', true);

  delete from public.point_events where family_id = p_family and event_date < v_cutoff
    and reverses_event_id is not null;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('point_reversals', n);
  delete from public.point_events where family_id = p_family and event_date < v_cutoff;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('point_events', n);
  delete from public.task_submissions where family_id = p_family and for_date < v_cutoff;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('task_submissions', n);
  delete from public.initiative_submissions where family_id = p_family and for_date < v_cutoff;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('initiatives', n);
  delete from public.task_reminders where family_id = p_family and for_date < v_cutoff;
  delete from public.notes where family_id = p_family and created_at < v_cutoff;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('notes', n);
  delete from public.audit_logs where family_id = p_family and created_at < v_cutoff;

  perform set_config('app.purging', 'off', true);
  insert into public.audit_logs (family_id, actor_id, action, table_name, new_data)
  values (p_family, auth.uid(), 'retention', 'families', v_counts || jsonb_build_object('cutoff', v_cutoff));
  return v_counts;
end $$;

-- ---------------------------------------------------------------------------
-- Service-role only functions (used by Edge Functions)
-- ---------------------------------------------------------------------------
create or replace function public.svc_resolve_child_login(p_family_code text, p_username text)
returns table (child_id uuid, user_id uuid, internal_email text, is_active boolean, family_id uuid)
language sql stable security definer set search_path = '' as $$
  select c.id, a.user_id, a.internal_email, c.is_active, c.family_id
  from public.families f
  join public.children c on c.family_id = f.id
  join private.child_auth a on a.child_id = c.id
  where f.family_code = upper(trim(p_family_code)) and c.username = lower(trim(p_username));
$$;

create or replace function public.svc_login_blocked(p_key text, p_ip text)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from private.login_attempts
      where attempt_key = p_key and not success and created_at > now() - interval '15 minutes') >= 5
    or (select count(*) from private.login_attempts
      where ip = p_ip and not success and created_at > now() - interval '15 minutes') >= 30;
$$;

create or replace function public.svc_record_login(p_key text, p_ip text, p_success boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into private.login_attempts (attempt_key, ip, success) values (p_key, p_ip, p_success);
  if p_success then
    -- a successful login clears the failure streak for that account
    delete from private.login_attempts where attempt_key = p_key and not success;
  end if;
  delete from private.login_attempts where created_at < now() - interval '2 days';
end $$;

-- Generic sliding-window limiter for sensitive endpoints (credential resets etc.).
-- Returns true when the call is allowed (and records it).
create or replace function public.svc_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.login_attempts
      where attempt_key = p_key and created_at > now() - make_interval(secs => p_window_seconds)) >= p_max then
    return false;
  end if;
  insert into private.login_attempts (attempt_key, success) values (p_key, true);
  return true;
end $$;

create or replace function public.svc_register_child_auth(p_child uuid, p_user uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into private.child_auth (child_id, user_id, internal_email) values (p_child, p_user, p_email)
  on conflict (child_id) do update set user_id = excluded.user_id, internal_email = excluded.internal_email,
    credential_version = private.child_auth.credential_version + 1, updated_at = now();
  update public.children set auth_user_id = p_user where id = p_child;
end $$;

create or replace function public.svc_child_auth(p_child uuid)
returns table (user_id uuid, internal_email text, credential_version integer)
language sql stable security definer set search_path = '' as $$
  select user_id, internal_email, credential_version from private.child_auth where child_id = p_child;
$$;

create or replace function public.svc_bump_credential(p_child uuid)
returns void language sql security definer set search_path = '' as $$
  update private.child_auth set credential_version = credential_version + 1, updated_at = now()
  where child_id = p_child;
$$;

create or replace function public.svc_revoke_sessions(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = p_user;
$$;

-- Removes a child and all of their history (parent-confirmed in manage-child).
create or replace function public.svc_delete_child(p_child uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.purging', 'on', true);
  delete from public.children where id = p_child;
  perform set_config('app.purging', 'off', true);
end $$;

-- Hard-deletes a family. Called by the manage-family Edge Function after it has
-- verified the caller is the owner and removed child auth users.
create or replace function public.svc_purge_family(p_family uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.purging', 'on', true);
  delete from public.families where id = p_family;
  delete from public.audit_logs where family_id = p_family;
  perform set_config('app.purging', 'off', true);
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.create_family(text, text, text, text, text),
  public.regenerate_family_code(uuid),
  public.save_task(uuid, uuid, jsonb, integer, integer, uuid[], date),
  public.create_starter_tasks(uuid, uuid[]),
  public.create_invitation(uuid, text),
  public.revoke_invitation(uuid),
  public.get_invitation(text),
  public.accept_invitation(text, text),
  public.remove_member(uuid),
  public.export_family_data(uuid),
  public.apply_retention(uuid),
  public.get_child_progress(uuid, date, date),
  public.get_child_day(uuid, date),
  public.get_family_week(uuid, date),
  public.submit_task(uuid, date, public.completion_mode, integer, jsonb, text, uuid),
  public.review_submission(uuid, text, public.completion_mode, text),
  public.reverse_point_event(uuid, text),
  public.log_reminder(uuid, uuid, date),
  public.adjust_points(uuid, integer, text, date, uuid, public.point_event_kind),
  public.submit_initiative(text, text, date, uuid),
  public.review_initiative(uuid, text, text, integer),
  public.finalize_week(uuid, date, uuid[]),
  public.get_reward_options(uuid),
  public.request_reward(uuid, text),
  public.grant_reward(uuid, uuid, text, numeric, text),
  public.update_fulfillment(uuid, public.reward_status, public.payment_status, text)
to authenticated;

-- invitation preview is visible before sign-in
grant execute on function public.get_invitation(text) to anon;

grant execute on function
  public.svc_resolve_child_login(text, text),
  public.svc_login_blocked(text, text),
  public.svc_record_login(text, text, boolean),
  public.svc_rate_limit(text, integer, integer),
  public.svc_register_child_auth(uuid, uuid, text),
  public.svc_child_auth(uuid),
  public.svc_bump_credential(uuid),
  public.svc_revoke_sessions(uuid),
  public.svc_purge_family(uuid),
  public.svc_delete_child(uuid)
to service_role;

-- new functions are private by default
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- helpers added in later migrations: usable by RLS for signed-in users only
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on all functions in schema private from public, anon;
