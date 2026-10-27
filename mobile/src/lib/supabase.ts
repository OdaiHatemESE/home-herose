import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import type { Database } from '@shared/lib/database.types';
import { SUPABASE_KEY, SUPABASE_URL } from './config';

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

// Shipping an administrative key inside an app would expose every family's data.
if (looksLikeSecretKey(SUPABASE_KEY)) {
  throw new Error('A Supabase SECRET key was configured for the app. Use the publishable key only.');
}

export const supabase: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    storageKey: 'hh-auth',
    persistSession: true,
    autoRefreshToken: true,
    // e-mail links (confirm address, reset password) come back to the web app as ?code=
    flowType: 'pkce',
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Refresh the session only while the app is in the foreground (recommended for React Native)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

/** Calls an Edge Function with the current session; returns typed JSON or throws Error(code). */
export async function invokeFunction<T>(name: string, body: unknown, opts: { anonymous?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY };
  if (!opts.anonymous) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const payload = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(payload.error ?? `http_${res.status}`);
  return payload;
}
