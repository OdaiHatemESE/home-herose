/**
 * QA stack — a minimal Supabase-compatible HTTP server for local UI verification
 * WITHOUT Docker. It runs the real migrations in PGlite (Postgres in WASM) with RLS
 * enforced, and implements the subset of the PostgREST + GoTrue protocol that the
 * app uses. It is a development/QA tool only and is never part of the app build.
 *
 *   npx tsx scripts/qa-stack/server.ts          # http://127.0.0.1:54321
 *
 * Seeded logins (password for parents: "password123"):
 *   father@example.com, mother@example.com   — children sign in with family code + username + secret
 */
import http from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { createDb, createAuthUser, provisionChild, type Db } from '../../supabase/tests/harness';
import { deriveChildPassword } from '../../supabase/functions/_shared/credentials';

const PORT = Number(process.env.QA_PORT ?? 54321);
const PEPPER = 'qa-stack-pepper-qa-stack-pepper-qa-stack-pepper';
type Json = Record<string, any>;

const passwords = new Map<string, { userId: string; password: string }>();

function b64url(s: string) {
  return Buffer.from(s).toString('base64url');
}
function makeToken(userId: string, email: string, appMeta: Json) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: userId, email, role: 'authenticated', app_metadata: appMeta, exp: Math.floor(Date.now() / 1000) + 86400 * 30 }));
  const sig = createHmac('sha256', 'qa').update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}
function readToken(req: http.IncomingMessage): Json | null {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!auth || auth.split('.').length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(auth.split('.')[1], 'base64url').toString());
  } catch {
    return null;
  }
}

async function userRow(db: Db, id: string) {
  const [u] = await db.rows(`select id, email, raw_app_meta_data as app_metadata, raw_user_meta_data as user_metadata, created_at from auth.users where id = $1`, [id]);
  return u ? { ...u, aud: 'authenticated', role: 'authenticated' } : null;
}

async function sessionFor(db: Db, userId: string) {
  const user = await userRow(db, userId);
  const token = makeToken(userId, user.email, user.app_metadata);
  return { access_token: token, refresh_token: `r-${userId}`, token_type: 'bearer', expires_in: 86400 * 30, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user };
}

/* ---------------- PostgREST subset ---------------- */
const ident = (s: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`bad identifier ${s}`);
  return `"${s}"`;
};

function parseFilter(col: string, expr: string, params: unknown[]): string {
  const m = expr.match(/^(not\.)?(eq|neq|gt|gte|lt|lte|in|is|like|ilike)\.(.*)$/s);
  if (!m) throw new Error(`unsupported filter ${col}=${expr}`);
  const [, not, op, raw] = m;
  let clause: string;
  if (op === 'is') clause = `${ident(col)} is ${raw === 'null' ? 'null' : raw === 'true' ? 'true' : 'false'}`;
  else if (op === 'in') {
    const values = raw.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, ''));
    params.push(values);
    clause = `${ident(col)}::text = any($${params.length}::text[])`;
  } else {
    params.push(raw);
    const sym = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', ilike: 'ilike' }[op]!;
    clause = `${ident(col)}::text ${sym} $${params.length}::text`;
    if (['gt', 'gte', 'lt', 'lte'].includes(op)) clause = `${ident(col)} ${sym} $${params.length}`;
    if (op === 'eq' || op === 'neq') clause = `${ident(col)} ${sym} $${params.length}`;
  }
  return not ? `not (${clause})` : clause;
}

function buildWhere(q: URLSearchParams, params: unknown[]) {
  const clauses: string[] = [];
  for (const [k, v] of q) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    if (k === 'or') {
      const inner = v.replace(/^\(|\)$/g, '').split(/,(?![^(]*\))/);
      clauses.push(`(${inner.map((p) => {
        const [c, ...rest] = p.split('.');
        return parseFilter(c, rest.join('.'), params);
      }).join(' or ')})`);
    } else clauses.push(parseFilter(k, v, params));
  }
  return clauses.length ? `where ${clauses.join(' and ')}` : '';
}

function buildOrder(q: URLSearchParams) {
  const o = q.get('order');
  if (!o) return '';
  return 'order by ' + o.split(',').map((p) => {
    const [c, dir, nulls] = p.split('.');
    return `${ident(c)} ${dir === 'desc' ? 'desc' : 'asc'}${nulls ? ` ${nulls.replace('nulls', 'nulls ')}` : ''}`;
  }).join(', ');
}

function selectList(q: URLSearchParams) {
  const s = q.get('select');
  if (!s || s === '*') return '*';
  return s.split(',').map((c) => ident(c.trim())).join(', ');
}

async function asCaller(db: Db, claims: Json | null, sql: string, params: unknown[]) {
  if (!claims) return db.as.anon(sql, params);
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)`, [claims.sub, JSON.stringify(claims)]);
  await db.exec('set role authenticated');
  try {
    return (await db.query(sql, params)).rows as Json[];
  } finally {
    await db.exec('reset role');
  }
}

async function callRpc(db: Db, claims: Json | null, fn: string, args: Json) {
  const params: unknown[] = [];
  const named = Object.entries(args).map(([k, v]) => {
    params.push(v === null ? null : Array.isArray(v) ? `{${v.join(',')}}` : typeof v === 'object' ? JSON.stringify(v) : String(v));
    return `${ident(k)} => $${params.length}`;
  });
  const rows = await asCaller(db, claims, `select public.${ident(fn)}(${named.join(', ')}) as r`, params);
  return rows[0]?.r ?? null;
}

/* ---------------- seed ---------------- */
async function seed(db: Db) {
  const father = await createAuthUser(db, 'father@example.com');
  passwords.set('father@example.com', { userId: father, password: 'password123' });
  const [{ id: familyId }] = await db.as.user<{ id: string }>(father, `select public.create_family('عائلة الحاتم', 'Asia/Dubai', 'AED', 'ar', 'أبو حاتم') as id`);
  const mother = await createAuthUser(db, 'mother@example.com');
  passwords.set('mother@example.com', { userId: mother, password: 'password123' });
  const [{ inv }] = await db.as.user<Json>(father, `select public.create_invitation($1, 'mother@example.com') as inv`, [familyId]);
  await db.as.user(mother, `select public.accept_invitation($1, 'أم حاتم')`, [inv.token], 'mother@example.com');
  const year = new Date().getFullYear();
  const kids = [
    { name: 'تُقى', username: 'tuqa', age: 12, resp: 'ترتيب غرفة الجلوس', avatar: 'butterfly', color: 'pink' },
    { name: 'ريتال', username: 'retal', age: 11, resp: 'تنظيم المطبخ والمساعدة في غسالة الصحون', avatar: 'flower', color: 'purple' },
    { name: 'حاتم', username: 'hatem', age: 10, resp: 'العناية بنفايات المنزل', avatar: 'falcon', color: 'blue' },
    { name: 'أُبي', username: 'obai', age: 5, resp: 'ترتيب ألعابه وأغراضه', avatar: 'lion', color: 'gold' },
  ];
  const ids: Json = {};
  for (const k of kids) {
    const c = await provisionChild(db, familyId, { name: k.name, username: k.username, birthYear: year - k.age, responsibility: k.resp });
    await db.query(`update public.children set avatar = $2, color = $3, ui_mode = $4 where id = $1`, [c.childId, k.avatar, k.color, k.age < 7 ? 'simple' : 'standard']);
    const [{ internal_email }] = await db.rows(`select internal_email from private.child_auth where child_id = $1`, [c.childId]);
    passwords.set(internal_email, { userId: c.userId, password: await deriveChildPassword(PEPPER, c.childId, `${k.username}-star-7`) });
    ids[k.username] = c;
  }
  await db.as.user(father, `select public.create_starter_tasks($1, $2)`, [familyId, Object.values(ids).map((c: any) => c.childId)]);
  const [{ today }] = await db.rows(`select private.family_today($1)::text as today`, [familyId]);
  const day = async (c: Json) => (await db.as.user<Json>(c.userId, `select public.get_child_day($1, $2) as d`, [c.childId, today]))[0].d.tasks as Json[];

  // Tuqa: everything done independently, all approved, plus an approved initiative
  for (const t of await day(ids.tuqa)) {
    const [{ s }] = await db.as.user<Json>(ids.tuqa.userId, `select public.submit_task($1, $2) as s`, [t.task_id, today]);
    if (s.status === 'pending') await db.as.user(father, `select public.review_submission($1, 'approve')`, [s.id]);
  }
  const [{ i }] = await db.as.user<Json>(ids.tuqa.userId, `select public.submit_initiative('ساعدت أمي في تجهيز الغداء', 'دون أن تطلب') as i`);
  await db.as.user(mother, `select public.review_initiative($1, 'approve')`, [i.id]);
  // Retal: a few submitted, waiting for review; one initiative pending
  const retalTasks = await day(ids.retal);
  for (const t of retalTasks.slice(0, 3)) await db.as.user(ids.retal.userId, `select public.submit_task($1, $2, 'independent', 100, '{}'::jsonb, 'انتهيت') as s`, [t.task_id, today]);
  await db.as.user(ids.retal.userId, `select public.submit_initiative('رتبت رف الكتب في الصالة') as i`);
  // Hatem: reminder logged, then done after the reminder
  const hatemTasks = await day(ids.hatem);
  await db.as.user(father, `select public.log_reminder($1, $2)`, [ids.hatem.childId, hatemTasks[0].task_id]);
  const [{ s: hs }] = await db.as.user<Json>(ids.hatem.userId, `select public.submit_task($1, $2) as s`, [hatemTasks[0].task_id, today]);
  await db.as.user(father, `select public.review_submission($1, 'approve')`, [hs.id]);
  // notes and a skill assessment
  await db.as.user(mother, `insert into public.notes (family_id, child_id, author_id, author_role, kind, visibility, body) values ($1, $2, $3, 'parent', 'positive', 'child_visible', 'فخورة بك يا تُقى، كنت مبادرة جدًا اليوم 💛')`, [familyId, ids.tuqa.childId, mother]);
  const [skill] = await db.rows(`select id from public.skills where family_id = $1 and name_en = 'Initiative'`, [familyId]);
  await db.as.user(mother, `insert into public.skill_assessments (family_id, child_id, skill_id, rating, observation) values ($1, $2, $3, 4, 'يبادر بالمساعدة دون طلب')`, [familyId, ids.tuqa.childId, skill.id]);
  const [{ family_code }] = await db.rows(`select family_code from public.families where id = $1`, [familyId]);
  return { familyId, family_code, father, mother, ids };
}

/* ---------------- HTTP ---------------- */
const db = await createDb({ postgrestTypes: true });
const seeded = await seed(db);
console.log('QA stack seeded. Family code:', seeded.family_code);

function send(res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,HEAD,OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Range',
    ...headers,
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, undefined);
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString();
  const body = raw ? JSON.parse(raw) : {};
  const claims = readToken(req);
  try {
    // ---- auth ----
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'refresh_token') {
        const userId = String(body.refresh_token).replace(/^r-/, '');
        return send(res, 200, await sessionFor(db, userId));
      }
      const entry = passwords.get(String(body.email).toLowerCase());
      if (!entry || entry.password !== body.password) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', code: 'invalid_credentials' });
      return send(res, 200, await sessionFor(db, entry.userId));
    }
    if (url.pathname === '/auth/v1/user') {
      if (!claims) return send(res, 401, { msg: 'unauthorized' });
      return send(res, 200, await userRow(db, claims.sub));
    }
    if (url.pathname === '/auth/v1/signup') {
      const id = await createAuthUser(db, body.email);
      await db.query(`update auth.users set raw_user_meta_data = $2 where id = $1`, [id, JSON.stringify(body.data ?? {})]);
      passwords.set(String(body.email).toLowerCase(), { userId: id, password: body.password });
      return send(res, 200, await sessionFor(db, id));
    }
    if (url.pathname === '/auth/v1/logout') return send(res, 204, undefined);

    // ---- edge functions ----
    if (url.pathname === '/functions/v1/child-login') {
      const [acct] = await db.as.service<Json>(`select * from public.svc_resolve_child_login($1, $2)`, [body.familyCode, body.username]);
      if (!acct) return send(res, 401, { error: 'invalid_credentials' });
      const pw = await deriveChildPassword(PEPPER, acct.child_id, body.secret);
      const entry = passwords.get(acct.internal_email);
      if (!entry || entry.password !== pw) return send(res, 401, { error: 'invalid_credentials' });
      const s = await sessionFor(db, acct.user_id);
      return send(res, 200, { session: { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at } });
    }
    if (url.pathname === '/functions/v1/manage-child' && body.action === 'create') {
      const c = await provisionChild(db, body.familyId, { name: body.displayName, username: body.username, birthYear: body.birthYear, responsibility: body.householdResponsibility });
      await db.query(`update public.children set avatar = $2, color = $3, ui_mode = $4 where id = $1`, [c.childId, body.avatar ?? 'star', body.color ?? 'gold', body.uiMode ?? 'standard']);
      const [{ internal_email }] = await db.rows(`select internal_email from private.child_auth where child_id = $1`, [c.childId]);
      passwords.set(internal_email, { userId: c.userId, password: await deriveChildPassword(PEPPER, c.childId, body.secret) });
      return send(res, 201, { childId: c.childId });
    }

    // ---- PostgREST ----
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (rpc) return send(res, 200, await callRpc(db, claims, rpc[1], body));
    const tbl = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (tbl) {
      const table = `public.${ident(tbl[1])}`;
      const q = url.searchParams;
      const params: unknown[] = [];
      const single = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
      const range = req.headers.range?.match(/(\d+)-(\d+)/);
      if (req.method === 'GET' || req.method === 'HEAD') {
        const where = buildWhere(q, params);
        let sql = `select ${selectList(q)} from ${table} ${where} ${buildOrder(q)}`;
        if (q.get('limit')) sql += ` limit ${Number(q.get('limit'))}`;
        if (range) sql += ` offset ${Number(range[1])} limit ${Number(range[2]) - Number(range[1]) + 1}`;
        const rows = await asCaller(db, claims, sql, params);
        if (req.method === 'HEAD' || String(req.headers.prefer ?? '').includes('count=exact')) {
          const cnt = await asCaller(db, claims, `select count(*)::int as n from ${table} ${where}`, params);
          return send(res, 200, req.method === 'HEAD' ? undefined : rows, { 'Content-Range': `0-${Math.max(rows.length - 1, 0)}/${cnt[0].n}` });
        }
        if (single) return rows[0] ? send(res, 200, rows[0]) : send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
        return send(res, 200, rows);
      }
      if (req.method === 'POST') {
        const items: Json[] = Array.isArray(body) ? body : [body];
        const out: Json[] = [];
        for (const item of items) {
          const cols = Object.keys(item);
          const vals = cols.map((c) => (item[c] !== null && typeof item[c] === 'object' ? JSON.stringify(item[c]) : item[c]));
          const r = await asCaller(db, claims, `insert into ${table} (${cols.map(ident).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning *`, vals);
          out.push(...r);
        }
        return send(res, 201, single ? out[0] : out);
      }
      if (req.method === 'PATCH') {
        const cols = Object.keys(body);
        const vals = cols.map((c) => (body[c] !== null && typeof body[c] === 'object' ? JSON.stringify(body[c]) : body[c]));
        const set = cols.map((c, i) => `${ident(c)} = $${i + 1}`).join(', ');
        params.push(...vals);
        const where = buildWhere(q, params);
        const r = await asCaller(db, claims, `update ${table} set ${set} ${where} returning *`, params);
        if (single) return r[0] ? send(res, 200, r[0]) : send(res, 406, { code: 'PGRST116', message: 'no rows' });
        return send(res, 200, r);
      }
      if (req.method === 'DELETE') {
        const where = buildWhere(q, params);
        await asCaller(db, claims, `delete from ${table} ${where}`, params);
        return send(res, 204, undefined);
      }
    }
    send(res, 404, { message: `not implemented: ${req.method} ${url.pathname}` });
  } catch (err) {
    const e = err as Error & { code?: string };
    console.error(req.method, url.pathname + url.search, '→', e.message);
    send(res, 400, { message: e.message, code: e.code ?? 'P0001' });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`QA stack on http://127.0.0.1:${PORT}`));
export { randomUUID };
