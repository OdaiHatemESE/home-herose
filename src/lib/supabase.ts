import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

/** True when the build has been given a Supabase project. */
export const isSupabaseConfigured = Boolean(url && key && !url.includes('your-project'));

function looksLikeSecretKey(k: string): boolean {
  if (k.startsWith('sb_secret_')) return true;
  try {
    const part = k.split('.')[1];
    if (!part) return false;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(b64)).role === 'service_role';
  } catch {
    return false;
  }
}

// Guard against the most damaging mistake: shipping a secret key in a public bundle.
if (key && looksLikeSecretKey(key)) {
  throw new Error('A Supabase SECRET key was provided to the browser build. Use the publishable key only.');
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  url ?? 'http://localhost:54321',
  key ?? 'public-anon-key-not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // HashRouter owns the URL hash, so auth redirects use ?code= (PKCE)
      flowType: 'pkce',
      detectSessionInUrl: true,
      storageKey: 'hh-auth',
    },
  },
);

/** Calls an Edge Function with the current session and returns typed JSON or throws an Error(code). */
export async function invokeFunction<T>(name: string, body: unknown, opts: { anonymous?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: key ?? '' };
  if (!opts.anonymous) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(`${url}/functions/v1/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const payload = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(payload.error ?? `http_${res.status}`);
  return payload;
}
