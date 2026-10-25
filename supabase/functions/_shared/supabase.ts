import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';
import { HttpError } from './http.ts';

function keyFromEnv(jsonVar: string, legacyVar: string): string {
  const raw = Deno.env.get(jsonVar);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const name = Deno.env.get('SUPABASE_KEY_NAME') ?? 'default';
      if (parsed[name]) return parsed[name];
    } catch {
      /* fall through to legacy */
    }
  }
  const legacy = Deno.env.get(legacyVar);
  if (!legacy) throw new Error(`Missing ${jsonVar} / ${legacyVar}`);
  return legacy;
}

const url = Deno.env.get('SUPABASE_URL')!;

/** Admin client: bypasses RLS. Never leaves the Edge runtime. */
export function adminClient(): SupabaseClient {
  return createClient(url, keyFromEnv('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Public client used only to perform password sign-in for children. */
export function publicClient(): SupabaseClient {
  return createClient(url, keyFromEnv('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Validates the caller's access token. A valid JWT alone is never sufficient — see requireParent. */
export async function requireUser(req: Request, admin: SupabaseClient): Promise<User> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'not_authenticated');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'not_authenticated');
  if (data.user.app_metadata?.role === 'child') throw new HttpError(403, 'forbidden');
  return data.user;
}

/** Explicitly confirms the user is a parent (optionally owner) of the family. */
export async function requireParent(
  admin: SupabaseClient,
  userId: string,
  familyId: string,
  opts: { owner?: boolean } = {},
): Promise<{ role: 'owner' | 'co_parent' }> {
  const { data, error } = await admin
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(403, 'forbidden');
  if (opts.owner && data.role !== 'owner') throw new HttpError(403, 'owner_required');
  return data as { role: 'owner' | 'co_parent' };
}

export function pepper(): string {
  const p = Deno.env.get('CHILD_CREDENTIAL_PEPPER');
  if (!p || p.length < 32) throw new Error('CHILD_CREDENTIAL_PEPPER is not configured (min 32 chars)');
  return p;
}

export function childEmailDomain(): string | undefined {
  return Deno.env.get('CHILD_EMAIL_DOMAIN') ?? undefined;
}
