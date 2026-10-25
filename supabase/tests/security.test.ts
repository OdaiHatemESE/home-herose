import { beforeAll, describe, expect, it } from 'vitest';
import { createAuthUser, createDb, expectError, setupFamily, taskId, type Db, type FamilyFixture } from './harness';

type Json = Record<string, any>;
let db: Db;
let a: FamilyFixture;
let b: FamilyFixture;

const FAMILY_TABLES = [
  'families', 'family_members', 'family_invitations', 'children', 'family_settings', 'task_categories', 'tasks',
  'task_rule_versions', 'task_assignments', 'family_holidays', 'task_exemptions', 'task_reminders',
  'task_submissions', 'initiative_submissions', 'skills', 'skill_assessments', 'point_events', 'notes',
  'family_rules', 'achievement_levels', 'achievement_definitions', 'earned_achievements', 'reward_catalog',
  'weekly_snapshots', 'reward_fulfillments', 'audit_logs',
];

beforeAll(async () => {
  db = await createDb();
  a = await setupFamily(db, 'alpha');
  b = await setupFamily(db, 'beta');
  // give family B some activity and private notes
  const task = await taskId(db, b.familyId, 'Bedroom and clothes');
  const [{ s }] = await db.as.user<{ s: Json }>(b.children.tuqa.userId, `select public.submit_task($1, $2) as s`, [task, b.today]);
  await db.as.user(b.fatherId, `select public.review_submission($1, 'approve')`, [s.id]);
  await db.as.user(b.fatherId,
    `insert into public.notes (family_id, child_id, author_id, author_role, kind, visibility, body)
     values ($1, $2, $3, 'parent', 'observation', 'parent_only', 'ملاحظة خاصة بالوالدين')`,
    [b.familyId, b.children.tuqa.childId, b.fatherId]);
}, 120_000);

describe('multi-family isolation', () => {
  it('a parent of family A cannot read any row of family B', async () => {
    for (const table of FAMILY_TABLES) {
      const col = table === 'families' ? 'id' : 'family_id';
      const rows = await db.as.user<Json>(a.fatherId, `select 1 from public.${table} where ${col} = $1`, [b.familyId]);
      expect(rows, `leak in ${table}`).toHaveLength(0);
    }
  });

  it('a parent of family A cannot modify family B', async () => {
    const task = await taskId(db, b.familyId, 'Prayers');
    const upd = await db.as.user<Json>(a.fatherId, `update public.tasks set title_ar = 'x' where id = $1 returning id`, [task]);
    expect(upd).toHaveLength(0);
    await expectError(db.as.user(a.fatherId,
      `insert into public.tasks (family_id, title_ar) values ($1, 'تسلل')`, [b.familyId]), /row-level security/);
    await expectError(db.as.user(a.fatherId,
      `select public.save_task($1, null, '{"title_ar":"x"}'::jsonb, 1, 1, null)`, [b.familyId]), /forbidden/);
    await expectError(db.as.user(a.fatherId, `select public.adjust_points($1, 50, 'hack')`, [b.children.hatem.childId]), /forbidden/);
    await expectError(db.as.user(a.fatherId, `select public.finalize_week($1, $2)`, [b.familyId, b.weekStart]), /forbidden/);
    await expectError(db.as.user(a.fatherId, `select public.get_child_progress($1, $2, $2)`, [b.children.hatem.childId, b.today]), /forbidden/);
    await expectError(db.as.user(a.fatherId, `select public.export_family_data($1)`, [b.familyId]), /forbidden/);
    await expectError(db.as.user(a.fatherId, `select public.create_invitation($1)`, [b.familyId]), /forbidden/);
    const [sub] = await db.rows<Json>(`select id from public.task_submissions where family_id = $1 limit 1`, [b.familyId]);
    await expectError(db.as.user(a.fatherId, `select public.review_submission($1, 'reject')`, [sub.id]), /forbidden/);
    const upSettings = await db.as.user<Json>(a.fatherId,
      `update public.family_settings set initiative_daily_cap = 50 where family_id = $1 returning 1`, [b.familyId]);
    expect(upSettings).toHaveLength(0);
  });

  it("a parent cannot assign another family's child to their task", async () => {
    const task = await taskId(db, a.familyId, 'Prayers');
    await expectError(db.as.user(a.fatherId,
      `insert into public.task_assignments (family_id, task_id, child_id) values ($1, $2, $3)`,
      [a.familyId, task, b.children.obai.childId]), /row-level security/);
    await expectError(db.as.user(a.fatherId,
      `select public.save_task($1, $2, (select to_jsonb(t) from public.tasks t where id = $2), 1, 1, $3)`,
      [a.familyId, task, [b.children.obai.childId]]), /child_not_in_family/);
  });

  it('an unrelated signed-in user sees nothing', async () => {
    const stranger = await createAuthUser(db, 'stranger@example.com');
    for (const table of FAMILY_TABLES) {
      expect(await db.as.user<Json>(stranger, `select 1 from public.${table}`), table).toHaveLength(0);
    }
  });

  it('anonymous visitors have no table access', async () => {
    await expectError(db.as.anon(`select * from public.children`), /permission denied/);
    await expectError(db.as.anon(`select * from public.families`), /permission denied/);
    await expectError(db.as.anon(`select public.submit_task(gen_random_uuid(), current_date)`), /permission denied/);
  });
});

describe('child restrictions', () => {
  it('a child sees only its own child record and its own scores', async () => {
    const me = a.children.retal;
    const kids = await db.as.user<Json>(me.userId, `select id from public.children`);
    expect(kids.map((k) => k.id)).toEqual([me.childId]);
    await expectError(db.as.user(me.userId, `select public.get_child_progress($1, $2, $2)`, [a.children.tuqa.childId, a.today]), /forbidden/);
    await expectError(db.as.user(me.userId, `select public.get_child_day($1, $2)`, [a.children.tuqa.childId, a.today]), /forbidden/);
  });

  it('a child cannot submit on behalf of a sibling', async () => {
    const task = await taskId(db, a.familyId, 'Prayers');
    await expectError(db.as.user(a.children.retal.userId,
      `select public.submit_task($1, $2, 'independent', 100, '{}'::jsonb, null, $3)`,
      [task, a.today, a.children.tuqa.childId]), /forbidden/);
  });

  it('a child cannot approve, adjust, reverse, finalize or configure', async () => {
    const child = a.children.hatem;
    const task = await taskId(db, a.familyId, 'Personal hygiene');
    const [{ s }] = await db.as.user<{ s: Json }>(child.userId, `select public.submit_task($1, $2) as s`, [task, a.today]);
    await expectError(db.as.user(child.userId, `select public.review_submission($1, 'approve')`, [s.id]), /forbidden/);
    await expectError(db.as.user(child.userId, `select public.adjust_points($1, 10, 'I deserve it')`, [child.childId]), /forbidden/);
    await expectError(db.as.user(child.userId, `select public.finalize_week($1, $2)`, [a.familyId, a.weekStart]), /forbidden/);
    await expectError(db.as.user(child.userId,
      `select public.save_task($1, null, '{"title_ar":"x"}'::jsonb, 50, 50, null)`, [a.familyId]), /forbidden/);
    await expectError(db.as.user(child.userId, `select public.log_reminder($1, $2)`, [child.childId, task]), /forbidden/);

    // direct table writes are blocked too
    await expectError(db.as.user(child.userId,
      `update public.task_submissions set status = 'approved', awarded_points = 99 where id = $1`, [s.id]), /permission denied/);
    const changedRules = await db.as.user<Json>(child.userId,
      `update public.task_rule_versions set base_points = 50 returning id`);
    expect(changedRules).toHaveLength(0);
    const changedLevels = await db.as.user<Json>(child.userId,
      `update public.achievement_levels set min_percent = 0 returning id`);
    expect(changedLevels).toHaveLength(0);
    const changedSettings = await db.as.user<Json>(child.userId,
      `update public.family_settings set initiative_daily_cap = 50 returning 1`);
    expect(changedSettings).toHaveLength(0);
    await expectError(db.as.user(child.userId,
      `update public.children set auth_user_id = null where id = $1`, [child.childId]), /permission denied/);
  });

  it('children cannot alter approved scores', async () => {
    const [ev] = await db.rows<Json>(`select id from public.point_events where family_id = $1 limit 1`, [b.familyId]);
    await expectError(db.as.user(b.children.tuqa.userId,
      `update public.point_events set points = 100 where id = $1`, [ev.id]), /permission denied/);
    await expectError(db.as.user(b.children.tuqa.userId,
      `delete from public.point_events where id = $1`, [ev.id]), /permission denied/);
    await expectError(db.as.user(b.children.tuqa.userId, `select public.reverse_point_event($1, 'oops')`, [ev.id]), /forbidden/);
  });

  it('parent-only notes never reach the child', async () => {
    const child = b.children.tuqa;
    expect(await db.as.user<Json>(child.userId, `select * from public.notes`)).toHaveLength(0);
    await db.as.user(b.motherId,
      `insert into public.notes (family_id, child_id, author_id, author_role, kind, visibility, body)
       values ($1, $2, $3, 'parent', 'positive', 'child_visible', 'أحسنتِ!')`, [b.familyId, child.childId, b.motherId]);
    const visible = await db.as.user<Json>(child.userId, `select body, visibility from public.notes`);
    expect(visible).toEqual([{ body: 'أحسنتِ!', visibility: 'child_visible' }]);

    // children can write reflections, but cannot create hidden or parent-authored notes
    await db.as.user(child.userId,
      `insert into public.notes (family_id, child_id, author_id, author_role, kind, visibility, body)
       values ($1, $2, $3, 'child', 'reflection', 'child_visible', 'استمتعت بالمساعدة اليوم')`,
      [b.familyId, child.childId, child.userId]);
    await expectError(db.as.user(child.userId,
      `insert into public.notes (family_id, child_id, author_id, author_role, kind, visibility, body)
       values ($1, $2, $3, 'parent', 'observation', 'parent_only', 'x')`,
      [b.familyId, child.childId, child.userId]), /row-level security/);
  });

  it('children cannot see the audit log, invitations or login mappings', async () => {
    const child = a.children.obai;
    expect(await db.as.user<Json>(child.userId, `select * from public.audit_logs`)).toHaveLength(0);
    expect(await db.as.user<Json>(child.userId, `select * from public.family_invitations`)).toHaveLength(0);
    await expectError(db.as.user(child.userId, `select * from private.child_auth`), /permission denied/);
    await expectError(db.as.user(child.userId, `select * from public.svc_resolve_child_login('x', 'y')`), /permission denied/);
  });

  it('parents also cannot read private login mappings or call service functions', async () => {
    await expectError(db.as.user(a.fatherId, `select * from private.child_auth`), /permission denied/);
    await expectError(db.as.user(a.fatherId, `select public.svc_purge_family($1)`, [a.familyId]), /permission denied/);
    await expectError(db.as.user(a.fatherId, `select public.svc_revoke_sessions($1)`, [a.fatherId]), /permission denied/);
  });
});

describe('invitations', () => {
  it('are single-use, email-bound, revocable and expiring', async () => {
    const [{ create_invitation: inv }] = await db.as.user<Json>(a.fatherId,
      `select public.create_invitation($1, 'aunt@example.com')`, [a.familyId]);
    const intruder = await createAuthUser(db, 'intruder@example.com');
    await expectError(db.as.user(intruder, `select public.accept_invitation($1)`, [inv.token], 'intruder@example.com'),
      /invitation_email_mismatch/);
    const [preview] = await db.as.anon<Json>(`select public.get_invitation($1) as i`, [inv.token]);
    expect(preview.i.valid).toBe(true);
    expect(preview.i.family_name).toContain('alpha');

    const aunt = await createAuthUser(db, 'aunt@example.com');
    await db.as.user(aunt, `select public.accept_invitation($1)`, [inv.token], 'aunt@example.com');
    await expectError(db.as.user(aunt, `select public.accept_invitation($1)`, [inv.token], 'aunt@example.com'), /invitation_invalid/);

    const [{ create_invitation: inv2 }] = await db.as.user<Json>(a.fatherId, `select public.create_invitation($1)`, [a.familyId]);
    await db.as.user(a.fatherId, `select public.revoke_invitation($1)`, [inv2.id]);
    await expectError(db.as.user(intruder, `select public.accept_invitation($1)`, [inv2.token]), /invitation_invalid/);

    const [{ create_invitation: inv3 }] = await db.as.user<Json>(a.fatherId, `select public.create_invitation($1)`, [a.familyId]);
    await db.query(`update public.family_invitations set expires_at = now() - interval '1 minute' where id = $1`, [inv3.id]);
    await expectError(db.as.user(intruder, `select public.accept_invitation($1)`, [inv3.token]), /invitation_invalid/);

    // raw tokens are never stored
    const stored = await db.rows<Json>(`select token_hash from public.family_invitations where id = $1`, [inv.id]);
    expect(stored[0].token_hash).not.toBe(inv.token);

    // co-parent cannot remove the owner; owner can remove co-parent
    const [owner] = await db.rows<Json>(`select id from public.family_members where family_id = $1 and role = 'owner'`, [a.familyId]);
    await expectError(db.as.user(aunt, `select public.remove_member($1)`, [owner.id]), /forbidden|cannot_remove_owner/);
    const [auntMember] = await db.rows<Json>(`select id from public.family_members where user_id = $1`, [aunt]);
    await db.as.user(a.fatherId, `select public.remove_member($1)`, [auntMember.id]);
    expect(await db.as.user<Json>(aunt, `select * from public.children`)).toHaveLength(0);
  });
});

describe('audit, export and deletion', () => {
  it('logs privileged changes and exports family data', async () => {
    const logs = await db.as.user<Json>(a.fatherId, `select distinct table_name from public.audit_logs`);
    expect(logs.map((l) => l.table_name)).toEqual(expect.arrayContaining(['families', 'children', 'tasks', 'task_rule_versions', 'family_invitations']));
    const [{ e }] = await db.as.user<{ e: Json }>(a.motherId, `select public.export_family_data($1) as e`, [a.familyId]);
    expect(e.children).toHaveLength(4);
    expect(e.family.id).toBe(a.familyId);
  });

  it('purges a whole family including its immutable ledger', async () => {
    const victim = await setupFamily(db, 'gamma');
    const task = await taskId(db, victim.familyId, 'Prayers');
    const [{ s }] = await db.as.user<{ s: Json }>(victim.children.hatem.userId, `select public.submit_task($1, $2) as s`, [task, victim.today]);
    await db.as.user(victim.fatherId, `select public.review_submission($1, 'approve')`, [s.id]);
    await db.as.service(`select public.svc_purge_family($1)`, [victim.familyId]);
    for (const table of FAMILY_TABLES.filter((t) => t !== 'families')) {
      const rows = await db.rows<Json>(`select 1 from public.${table} where family_id = $1`, [victim.familyId]);
      expect(rows, table).toHaveLength(0);
    }
  });

  it('applies retention without touching weekly snapshots', async () => {
    await expectError(db.as.user(a.motherId, `select public.apply_retention($1)`, [a.familyId]), /forbidden/);
    await db.as.user(a.fatherId, `update public.family_settings set retention_months = 12`);
    const [{ r }] = await db.as.user<{ r: Json }>(a.fatherId, `select public.apply_retention($1) as r`, [a.familyId]);
    expect(r.point_events).toBe(0);
  });
});
