import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeFunction, supabase } from '@/lib/supabase';
import type { Child, Family, FamilyMember, FamilySettings, Profile } from '@/lib/database.types';
import { todayIn } from '@/lib/today';

export type Identity =
  | { kind: 'none' }
  | { kind: 'parent-no-family'; profile: Profile | null }
  | { kind: 'parent'; profile: Profile | null; membership: FamilyMember; family: Family; settings: FamilySettings }
  | { kind: 'child'; child: Child; family: Family; settings: FamilySettings };

type AuthState = {
  ready: boolean;
  session: Session | null;
  identity: Identity;
  identityLoading: boolean;
  refreshIdentity: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

async function loadIdentity(session: Session): Promise<Identity> {
  const isChild = session.user.app_metadata?.role === 'child';
  if (isChild) {
    // RLS returns only the child's own row
    const { data: child, error } = await supabase.from('children').select('*').limit(1).maybeSingle();
    if (error) throw error;
    if (!child) return { kind: 'none' };
    const [{ data: family, error: fe }, { data: settings, error: se }] = await Promise.all([
      supabase.from('families').select('*').eq('id', child.family_id).single(),
      supabase.from('family_settings').select('*').eq('family_id', child.family_id).single(),
    ]);
    if (fe) throw fe;
    if (se) throw se;
    return { kind: 'child', child, family: family!, settings: settings! };
  }

  const [{ data: profile }, { data: memberships, error }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
    supabase.from('family_members').select('*').eq('user_id', session.user.id).order('created_at'),
  ]);
  if (error) throw error;
  const membership = memberships?.[0];
  if (!membership) return { kind: 'parent-no-family', profile: profile ?? null };
  const [{ data: family, error: fe }, { data: settings, error: se }] = await Promise.all([
    supabase.from('families').select('*').eq('id', membership.family_id).single(),
    supabase.from('family_settings').select('*').eq('family_id', membership.family_id).single(),
  ]);
  if (fe) throw fe;
  if (se) throw se;
  return { kind: 'parent', profile: profile ?? null, membership, family: family!, settings: settings! };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = React.useState<Session | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') qc.clear();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const userId = session?.user.id;
  const identityQuery = useQuery({
    queryKey: ['identity', userId],
    queryFn: () => loadIdentity(session!),
    enabled: !!session,
    staleTime: 5 * 60_000,
  });

  const value = React.useMemo<AuthState>(
    () => ({
      ready,
      session,
      identity: session ? identityQuery.data ?? { kind: 'none' } : { kind: 'none' },
      identityLoading: !!session && identityQuery.isPending,
      refreshIdentity: async () => {
        await qc.invalidateQueries({ queryKey: ['identity'] });
      },
      signOut: async () => {
        await supabase.auth.signOut();
        qc.clear();
      },
    }),
    [ready, session, identityQuery.data, identityQuery.isPending, qc],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Parent-only context (throws outside parent routes, which are guarded). */
export function useParent() {
  const { identity } = useAuth();
  if (identity.kind !== 'parent') throw new Error('useParent used outside a parent route');
  const today = todayIn(identity.family.timezone);
  return { ...identity, familyId: identity.family.id, today };
}

export function useChildIdentity() {
  const { identity } = useAuth();
  if (identity.kind !== 'child') throw new Error('useChildIdentity used outside a child route');
  const today = todayIn(identity.family.timezone);
  return { ...identity, today };
}

/** Child sign-in through the child-login Edge Function. */
export async function childSignIn(familyCode: string, username: string, secret: string) {
  const res = await invokeFunction<{ session: { access_token: string; refresh_token: string } }>(
    'child-login',
    { familyCode, username, secret },
    { anonymous: true },
  );
  const { error } = await supabase.auth.setSession(res.session);
  if (error) throw error;
}
