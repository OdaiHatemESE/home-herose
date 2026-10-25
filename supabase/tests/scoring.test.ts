import { beforeAll, describe, expect, it } from 'vitest';
import { createDb, expectError, setupFamily, taskId, type Db, type FamilyFixture } from './harness';

type Json = Record<string, any>;
let db: Db;

beforeAll(async () => {
  db = await createDb();
}, 60_000);

async function progress(f: FamilyFixture, userId: string, childId: string, from = f.today, to = f.today) {
  const [row] = await db.as.user<{ p: Json }>(userId, `select public.get_child_progress($1, $2, $3) as p`, [childId, from, to]);
  return row.p;
}

describe('family onboarding', () => {
  it('creates a family with seeded defaults, owner + co-parent and starter tasks', async () => {
    const f = await setupFamily(db, 'onboard');
    const members = await db.as.user<Json>(f.fatherId, `select role from public.family_members order by role`);
    expect(members.map((m) => m.role)).toEqual(['owner', 'co_parent']);

    const levels = await db.as.user<Json>(f.motherId, `select code, min_percent::float, money_amount::float from public.achievement_levels order by rank desc`);
    expect(levels).toEqual([
      { code: 'gold', min_percent: 90, money_amount: 10 },
      { code: 'silver', min_percent: 75, money_amount: 5 },
      { code: 'bronze', min_percent: 60, money_amount: 0 },
      { code: 'growing', min_percent: 0, money_amount: 0 },
    ]);
    const [{ n }] = await db.as.user<{ n: number }>(f.fatherId, `select count(*)::int n from public.tasks`);
    expect(n).toBe(6 + 4); // six shared defaults + one household chore per child

    // each child has exactly seven responsibilities
    const [{ c }] = await db.as.user<{ c: number }>(f.children.hatem.userId, `select count(*)::int c from public.task_assignments`);
    expect(c).toBe(7);
  });

  it('refuses a second family for the same owner and refuses children creating families', async () => {
    const f = await setupFamily(db, 'dup');
    await expectError(db.as.user(f.fatherId, `select public.create_family('x')`), /already_owns_family/);
    await expectError(db.as.user(f.children.tuqa.userId, `select public.create_family('kids')`), /forbidden/);
  });
});

describe('daily scoring', () => {
  let f: FamilyFixture;
  beforeAll(async () => {
    f = await setupFamily(db, 'score');
  });

  it('computes the default seven-task day maximum (16) excluding non-applicable school days', async () => {
    const p = await progress(f, f.fatherId, f.children.tuqa.childId);
    const isWeekend = [6, 0].includes(f.dow);
    // 7 tasks × 2 + 2 initiative allowance = 16 on school days; the school task does not count on weekends
    expect(p.max_points).toBe(isWeekend ? 14 : 16);
    expect(p.initiative_max_points).toBe(2);
    expect(p.approved_points).toBe(0);
  });

  it('awards +2 for an independent completion only after parent approval', async () => {
    const task = await taskId(db, f.familyId, 'Bedroom and clothes');
    const child = f.children.tuqa;
    const [{ s }] = await db.as.user<{ s: Json }>(child.userId,
      `select public.submit_task($1, $2, 'independent', 100, '{"bed":true}'::jsonb, 'رتبت كل شيء') as s`, [task, f.today]);
    expect(s.status).toBe('pending');
    expect(s.claimed_points).toBe(2);

    let p = await progress(f, child.userId, child.childId);
    expect(p.self_reported_points).toBe(2);
    expect(p.pending_points).toBe(2);
    expect(p.approved_points).toBe(0);

    await db.as.user(f.motherId, `select public.review_submission($1, 'approve')`, [s.id]);
    p = await progress(f, child.userId, child.childId);
    expect(p.approved_points).toBe(2);
    expect(p.pending_points).toBe(0);
  });

  it('awards +1 when the parent logged a reminder, even if the child claimed independence', async () => {
    const task = await taskId(db, f.familyId, 'Prayers');
    const child = f.children.retal;
    await db.as.user(f.fatherId, `select public.log_reminder($1, $2)`, [child.childId, task]);
    const [{ s }] = await db.as.user<{ s: Json }>(child.userId,
      `select public.submit_task($1, $2, 'independent') as s`, [task, f.today]);
    expect(s.claimed_mode).toBe('reminded');
    expect(s.claimed_points).toBe(1);
    const [{ r }] = await db.as.user<{ r: Json }>(f.fatherId, `select public.review_submission($1, 'approve') as r`, [s.id]);
    expect(r.awarded_points).toBe(1);
    expect(r.reminder_count).toBe(1);
  });

  it('never trusts client totals and never double-awards', async () => {
    const task = await taskId(db, f.familyId, 'Personal hygiene');
    const child = f.children.hatem;
    const [{ s }] = await db.as.user<{ s: Json }>(child.userId, `select public.submit_task($1, $2) as s`, [task, f.today]);
    await db.as.user(f.fatherId, `select public.review_submission($1, 'approve')`, [s.id]);
    await expectError(db.as.user(f.motherId, `select public.review_submission($1, 'approve')`, [s.id]), /not_pending/);
    await expectError(db.as.user(child.userId, `select public.submit_task($1, $2) as s`, [task, f.today]), /already_approved/);
    const [{ total }] = await db.as.user<{ total: number }>(f.fatherId,
      `select sum(points)::int total from public.point_events where source_id = $1`, [s.id]);
    expect(total).toBe(2);
    // children cannot write to the ledger directly
    await expectError(db.as.user(child.userId,
      `insert into public.point_events (family_id, child_id, event_date, points, kind) values ($1, $2, $3, 50, 'bonus')`,
      [f.familyId, child.childId, f.today]), /permission denied/);
  });

  it('records reversals immutably and allows a corrected resubmission to be re-awarded', async () => {
    const task = await taskId(db, f.familyId, 'Quran revision');
    const child = f.children.obai;
    const [{ s }] = await db.as.user<{ s: Json }>(child.userId, `select public.submit_task($1, $2) as s`, [task, f.today]);
    await db.as.user(f.fatherId, `select public.review_submission($1, 'approve')`, [s.id]);
    const [ev] = await db.as.user<Json>(f.fatherId, `select id from public.point_events where source_id = $1`, [s.id]);
    await expectError(db.as.user(f.fatherId, `select public.reverse_point_event($1, '')`, [ev.id]), /reason_required/);
    await db.as.user(f.fatherId, `select public.reverse_point_event($1, 'لم تكتمل المراجعة')`, [ev.id]);
    await expectError(db.as.user(f.fatherId, `select public.reverse_point_event($1, 'again')`, [ev.id]), /duplicate key/);

    const [{ s: again }] = await db.as.user<{ s: Json }>(child.userId,
      `select public.submit_task($1, $2, 'reminded') as s`, [task, f.today]);
    expect(again.revision).toBe(2);
    await db.as.user(f.motherId, `select public.review_submission($1, 'approve')`, [again.id]);
    const [{ total }] = await db.as.user<{ total: number }>(f.fatherId,
      `select sum(points)::int total from public.point_events where source_id = $1`, [s.id]);
    expect(total).toBe(1); // +2 −2 +1

    // even the service role cannot rewrite history
    await expectError(db.as.service(`update public.point_events set points = 99 where id = $1`, [ev.id]), /immutable_record/);
    await expectError(db.as.service(`delete from public.point_events where id = $1`, [ev.id]), /immutable_record/);
  });

  it('auto-approves low-risk tasks when configured', async () => {
    const [{ id }] = await db.as.user<{ id: string }>(f.fatherId,
      `select public.save_task($1, null, '{"title_ar":"سقي النباتات","title_en":"Water plants","auto_approve":true}'::jsonb, 1, 1, $2) as id`,
      [f.familyId, [f.children.tuqa.childId]]);
    const [{ s }] = await db.as.user<{ s: Json }>(f.children.tuqa.userId, `select public.submit_task($1, $2) as s`, [id, f.today]);
    expect(s.status).toBe('approved');
    expect(s.auto_approved).toBe(true);
    expect(s.awarded_points).toBe(2);
  });

  it('saves partial progress without awarding points', async () => {
    const task = await taskId(db, f.familyId, 'Preparing for tomorrow');
    const [{ s }] = await db.as.user<{ s: Json }>(f.children.retal.userId,
      `select public.submit_task($1, $2, 'independent', 40) as s`, [task, f.today]);
    expect(s.status).toBe('in_progress');
    await expectError(db.as.user(f.fatherId, `select public.review_submission($1, 'approve')`, [s.id]), /not_pending/);
  });
});

describe('scheduling', () => {
  it('rejects unscheduled tasks and excludes them from the maximum', async () => {
    const f = await setupFamily(db, 'sched');
    const child = f.children.hatem;
    const otherDay = (f.dow + 1) % 7;
    const before = (await progress(f, f.fatherId, child.childId)).max_points;
    const [{ id }] = await db.as.user<{ id: string }>(f.fatherId,
      `select public.save_task($1, null, jsonb_build_object('title_ar','كرة القدم','recurrence','weekdays','weekdays', jsonb_build_array($3::int)), 3, 1, $2) as id`,
      [f.familyId, [child.childId], otherDay]);
    await expectError(db.as.user(child.userId, `select public.submit_task($1, $2)`, [id, f.today]), /not_scheduled/);
    expect((await progress(f, f.fatherId, child.childId)).max_points).toBe(before);

    // a day marked "not applicable" removes tasks and the initiative allowance
    await db.as.user(f.fatherId, `insert into public.task_exemptions (family_id, child_id, exempt_date, reason) values ($1, $2, $3, 'مريض')`,
      [f.familyId, child.childId, f.today]);
    expect((await progress(f, f.fatherId, child.childId)).max_points).toBe(0);
  });

  it('keeps historical point values when a parent changes them', async () => {
    const f = await setupFamily(db, 'versions');
    const task = await taskId(db, f.familyId, 'Bedroom and clothes');
    const [{ tomorrow }] = await db.rows<{ tomorrow: string }>(`select ($1::date + 1)::text tomorrow`, [f.today]);
    await db.as.user(f.fatherId,
      `select public.save_task($1, $2, (select to_jsonb(t) from public.tasks t where t.id = $2), 5, 5, null, $3::date)`,
      [f.familyId, task, tomorrow]);
    const [{ s }] = await db.as.user<{ s: Json }>(f.children.tuqa.userId, `select public.submit_task($1, $2) as s`, [task, f.today]);
    expect(s.claimed_points).toBe(2);
    const [{ v }] = await db.rows<{ v: number }>(`select count(*)::int v from public.task_rule_versions where task_id = $1`, [task]);
    expect(v).toBe(2);
  });
});

describe('initiatives', () => {
  it('caps initiative bonus at the configured daily allowance', async () => {
    const f = await setupFamily(db, 'init');
    const child = f.children.retal;
    const ids: string[] = [];
    for (const title of ['ساعدت أمي', 'ساعدت أخي الصغير', 'رتبت الحديقة']) {
      const [{ i }] = await db.as.user<{ i: Json }>(child.userId, `select public.submit_initiative($1, 'وصف') as i`, [title]);
      ids.push(i.id);
    }
    const awards: number[] = [];
    for (const id of ids) {
      const [{ r }] = await db.as.user<{ r: Json }>(f.fatherId, `select public.review_initiative($1, 'approve') as r`, [id]);
      awards.push(r.points_awarded);
    }
    expect(awards).toEqual([1, 1, 0]);
    const p = await progress(f, child.userId, child.childId);
    expect(p.approved_points).toBe(2);
    expect(p.initiatives_approved).toBe(3);

    // parents can change the allowance
    await db.as.user(f.fatherId, `update public.family_settings set initiative_daily_cap = 3, initiative_points = 2`);
    const [{ i }] = await db.as.user<{ i: Json }>(child.userId, `select public.submit_initiative('مبادرة رابعة') as i`);
    const [{ r }] = await db.as.user<{ r: Json }>(f.fatherId, `select public.review_initiative($1, 'approve') as r`, [i.id]);
    expect(r.points_awarded).toBe(1);
    expect(r.capped).toBe(true);
  });
});

describe('weekly finalisation, levels and rewards', () => {
  it('awards levels per child (multiple golds allowed), snapshots results and records rewards', async () => {
    const f = await setupFamily(db, 'week');
    // days of this week after today are marked not applicable so the test is independent of the weekday
    await db.as.user(f.fatherId,
      `insert into public.task_exemptions (family_id, child_id, exempt_date, reason)
       select $1, c.id, d::date, 'test' from public.children c,
              generate_series($2::date + 1, $3::date + 6, interval '1 day') d`,
      [f.familyId, f.today, f.weekStart]);

    // two children complete everything independently plus two initiatives → 100%
    for (const child of [f.children.tuqa, f.children.retal]) {
      const [{ d }] = await db.as.user<{ d: Json }>(child.userId, `select public.get_child_day($1, $2) as d`, [child.childId, f.today]);
      for (const t of d.tasks) {
        const [{ s }] = await db.as.user<{ s: Json }>(child.userId, `select public.submit_task($1, $2) as s`, [t.task_id, f.today]);
        await db.as.user(f.fatherId, `select public.review_submission($1, 'approve')`, [s.id]);
      }
      for (const title of ['مبادرة', 'مبادرة ثانية']) {
        const [{ i }] = await db.as.user<{ i: Json }>(child.userId, `select public.submit_initiative($1) as i`, [title]);
        await db.as.user(f.motherId, `select public.review_initiative($1, 'approve')`, [i.id]);
      }
    }
    // one child completes most tasks after reminders
    {
      const child = f.children.hatem;
      const [{ d }] = await db.as.user<{ d: Json }>(child.userId, `select public.get_child_day($1, $2) as d`, [child.childId, f.today]);
      for (const t of d.tasks) {
        const [{ s }] = await db.as.user<{ s: Json }>(child.userId, `select public.submit_task($1, $2, 'reminded') as s`, [t.task_id, f.today]);
        await db.as.user(f.fatherId, `select public.review_submission($1, 'approve')`, [s.id]);
      }
    }

    // a reward that needs silver is not yet available
    const [reward] = await db.as.user<Json>(f.fatherId,
      `select id from public.reward_catalog where name_en = 'Choose the family movie'`);
    await expectError(db.as.user(f.children.tuqa.userId, `select public.request_reward($1)`, [reward.id]), /not_eligible:level/);

    const [{ w }] = await db.as.user<{ w: Json[] }>(f.fatherId, `select public.get_family_week($1, $2) as w`, [f.familyId, f.weekStart]);
    expect(w).toHaveLength(4);

    const [{ snaps }] = await db.as.user<{ snaps: Json[] }>(f.fatherId,
      `select public.finalize_week($1, $2) as snaps`, [f.familyId, f.weekStart]);
    const byName = Object.fromEntries(snaps.map((s) => [s.display_name, s]));
    expect(byName['تُقى'].level_snapshot.code).toBe('gold');
    expect(byName['ريتال'].level_snapshot.code).toBe('gold');
    expect(Number(byName['تُقى'].percent)).toBe(100);
    expect(byName['حاتم'].level_snapshot.code).toBe('growing'); // half points, no initiatives
    expect(byName['أُبي'].level_snapshot.code).toBe('growing');

    // idempotent: finalising again returns the same snapshots without duplicates
    const [{ again }] = await db.as.user<{ again: Json[] }>(f.motherId,
      `select public.finalize_week($1, $2) as again`, [f.familyId, f.weekStart]);
    expect(again.map((s) => s.id).sort()).toEqual(snaps.map((s) => s.id).sort());

    // gold → 10 AED (unpaid) + premium privilege per gold child
    const money = await db.as.user<Json>(f.fatherId,
      `select id, child_id, amount::float, payment_status from public.reward_fulfillments where amount > 0 order by child_id`);
    expect(money).toHaveLength(2);
    expect(money.every((m) => m.amount === 10 && m.payment_status === 'unpaid')).toBe(true);
    const [{ u }] = await db.as.user<{ u: Json }>(f.fatherId,
      `select public.update_fulfillment($1, 'fulfilled', 'paid') as u`, [money[0].id]);
    expect(u.payment_status).toBe('paid');

    // earned achievements
    const ach = await db.as.user<Json>(f.children.tuqa.userId,
      `select d.code from public.earned_achievements e join public.achievement_definitions d on d.id = e.achievement_id`);
    expect(ach.map((a) => a.code)).toEqual(expect.arrayContaining(['first_task', 'gold_week']));

    // the gold child can now redeem the movie privilege, once per week
    const [{ r }] = await db.as.user<{ r: Json }>(f.children.tuqa.userId, `select public.request_reward($1) as r`, [reward.id]);
    expect(r.status).toBe('pending');
    await expectError(db.as.user(f.children.tuqa.userId, `select public.request_reward($1)`, [reward.id]), /not_eligible:limit/);

    // the closed week is frozen
    const task = await taskId(db, f.familyId, 'Bedroom and clothes');
    await expectError(db.as.user(f.children.obai.userId, `select public.submit_task($1, $2)`, [task, f.today]), /week_finalized/);
    await expectError(db.as.service(`update public.weekly_snapshots set percent = 1`), /immutable_record/);
  });
});
