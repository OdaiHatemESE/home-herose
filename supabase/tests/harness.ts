/**
 * Test harness: runs the real Supabase migrations inside PGlite (Postgres compiled to WASM)
 * with a minimal emulation of Supabase's auth schema, roles and JWT helpers.
 */
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const SUPABASE_SHIM = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}',
  raw_app_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export type Db = PGlite & { as: Actor; rows: <T = Record<string, any>>(sql: string, params?: unknown[]) => Promise<T[]> };
type Actor = {
  user: <T = Record<string, unknown>>(userId: string, sql: string, params?: unknown[], email?: string) => Promise<T[]>;
  anon: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  service: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
};

export async function createDb(): Promise<Db> {
  const db = new PGlite() as Db;
  await db.exec(SUPABASE_SHIM);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }

  async function run<T>(role: string, sub: string | null, sql: string, params: unknown[] = [], email?: string) {
    await db.exec('reset role');
    const claims = sub ? JSON.stringify({ sub, role, email: email ?? null }) : '';
    await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)`, [
      sub ?? '',
      claims,
    ]);
    await db.exec(`set role ${role}`);
    try {
      const res = await db.query<T>(sql, params);
      return res.rows;
    } finally {
      await db.exec('reset role');
    }
  }

  db.rows = async (sql, params) => (await db.query<any>(sql, params)).rows;
  db.as = {
    user: (userId, sql, params, email) => run('authenticated', userId, sql, params, email),
    anon: (sql, params) => run('anon', null, sql, params),
    service: (sql, params) => run('service_role', null, sql, params),
  };
  return db;
}

/** Creates an auth user (as Supabase Auth would) and returns its id. */
export async function createAuthUser(db: PGlite, email: string, appMeta: Record<string, unknown> = {}) {
  const res = await db.query<{ id: string }>(
    `insert into auth.users (email, raw_app_meta_data, raw_user_meta_data) values ($1, $2, $3) returning id`,
    [email, JSON.stringify(appMeta), JSON.stringify({ display_name: email.split('@')[0] })],
  );
  return res.rows[0].id;
}

/**
 * Provisions a child exactly like the manage-child Edge Function does:
 * child row + auth user + private login mapping (all with service privileges).
 */
export async function provisionChild(
  db: Db,
  familyId: string,
  child: { name: string; username: string; birthYear?: number; responsibility?: string },
) {
  const [row] = await db.as.service<{ id: string }>(
    `insert into public.children (family_id, display_name, username, birth_year, household_responsibility)
     values ($1, $2, $3, $4, $5) returning id`,
    [familyId, child.name, child.username, child.birthYear ?? null, child.responsibility ?? null],
  );
  const email = `child-${row.id}@children.home-heroes.invalid`;
  const userId = await createAuthUser(db, email, { role: 'child', family_id: familyId, child_id: row.id });
  await db.as.service(`select public.svc_register_child_auth($1, $2, $3)`, [row.id, userId, email]);
  return { childId: row.id, userId };
}

export async function expectError(p: Promise<unknown>, match: RegExp) {
  try {
    await p;
  } catch (err) {
    const msg = (err as Error).message;
    if (!match.test(msg)) throw new Error(`Expected error matching ${match}, got: ${msg}`);
    return msg;
  }
  throw new Error(`Expected error matching ${match}, but call succeeded`);
}

export type FamilyFixture = Awaited<ReturnType<typeof setupFamily>>;

/** Father registers, creates a family, invites the mother, adds four children with starter tasks. */
export async function setupFamily(db: Db, label: string) {
  const fatherId = await createAuthUser(db, `father-${label}@example.com`);
  const [{ create_family: familyId }] = await db.as.user<{ create_family: string }>(
    fatherId,
    `select public.create_family($1, 'Asia/Dubai', 'AED', 'ar', 'أبو حاتم')`,
    [`عائلة ${label}`],
  );
  const motherEmail = `mother-${label}@example.com`;
  const motherId = await createAuthUser(db, motherEmail);
  const [{ create_invitation: inv }] = await db.as.user<{ create_invitation: { token: string } }>(
    fatherId,
    `select public.create_invitation($1, $2)`,
    [familyId, motherEmail],
  );
  await db.as.user(motherId, `select public.accept_invitation($1, 'أم حاتم')`, [inv.token], motherEmail);

  const year = new Date().getFullYear();
  const tuqa = await provisionChild(db, familyId, { name: 'تُقى', username: `tuqa`, birthYear: year - 12, responsibility: 'ترتيب غرفة الجلوس' });
  const retal = await provisionChild(db, familyId, { name: 'ريتال', username: `retal`, birthYear: year - 11, responsibility: 'ترتيب المطبخ' });
  const hatem = await provisionChild(db, familyId, { name: 'حاتم', username: `hatem`, birthYear: year - 10, responsibility: 'إخراج النفايات' });
  const obai = await provisionChild(db, familyId, { name: 'أُبي', username: `obai`, birthYear: year - 5, responsibility: 'ترتيب الألعاب' });
  const children = { tuqa, retal, hatem, obai };

  await db.as.user(fatherId, `select public.create_starter_tasks($1, $2)`, [
    familyId,
    Object.values(children).map((c) => c.childId),
  ]);

  const [{ today, week_start, dow }] = await db.rows<{ today: string; week_start: string; dow: number }>(
    `select private.family_today($1)::text as today, private.week_start_for($1, private.family_today($1))::text as week_start,
            extract(dow from private.family_today($1))::int as dow`,
    [familyId],
  );
  return { familyId, fatherId, motherId, motherEmail, children, today, weekStart: week_start, dow };
}

export async function taskId(db: Db, familyId: string, titleEn: string, childId?: string) {
  const rows = await db.rows<{ id: string }>(
    `select t.id from public.tasks t
     where t.family_id = $1 and t.title_en = $2
       and ($3::uuid is null or exists (select 1 from public.task_assignments a where a.task_id = t.id and a.child_id = $3))
     limit 1`,
    [familyId, titleEn, childId ?? null],
  );
  if (!rows[0]) throw new Error(`task ${titleEn} not found`);
  return rows[0].id;
}
